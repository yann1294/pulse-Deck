"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { AiSuggestionStatus, TicketCategory } from "@pulsedesk/shared";
import { DashboardShell, PageHeader } from "@/components/layout";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingSkeleton,
  PriorityBadge,
  Select
} from "@/components/ui";
import {
  listAiSuggestions,
  type AiSuggestionListItemDTO,
  type ListAiSuggestionsParams
} from "@/lib/api";
import { routes } from "@/lib/routes";
import { useTicketRealtime } from "@/lib/socket";
import { cn } from "@/lib/utils";

type FilterValue<T extends string> = T | "all";
type ConfidenceFilter = "all" | "0.5" | "0.7" | "0.85";

const statuses: Array<{ label: string; value: FilterValue<AiSuggestionStatus> }> = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Generated", value: "generated" },
  { label: "Approved", value: "approved" },
  { label: "Edited", value: "edited" },
  { label: "Failed", value: "failed" }
];

const confidenceThresholds: Array<{ label: string; value: ConfidenceFilter }> = [
  { label: "All confidence", value: "all" },
  { label: "50% and above", value: "0.5" },
  { label: "70% and above", value: "0.7" },
  { label: "85% and above", value: "0.85" }
];

export function AiSuggestionsWorkspace() {
  const router = useRouter();
  const realtime = useTicketRealtime();
  const [status, setStatus] = useState<FilterValue<AiSuggestionStatus>>("all");
  const [confidence, setConfidence] = useState<ConfidenceFilter>("all");
  const [search, setSearch] = useState("");
  const filters = useMemo<ListAiSuggestionsParams>(
    () => ({
      ...(status !== "all" ? { status } : {}),
      ...(confidence !== "all" ? { minConfidence: Number(confidence) } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
      page: 1,
      limit: 100
    }),
    [confidence, search, status]
  );
  const suggestionsQuery = useQuery({
    queryKey: ["ai-suggestions", filters],
    queryFn: () => listAiSuggestions(filters),
    refetchInterval: realtime.pollingFallbackInterval
  });
  const suggestions = suggestionsQuery.data?.data ?? [];
  const hasActiveFilters = status !== "all" || confidence !== "all" || Boolean(search.trim());

  function clearFilters() {
    setStatus("all");
    setConfidence("all");
    setSearch("");
  }

  return (
    <DashboardShell activeHref={routes.aiSuggestions()} title="AI suggestions">
      <PageHeader
        actions={
          <>
            <LiveUpdatesIndicator isLive={realtime.isLive} />
            <Badge tone="amber">Human review required</Badge>
          </>
        }
        description="Review AI suggestion status, confidence, and related ticket context before opening the full ticket workspace."
        eyebrow="AI workspace"
        title="AI suggestions"
      />

      {realtime.notice ? <RealtimeNotice notice={realtime.notice} /> : null}

      <Card className="mt-8 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
          <FilterSelect
            label="Status"
            onChange={(value) => setStatus(value as FilterValue<AiSuggestionStatus>)}
            options={statuses}
            value={status}
          />
          <FilterSelect
            label="Confidence"
            onChange={(value) => setConfidence(value as ConfidenceFilter)}
            options={confidenceThresholds}
            value={confidence}
          />
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
              Search
            </span>
            <Input
              className="mt-2"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ticket, customer, category..."
              value={search}
            />
          </label>
        </div>
        {hasActiveFilters ? (
          <div className="mt-4 flex justify-end">
            <Button onClick={clearFilters} type="button" variant="secondary">
              Clear filters
            </Button>
          </div>
        ) : null}
      </Card>

      <section className="mt-6">
        {suggestionsQuery.isLoading ? (
          <LoadingSkeleton label="Loading AI suggestions" rows={6} />
        ) : suggestionsQuery.isError ? (
          <ErrorState
            actionLabel="Retry"
            error={suggestionsQuery.error}
            onAction={() => void suggestionsQuery.refetch()}
            title="Could not load AI suggestions"
          />
        ) : suggestions.length === 0 ? (
          <EmptyState
            action={
              hasActiveFilters ? (
                <Button onClick={clearFilters} type="button" variant="secondary">
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => router.push(routes.tickets())} type="button" variant="secondary">
                  View tickets
                </Button>
              )
            }
            description={
              hasActiveFilters
                ? "Clear the active filters to return to the full AI suggestion queue."
                : "AI suggestions will appear here after tickets are processed."
            }
            title={hasActiveFilters ? "No suggestions match your filters." : "No AI suggestions yet."}
          />
        ) : (
          <SuggestionResults
            onOpenSuggestion={(ticketId) => router.push(routes.ticketDetail(ticketId))}
            suggestions={suggestions}
          />
        )}
      </section>
    </DashboardShell>
  );
}

