import { TicketPriority } from "@prisma/client";

export type SlaStatus = "ON_TRACK" | "DUE_SOON" | "OVERDUE";

export interface TicketSlaResult {
  dueAt: string;
  minutesRemaining: number;
  status: SlaStatus;
}

const FIRST_RESPONSE_MINUTES: Record<TicketPriority, number> = {
  URGENT: 60,
  HIGH: 4 * 60,
  MEDIUM: 24 * 60,
  LOW: 48 * 60
};

const DUE_SOON_MINUTES: Record<TicketPriority, number> = {
  URGENT: 30,
  HIGH: 30,
  MEDIUM: 4 * 60,
  LOW: 4 * 60
};

export function calculateTicketSla(input: {
  createdAt: Date;
  priority?: TicketPriority | null;
  now?: Date;
}): TicketSlaResult {
  const priority = input.priority ?? TicketPriority.MEDIUM;
  const now = input.now ?? new Date();
  const dueAt = new Date(input.createdAt.getTime() + FIRST_RESPONSE_MINUTES[priority] * 60_000);
  const minutesRemaining = Math.ceil((dueAt.getTime() - now.getTime()) / 60_000);

  return {
    dueAt: dueAt.toISOString(),
    minutesRemaining,
    status: getSlaStatus(minutesRemaining, DUE_SOON_MINUTES[priority])
  };
}

function getSlaStatus(minutesRemaining: number, dueSoonThresholdMinutes: number): SlaStatus {
  if (minutesRemaining < 0) {
    return "OVERDUE";
  }

  if (minutesRemaining <= dueSoonThresholdMinutes) {
    return "DUE_SOON";
  }

  return "ON_TRACK";
}
