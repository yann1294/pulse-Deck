import assert from "node:assert/strict";
import test from "node:test";
import { chunkText, normalizeWhitespace } from "./chunker.service";
import { getSupportedDocumentExtension, parsePlainTextBuffer } from "./document-parser.service";

test("normalizeWhitespace trims and collapses repeated spaces and blank lines", () => {
  assert.equal(normalizeWhitespace("  Hello   world\r\n\r\n\r\nNext\tline  "), "Hello world\n\nNext line");
});

test("chunkText returns indexed chunks within the configured size", () => {
  const text = Array.from({ length: 80 }, (_, index) => `Sentence ${index} has useful support context.`).join(" ");
  const chunks = chunkText(text, { maxChunkSize: 700, overlapSize: 100 });

  assert.ok(chunks.length > 1);
  assert.deepEqual(
    chunks.map((chunk) => chunk.chunkIndex),
    chunks.map((_, index) => index)
  );
  assert.ok(chunks.every((chunk) => chunk.content.length <= 700));
});

test("getSupportedDocumentExtension accepts txt, md, and pdf", () => {
  assert.equal(getSupportedDocumentExtension("faq.txt"), ".txt");
  assert.equal(getSupportedDocumentExtension("guide.MD"), ".md");
  assert.equal(getSupportedDocumentExtension("policy.pdf"), ".pdf");
});

test("parsePlainTextBuffer returns normalized utf8 text", () => {
  assert.equal(parsePlainTextBuffer(Buffer.from("First   line\n\n\nSecond line")), "First line\n\nSecond line");
});
