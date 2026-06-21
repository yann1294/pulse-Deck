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
  SlaBadge,
  StatusBadge,
  Textarea
} from "@/components/ui";
import {
  approveAiSuggestion,
  createInternalNote,
  createTicketMessage,
  generateAiSuggestion,
  getTicket,
  getTicketMessages,
  updateTicketStatus,
  type TicketMessageDTO
} from "@/lib/api";
import { routes } from "@/lib/routes";
import { useTicketRealtime } from "@/lib/socket";
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
  const [replyBody, setReplyBody] = useState("");
  const [internalNoteBody, setInternalNoteBody] = useState("");
  const realtime = useTicketRealtime(ticketId);
  const ticketQuery = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => getTicket(ticketId),
    refetchInterval: realtime.pollingFallbackInterval
  });
  const messagesQuery = useQuery({
    queryKey: ["ticket", ticketId, "messages"],
    queryFn: () => getTicketMessages(ticketId),
    refetchInterval: realtime.pollingFallbackInterval,
    enabled: Boolean(ticketQuery.data?.ticket)
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
  const replyMutation = useMutation({
    mutationFn: () => createTicketMessage(ticketId, replyBody.trim()),
    onSuccess: async () => {
      setReplyBody("");
      setActionMessage("Reply added to the conversation.");
      await queryClient.invalidateQueries({ queryKey: ["ticket", ticketId, "messages"] });
    }
  });
  const internalNoteMutation = useMutation({
    mutationFn: () => createInternalNote(ticketId, internalNoteBody.trim()),
    onSuccess: async () => {
      setInternalNoteBody("");
      setActionMessage("Internal note added.");
      await queryClient.invalidateQueries({ queryKey: ["ticket", ticketId, "messages"] });
    }
  });
  const approveSuggestionMutation = useMutation({
    mutationFn: ({ finalReply, suggestionId }: { finalReply: string; suggestionId: string }) =>
      approveAiSuggestion(ticketId, suggestionId, finalReply.trim()),
    onSuccess: async (result) => {
      setActionMessage(
        result.suggestion.editedBeforeApproval
          ? "Edited AI reply approved and added to the conversation."
          : "AI draft approved and added to the conversation."
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] }),
        queryClient.invalidateQueries({ queryKey: ["ticket", ticketId, "messages"] }),
        queryClient.invalidateQueries({ queryKey: ["tickets"] }),
        queryClient.invalidateQueries({ queryKey: ["ai-suggestions"] })
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
    <DashboardShell activeHref={routes.tickets()} title="Ticket detail">
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
            <ButtonLink href={routes.dashboard()} variant="secondary">
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
                <LiveUpdatesIndicator isLive={realtime.isLive} />
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

          {realtime.notice ? <RealtimeNotice notice={realtime.notice} /> : null}

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
              actionLabel="Retry"
              error={generateMutation.error}
              onAction={() => generateMutation.mutate()}
              title="AI suggestion failed"
            />
          ) : null}

          {resolveMutation.isError ? (
            <ErrorState
              className="mt-6"
              actionLabel="Retry"
              error={resolveMutation.error}
              onAction={() => resolveMutation.mutate()}
              title="Could not update ticket"
            />
          ) : null}

          {replyMutation.isError ? (
            <ErrorState
              className="mt-6"
              actionLabel="Retry"
              error={replyMutation.error}
              onAction={() => replyMutation.mutate()}
              title="Could not send reply"
            />
          ) : null}

          {internalNoteMutation.isError ? (
            <ErrorState
              className="mt-6"
              actionLabel="Retry"
              error={internalNoteMutation.error}
              onAction={() => internalNoteMutation.mutate()}
              title="Could not add internal note"
            />
          ) : null}

          {approveSuggestionMutation.isError ? (
            <ErrorState
              className="mt-6"
              error={approveSuggestionMutation.error}
              title="Could not approve AI reply"
            />
          ) : null}

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
            <div className="space-y-6">
              <TicketContextPanel
                customer={detail.customer}
                history={detail.customerHistory}
                ticket={ticket}
              />
              <ConversationPanel
                internalNoteBody={internalNoteBody}
                internalNotePending={internalNoteMutation.isPending}
                messages={messagesQuery.data ?? []}
                onAddInternalNote={() => {
                  if (internalNoteBody.trim()) {
                    internalNoteMutation.mutate();
                  }
                }}
                onRefetchMessages={() => void messagesQuery.refetch()}
                onReplyBodyChange={setReplyBody}
                onInternalNoteBodyChange={setInternalNoteBody}
                onSendReply={() => {
                  if (replyBody.trim()) {
                    replyMutation.mutate();
                  }
                }}
                replyBody={replyBody}
                replyPending={replyMutation.isPending}
                state={
                  messagesQuery.isLoading || messagesQuery.isPending
                    ? "loading"
                    : messagesQuery.isError
                      ? "error"
                      : "ready"
                }
              />
            </div>
            <AiSuggestionPanel
              isApproving={approveSuggestionMutation.isPending}
              key={latestSuggestion?.id ?? "empty-ai-suggestion"}
              onApprove={(suggestionId, finalReply) => {
                approveSuggestionMutation.mutate({ suggestionId, finalReply });
              }}
              suggestion={latestSuggestion}
            />
          </div>
        </>
      )}
    </DashboardShell>
  );
}

