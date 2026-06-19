import { Badge, ButtonLink, SectionCard } from "@/components/ui";

const tickets = [
  {
    title: "CSV export stuck in queue",
    customer: "Mara Chen, BrightLedger",
    priority: "High",
    status: "AI ready"
  },
  {
    title: "Webhook signatures failing",
    customer: "Noah Park, OrbitOps",
    priority: "Urgent",
    status: "Needs review"
  },
  {
    title: "Question about annual invoice",
    customer: "Amelia Stone, Atlas HR",
    priority: "Medium",
    status: "Drafting"
  }
];

export function DashboardPreview() {
  return (
    <div id="dashboard" className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-3 shadow-glow">
      <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950">
        <div className="flex flex-col gap-4 border-b border-zinc-800 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Admin queue</p>
            <p className="mt-1 text-xs text-zinc-500">Live ticket triage with AI assistance</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="emerald">12 open</Badge>
            <Badge tone="teal">5 AI ready</Badge>
            <ButtonLink href="/dashboard" size="sm" variant="secondary">
              Open dashboard
            </ButtonLink>
          </div>
        </div>
        <div className="grid gap-3 p-3 lg:grid-cols-[1.2fr_0.8fr]">
          <SectionCard
            title="Priority tickets"
            description="Sorted by freshness and impact"
            action={
              <ButtonLink href="/dashboard" size="sm" variant="ghost">
                View queue
              </ButtonLink>
            }
          >
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
                  key={ticket.title}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100">{ticket.title}</h3>
                      <p className="mt-1 text-xs text-zinc-500">{ticket.customer}</p>
                    </div>
                    <Badge tone={ticket.priority === "Urgent" ? "amber" : "emerald"}>
                      {ticket.priority}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                    <span>{ticket.status}</span>
                    <span>2m ago</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard
            title="AI suggestion"
            description="Grounded in uploaded knowledge"
            action={
              <ButtonLink href="/dashboard" size="sm" variant="ghost">
                Review drafts
              </ButtonLink>
            }
          >
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Draft ready
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-100">
                Acknowledge the delayed export, explain that large workspaces may take longer, and
                ask the admin to retry if it exceeds the support threshold.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="emerald">RAG context: 4 snippets</Badge>
                <Badge tone="neutral">Human approval required</Badge>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
