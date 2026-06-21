import type { TicketSlaDTO } from "@pulsedesk/shared";
import { cn } from "@/lib/utils";

const statusConfig: Record<TicketSlaDTO["status"], { label: string; className: string }> = {
  ON_TRACK: {
    label: "On track",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
  },
  DUE_SOON: {
    label: "Due soon",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-200"
  },
  OVERDUE: {
    label: "Overdue",
    className: "border-rose-400/30 bg-rose-400/10 text-rose-200"
  }
};

interface SlaBadgeProps {
  className?: string;
  showDueAt?: boolean;
  sla?: TicketSlaDTO;
}

export function SlaBadge({ className, showDueAt = false, sla }: SlaBadgeProps) {
  if (!sla) {
    return (
      <span
        className={cn(
          "inline-flex max-w-full min-w-0 items-center rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-semibold leading-5 text-zinc-200",
          className
        )}
      >
        SLA unavailable
      </span>
    );
  }

  const config = statusConfig[sla.status];
  const relativeLabel = formatSlaRelativeTime(sla.minutesRemaining);

  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-5",
        config.className,
        className
      )}
    >
      <span>{config.label}</span>
      <span className="opacity-75">{relativeLabel}</span>
      {showDueAt ? <span className="opacity-75">Due {formatSlaDueAt(sla.dueAt)}</span> : null}
    </span>
  );
}

function formatSlaRelativeTime(minutesRemaining: number): string {
  const absoluteMinutes = Math.abs(minutesRemaining);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  const timeLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  if (minutesRemaining < 0) {
    return `${timeLabel} late`;
  }

  return `${timeLabel} left`;
}

function formatSlaDueAt(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