function LiveUpdatesIndicator({ isLive }: { isLive: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-zinc-950 px-2.5 py-1 text-xs font-semibold leading-5 text-emerald-100">
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 rounded-full",
          isLive ? "bg-emerald-400" : "bg-amber-400"
        )}
      />
      {isLive ? "Live updates enabled" : "Polling fallback active"}
    </span>
  );
}

function RealtimeNotice({
  notice
}: {
  notice: { message: string; tone: "emerald" | "teal" | "amber" };
}) {
  const toneClasses = {
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    teal: "border-teal-400/20 bg-teal-400/10 text-teal-100",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-100"
  };

  return (
    <div
      aria-live="polite"
      className={cn("mt-6 rounded-2xl border px-4 py-3 text-sm leading-6", toneClasses[notice.tone])}
      role="status"
    >
      {notice.message}
    </div>
  );
}

function TicketContextPanel({
  ticket,
  customer,
  history
}: {
  ticket: NonNullable<Awaited<ReturnType<typeof getTicket>>["ticket"]>;
  customer: Awaited<ReturnType<typeof getTicket>>["customer"];
  history: Awaited<ReturnType<typeof getTicket>>["customerHistory"];
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Conversation context</h2>
          <p className="mt-1 text-sm text-zinc-400">
            {customer.name} - {customer.companyName ?? "No company provided"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <Badge tone="neutral">{formatCategory(ticket.category)}</Badge>
          <SlaBadge sla={ticket.sla} />
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <p className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-200">{ticket.description}</p>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-3 text-sm">
          <InfoRow label="Customer" value={customer.name} />
          <InfoRow label="Email" value={customer.email} />
          <InfoRow label="Created" value={formatDate(ticket.createdAt)} />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">SLA</p>
            <div className="mt-2">
              <SlaBadge showDueAt sla={ticket.sla} />
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Previous tickets</h3>
          <div className="mt-3 space-y-3">
            {history.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm leading-6 text-zinc-400">
                No previous tickets for this customer.
              </div>
            ) : (
              history.map((historyTicket) => (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4" key={historyTicket.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="line-clamp-2 break-words text-sm font-semibold text-zinc-100">
                        {historyTicket.subject}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">{formatDate(historyTicket.createdAt)}</p>
                    </div>
                    <StatusBadge status={historyTicket.status} />
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

function ConversationPanel({
  messages,
  state,
  replyBody,
  internalNoteBody,
  replyPending,
  internalNotePending,
  onReplyBodyChange,
  onInternalNoteBodyChange,
  onSendReply,
  onAddInternalNote,
  onRefetchMessages
}: {
  messages: TicketMessageDTO[];
  state: "loading" | "error" | "ready";
  replyBody: string;
  internalNoteBody: string;
  replyPending: boolean;
  internalNotePending: boolean;
  onReplyBodyChange: (value: string) => void;
  onInternalNoteBodyChange: (value: string) => void;
  onSendReply: () => void;
  onAddInternalNote: () => void;
  onRefetchMessages: () => void;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Conversation</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Customer-visible replies and internal notes stay together in chronological order.
          </p>
        </div>
        <Badge tone="teal">{messages.length} messages</Badge>
      </div>

      <div className="mt-6">
        {state === "loading" ? (
          <LoadingSkeleton label="Loading conversation" rows={5} />
        ) : state === "error" ? (
          <ErrorState
            actionLabel="Retry"
            onAction={onRefetchMessages}
            title="Could not load conversation"
            message="Ticket messages could not be loaded. Please retry in a moment."
          />
        ) : messages.length === 0 ? (
          <EmptyState
            description="Replies and internal notes will appear here once the team starts the conversation."
            title="No conversation messages yet"
          />
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ConversationMessage key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ComposerCard
          buttonLabel={replyPending ? "Sending..." : "Send reply"}
          disabled={replyPending || !replyBody.trim()}
          label="Reply"
          onChange={onReplyBodyChange}
          onSubmit={onSendReply}
          placeholder="Write a customer-visible reply..."
          tone="reply"
          value={replyBody}
        />
        <ComposerCard
          buttonLabel={internalNotePending ? "Saving..." : "Add internal note"}
          disabled={internalNotePending || !internalNoteBody.trim()}
          label="Internal note"
          onChange={onInternalNoteBodyChange}
          onSubmit={onAddInternalNote}
          placeholder="Add private context for the support team..."
          tone="note"
          value={internalNoteBody}
        />
      </div>
    </Card>
  );
}

function ConversationMessage({ message }: { message: TicketMessageDTO }) {
  const meta = getMessageMeta(message);

  return (
    <article className={cn("rounded-2xl border p-4", meta.containerClass)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit shrink-0 whitespace-nowrap" tone={meta.badgeTone}>
              {meta.label}
            </Badge>
            {message.isInternal ? <Badge tone="amber">Internal note</Badge> : null}
          </div>
          <p className="mt-2 text-sm font-semibold text-zinc-100">
            {message.authorName ?? meta.fallbackAuthor}
          </p>
          {message.authorEmail ? (
            <p className="mt-1 break-all text-xs text-zinc-500">{message.authorEmail}</p>
          ) : null}
        </div>
        <time className="shrink-0 text-xs text-zinc-500" dateTime={message.createdAt}>
          {formatDate(message.createdAt)}
        </time>
      </div>
      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-200">{message.body}</p>
    </article>
  );
}

function ComposerCard({
  label,
  value,
  placeholder,
  buttonLabel,
  disabled,
  tone,
  onChange,
  onSubmit
}: {
  label: string;
  value: string;
  placeholder: string;
  buttonLabel: string;
  disabled: boolean;
  tone: "reply" | "note";
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "note"
          ? "border-amber-400/20 bg-amber-400/10"
          : "border-zinc-800 bg-zinc-950/70"
      )}
    >
      <label className="block">
        <span className={cn("text-sm font-semibold", tone === "note" ? "text-amber-100" : "text-zinc-100")}>
          {label}
        </span>
        <Textarea
          className="mt-3 min-h-28"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      </label>
      <div className="mt-3 flex justify-end">
        <Button disabled={disabled} onClick={onSubmit} type="button" variant={tone === "note" ? "secondary" : "primary"}>
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}

function getMessageMeta(message: TicketMessageDTO): {
  label: string;
  fallbackAuthor: string;
  badgeTone: "neutral" | "emerald" | "teal" | "amber" | "rose";
  containerClass: string;
} {
  if (message.isInternal) {
    return {
      label: "Internal",
      fallbackAuthor: "Support team",
      badgeTone: "amber",
      containerClass: "border-amber-400/20 bg-amber-400/10"
    };
  }

  switch (message.authorType) {
    case "customer":
      return {
        label: "Customer",
        fallbackAuthor: "Customer",
        badgeTone: "neutral",
        containerClass: "border-zinc-800 bg-zinc-950/80"
      };
    case "admin":
      return {
        label: "Admin",
        fallbackAuthor: "Support admin",
        badgeTone: "teal",
        containerClass: "border-teal-400/20 bg-teal-400/10"
      };
    case "ai":
      return {
        label: "AI",
        fallbackAuthor: "PulseDesk AI",
        badgeTone: "emerald",
        containerClass: "border-emerald-400/20 bg-emerald-400/10"
      };
    case "system":
      return {
        label: "System",
        fallbackAuthor: "PulseDesk",
        badgeTone: "teal",
        containerClass: "border-teal-400/20 bg-zinc-950/80"
      };
  }
}

function AiSuggestionPanel({
  suggestion,
  isApproving,
  onApprove,
}: {
  suggestion?: AiSuggestionDTO;
  isApproving: boolean;
  onApprove: (suggestionId: string, finalReply: string) => void;
}) {
  const context = getRetrievedContext(suggestion);
  const snippets = getRetrievedSnippets(suggestion, context);
  const summary = suggestion?.summary ?? context?.reply?.summary;
  const limitations = getLimitations(suggestion, context, snippets);
  const safetyTone = getSuggestionSafetyTone(suggestion, limitations.needsManualVerification);
  const confidence = getConfidenceDisplay(suggestion?.confidenceScore);
  const reviewRequired = context?.reply?.humanReviewRequired !== false;
  const aiDraft = getSuggestionDraft(suggestion);
  const savedApprovedReply = suggestion?.finalApprovedReply?.trim() ?? "";
  const [finalReply, setFinalReply] = useState(savedApprovedReply || aiDraft);
  const finalReplyTrimmed = finalReply.trim();
  const aiDraftTrimmed = aiDraft.trim();
  const isEditedDraft = Boolean(suggestion && finalReplyTrimmed && aiDraftTrimmed && finalReplyTrimmed !== aiDraftTrimmed);
  const isAlreadyApprovedCurrentReply = Boolean(savedApprovedReply && finalReplyTrimmed === savedApprovedReply);
  const canApprove = Boolean(
    suggestion &&
      suggestion.status !== "failed" &&
      aiDraftTrimmed &&
      finalReplyTrimmed &&
      !isAlreadyApprovedCurrentReply
  );

  return (
    <aside className="space-y-4">
      <Card
        className={cn(
          "p-5 shadow-glow",
          safetyTone === "rose"
            ? "border-rose-400/25 bg-gradient-to-br from-rose-400/10 to-zinc-950"
            : safetyTone === "amber"
              ? "border-amber-400/25 bg-gradient-to-br from-amber-400/10 to-zinc-950"
              : "border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 to-zinc-950"
        )}
      >
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <SafetyTag tone={suggestion?.status === "failed" ? "rose" : suggestion ? "emerald" : "amber"}>
                {suggestion ? formatAiStatus(suggestion.status) : "Needs review"}
              </SafetyTag>
              {limitations.needsManualVerification ? (
                <SafetyTag tone={suggestion?.status === "failed" ? "rose" : "amber"}>
                  Needs manual verification
                </SafetyTag>
              ) : (
                <SafetyTag tone="teal">Grounded draft</SafetyTag>
              )}
              {suggestion?.finalApprovedReply ? (
                suggestion.editedBeforeApproval ? (
                  <SafetyTag tone="amber">Edited before approval</SafetyTag>
                ) : (
                  <SafetyTag tone="emerald">Approved AI draft</SafetyTag>
                )
              ) : isEditedDraft ? (
                <SafetyTag tone="amber">Edited before approval</SafetyTag>
              ) : null}
            </div>
            <h2 className="mt-4 text-xl font-semibold text-white">AI assistant</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              AI-generated draft. Human review is required before any customer response.
            </p>
          </div>
          <Badge className="w-fit shrink-0 whitespace-nowrap" tone={reviewRequired ? "amber" : "rose"}>
            Human review required
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <SafetyMetric
            helper={confidence.helper}
            label="Confidence score"
            tone={confidence.tone}
            value={confidence.value}
          />
          <SafetyMetric
            helper={snippets.length > 0 ? "Retrieved knowledge available" : "No grounded context found"}
            label="Knowledge context"
            tone={snippets.length > 0 ? "teal" : "amber"}
            value={snippets.length > 0 ? `${snippets.length} snippets` : "Manual check"}
          />
          <SafetyMetric
            helper="Automatic customer sending is disabled"
            label="Review gate"
            tone="amber"
            value="Required"
          />
        </div>

        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-start 2xl:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-amber-100">Human review required</h3>
              <p className="mt-1 text-sm leading-6 text-amber-100/85">
                Approving adds the reply to the ticket conversation. It does not send an email in this demo.
              </p>
            </div>
            <Badge className="w-fit shrink-0 whitespace-nowrap" tone="amber">
              Email disabled
            </Badge>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <PanelBlock title="Summary">
            <p className="text-sm leading-6 text-zinc-300">
              {summary ?? "No AI summary generated yet."}
            </p>
          </PanelBlock>

          <PanelBlock title="Reply approval">
            <label className="block">
              <span className="text-sm font-medium text-zinc-300">Final reply</span>
              <Textarea
                className="mt-3 min-h-64"
                disabled={!suggestion || suggestion.status === "failed"}
                onChange={(event) => setFinalReply(event.target.value)}
                placeholder="Generate an AI suggestion to draft a reply."
                value={finalReply}
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                disabled={!aiDraftTrimmed || isApproving}
                onClick={() => setFinalReply(aiDraft)}
                size="sm"
                type="button"
                variant="secondary"
              >
                Reset to AI draft
              </Button>
              <Button
                disabled={!canApprove || isEditedDraft || isApproving}
                onClick={() => {
                  if (suggestion) {
                    onApprove(suggestion.id, finalReply);
                  }
                }}
                size="sm"
                type="button"
              >
                {isApproving ? "Approving..." : "Approve reply"}
              </Button>
              <Button
                disabled={!canApprove || !isEditedDraft || isApproving}
                onClick={() => {
                  if (suggestion) {
                    onApprove(suggestion.id, finalReply);
                  }
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                {isApproving ? "Saving..." : "Save as edited approval"}
              </Button>
            </div>
            {isAlreadyApprovedCurrentReply ? (
              <p className="mt-3 text-xs leading-5 text-emerald-100">
                This approved reply is already saved in the conversation.
              </p>
            ) : null}
          </PanelBlock>

          <PanelBlock title="Limitations">
            <ul className="space-y-2">
              {limitations.notes.map((note) => (
                <li
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm leading-6",
                    limitations.needsManualVerification
                      ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-300"
                  )}
                  key={note}
                >
                  {note}
                </li>
              ))}
            </ul>
          </PanelBlock>
        </div>

        <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm leading-6 text-zinc-400">
          Review and approve the final reply here. Customer email sending remains intentionally unavailable in this MVP.
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-white">Retrieved knowledge</h3>
          <Badge className="w-fit shrink-0 whitespace-nowrap" tone={snippets.length > 0 ? "teal" : "amber"}>
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

function SafetyTag({
  children,
  tone
}: {
  children: React.ReactNode;
  tone: "emerald" | "teal" | "amber" | "rose" | "neutral";
}) {
  return (
    <Badge className="w-fit max-w-none shrink-0 justify-center whitespace-nowrap px-3" tone={tone}>
      <span className="leading-none">{children}</span>
    </Badge>
  );
}

function SafetyMetric({
  label,
  value,
  helper,
  tone
}: {
  label: string;
  value: string;
  helper: string;
  tone: "emerald" | "teal" | "amber" | "rose" | "neutral";
}) {
  const toneClasses = {
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    teal: "border-teal-400/20 bg-teal-400/10 text-teal-100",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    rose: "border-rose-400/20 bg-rose-400/10 text-rose-100",
    neutral: "border-zinc-800 bg-zinc-950/80 text-zinc-200"
  };

  return (
    <div className={cn("rounded-2xl border p-3", toneClasses[tone])}>
      <p className="text-xs font-medium uppercase tracking-[0.16em] opacity-75">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-xs leading-5 opacity-75">{helper}</p>
    </div>
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
      <p className="mt-1 break-all text-zinc-200">{value}</p>
    </div>
  );
}

function getLatestSuggestion(
  suggestions: AiSuggestionDTO[],
  generatedSuggestion?: AiSuggestionDTO
): AiSuggestionDTO | undefined {
  return generatedSuggestion ?? suggestions[0];
}

function getSuggestionDraft(suggestion: AiSuggestionDTO | undefined): string {
  return suggestion?.originalSuggestedReply ?? suggestion?.suggestedReply ?? "";
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
): { notes: string[]; needsManualVerification: boolean } {
  const baseNotes = ["AI output can be incomplete or incorrect and must be checked by a support admin."];

  if (!suggestion) {
    return {
      notes: [
        "No AI draft has been generated yet.",
        "Review the ticket manually until classification, priority, and reply context are available."
      ],
      needsManualVerification: true
    };
  }

  if (suggestion.status === "failed") {
    return {
      notes: [
        suggestion.errorMessage ?? context?.failure ?? "AI generation failed.",
        "Use manual triage or retry generation after checking provider and knowledge-base status."
      ],
      needsManualVerification: true
    };
  }

  if (context?.reply?.contextSufficient === false) {
    return {
      notes: [
        context.reply.insufficientContextReason ?? "Available context is insufficient.",
        "Do not rely on this draft without verifying missing details against source documentation or the customer."
      ],
      needsManualVerification: true
    };
  }

  if (snippets.length === 0) {
    return {
      notes: [
        "No knowledge-base context was retrieved for this suggestion.",
        "Verify policy, product behavior, and next steps manually before using the draft."
      ],
      needsManualVerification: true
    };
  }

  return {
    notes: [
      context?.reply?.internalNotes ?? "Grounded in retrieved knowledge snippets.",
      ...baseNotes,
      "Confirm citations and customer-specific facts before responding."
    ],
    needsManualVerification: false
  };
}

function getSuggestionSafetyTone(
  suggestion: AiSuggestionDTO | undefined,
  needsManualVerification: boolean
): "emerald" | "amber" | "rose" {
  if (suggestion?.status === "failed") {
    return "rose";
  }

  if (!suggestion || needsManualVerification) {
    return "amber";
  }

  return "emerald";
}

function getConfidenceDisplay(score: number | undefined): {
  value: string;
  helper: string;
  tone: "emerald" | "teal" | "amber" | "rose" | "neutral";
} {
  if (score === undefined) {
    return {
      value: "Not available",
      helper: "Manual review required",
      tone: "neutral"
    };
  }

  const percent = Math.round(score * 100);

  if (score < 0.5) {
    return {
      value: `${percent}%`,
      helper: "Low confidence",
      tone: "rose"
    };
  }

  if (score < 0.75) {
    return {
      value: `${percent}%`,
      helper: "Review carefully",
      tone: "amber"
    };
  }

  return {
    value: `${percent}%`,
    helper: "Still requires review",
    tone: "emerald"
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
