"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  SlaBadge,
  StatusBadge
} from "@/components/ui";
import {
  getCustomer,
  getCustomerTimeline,
  listCustomers,
  type CustomerListItemDTO,
  type CustomerTimelineEventDTO,
  type CustomerTimelineEventType
} from "@/lib/api";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function CustomersWorkspace() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const customersQuery = useQuery({
    queryKey: ["customers", { search: search.trim(), page: 1, limit: 100 }],
    queryFn: () => listCustomers({ search: search.trim(), page: 1, limit: 100 })
  });
  const customers = customersQuery.data?.data ?? [];
  const hasSearch = Boolean(search.trim());

  function clearSearch() {
    setSearch("");
  }

  return (
    <DashboardShell activeHref={routes.customers()} title="Customers">
      <PageHeader
        actions={<Badge tone="teal">{customers.length} customers</Badge>}
        description="Search customer records, review ticket activity, and open the customer support history."
        eyebrow="Customer workspace"
        title="Customers"
      />

      <Card className="mt-8 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label className="block w-full lg:max-w-xl">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
              Search customers
            </span>
            <Input
              className="mt-2"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email, or company..."
              value={search}
            />
          </label>
          {hasSearch ? (
            <Button className="w-full lg:w-auto" onClick={clearSearch} type="button" variant="secondary">
              Clear search
            </Button>
          ) : null}
        </div>
      </Card>

      <section className="mt-6">
        {customersQuery.isLoading ? (
          <CustomersSkeleton />
        ) : customersQuery.isError ? (
          <ErrorState
            actionLabel="Retry"
            error={customersQuery.error}
            onAction={() => void customersQuery.refetch()}
            title="Could not load customers"
          />
        ) : customers.length === 0 ? (
          <EmptyState
            action={
              hasSearch ? (
                <Button onClick={clearSearch} type="button" variant="secondary">
                  Clear search
                </Button>
              ) : (
                <Button onClick={() => router.push(routes.tickets())} type="button" variant="secondary">
                  View tickets
                </Button>
              )
            }
            description={
              hasSearch
                ? "Try a different name, email, or company."
                : "Customers will appear here after support tickets are submitted."
            }
            title={hasSearch ? "No customers match your search." : "No customers yet."}
          />
        ) : (
          <CustomerResults
            customers={customers}
            onOpenCustomer={(customerId) => router.push(routes.customerDetail(customerId))}
          />
        )}
      </section>
    </DashboardShell>
  );
}

