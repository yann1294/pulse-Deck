import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import {
  KnowledgeBaseService,
  normalizeDocumentTitle,
  normalizeSearchLimit,
  toPgVectorLiteral
} from "./knowledge-base.service";

test("normalizeDocumentTitle uses explicit title when provided", () => {
  assert.equal(normalizeDocumentTitle(" Billing FAQ ", "billing-faq.md"), "Billing FAQ");
});

test("normalizeDocumentTitle infers a readable title from file name", () => {
  assert.equal(normalizeDocumentTitle(undefined, "account-security_checklist.pdf"), "account security checklist");
});

test("toPgVectorLiteral formats finite embedding values for pgvector", () => {
  assert.equal(toPgVectorLiteral([0.1, -0.25, 1]), "[0.1,-0.25,1]");
});

test("toPgVectorLiteral rejects invalid embedding values", () => {
  assert.throws(() => toPgVectorLiteral([]), ServiceUnavailableException);
  assert.throws(() => toPgVectorLiteral([Number.NaN]), ServiceUnavailableException);
});

test("normalizeSearchLimit defaults invalid limits and caps large limits", () => {
  assert.equal(normalizeSearchLimit(0), 5);
  assert.equal(normalizeSearchLimit(Number.NaN), 5);
  assert.equal(normalizeSearchLimit(3), 3);
  assert.equal(normalizeSearchLimit(50), 25);
});

test("searchRelevantChunks trims input, embeds query, and maps scores", async () => {
  const embedCalls: string[] = [];
  const prisma = {
    $queryRaw: async () => [
      {
        id: "doc-1",
        title: "Billing FAQ",
        content: "Refunds are processed within five business days.",
        score: "0.91",
        sourceName: "billing-faq.md"
      }
    ]
  };
  const aiService = {
    embedText: async (query: string) => {
      embedCalls.push(query);
      return [0.1, 0.2, 0.3];
    }
  };

  const service = new KnowledgeBaseService(prisma as never, aiService as never, {} as never, {} as never);
  const results = await service.searchRelevantChunks("  refund timing  ", 50);

  assert.deepEqual(embedCalls, ["refund timing"]);
  assert.deepEqual(results, [
    {
      id: "doc-1",
      title: "Billing FAQ",
      content: "Refunds are processed within five business days.",
      score: 0.91,
      sourceName: "billing-faq.md"
    }
  ]);
});

test("searchRelevantChunks rejects blank queries before embedding", async () => {
  const aiService = {
    embedText: async () => {
      throw new Error("should not be called");
    }
  };

  const service = new KnowledgeBaseService({} as never, aiService as never, {} as never, {} as never);

  await assert.rejects(() => service.searchRelevantChunks("   "), BadRequestException);
});
