import { DashboardShell, PageHeader } from "@/components/layout";
import { Badge, Card, EmptyState, PriorityBadge, StatusBadge } from "@/components/ui";

const demoTickets = [
  {
    title: "Webhook signatures failing in production",
    status: "open" as const,
    priority: "urgent" as const
  },
  {
    title: "Monthly export has been queued for an hour",
    status: "in_progress" as const,
    priority: "high" as const
  }
];

export default function DashboardPage() {
  return (
    <DashboardShell activeHref="/dashboard" title="PulseDesk dashboard">
      <PageHeader
        description="Review ticket queues, AI-generated suggestions, and customer context from one protected workspace."
        eyebrow="Admin workspace"
        title="Support operations"
      />
      <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-white">Priority queue</h2>
              <p className="mt-1 text-sm text-zinc-500">Protected demo dashboard</p>
            </div>
            <Badge tone="emerald">AI ready</Badge>
          </div>
          <div className="space-y-3">
            {demoTickets.map((ticket) => (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4" key={ticket.title}>
                <h3 className="text-sm font-semibold text-zinc-100">{ticket.title}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <EmptyState
          description="Detailed charts and polling states will be added when the dashboard connects to the NestJS API."
          title="Dashboard shell is authenticated"
        />
      </div>
    </DashboardShell>
  );
}
