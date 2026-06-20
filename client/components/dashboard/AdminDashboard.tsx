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
  StatusBadge
} from "@/components/ui";
import { listTickets, type ListTicketsParams } from "@/lib/api";
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

const isDemoWorkspace = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function AdminDashboard() {
  const router = useRouter();
  const [status, setStatus] = useState<FilterValue<TicketStatus>>("all");
  const [priority, setPriority] = useState<FilterValue<TicketPriority>>("all");
  const [category, setCategory] = useState<FilterValue<TicketCategory>>("all");
  const [search, setSearch] = useState("");
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
  const realtime = useTicketRealtime();
  const ticketsQuery = useQuery({
    queryKey: ["tickets", filters],
    queryFn: () => listTickets(filters),
    refetchInterval: realtime.pollingFallbackInterval
  });
  const summaryQuery = useQuery({
    queryKey: ["tickets", "summary"],
    queryFn: () => listTickets({ page: 1, limit: 100 }),
    refetchInterval: realtime.pollingFallbackInterval
  });
  const tickets = ticketsQuery.data?.data ?? [];
  const summaryTickets = summaryQuery.data?.data ?? [];
  const kpis = getDashboardKpis(summaryTickets);
  const hasActiveFilters = status !== "all" || priority !== "all" || category !== "all" || Boolean(search.trim());

  function clearFilters() {
    setStatus("all");
    setPriority("all");
    setCategory("all");
    setSearch("");
  }

  return (
    <DashboardShell activeHref="/dashboard" title="PulseDesk dashboard">
      <PageHeader
        actions={
          <>
            <LiveUpdatesIndicator isLive={realtime.isLive} />
            <Badge tone="emerald">Human-approved AI replies</Badge>
          </>
        }
        description="Review ticket queues, AI-generated suggestions, and customer context from one protected workspace."
        eyebrow="Admin workspace"
        title="Support operations"
      />

      {realtime.notice ? <RealtimeNotice notice={realtime.notice} /> : null}
      {isDemoWorkspace ? <DemoWorkspaceBanner /> : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryQuery.isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <LoadingSkeleton key={index} label="Loading KPI" rows={2} />
            ))
          : kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </section>

      <Card className="mt-6 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                placeholder="Title, email, company..."
                value={search}
              />
            </label>
          </div>
        </div>
      </Card>

      <section className="mt-6">
        {ticketsQuery.isLoading ? (
          <DashboardTableSkeleton />
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
                ? "Clear the active filters to return to the full queue."
                : "New support requests will appear here once customers submit tickets."
            }
            title="No tickets match your filters."
          />
        ) : (
          <TicketResults
            onOpenTicket={(ticketId) => router.push(`/dashboard/tickets/${ticketId}`)}
            tickets={tickets}
          />
        )}
      </section>
    </DashboardShell>
  );
}

