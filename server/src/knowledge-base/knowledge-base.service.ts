import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { basename, extname } from "node:path";
import { AiService } from "../ai/ai.service";
import { PrismaService } from "../prisma/prisma.service";
import { ChunkerService } from "./chunker.service";
import { DocumentParserService } from "./document-parser.service";

export interface IngestUploadedFileInput {
  file?: UploadedKnowledgeFile;
  title?: string;
}

export interface UploadedKnowledgeFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

export interface KnowledgeUploadResultDTO {
  title: string;
  sourceName: string;
  chunksCreated: number;
}

export interface KnowledgeDocumentGroupDTO {
  title: string;
  sourceName: string;
  sourceType: string;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class KnowledgeBaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly documentParser: DocumentParserService,
    private readonly chunker: ChunkerService
  ) {}

  async ingestUploadedFile(input: IngestUploadedFileInput): Promise<KnowledgeUploadResultDTO> {
    if (!input.file) {
      throw new BadRequestException("A multipart file field named 'file' is required");
    }

    const parsedDocument = await this.documentParser.parseDocument({
      fileName: input.file.originalname,
      buffer: input.file.buffer
    });
    const chunks = this.chunker.chunkText(parsedDocument.text);

    if (chunks.length === 0) {
      throw new BadRequestException("Document did not produce any chunks");
    }

    const title = normalizeDocumentTitle(input.title, input.file.originalname);
    const sourceName = input.file.originalname;
    const sourceType = parsedDocument.extension.slice(1);
    const mimeType = input.file.mimetype || sourceType;

    for (const chunk of chunks) {
      const embedding = await this.aiService.embedText(chunk.content);
      const vectorLiteral = toPgVectorLiteral(embedding);

      await this.prisma.$executeRaw`
        INSERT INTO "KnowledgeDocument" (
          "id",
          "title",
          "fileName",
          "mimeType",
          "sourceType",
          "sourceName",
          "content",
          "chunkIndex",
          "embedding",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${randomUUID()},
          ${title},
          ${sourceName},
          ${mimeType},
          ${sourceType},
          ${sourceName},
          ${chunk.content},
          ${chunk.chunkIndex},
          ${vectorLiteral}::vector,
          NOW(),
          NOW()
        )
      `;
    }

    return {
      title,
      sourceName,
      chunksCreated: chunks.length
    };
  }

  async listDocumentGroups(): Promise<KnowledgeDocumentGroupDTO[]> {
    const documents = await this.prisma.knowledgeDocument.findMany({
      select: {
        title: true,
        sourceName: true,
        sourceType: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    const groups = new Map<string, KnowledgeDocumentGroupDTO>();

    for (const document of documents) {
      const key = `${document.sourceName}:${document.title}`;
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, {
          title: document.title,
          sourceName: document.sourceName,
          sourceType: document.sourceType,
          chunkCount: 1,
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt.toISOString()
        });
        continue;
      }

      existing.chunkCount += 1;

      if (document.createdAt.toISOString() < existing.createdAt) {
        existing.createdAt = document.createdAt.toISOString();
      }

      if (document.updatedAt.toISOString() > existing.updatedAt) {
        existing.updatedAt = document.updatedAt.toISOString();
      }
    }

    return Array.from(groups.values()).sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
  }
}

export function normalizeDocumentTitle(title: string | undefined, fileName: string): string {
  const trimmedTitle = title?.trim();

  if (trimmedTitle) {
    return trimmedTitle;
  }

  const extension = extname(fileName);
  const baseName = basename(fileName, extension).replace(/[-_]+/g, " ").trim();

  if (!baseName) {
    throw new BadRequestException("Document title could not be inferred from file name");
  }

  return baseName;
}

export function toPgVectorLiteral(values: number[]): string {
  if (values.length === 0) {
    throw new ServiceUnavailableException("Embedding provider returned an empty vector");
  }

  return `[${values.map(toPgVectorNumber).join(",")}]`;
}

function toPgVectorNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new ServiceUnavailableException("Embedding provider returned a non-finite vector value");
  }

  return String(value);
}
