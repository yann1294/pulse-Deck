import assert from "node:assert/strict";
import { test } from "node:test";
import { TicketPriority } from "@prisma/client";
import { calculateTicketSla } from "./sla.util";

const createdAt = new Date("2026-06-21T10:00:00.000Z");

test("calculateTicketSla uses priority-specific first response windows", () => {
  assert.equal(
    calculateTicketSla({
      createdAt,
      priority: TicketPriority.URGENT,
      now: createdAt
    }).dueAt,
    "2026-06-21T11:00:00.000Z"
  );
  assert.equal(
    calculateTicketSla({
      createdAt,
      priority: TicketPriority.HIGH,
      now: createdAt
    }).dueAt,
    "2026-06-21T14:00:00.000Z"
  );
  assert.equal(
    calculateTicketSla({
      createdAt,
      priority: TicketPriority.LOW,
      now: createdAt
    }).dueAt,
    "2026-06-23T10:00:00.000Z"
  );
});

test("calculateTicketSla defaults missing priority to medium", () => {
  const result = calculateTicketSla({
    createdAt,
    priority: null,
    now: createdAt
  });

  assert.equal(result.dueAt, "2026-06-22T10:00:00.000Z");
  assert.equal(result.status, "ON_TRACK");
});

test("calculateTicketSla marks due soon and overdue tickets", () => {
  assert.equal(
    calculateTicketSla({
      createdAt,
      priority: TicketPriority.URGENT,
      now: new Date("2026-06-21T10:35:00.000Z")
    }).status,
    "DUE_SOON"
  );
  assert.equal(
    calculateTicketSla({
      createdAt,
      priority: TicketPriority.MEDIUM,
      now: new Date("2026-06-22T06:30:00.000Z")
    }).status,
    "DUE_SOON"
  );
  assert.equal(
    calculateTicketSla({
      createdAt,
      priority: TicketPriority.HIGH,
      now: new Date("2026-06-21T14:01:00.000Z")
    }).status,
    "OVERDUE"
  );
});