function DemoWorkspaceBanner() {
  return (
    <Card className="mt-6 border-emerald-400/25 bg-gradient-to-br from-emerald-400/10 to-zinc-950 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Badge tone="emerald">Demo Workspace</Badge>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
            This workspace uses fake customers, tickets, knowledge-base content, and AI suggestions for recruiter review.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">Load data</p>
          <code className="mt-1 block break-words text-xs text-emerald-100">
            pnpm demo:seed
          </code>
        </div>
      </div>
    </Card>
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

interface KpiCardProps {
  label: string;
  value: number;
  helper: string;
  tone: "emerald" | "teal" | "amber" | "rose";
}

function KpiCard({ label, value, helper, tone }: KpiCardProps) {
  const toneClasses: Record<KpiCardProps["tone"], string> = {
    emerald: "border-emerald-400/30 from-emerald-400/15",
    teal: "border-teal-400/30 from-teal-400/15",
    amber: "border-amber-400/30 from-amber-400/15",
    rose: "border-rose-400/30 from-rose-400/15"
  };

  return (
    <Card className={cn("bg-gradient-to-br to-zinc-950 p-5", toneClasses[tone])}>
      <p className="text-sm font-medium text-zinc-300">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-400">{helper}</p>
    </Card>
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
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Support ticket queue</caption>
          <thead className="border-b border-zinc-800 bg-zinc-900/70 text-xs uppercase tracking-[0.16em] text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-semibold" scope="col">Title</th>
              <th className="px-4 py-3 font-semibold" scope="col">Customer</th>
              <th className="px-4 py-3 font-semibold" scope="col">Status</th>
              <th className="px-4 py-3 font-semibold" scope="col">Priority</th>
              <th className="px-4 py-3 font-semibold" scope="col">Category</th>
              <th className="px-4 py-3 font-semibold" scope="col">AI status</th>
              <th className="px-4 py-3 font-semibold" scope="col">Created</th>
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
                <td className="max-w-sm px-4 py-4">
                  <p className="truncate text-sm font-semibold text-zinc-100">{ticket.subject}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-zinc-400">{ticket.description}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="text-sm text-zinc-200">{ticket.customer?.name ?? "Unknown"}</p>
                  <p className="mt-1 text-xs text-zinc-400">{ticket.customer?.email ?? "No email"}</p>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="px-4 py-4">
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-4 py-4">
                  <Badge tone="neutral">{formatCategory(ticket.category)}</Badge>
                </td>
                <td className="px-4 py-4">
                  <AiStatusIndicator status={getAiStatus(ticket)} />
                </td>
                <td className="px-4 py-4 text-sm text-zinc-400">
                  {formatDate(ticket.createdAt)}
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
            className="focus-ring min-h-11 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-left shadow-panel transition hover:border-zinc-700 hover:bg-zinc-900/80"
            key={ticket.id}
            onClick={() => onOpenTicket(ticket.id)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="line-clamp-2 break-words text-sm font-semibold text-zinc-100">{ticket.subject}</h3>
                <p className="mt-1 text-xs text-zinc-400">
                  {ticket.customer?.name ?? "Unknown customer"} · {formatDate(ticket.createdAt)}
                </p>
              </div>
              <AiStatusIndicator status={getAiStatus(ticket)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <Badge tone="neutral">{formatCategory(ticket.category)}</Badge>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function DashboardTableSkeleton() {
  return (
    <Card aria-busy="true" aria-live="polite" className="p-5" role="status">
      <span className="sr-only">Loading ticket queue</span>
      <div className="mb-5 flex items-center justify-between">
        <div className="h-4 w-36 rounded-full bg-zinc-800" />
        <div className="h-4 w-24 rounded-full bg-zinc-800" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 md:grid-cols-6" key={index}>
            <div className="h-3 rounded-full bg-zinc-800 md:col-span-2" />
            <div className="h-3 rounded-full bg-zinc-800" />
            <div className="h-3 rounded-full bg-zinc-800" />
            <div className="h-3 rounded-full bg-zinc-800" />
            <div className="h-3 rounded-full bg-zinc-800" />
          </div>
        ))}
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
    <span className="inline-flex min-w-[5.75rem] items-center justify-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-200">
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", config.className)} />
      {config.label}
    </span>
  );
}

function getDashboardKpis(tickets: TicketDTO[]): KpiCardProps[] {
  return [
    {
      label: "Open tickets",
      value: tickets.filter((ticket) => ticket.status === "open").length,
      helper: "Active customer requests",
      tone: "emerald"
    },
    {
      label: "Urgent tickets",
      value: tickets.filter((ticket) => ticket.priority === "urgent").length,
      helper: "Needs immediate review",
      tone: "rose"
    },
    {
      label: "AI suggestions ready",
      value: tickets.filter((ticket) => getAiStatus(ticket) === "generated").length,
      helper: "Drafts ready for human approval",
      tone: "teal"
    },
    {
      label: "Resolved tickets",
      value: tickets.filter((ticket) => ticket.status === "resolved").length,
      helper: "Closed support requests",
      tone: "amber"
    }
  ];
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
