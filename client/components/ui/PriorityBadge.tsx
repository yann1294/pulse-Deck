import type { ComponentProps } from "react";
import type { TicketPriority } from "@pulsedesk/shared";
import { Badge } from "./Badge";

const priorityLabels: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent"
};

const priorityTones: Record<TicketPriority, ComponentProps<typeof Badge>["tone"]> = {
  low: "neutral",
  medium: "teal",
  high: "amber",
  urgent: "rose"
};

interface PriorityBadgeProps {
  priority: TicketPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return <Badge tone={priorityTones[priority]}>{priorityLabels[priority]}</Badge>;
}
