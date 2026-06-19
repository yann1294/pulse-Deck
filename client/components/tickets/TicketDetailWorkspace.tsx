"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AiSuggestionDTO, TicketCategory } from "@pulsedesk/shared";
import { DashboardShell, PageHeader } from "@/components/layout";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PriorityBadge,
  StatusBadge
} from "@/components/ui";
import { generateAiSuggestion, getTicket, updateTicketStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

interface TicketDetailWorkspaceProps {
  ticketId: string;
}

interface RetrievedSnippet {
  id: string;
  title: string;
  content: string;
  score?: number;
  sourceName?: string;
}

interface RetrievedContext {
  snippets?: RetrievedSnippet[];
  reply?: {
    summary?: string;
    contextSufficient?: boolean;
    insufficientContextReason?: string | null;
    internalNotes?: string;
    humanReviewRequired?: boolean;
  };
  failure?: string;
}

export function TicketDetailWorkspace({ ticketId }: TicketDetailWorkspaceProps) {
  const queryClient = useQueryClient();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const ticketQuery = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => getTicket(ticketId)
  });
  const generateMutation = useMutation({
    mutationFn: () => generateAiSuggestion(ticketId),
    onSuccess: async () => {
      setActionMessage("AI suggestion generated. Review before sending.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] }),
        queryClient.invalidateQueries({ queryKey: ["tickets"] })
      ]);
    }
  });
  const resolveMutation = useMutation({
    mutationFn: () => updateTicketStatus(ticketId, "resolved"),
    onSuccess: async () => {
      setActionMessage("Ticket marked resolved.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] }),
        queryClient.invalidateQueries({ queryKey: ["tickets"] })
      ]);
    }
  });
  const detail = ticketQuery.data;
  const ticket = detail?.ticket;
  const latestSuggestion = useMemo(
    () => getLatestSuggestion(detail?.aiSuggestions ?? [], generateMutation.data?.suggestion),
    [detail?.aiSuggestions, generateMutation.data?.suggestion]
  );

  return (
    <DashboardShell activeHref="/dashboard/tickets" title="Ticket detail">
      {ticketQuery.isLoading ? (
        <TicketDetailSkeleton />
      ) : ticketQuery.isError ? (
        <ErrorState
          actionLabel="Retry"
          error={ticketQuery.error}
          onAction={() => void ticketQuery.refetch()}
          title="Could not load ticket"
        />
      ) : !detail || !ticket ? (
        <EmptyState
          action={
            <ButtonLink href="/dashboard" variant="secondary">
              Back to dashboard
            </ButtonLink>
          }
          description="The selected ticket could not be found or is no longer available."
          title="Ticket not found"
        />
      ) : (
        <>
          <PageHeader
            actions={
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                <Button
                  aria-busy={generateMutation.isPending}
                  className="w-full sm:w-auto"
                  disabled={generateMutation.isPending}
                  onClick={() => generateMutation.mutate()}
                  type="button"
                >
                  {generateMutation.isPending ? "Generating..." : "Generate AI suggestion"}
                </Button>
                <Button
                  aria-busy={resolveMutation.isPending}
                  className="w-full sm:w-auto"
                  disabled={resolveMutation.isPending || ticket.status === "resolved"}
                  onClick={() => resolveMutation.mutate()}
                  type="button"
                  variant="secondary"
                >
                  {resolveMutation.isPending ? "Resolving..." : "Mark resolved"}
                </Button>
              </div>
            }
            description="Review ticket context, customer history, and AI-generated draft before responding."
            eyebrow="Support workspace"
            title={ticket.subject}
          />

          {actionMessage ? (
            <div
              aria-live="polite"
              className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-100"
              role="status"
            >
              {actionMessage}
            </div>
          ) : null}

          {generateMutation.isError ? (
            <ErrorState
              className="mt-6"
              error={generateMutation.error}
              title="AI suggestion failed"
            />
          ) : null}

          {resolveMutation.isError ? (
            <ErrorState
              className="mt-6"
              error={resolveMutation.error}
              title="Could not update ticket"
            />
          ) : null}

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
            <div className="space-y-6">
              <TicketOverview ticket={ticket} />
              <CustomerPanel
                customer={detail.customer}
                history={detail.customerHistory}
              />
            </div>
            <AiSuggestionPanel
              onApprove={() => setActionMessage("Approval workflow placeholder. Sending remains human-controlled.")}
              onEdit={() => setActionMessage("Edit suggestion placeholder. Rich editor comes next.")}
              suggestion={latestSuggestion}
            />
          </div>
        </>
      )}
    </DashboardShell>
  );
}

