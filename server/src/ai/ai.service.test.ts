import assert from "node:assert/strict";
import test from "node:test";
import { ServiceUnavailableException } from "@nestjs/common";
import { parseEmbeddingDimension, parseStrictJson } from "./ai.service";

test("parseEmbeddingDimension defaults to 768", () => {
  assert.equal(parseEmbeddingDimension(undefined), 768);
});

test("parseEmbeddingDimension accepts positive integer values", () => {
  assert.equal(parseEmbeddingDimension("384"), 384);
});

test("parseEmbeddingDimension rejects invalid values", () => {
  assert.throws(() => parseEmbeddingDimension("0"), ServiceUnavailableException);
  assert.throws(() => parseEmbeddingDimension("abc"), ServiceUnavailableException);
});

test("parseStrictJson parses valid JSON objects", () => {
  assert.deepEqual(parseStrictJson('{"status":"ok","count":2}'), {
    status: "ok",
    count: 2
  });
});

test("parseStrictJson accepts fenced json responses", () => {
  assert.deepEqual(parseStrictJson('```json\n{"status":"ok"}\n```'), {
    status: "ok"
  });
});

test("parseStrictJson rejects invalid JSON", () => {
  assert.throws(() => parseStrictJson("{status:ok}"), ServiceUnavailableException);
});
