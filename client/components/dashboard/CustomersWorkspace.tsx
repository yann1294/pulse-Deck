"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  StatusBadge
} from "@/components/ui";
import {
  listCustomers,
  listTickets,
  type CustomerListItemDTO
} from "@/lib/api";
import { routes } from "@/lib/routes";

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
  const ticketsQuery = useQuery({
    queryKey: ["tickets", "customer", customerId],
    queryFn: () => listTickets({ page: 1, limit: 100 })
  });
  const tickets = (ticketsQuery.data?.data ?? []).filter((ticket) => ticket.customer?.id === customerId);
  const customer = tickets[0]?.customer;

  return (
    <DashboardShell activeHref={routes.customers()} title="Customer detail">
      {ticketsQuery.isLoading ? (
        <LoadingSkeleton label="Loading customer" rows={6} />
      ) : ticketsQuery.isError ? (
        <ErrorState
          actionLabel="Retry"
          error={ticketsQuery.error}
          onAction={() => void ticketsQuery.refetch()}
          title="Could not load customer"
        />
      ) : !customer ? (
        <EmptyState
          action={
            <Button onClick={() => router.push(routes.customers())} type="button" variant="secondary">
              Back to customers
            </Button>
          }
          description="The selected customer was not found in the current ticket data."
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

          <div className="mt-8 grid gap-6 xl:grid-cols-[24rem_1fr]">
            <Card className="p-5">
              <h2 className="text-base font-semibold text-white">Customer profile</h2>
              <div className="mt-5 space-y-4 text-sm">
                <InfoRow label="Email" value={customer.email} />
                <InfoRow label="Company" value={customer.companyName ?? "Not provided"} />
                <InfoRow label="Known tickets" value={String(tickets.length)} />
                <InfoRow label="Customer since" value={formatDate(customer.createdAt)} />
              </div>
            </Card>

            <section className="space-y-3">
              {tickets.map((ticket) => (
                <button
                  className="focus-ring w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-left shadow-panel transition hover:border-zinc-700 hover:bg-zinc-900/80"
                  key={ticket.id}
                  onClick={() => router.push(routes.ticketDetail(ticket.id))}
                  type="button"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 break-words text-sm font-semibold text-zinc-100">{ticket.subject}</h3>
                      <p className="mt-1 text-xs text-zinc-400">{formatDate(ticket.createdAt)}</p>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p className="mt-3 line-clamp-2 break-words text-sm leading-6 text-zinc-400">{ticket.description}</p>
                </button>
              ))}
            </section>
          </div>
        </>
      )}
    </DashboardShell>
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
              <CustomerMetric label="Open tickets" tone={(customer.openTicketCount ?? 0) > 0 ? "amber" : "emerald"} value={String(customer.openTicketCount ?? 0)} />
              <CustomerMetric label="Latest ticket" tone="neutral" value={customer.latestTicketAt ? formatDate(customer.latestTicketAt) : "No tickets"} />
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-1 break-words text-zinc-200">{value}</p>
    </div>
  );
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
