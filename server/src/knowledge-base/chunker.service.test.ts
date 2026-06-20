import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
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

test("chunkText returns empty list for blank input", () => {
  assert.deepEqual(chunkText(" \n\t "), []);
});

test("chunkText preserves overlap across adjacent chunks", () => {
  const text = Array.from({ length: 90 }, (_, index) => `Paragraph ${index} explains a support workflow.`).join(" ");
  const chunks = chunkText(text, { maxChunkSize: 700, overlapSize: 100 });

  assert.ok(chunks.length > 1);
  const overlapSample = chunks[0]?.content.slice(-60).trim();

  assert.ok(overlapSample);
  assert.ok(chunks[1]?.content.includes(overlapSample), "expected second chunk to retain overlapping text");
});

test("chunkText rejects invalid chunking options", () => {
  assert.throws(() => chunkText("Valid text", { maxChunkSize: 600, overlapSize: 100 }), BadRequestException);
  assert.throws(() => chunkText("Valid text", { maxChunkSize: 700, overlapSize: 99 }), BadRequestException);
  assert.throws(() => chunkText("Valid text", { maxChunkSize: 700, overlapSize: 700 }), BadRequestException);
});

test("getSupportedDocumentExtension accepts txt, md, and pdf", () => {
  assert.equal(getSupportedDocumentExtension("faq.txt"), ".txt");
  assert.equal(getSupportedDocumentExtension("guide.MD"), ".md");
  assert.equal(getSupportedDocumentExtension("policy.pdf"), ".pdf");
});

test("parsePlainTextBuffer returns normalized utf8 text", () => {
  assert.equal(parsePlainTextBuffer(Buffer.from("First   line\n\n\nSecond line")), "First line\n\nSecond line");
});
