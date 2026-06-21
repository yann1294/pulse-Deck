import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ConfigService } from "@nestjs/config";
import { AiService } from "../src/ai/ai.service";
import { ChunkerService } from "../src/knowledge-base/chunker.service";
import { DocumentParserService } from "../src/knowledge-base/document-parser.service";
import { KnowledgeBaseService, toPgVectorLiteral } from "../src/knowledge-base/knowledge-base.service";
import { PrismaService } from "../src/prisma/prisma.service";

interface RagEvalCase {
  id: string;
  question: string;
  expectedDocumentTitle: string;
  expectedFacts: string[];
  category: string;
}

interface RagEvalResult {
  id: string;
  expectedDocumentTitle: string;
  retrievedTitles: string[];
  top1Match: boolean;
  top3Match: boolean;
}

interface KnowledgeDocumentWithoutEmbedding {
  id: string;
  content: string;
}

const DEFAULT_TOP_3_THRESHOLD = 0.75;

async function main(): Promise<void> {
  loadLocalEnv();

  const cases = await loadEvalCases();
  const configService = new ConfigService(process.env);
  const prismaService = new PrismaService(configService);
  const aiService = new AiService(configService);
  const knowledgeBaseService = new KnowledgeBaseService(
    prismaService,
    aiService,
    new DocumentParserService(),
    new ChunkerService()
  );

  try {
    await prismaService.$connect();
    await ensureKnowledgeBaseEmbeddings(prismaService, aiService);

    const results: RagEvalResult[] = [];

    for (const evalCase of cases) {
      const retrievedChunks = await knowledgeBaseService.searchRelevantChunks(evalCase.question, 3);
      const retrievedTitles = retrievedChunks.map((chunk) => chunk.title);
      const top3Titles = new Set(retrievedTitles.slice(0, 3));

      results.push({
        id: evalCase.id,
        expectedDocumentTitle: evalCase.expectedDocumentTitle,
        retrievedTitles,
        top1Match: retrievedTitles[0] === evalCase.expectedDocumentTitle,
        top3Match: top3Titles.has(evalCase.expectedDocumentTitle)
      });
    }

    printResults(results);
    maybeFailStrictEval(results);
  } finally {
    await prismaService.$disconnect();
  }
}

async function ensureKnowledgeBaseEmbeddings(
  prismaService: PrismaService,
  aiService: AiService
): Promise<void> {
  const documents = await prismaService.$queryRaw<KnowledgeDocumentWithoutEmbedding[]>`
    SELECT "id", "content"
    FROM "KnowledgeDocument"
    WHERE "embedding" IS NULL
      AND "isActive" = true
  `;

  if (documents.length === 0) {
    return;
  }

  console.info(`Embedding ${documents.length} knowledge-base documents without vectors...`);

  for (const document of documents) {
    const embedding = await aiService.embedText(document.content);
    const vectorLiteral = toPgVectorLiteral(embedding);

    await prismaService.$executeRaw`
      UPDATE "KnowledgeDocument"
      SET "embedding" = ${vectorLiteral}::vector,
          "updatedAt" = NOW()
      WHERE "id" = ${document.id}
    `;
  }
}

async function loadEvalCases(): Promise<RagEvalCase[]> {
  const casesPath = join(process.cwd(), "evals", "rag-eval-cases.json");
  const rawCases = JSON.parse(await readFile(casesPath, "utf8")) as unknown;

  if (!Array.isArray(rawCases)) {
    throw new Error("RAG eval cases file must contain an array");
  }

  return rawCases.map(parseEvalCase);
}

function parseEvalCase(value: unknown): RagEvalCase {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid RAG eval case");
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.id !== "string" ||
    typeof record.question !== "string" ||
    typeof record.expectedDocumentTitle !== "string" ||
    !Array.isArray(record.expectedFacts) ||
    typeof record.category !== "string"
  ) {
    throw new Error(`Invalid RAG eval case shape: ${String(record.id)}`);
  }

  return {
    id: record.id,
    question: record.question,
    expectedDocumentTitle: record.expectedDocumentTitle,
    expectedFacts: record.expectedFacts.map((fact) => {
      if (typeof fact !== "string") {
        throw new Error(`Invalid expected fact in case: ${record.id}`);
      }

      return fact;
    }),
    category: record.category
  };
}

function printResults(results: RagEvalResult[]): void {
  const totalCases = results.length;
  const top1Hits = results.filter((result) => result.top1Match).length;
  const top3Hits = results.filter((result) => result.top3Match).length;
  const failedCases = results.filter((result) => !result.top3Match);

  console.info("PulseDesk RAG retrieval evaluation");
  console.info("This is a lightweight retrieval evaluation, not a full answer-quality evaluation.");
  console.info(`Total cases: ${totalCases}`);
  console.info(`Top-1 accuracy: ${formatAccuracy(top1Hits, totalCases)} (${top1Hits}/${totalCases})`);
  console.info(`Top-3 accuracy: ${formatAccuracy(top3Hits, totalCases)} (${top3Hits}/${totalCases})`);

  if (failedCases.length === 0) {
    console.info("Failed cases: none");
    return;
  }

  console.info("Failed cases:");

  for (const result of failedCases) {
    console.info(`- ${result.id}`);
    console.info(`  Expected: ${result.expectedDocumentTitle}`);
    console.info(`  Retrieved: ${result.retrievedTitles.join(" | ") || "none"}`);
  }
}

function maybeFailStrictEval(results: RagEvalResult[]): void {
  if (process.env.STRICT_EVAL !== "true") {
    return;
  }

  const threshold = parseThreshold(process.env.RAG_EVAL_THRESHOLD);
  const top3Accuracy = results.filter((result) => result.top3Match).length / results.length;

  if (top3Accuracy < threshold) {
    console.error(
      `STRICT_EVAL=true and top-3 accuracy ${formatPercent(top3Accuracy)} is below threshold ${formatPercent(threshold)}`
    );
    process.exitCode = 1;
  }
}

function parseThreshold(rawValue: string | undefined): number {
  if (!rawValue) {
    return DEFAULT_TOP_3_THRESHOLD;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > 1) {
    throw new Error("RAG_EVAL_THRESHOLD must be a number between 0 and 1");
  }

  return parsedValue;
}

function formatAccuracy(hits: number, total: number): string {
  return formatPercent(total === 0 ? 0 : hits / total);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function loadLocalEnv(): void {
  const envPaths = [
    join(process.cwd(), ".env"),
    join(process.cwd(), "..", ".env")
  ];

  for (const envPath of envPaths) {
    if (!existsSync(envPath)) {
      continue;
    }

    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

main().catch((error: unknown) => {
  console.error("RAG evaluation failed");
  console.error(error);
  process.exitCode = 1;
});