function TicketOverview({ ticket }: { ticket: NonNullable<Awaited<ReturnType<typeof getTicket>>["ticket"]> }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Ticket details</h2>
          <p className="mt-1 text-sm text-zinc-400">Created {formatDate(ticket.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <Badge tone="neutral">{formatCategory(ticket.category)}</Badge>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <p className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-200">{ticket.description}</p>
      </div>
    </Card>
  );
}

function CustomerPanel({
  customer,
  history
}: {
  customer: Awaited<ReturnType<typeof getTicket>>["customer"];
  history: Awaited<ReturnType<typeof getTicket>>["customerHistory"];
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="text-lg font-semibold text-white">Customer</h2>
          <div className="mt-4 space-y-3 text-sm">
            <InfoRow label="Name" value={customer.name} />
            <InfoRow label="Email" value={customer.email} />
            <InfoRow label="Company" value={customer.companyName ?? "Not provided"} />
            <InfoRow label="Total tickets" value={String(customer.ticketCount)} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Previous tickets</h3>
          <div className="mt-3 space-y-3">
            {history.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm leading-6 text-zinc-400">
                No previous tickets for this customer. Use the current ticket details and AI panel to continue triage.
              </div>
            ) : (
              history.map((ticket) => (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4" key={ticket.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="line-clamp-2 break-words text-sm font-semibold text-zinc-100">{ticket.subject}</p>
                      <p className="mt-1 text-xs text-zinc-400">{formatDate(ticket.createdAt)}</p>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function AiSuggestionPanel({
  suggestion,
  onApprove,
  onEdit
}: {
  suggestion?: AiSuggestionDTO;
  onApprove: () => void;
  onEdit: () => void;
}) {
  const context = getRetrievedContext(suggestion);
  const snippets = getRetrievedSnippets(suggestion, context);
  const summary = suggestion?.summary ?? context?.reply?.summary;
  const limitations = getLimitations(suggestion, context, snippets);

  return (
    <aside className="space-y-4">
      <Card className="border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 to-zinc-950 p-5 shadow-glow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Badge tone={suggestion?.status === "failed" ? "rose" : suggestion ? "emerald" : "amber"}>
              {suggestion ? formatAiStatus(suggestion.status) : "Needs review"}
            </Badge>
            <h2 className="mt-4 text-xl font-semibold text-white">AI assistant</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              AI-generated draft. Review before sending.
            </p>
          </div>
          {suggestion?.confidenceScore !== undefined ? (
            <div className="self-start rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-left sm:text-right">
              <p className="text-xs text-zinc-400">Confidence</p>
              <p className="text-lg font-semibold text-emerald-200">
                {Math.round(suggestion.confidenceScore * 100)}%
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 space-y-4">
          <PanelBlock title="Summary">
            <p className="text-sm leading-6 text-zinc-300">
              {summary ?? "No AI summary generated yet."}
            </p>
          </PanelBlock>

          <PanelBlock title="Suggested reply">
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-200">
              {suggestion?.suggestedReply ?? "Generate an AI suggestion to draft a reply."}
            </p>
          </PanelBlock>

          <PanelBlock title="Limitations">
            <p className={cn("text-sm leading-6", limitations.needsManualVerification ? "text-amber-200" : "text-zinc-300")}>
              {limitations.text}
            </p>
          </PanelBlock>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <Button disabled={!suggestion || suggestion.status === "failed"} onClick={onApprove} type="button">
            Approve suggestion
          </Button>
          <Button disabled={!suggestion} onClick={onEdit} type="button" variant="secondary">
            Edit suggestion
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-white">Retrieved knowledge</h3>
          <Badge tone={snippets.length > 0 ? "teal" : "amber"}>
            {snippets.length > 0 ? `${snippets.length} snippets` : "Needs manual verification"}
          </Badge>
        </div>
        <div className="mt-4 space-y-3">
          {snippets.length === 0 ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
              No knowledge snippets were retrieved. Review the ticket manually or upload relevant support documentation before relying on an AI draft.
            </div>
          ) : (
            snippets.map((snippet, index) => (
              <details
                className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
                key={`${snippet.id}-${index}`}
              >
                <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-100">
                  <span className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <span className="break-words">{snippet.title || `Snippet ${index + 1}`}</span>
                    {snippet.score !== undefined ? (
                      <span className="text-xs font-medium text-zinc-400">
                        {Math.round(snippet.score * 100)}%
                      </span>
                    ) : null}
                  </span>
                  {snippet.sourceName ? (
                    <span className="mt-1 block text-xs font-normal text-zinc-400">{snippet.sourceName}</span>
                  ) : null}
                </summary>
                <p className="mt-3 break-words text-sm leading-6 text-zinc-400">{snippet.content}</p>
              </details>
            ))
          )}
        </div>
      </Card>
    </aside>
  );
}

function TicketDetailSkeleton() {
  return (
    <div className="space-y-6">
      <LoadingSkeleton label="Loading ticket detail" rows={4} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <LoadingSkeleton label="Loading customer context" rows={5} />
        <LoadingSkeleton label="Loading AI panel" rows={6} />
      </div>
    </div>
  );
}

function PanelBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-1 break-words text-zinc-200">{value}</p>
    </div>
  );
}

function getLatestSuggestion(
  suggestions: AiSuggestionDTO[],
  generatedSuggestion?: AiSuggestionDTO
): AiSuggestionDTO | undefined {
  return generatedSuggestion ?? suggestions[0];
}

function getRetrievedContext(suggestion: AiSuggestionDTO | undefined): RetrievedContext | undefined {
  const context = suggestion?.retrievedContext;

  if (!context || typeof context !== "object" || Array.isArray(context)) {
    return undefined;
  }

  return context as RetrievedContext;
}

function getRetrievedSnippets(
  suggestion: AiSuggestionDTO | undefined,
  context: RetrievedContext | undefined
): RetrievedSnippet[] {
  if (Array.isArray(context?.snippets)) {
    return context.snippets.filter(isRetrievedSnippet);
  }

  if (Array.isArray(suggestion?.ragSnippets)) {
    return suggestion.ragSnippets.filter(isRetrievedSnippet);
  }

  return [];
}

function isRetrievedSnippet(value: unknown): value is RetrievedSnippet {
  return Boolean(
    value &&
      typeof value === "object" &&
      "content" in value &&
      typeof (value as { content?: unknown }).content === "string"
  );
}

function getLimitations(
  suggestion: AiSuggestionDTO | undefined,
  context: RetrievedContext | undefined,
  snippets: RetrievedSnippet[]
): { text: string; needsManualVerification: boolean } {
  if (!suggestion) {
    return {
      text: "No AI draft has been generated yet. Needs manual verification.",
      needsManualVerification: true
    };
  }

  if (suggestion.status === "failed") {
    return {
      text: suggestion.errorMessage ?? context?.failure ?? "AI generation failed. Needs manual verification.",
      needsManualVerification: true
    };
  }

  if (context?.reply?.contextSufficient === false) {
    return {
      text: context.reply.insufficientContextReason ?? "Available context is insufficient. Needs manual verification.",
      needsManualVerification: true
    };
  }

  if (snippets.length === 0) {
    return {
      text: "Needs manual verification.",
      needsManualVerification: true
    };
  }

  return {
    text: context?.reply?.internalNotes ?? "Grounded in retrieved knowledge snippets. Human review is still required.",
    needsManualVerification: false
  };
}

function formatAiStatus(status: AiSuggestionDTO["status"]): string {
  const labels: Record<AiSuggestionDTO["status"], string> = {
    pending: "Pending",
    generated: "AI ready",
    approved: "Approved",
    edited: "Edited",
    failed: "Failed"
  };

  return labels[status];
}

function formatCategory(category: TicketCategory): string {
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
