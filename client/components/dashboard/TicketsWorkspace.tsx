"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type {
  AiSuggestionStatus,
  TicketCategory,
  TicketDTO,
  TicketPriority,
  TicketStatus
} from "@pulsedesk/shared";
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
  Select,
  SlaBadge,
  StatusBadge
} from "@/components/ui";
import { listTickets, type ListTicketsParams } from "@/lib/api";
import { routes } from "@/lib/routes";
import { useTicketRealtime } from "@/lib/socket";
import { cn } from "@/lib/utils";

type FilterValue<T extends string> = T | "all";

const statuses: Array<{ label: string; value: FilterValue<TicketStatus> }> = [
  { label: "All statuses", value: "all" },
  { label: "Open", value: "open" },
  { label: "In progress", value: "in_progress" },
  { label: "Waiting customer", value: "waiting_customer" },
  { label: "Resolved", value: "resolved" }
];

const priorities: Array<{ label: string; value: FilterValue<TicketPriority> }> = [
  { label: "All priorities", value: "all" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" }
];

const categories: Array<{ label: string; value: FilterValue<TicketCategory> }> = [
  { label: "All categories", value: "all" },
  { label: "Billing", value: "billing" },
  { label: "Technical", value: "technical" },
  { label: "Account", value: "account" },
  { label: "Bug", value: "bug" },
  { label: "Feature request", value: "feature_request" },
  { label: "Other", value: "other" }
];

export function TicketsWorkspace() {
  const router = useRouter();
  const [status, setStatus] = useState<FilterValue<TicketStatus>>("all");
  const [priority, setPriority] = useState<FilterValue<TicketPriority>>("all");
  const [category, setCategory] = useState<FilterValue<TicketCategory>>("all");
  const [search, setSearch] = useState("");
  const realtime = useTicketRealtime();
  const filters = useMemo<ListTicketsParams>(
    () => ({
      ...(status !== "all" ? { status } : {}),
      ...(priority !== "all" ? { priority } : {}),
      ...(category !== "all" ? { category } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
      page: 1,
      limit: 25
    }),
    [category, priority, search, status]
  );
  const ticketsQuery = useQuery({
    queryKey: ["tickets", filters],
    queryFn: () => listTickets(filters),
    refetchInterval: realtime.pollingFallbackInterval
  });
  const tickets = ticketsQuery.data?.data ?? [];
  const hasActiveFilters = status !== "all" || priority !== "all" || category !== "all" || Boolean(search.trim());

  function clearFilters() {
    setStatus("all");
    setPriority("all");
    setCategory("all");
    setSearch("");
  }

  return (
    <DashboardShell activeHref={routes.tickets()} title="Tickets">
      <PageHeader
        actions={
          <>
            <LiveUpdatesIndicator isLive={realtime.isLive} />
            <Badge tone="emerald">Protected queue</Badge>
          </>
        }
        description="Filter, scan, and open customer support tickets without leaving the protected dashboard workspace."
        eyebrow="Ticket queue"
        title="Tickets"
      />

      {realtime.notice ? <RealtimeNotice notice={realtime.notice} /> : null}

      <Card className="mt-8 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            label="Status"
            onChange={(value) => setStatus(value as FilterValue<TicketStatus>)}
            options={statuses}
            value={status}
          />
          <FilterSelect
            label="Priority"
            onChange={(value) => setPriority(value as FilterValue<TicketPriority>)}
            options={priorities}
            value={priority}
          />
          <FilterSelect
            label="Category"
            onChange={(value) => setCategory(value as FilterValue<TicketCategory>)}
            options={categories}
            value={category}
          />
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
              Search
            </span>
            <Input
              className="mt-2"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Subject, email, company..."
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
        {ticketsQuery.isLoading ? (
          <TicketsSkeleton />
        ) : ticketsQuery.isError ? (
          <ErrorState
            actionLabel="Retry"
            error={ticketsQuery.error}
            onAction={() => void ticketsQuery.refetch()}
            title="Could not load tickets"
          />
        ) : tickets.length === 0 ? (
          <EmptyState
            action={
              hasActiveFilters ? (
                <Button onClick={clearFilters} type="button" variant="secondary">
                  Clear filters
                </Button>
              ) : null
            }
            description={
              hasActiveFilters
                ? "Clear the active filters to return to the full support queue."
                : "New support requests will appear here once customers submit tickets."
            }
            title={hasActiveFilters ? "No tickets match your filters." : "No tickets yet."}
          />
        ) : (
          <TicketResults
            onOpenTicket={(ticketId) => router.push(routes.ticketDetail(ticketId))}
            tickets={tickets}
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

function TicketResults({
  tickets,
  onOpenTicket
}: {
  tickets: TicketDTO[];
  onOpenTicket: (ticketId: string) => void;
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70 shadow-panel lg:block">
        <table className="w-full table-fixed border-collapse text-left">
          <caption className="sr-only">Support ticket queue</caption>
          <thead className="border-b border-zinc-800 bg-zinc-900/70 text-xs uppercase tracking-[0.16em] text-zinc-400">
            <tr>
              <th className="w-[24%] px-4 py-3 font-semibold" scope="col">Ticket</th>
              <th className="w-[18%] px-4 py-3 font-semibold" scope="col">Customer</th>
              <th className="w-[10%] px-4 py-3 font-semibold" scope="col">Status</th>
              <th className="w-[10%] px-4 py-3 font-semibold" scope="col">Priority</th>
              <th className="w-[12%] px-4 py-3 font-semibold" scope="col">Category</th>
              <th className="w-[12%] px-4 py-3 font-semibold" scope="col">SLA</th>
              <th className="w-[8%] px-4 py-3 font-semibold" scope="col">AI</th>
              <th className="w-[6%] px-4 py-3 font-semibold" scope="col">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {tickets.map((ticket) => (
              <tr
                aria-label={`Open ticket: ${ticket.subject}`}
                className="cursor-pointer transition hover:bg-zinc-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400"
                key={ticket.id}
                onClick={() => onOpenTicket(ticket.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenTicket(ticket.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <td className="px-4 py-4 align-top">
                  <p className="truncate text-sm font-semibold text-zinc-100">{ticket.subject}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-zinc-400">{ticket.description}</p>
                </td>
                <td className="px-4 py-4 align-top">
                  <p className="truncate text-sm text-zinc-200">{ticket.customer?.name ?? "Unknown"}</p>
                  <p className="mt-1 truncate text-xs text-zinc-400">{ticket.customer?.email ?? "No email"}</p>
                </td>
                <td className="px-4 py-4 align-top">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="px-4 py-4 align-top">
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-4 py-4 align-top">
                  <Badge className="max-w-full truncate" tone="neutral">{formatCategory(ticket.category)}</Badge>
                </td>
                <td className="px-4 py-4 align-top">
                  <SlaBadge sla={ticket.sla} />
                </td>
                <td className="px-4 py-4 align-top">
                  <AiStatusIndicator status={getAiStatus(ticket)} />
                </td>
                <td className="px-4 py-4 align-top text-sm text-zinc-400">
                  {formatShortDate(ticket.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {tickets.map((ticket) => (
          <button
            aria-label={`Open ticket: ${ticket.subject}`}
            className="focus-ring min-h-11 min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-left shadow-panel transition hover:border-zinc-700 hover:bg-zinc-900/80"
            key={ticket.id}
            onClick={() => onOpenTicket(ticket.id)}
            type="button"
          >
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="line-clamp-2 break-words text-sm font-semibold text-zinc-100">{ticket.subject}</h2>
                <p className="mt-1 break-words text-xs text-zinc-400">
                  {ticket.customer?.name ?? "Unknown customer"} - {formatDate(ticket.createdAt)}
                </p>
                <p className="mt-1 break-all text-xs text-zinc-500">
                  {ticket.customer?.email ?? "No email"}
                </p>
              </div>
              <AiStatusIndicator status={getAiStatus(ticket)} />
            </div>
            <p className="mt-3 line-clamp-2 break-words text-sm leading-6 text-zinc-400">{ticket.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <Badge tone="neutral">{formatCategory(ticket.category)}</Badge>
              <SlaBadge sla={ticket.sla} />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function TicketsSkeleton() {
  return (
    <Card aria-busy="true" aria-live="polite" className="p-5" role="status">
      <span className="sr-only">Loading tickets</span>
      <div className="hidden space-y-3 lg:block">
        <div className="grid grid-cols-7 gap-4 border-b border-zinc-800 pb-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <div className="h-3 rounded-full bg-zinc-800" key={index} />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="grid grid-cols-7 gap-4 py-3" key={index}>
            <div className="col-span-2 h-4 rounded-full bg-zinc-800" />
            <div className="h-4 rounded-full bg-zinc-800" />
            <div className="h-4 rounded-full bg-zinc-800" />
            <div className="h-4 rounded-full bg-zinc-800" />
            <div className="h-4 rounded-full bg-zinc-800" />
            <div className="h-4 rounded-full bg-zinc-800" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:hidden">
        <LoadingSkeleton label="Loading ticket cards" rows={6} />
      </div>
    </Card>
  );
}

function AiStatusIndicator({ status }: { status: AiSuggestionStatus }) {
  const statusConfig: Record<AiSuggestionStatus, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "bg-zinc-400"
    },
    generated: {
      label: "Ready",
      className: "bg-emerald-400"
    },
    approved: {
      label: "Approved",
      className: "bg-teal-400"
    },
    edited: {
      label: "Edited",
      className: "bg-amber-400"
    },
    failed: {
      label: "Failed",
      className: "bg-rose-400"
    }
  };
  const config = statusConfig[status];

  return (
    <span className="inline-flex w-fit min-w-[5.75rem] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-200">
      <span aria-hidden="true" className={cn("h-2 w-2 shrink-0 rounded-full", config.className)} />
      {config.label}
    </span>
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

function getAiStatus(ticket: TicketDTO): AiSuggestionStatus {
  if (ticket.latestAiSuggestion?.status) {
    return ticket.latestAiSuggestion.status;
  }

  if (ticket.aiStatus) {
    return ticket.aiStatus.toLowerCase() as AiSuggestionStatus;
  }

  return "pending";
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

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}
