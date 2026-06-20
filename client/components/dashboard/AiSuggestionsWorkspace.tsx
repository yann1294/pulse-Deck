"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { AiSuggestionStatus, TicketDTO } from "@pulsedesk/shared";
import { DashboardShell, PageHeader } from "@/components/layout";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PriorityBadge,
  StatusBadge
} from "@/components/ui";
import { listTickets } from "@/lib/api";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function AiSuggestionsWorkspace() {
  const router = useRouter();
  const ticketsQuery = useQuery({
    queryKey: ["tickets", "ai-suggestions"],
    queryFn: () => listTickets({ page: 1, limit: 100 })
  });
  const tickets = ticketsQuery.data?.data ?? [];
  const suggestionTickets = tickets.filter((ticket) => getAiStatus(ticket) !== "pending");

  return (
    <DashboardShell activeHref={routes.aiSuggestions()} title="AI suggestions">
      <PageHeader
        actions={<Badge tone="emerald">Human review required</Badge>}
        description="Review AI-generated ticket suggestions, confidence state, and failed AI jobs from one queue."
        eyebrow="AI workspace"
        title="AI suggestions"
      />

      <section className="mt-8">
        {ticketsQuery.isLoading ? (
          <LoadingSkeleton label="Loading AI suggestions" rows={6} />
        ) : ticketsQuery.isError ? (
          <ErrorState
            actionLabel="Retry"
            error={ticketsQuery.error}
            onAction={() => void ticketsQuery.refetch()}
            title="Could not load AI suggestions"
          />
        ) : suggestionTickets.length === 0 ? (
          <EmptyState
            action={
              <Button onClick={() => router.push(routes.tickets())} type="button" variant="secondary">
                View tickets
              </Button>
            }
            description="AI suggestions will appear here after tickets are classified, prioritized, or drafted."
            title="No AI suggestions yet"
          />
        ) : (
          <div className="grid gap-3">
            {suggestionTickets.map((ticket) => (
              <button
                className="focus-ring rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-left shadow-panel transition hover:border-zinc-700 hover:bg-zinc-900/80"
                key={ticket.id}
                onClick={() => router.push(routes.ticketDetail(ticket.id))}
                type="button"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 break-words text-sm font-semibold text-zinc-100">{ticket.subject}</h2>
                    <p className="mt-1 break-words text-xs text-zinc-400">
                      {ticket.customer?.name ?? "Unknown customer"} - {formatDate(ticket.updatedAt)}
                    </p>
                    {ticket.latestAiSuggestion?.suggestedReply ? (
                      <p className="mt-3 line-clamp-2 break-words text-sm leading-6 text-zinc-400">
                        {ticket.latestAiSuggestion.suggestedReply}
                      </p>
                    ) : null}
                  </div>
                  <AiStatusBadge status={getAiStatus(ticket)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                  {typeof ticket.latestAiSuggestion?.confidenceScore === "number" ? (
                    <Badge tone="teal">{Math.round(ticket.latestAiSuggestion.confidenceScore * 100)}% confidence</Badge>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}

function AiStatusBadge({ status }: { status: AiSuggestionStatus }) {
  const config: Record<AiSuggestionStatus, { label: string; tone: "emerald" | "teal" | "amber" | "rose" | "neutral"; dot: string }> = {
    pending: { label: "Pending", tone: "neutral", dot: "bg-zinc-400" },
    generated: { label: "Ready", tone: "emerald", dot: "bg-emerald-400" },
    approved: { label: "Approved", tone: "teal", dot: "bg-teal-400" },
    edited: { label: "Edited", tone: "amber", dot: "bg-amber-400" },
    failed: { label: "Failed", tone: "rose", dot: "bg-rose-400" }
  };
  const current = config[status];

  return (
    <Badge className="shrink-0 justify-center gap-2 self-start whitespace-nowrap px-3" tone={current.tone}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", current.dot)} />
      <span className="leading-none">{current.label}</span>
    </Badge>
  );
}

function getAiStatus(ticket: TicketDTO): AiSuggestionStatus {
  if (ticket.latestAiSuggestion?.status) {
    return ticket.latestAiSuggestion.status;
  }

  if (ticket.aiStatus) {
    return ticket.aiStatus.toLowerCase() as AiSuggestionStatus;
  }

  return "pending";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
