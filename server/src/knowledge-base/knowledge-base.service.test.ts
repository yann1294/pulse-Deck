import assert from "node:assert/strict";
import test from "node:test";
import { ServiceUnavailableException } from "@nestjs/common";
import { normalizeDocumentTitle, toPgVectorLiteral } from "./knowledge-base.service";

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