interface FilterSelectProps<T extends string> {
  label: string;
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
}

function FilterSelect<T extends string>({ label, options, value, onChange }: FilterSelectProps<T>) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </span>
      <Select
        className="mt-2"
        onChange={(event) => onChange(event.target.value as T)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

function SuggestionResults({
  suggestions,
  onOpenSuggestion
}: {
  suggestions: AiSuggestionListItemDTO[];
  onOpenSuggestion: (ticketId: string) => void;
}) {
  return (
    <div className="grid gap-3">
      {suggestions.map((suggestion) => (
        <button
          aria-label={`Open ticket for AI suggestion: ${suggestion.ticketTitle}`}
          className="focus-ring min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-left shadow-panel transition hover:border-zinc-700 hover:bg-zinc-900/80"
          key={suggestion.id}
          onClick={() => onOpenSuggestion(suggestion.ticketId)}
          type="button"
        >
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <AiStatusBadge status={suggestion.status} />
                <ConfidenceBadge value={suggestion.confidenceScore} />
              </div>
              <h2 className="mt-3 line-clamp-2 break-words text-sm font-semibold text-zinc-100">
                {suggestion.ticketTitle}
              </h2>
              <p className="mt-1 break-words text-xs text-zinc-400">
                {suggestion.customerName ?? "Unknown customer"} - {formatDate(suggestion.createdAt)}
              </p>
              <p className="mt-1 break-all text-xs text-zinc-500">
                {suggestion.customerEmail ?? "No email available"}
              </p>
              {suggestion.suggestedReply ? (
                <p className="mt-3 line-clamp-2 break-words text-sm leading-6 text-zinc-400">
                  {suggestion.suggestedReply}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-64 lg:justify-end">
              {suggestion.priority ? <PriorityBadge priority={suggestion.priority} /> : null}
              {suggestion.category ? <CategoryBadge category={suggestion.category} /> : null}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function AiStatusBadge({ status }: { status: AiSuggestionStatus }) {
  const config: Record<AiSuggestionStatus, { label: string; tone: "emerald" | "teal" | "amber" | "rose" | "neutral"; dot: string }> = {
    pending: { label: "Pending", tone: "amber", dot: "bg-amber-400" },
    generated: { label: "Generated", tone: "emerald", dot: "bg-emerald-400" },
    approved: { label: "Approved", tone: "teal", dot: "bg-teal-400" },
    edited: { label: "Edited", tone: "amber", dot: "bg-amber-400" },
    failed: { label: "Failed", tone: "rose", dot: "bg-rose-400" }
  };
  const current = config[status];

  return (
    <Badge className="w-fit max-w-none shrink-0 justify-center gap-2 whitespace-nowrap px-3" tone={current.tone}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", current.dot)} />
      <span className="leading-none">{current.label}</span>
    </Badge>
  );
}

function ConfidenceBadge({ value }: { value?: number }) {
  if (typeof value !== "number") {
    return <Badge className="w-fit shrink-0 whitespace-nowrap" tone="amber">Confidence unavailable</Badge>;
  }

  const tone = value >= 0.7 ? "teal" : value >= 0.5 ? "amber" : "rose";

  return (
    <Badge className="w-fit shrink-0 whitespace-nowrap" tone={tone}>
      {Math.round(value * 100)}% confidence
    </Badge>
  );
}

function CategoryBadge({ category }: { category: TicketCategory }) {
  return (
    <Badge className="w-fit shrink-0 whitespace-nowrap" tone="neutral">
      {formatCategory(category)}
    </Badge>
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

function formatCategory(category: TicketCategory): string {
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
