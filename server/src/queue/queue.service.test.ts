import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { QueueService } from "./queue.service";

test("enqueueTicketAi schedules classify, prioritize, and suggest-reply jobs", async () => {
  const addCalls: Array<{ name: string; data: { ticketId: string }; options: unknown }> = [];
  const queue = {
    add: async (name: string, data: { ticketId: string }, options: unknown) => {
      addCalls.push({ name, data, options });
      return { id: `${name}-job`, name };
    }
  };

  const service = new QueueService(queue as never);
  const jobs = await service.enqueueTicketAi("  ticket-123  ");

  assert.deepEqual(
    addCalls.map((call) => ({ name: call.name, ticketId: call.data.ticketId })),
    [
      { name: "classify", ticketId: "ticket-123" },
      { name: "prioritize", ticketId: "ticket-123" },
      { name: "suggest-reply", ticketId: "ticket-123" }
    ]
  );
  assert.equal(addCalls.length, 3);
  assert.deepEqual(jobs, [
    { id: "classify-job", name: "classify" },
    { id: "prioritize-job", name: "prioritize" },
    { id: "suggest-reply-job", name: "suggest-reply" }
  ]);
});

test("enqueueTicketAi rejects blank ticket ids", async () => {
  const service = new QueueService({ add: async () => ({}) } as never);

  await assert.rejects(() => service.enqueueTicketAi("   "), BadRequestException);
});
