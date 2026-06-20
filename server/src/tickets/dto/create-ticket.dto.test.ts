import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { CreateTicketDto } from "./create-ticket.dto";

test("CreateTicketDto accepts a valid public ticket payload", () => {
  const dto = plainToInstance(CreateTicketDto, {
    customerName: "Jordan Patel",
    customerEmail: "jordan@example.com",
    company: "Apex Analytics",
    title: "Export queue delay",
    description: "The monthly export has been queued for over an hour without completing.",
    attachmentUrl: "https://example.com/screenshots/export-delay.png"
  });

  const errors = validateSync(dto);

  assert.deepEqual(errors, []);
});

test("CreateTicketDto rejects invalid email, short description, and bad attachment url", () => {
  const dto = plainToInstance(CreateTicketDto, {
    customerName: "Jordan Patel",
    customerEmail: "not-an-email",
    title: "Export issue",
    description: "Too short",
    attachmentUrl: "example.com/no-protocol"
  });

  const errors = validateSync(dto);
  const properties = errors.map((error) => error.property).sort();

  assert.deepEqual(properties, ["attachmentUrl", "customerEmail", "description"]);
});

test("CreateTicketDto allows optional company and attachmentUrl to be omitted", () => {
  const dto = plainToInstance(CreateTicketDto, {
    customerName: "Jordan Patel",
    customerEmail: "jordan@example.com",
    title: "Export queue delay",
    description: "The monthly export has been queued for over an hour without completing."
  });

  const errors = validateSync(dto);

  assert.deepEqual(errors, []);
});
