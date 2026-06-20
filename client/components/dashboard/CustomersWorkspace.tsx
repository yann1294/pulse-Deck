"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { CustomerDTO, TicketDTO } from "@pulsedesk/shared";
import { DashboardShell, PageHeader } from "@/components/layout";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from "@/components/ui";
import { listTickets } from "@/lib/api";
import { routes } from "@/lib/routes";

interface CustomerSummary {
  customer: CustomerDTO;
  tickets: TicketDTO[];
  latestTicketAt: string;
}

export function CustomersWorkspace() {
  const router = useRouter();
  const ticketsQuery = useQuery({
    queryKey: ["tickets", "customers"],
    queryFn: () => listTickets({ page: 1, limit: 100 })
  });
  const customers = getCustomerSummaries(ticketsQuery.data?.data ?? []);

  return (
    <DashboardShell activeHref={routes.customers()} title="Customers">
      <PageHeader
        actions={<Badge tone="teal">{customers.length} customers</Badge>}
        description="Review customer records derived from submitted tickets and jump into their support history."
        eyebrow="Customer workspace"
        title="Customers"
      />

      <section className="mt-8">
        {ticketsQuery.isLoading ? (
          <LoadingSkeleton label="Loading customers" rows={6} />
        ) : ticketsQuery.isError ? (
          <ErrorState
            actionLabel="Retry"
            error={ticketsQuery.error}
            onAction={() => void ticketsQuery.refetch()}
            title="Could not load customers"
          />
        ) : customers.length === 0 ? (
          <EmptyState
            action={
              <Button onClick={() => router.push(routes.tickets())} type="button" variant="secondary">
                View tickets
              </Button>
            }
            description="Customers will appear here after support tickets are submitted."
            title="No customers yet"
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {customers.map(({ customer, tickets, latestTicketAt }) => (
              <button
                className="focus-ring rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-left shadow-panel transition hover:border-zinc-700 hover:bg-zinc-900/80"
                key={customer.id}
                onClick={() => router.push(routes.customerDetail(customer.id))}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 break-words text-sm font-semibold text-zinc-100">{customer.name}</h2>
                    <p className="mt-1 break-all text-xs text-zinc-400">{customer.email}</p>
                    <p className="mt-1 line-clamp-1 break-words text-xs text-zinc-500">
                      {customer.companyName ?? "No company provided"}
                    </p>
                  </div>
                  <Badge tone="neutral">{tickets.length}</Badge>
                </div>
                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Latest activity</p>
                  <p className="mt-1 text-sm text-zinc-300">{formatDate(latestTicketAt)}</p>
                </div>
              </button>
            ))}
          </div>
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
            actions={<Button onClick={() => router.push(routes.customers())} type="button" variant="secondary">Back to customers</Button>}
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

function getCustomerSummaries(tickets: TicketDTO[]): CustomerSummary[] {
  const summaries = new Map<string, CustomerSummary>();

  for (const ticket of tickets) {
    if (!ticket.customer) {
      continue;
    }

    const existing = summaries.get(ticket.customer.id);

    if (!existing) {
      summaries.set(ticket.customer.id, {
        customer: ticket.customer,
        tickets: [ticket],
        latestTicketAt: ticket.updatedAt
      });
      continue;
    }

    existing.tickets.push(ticket);

    if (ticket.updatedAt > existing.latestTicketAt) {
      existing.latestTicketAt = ticket.updatedAt;
    }
  }

  return Array.from(summaries.values()).sort((left, right) =>
    right.latestTicketAt.localeCompare(left.latestTicketAt)
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
