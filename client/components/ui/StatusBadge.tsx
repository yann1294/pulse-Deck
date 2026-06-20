import type { ComponentProps } from "react";
import type { TicketStatus } from "@pulsedesk/shared";
import { Badge } from "./Badge";

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_customer: "Waiting customer",
  resolved: "Resolved"
};

const statusTones: Record<TicketStatus, ComponentProps<typeof Badge>["tone"]> = {
  open: "emerald",
  in_progress: "teal",
  waiting_customer: "amber",
  resolved: "neutral"
};

interface StatusBadgeProps {
  status: TicketStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge tone={statusTones[status]}>{statusLabels[status]}</Badge>;
}
