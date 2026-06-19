import assert from "node:assert/strict";
import test from "node:test";
import { ServiceUnavailableException } from "@nestjs/common";
import { parseEmbeddingDimension } from "./ai.service";

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