export function CustomerDetailWorkspace({ customerId }: { customerId: string }) {
  const router = useRouter();
  const customerQuery = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => getCustomer(customerId)
  });
  const timelineQuery = useQuery({
    queryKey: ["customer", customerId, "timeline"],
    queryFn: () => getCustomerTimeline(customerId),
    enabled: Boolean(customerQuery.data)
  });
  const customer = customerQuery.data;

  return (
    <DashboardShell activeHref={routes.customers()} title="Customer detail">
      {customerQuery.isLoading ? (
        <CustomerDetailSkeleton />
      ) : customerQuery.isError ? (
        <ErrorState
          actionLabel="Retry"
          error={customerQuery.error}
          onAction={() => void customerQuery.refetch()}
          title="Could not load customer"
        />
      ) : !customer ? (
        <EmptyState
          action={
            <Button onClick={() => router.push(routes.customers())} type="button" variant="secondary">
              Back to customers
            </Button>
          }
          description="The selected customer was not found. Return to the customer list and choose another record."
          title="Customer not found"
        />
      ) : (
        <>
          <PageHeader
            actions={
              <Button onClick={() => router.push(routes.customers())} type="button" variant="secondary">
                Back to customers
              </Button>
            }
            description={customer.companyName ?? "Customer support history and submitted tickets."}
            eyebrow="Customer detail"
            title={customer.name}
          />

          <div className="mt-8 grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
            <div className="space-y-6">
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-white">Customer profile</h2>
                    <p className="mt-1 break-words text-sm text-zinc-400">
                      {customer.companyName ?? "No company provided"}
                    </p>
                  </div>
                  <Badge className="shrink-0 whitespace-nowrap" tone="teal">
                    Customer
                  </Badge>
                </div>
                <div className="mt-5 space-y-4 text-sm">
                  <InfoRow label="Name" value={customer.name} />
                  <InfoRow label="Email" value={customer.email} />
                  <InfoRow label="Company" value={customer.companyName ?? "Not provided"} />
                  <InfoRow label="Customer since" value={formatDate(customer.createdAt)} />
                  <InfoRow
                    label="Latest ticket"
                    value={customer.latestTicketAt ? formatDate(customer.latestTicketAt) : "No tickets"}
                  />
                </div>
              </Card>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <CustomerStatCard
                  helper="All known support requests"
                  label="Total tickets"
                  tone="teal"
                  value={String(customer.ticketCount)}
                />
                <CustomerStatCard
                  helper="Still needs support action"
                  label="Open tickets"
                  tone={(customer.openTicketCount ?? 0) > 0 ? "amber" : "emerald"}
                  value={String(customer.openTicketCount ?? 0)}
                />
                <CustomerStatCard
                  helper="Closed support requests"
                  label="Resolved tickets"
                  tone="emerald"
                  value={String(customer.resolvedTicketCount)}
                />
              </div>
            </div>

            <section>
              <div className="space-y-6">
                <CustomerTimelinePanel
                  events={timelineQuery.data ?? []}
                  isError={timelineQuery.isError}
                  isLoading={timelineQuery.isLoading || timelineQuery.isPending}
                  onRetry={() => void timelineQuery.refetch()}
                />

                <Card className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-white">Recent ticket history</h2>
                      <p className="mt-1 text-sm leading-6 text-zinc-400">
                        Open any ticket to review the full conversation, AI suggestion, and customer context.
                      </p>
                    </div>
                    <Badge tone={(customer.openTicketCount ?? 0) > 0 ? "amber" : "emerald"}>
                      {customer.openTicketCount ?? 0} open
                    </Badge>
                  </div>

                  {customer.tickets.length === 0 ? (
                    <div className="mt-5">
                      <EmptyState
                        description="This customer does not have ticket history yet."
                        title="No ticket history"
                      />
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {customer.tickets.map((ticket) => (
                        <button
                          className="focus-ring w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900/80"
                          key={ticket.id}
                          onClick={() => router.push(routes.ticketDetail(ticket.id))}
                          type="button"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <h3 className="line-clamp-2 break-words text-sm font-semibold text-zinc-100">
                                {ticket.subject}
                              </h3>
                              <p className="mt-1 text-xs text-zinc-400">{formatDate(ticket.createdAt)}</p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                              <StatusBadge status={ticket.status} />
                              <PriorityBadge priority={ticket.priority} />
                              <SlaBadge sla={ticket.sla} />
                            </div>
                          </div>
                          {ticket.description ? (
                            <p className="mt-3 line-clamp-2 break-words text-sm leading-6 text-zinc-400">
                              {ticket.description}
                            </p>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </section>
          </div>
        </>
      )}
    </DashboardShell>
  );
}

function CustomerTimelinePanel({
  events,
  isError,
  isLoading,
  onRetry
}: {
  events: CustomerTimelineEventDTO[];
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Activity timeline</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Customer, ticket, AI, and conversation activity sorted newest first.
          </p>
        </div>
        <Badge tone="teal">{events.length} events</Badge>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <LoadingSkeleton label="Loading customer activity" rows={5} />
        ) : isError ? (
          <ErrorState
            actionLabel="Retry"
            onAction={onRetry}
            title="Could not load activity"
            message="Customer activity could not be loaded. Please retry in a moment."
          />
        ) : events.length === 0 ? (
          <EmptyState
            description="Timeline activity will appear after this customer submits tickets or receives support updates."
            title="No customer activity yet"
          />
        ) : (
          <ol className="relative space-y-4 before:absolute before:left-4 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-zinc-800">
            {events.map((event) => (
              <CustomerTimelineItem event={event} key={event.id} />
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}

function CustomerTimelineItem({ event }: { event: CustomerTimelineEventDTO }) {
  const tone = getTimelineTone(event);
  const toneClasses = {
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    teal: "border-teal-400/30 bg-teal-400/10 text-teal-100",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    rose: "border-rose-400/30 bg-rose-400/10 text-rose-100",
    neutral: "border-zinc-700 bg-zinc-900 text-zinc-200"
  };

  return (
    <li className="relative pl-10">
      <div
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
          toneClasses[tone]
        )}
      >
        {getTimelineMarker(event.type)}
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="break-words text-sm font-semibold text-zinc-100">{event.title}</h3>
            <p className="mt-1 break-words text-sm leading-6 text-zinc-400">{event.description}</p>
          </div>
          <time className="shrink-0 text-xs text-zinc-500" dateTime={event.timestamp}>
            {formatDate(event.timestamp)}
          </time>
        </div>
        {event.ticketId ? (
          <Link
            className="focus-ring mt-3 inline-flex w-fit max-w-full rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-emerald-400/40 hover:text-emerald-100"
            href={routes.ticketDetail(event.ticketId)}
          >
            Open ticket
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function CustomerResults({
  customers,
  onOpenCustomer
}: {
  customers: CustomerListItemDTO[];
  onOpenCustomer: (customerId: string) => void;
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70 shadow-panel lg:block">
        <table className="w-full table-fixed border-collapse text-left">
          <caption className="sr-only">Customer list</caption>
          <thead className="border-b border-zinc-800 bg-zinc-900/70 text-xs uppercase tracking-[0.16em] text-zinc-400">
            <tr>
              <th className="w-[24%] px-4 py-3 font-semibold" scope="col">Customer</th>
              <th className="w-[24%] px-4 py-3 font-semibold" scope="col">Email</th>
              <th className="w-[20%] px-4 py-3 font-semibold" scope="col">Company</th>
              <th className="w-[12%] px-4 py-3 font-semibold" scope="col">Tickets</th>
              <th className="w-[10%] px-4 py-3 font-semibold" scope="col">Open</th>
              <th className="w-[10%] px-4 py-3 font-semibold" scope="col">Latest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {customers.map((customer) => (
              <tr
                aria-label={`Open customer: ${customer.name}`}
                className="cursor-pointer transition hover:bg-zinc-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400"
                key={customer.id}
                onClick={() => onOpenCustomer(customer.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenCustomer(customer.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <td className="px-4 py-4 align-top">
                  <p className="truncate text-sm font-semibold text-zinc-100">{customer.name}</p>
                </td>
                <td className="px-4 py-4 align-top">
                  <p className="truncate text-sm text-zinc-300">{customer.email}</p>
                </td>
                <td className="px-4 py-4 align-top">
                  <p className="truncate text-sm text-zinc-300">{customer.companyName ?? "Not provided"}</p>
                </td>
                <td className="px-4 py-4 align-top">
                  <Badge tone="teal">{customer.ticketCount} tickets</Badge>
                </td>
                <td className="px-4 py-4 align-top">
                  <Badge tone={(customer.openTicketCount ?? 0) > 0 ? "amber" : "emerald"}>
                    {customer.openTicketCount ?? 0}
                  </Badge>
                </td>
                <td className="px-4 py-4 align-top text-sm text-zinc-400">
                  {customer.latestTicketAt ? formatShortDate(customer.latestTicketAt) : "No tickets"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {customers.map((customer) => (
          <button
            aria-label={`Open customer: ${customer.name}`}
            className="focus-ring min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-left shadow-panel transition hover:border-zinc-700 hover:bg-zinc-900/80"
            key={customer.id}
            onClick={() => onOpenCustomer(customer.id)}
            type="button"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="line-clamp-2 break-words text-sm font-semibold text-zinc-100">{customer.name}</h2>
                <p className="mt-1 break-all text-xs text-zinc-400">{customer.email}</p>
                <p className="mt-1 line-clamp-1 break-words text-xs text-zinc-500">
                  {customer.companyName ?? "No company provided"}
                </p>
              </div>
              <Badge className="shrink-0 whitespace-nowrap" tone="teal">
                {customer.ticketCount}
              </Badge>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <CustomerMetric
                label="Open tickets"
                tone={(customer.openTicketCount ?? 0) > 0 ? "amber" : "emerald"}
                value={String(customer.openTicketCount ?? 0)}
              />
              <CustomerMetric
                label="Latest ticket"
                tone="neutral"
                value={customer.latestTicketAt ? formatDate(customer.latestTicketAt) : "No tickets"}
              />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function CustomersSkeleton() {
  return (
    <Card aria-busy="true" aria-live="polite" className="p-5" role="status">
      <span className="sr-only">Loading customers</span>
      <div className="hidden space-y-3 lg:block">
        <div className="grid grid-cols-6 gap-4 border-b border-zinc-800 pb-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="h-3 rounded-full bg-zinc-800" key={index} />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="grid grid-cols-6 gap-4 py-3" key={index}>
            <div className="h-4 rounded-full bg-zinc-800" />
            <div className="h-4 rounded-full bg-zinc-800" />
            <div className="h-4 rounded-full bg-zinc-800" />
            <div className="h-4 rounded-full bg-zinc-800" />
            <div className="h-4 rounded-full bg-zinc-800" />
            <div className="h-4 rounded-full bg-zinc-800" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:hidden">
        <LoadingSkeleton label="Loading customer cards" rows={6} />
      </div>
    </Card>
  );
}

function CustomerDetailSkeleton() {
  return (
    <div className="space-y-6">
      <LoadingSkeleton label="Loading customer profile" rows={3} />
      <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <Card className="p-5">
          <div className="h-4 w-36 rounded-full bg-zinc-800" />
          <div className="mt-5 space-y-4">
            <div className="h-3 rounded-full bg-zinc-800" />
            <div className="h-3 rounded-full bg-zinc-800" />
            <div className="h-3 rounded-full bg-zinc-800" />
            <div className="h-3 rounded-full bg-zinc-800" />
          </div>
        </Card>
        <LoadingSkeleton label="Loading ticket history" rows={6} />
      </div>
    </div>
  );
}

function CustomerMetric({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "emerald" | "amber" | "neutral";
}) {
  const toneClasses = {
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    neutral: "border-zinc-800 bg-zinc-900/60 text-zinc-300"
  };

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClasses[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-[0.16em] opacity-70">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}

function CustomerStatCard({
  label,
  value,
  helper,
  tone
}: {
  label: string;
  value: string;
  helper: string;
  tone: "emerald" | "teal" | "amber" | "rose";
}) {
  const toneClasses = {
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    teal: "border-teal-400/20 bg-teal-400/10 text-teal-100",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    rose: "border-rose-400/20 bg-rose-400/10 text-rose-100"
  };

  return (
    <Card className={`p-4 ${toneClasses[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-[0.16em] opacity-75">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs leading-5 opacity-75">{helper}</p>
    </Card>
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

function getTimelineTone(event: CustomerTimelineEventDTO): "emerald" | "teal" | "amber" | "rose" | "neutral" {
  if (event.type === "AI_REPLY_APPROVED" || event.type === "TICKET_RESOLVED") {
    return "emerald";
  }

  if (event.type === "INTERNAL_NOTE_ADDED" || event.type === "AI_SUGGESTION_GENERATED") {
    return "amber";
  }

  if (event.metadata?.priority === "urgent") {
    return "rose";
  }

  if (event.type === "MESSAGE_ADDED" || event.type === "TICKET_CREATED") {
    return "teal";
  }

  return "neutral";
}

function getTimelineMarker(type: CustomerTimelineEventType): string {
  const markers: Record<CustomerTimelineEventType, string> = {
    CUSTOMER_CREATED: "C",
    TICKET_CREATED: "T",
    TICKET_UPDATED: "U",
    AI_SUGGESTION_GENERATED: "AI",
    AI_REPLY_APPROVED: "OK",
    MESSAGE_ADDED: "M",
    INTERNAL_NOTE_ADDED: "N",
    TICKET_RESOLVED: "R"
  };

  return markers[type];
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
