import { DashboardPreview } from "@/components/dashboard/DashboardPreview";
import { KnowledgeBasePreview } from "@/components/knowledge-base/KnowledgeBasePreview";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Badge, ButtonLink, Card, SectionCard } from "@/components/ui";

const recruiterHighlights = [
  {
    title: "Full-stack SaaS surface",
    description:
      "Public ticket intake, authenticated admin dashboard, detail views, realtime updates, and production deployment artifacts."
  },
  {
    title: "AI/RAG support workflow",
    description:
      "Gemini-powered classification, prioritization, reply drafting, retrieved knowledge snippets, and human approval states."
  },
  {
    title: "Production data architecture",
    description:
      "PostgreSQL, Prisma migrations, pgvector embeddings, Redis-backed BullMQ workers, and deterministic demo seeding."
  },
  {
    title: "Deployment discipline",
    description:
      "Dockerized NestJS service, Compose local stack, GitHub Actions CI, Vercel frontend, and Railway backend guidance."
  }
];

const valueProps = [
  {
    title: "A real support desk, not a prompt demo",
    description:
      "PulseDesk models intake, assignment, status changes, customer history, knowledge retrieval, and AI review as one coherent SaaS workflow."
  },
  {
    title: "Human-reviewed AI by design",
    description:
      "AI can classify, prioritize, and draft, but every suggested response is visibly gated behind admin review."
  },
  {
    title: "Built for async operations",
    description:
      "BullMQ keeps expensive AI jobs off the request path while Socket.IO and cache invalidation keep the dashboard fresh."
  }
];

const workflow = [
  {
    step: "01",
    title: "Customer submits a ticket",
    description:
      "The public form captures customer details, issue context, and optional attachments through the NestJS API."
  },
  {
    step: "02",
    title: "Workers enrich the queue",
    description:
      "BullMQ jobs classify category, predict priority, retrieve pgvector-backed knowledge snippets, and generate a draft."
  },
  {
    step: "03",
    title: "Support reviews with context",
    description:
      "Admins see customer history, AI status, citations, and draft suggestions before taking action."
  }
];

const stackGroups = [
  {
    label: "Frontend",
    items: ["Next.js", "React", "TypeScript", "Tailwind CSS", "TanStack Query", "Socket.IO client"]
  },
  {
    label: "Backend",
    items: ["NestJS", "Prisma", "PostgreSQL", "pgvector", "Redis", "BullMQ", "Socket.IO"]
  },
  {
    label: "AI and delivery",
    items: ["Gemini", "RAG", "Docker", "GitHub Actions", "Vercel", "Railway"]
  }
];

export default function Home() {
  return (
    <div className="app-background">
      <PublicNavbar />
      <main id="main-content">
        <section className="page-shell pb-4 pt-6 sm:pb-6 sm:pt-10 lg:pb-8">
          <div className="mx-auto max-w-5xl text-center">
            <div className="flex flex-wrap justify-center gap-2">
              <Badge tone="emerald">Full-stack AI SaaS</Badge>
              <Badge tone="teal">RAG + pgvector</Badge>
              <Badge className="hidden sm:inline-flex" tone="neutral">
                Docker + CI/CD
              </Badge>
            </div>
            <h1 className="mt-5 text-balance text-[2.35rem] font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl sm:leading-none lg:text-7xl">
              An AI support desk built like a production SaaS product.
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-zinc-300 sm:text-lg sm:leading-8">
              PulseDesk demonstrates a complete customer-support workflow: ticket intake, admin triage,
              RAG-grounded AI suggestions, background processing, realtime updates, and deployable
              infrastructure.
            </p>
            <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center">
              <ButtonLink className="col-span-2 w-full sm:w-auto" href="/dashboard" size="lg">
                View Admin Dashboard
              </ButtonLink>
              <ButtonLink className="w-full sm:w-auto" href="/submit-ticket" size="lg" variant="secondary">
                Submit Demo Ticket
              </ButtonLink>
              <ButtonLink className="w-full sm:w-auto" href="#stack" size="lg" variant="ghost">
                Technical Stack
              </ButtonLink>
            </div>
          </div>

          <div className="mt-5 max-h-[6.5rem] overflow-hidden rounded-[1.25rem] sm:mt-8 sm:max-h-[17rem] sm:rounded-[1.5rem] lg:mt-10 lg:max-h-[22rem]">
            <DashboardPreview />
          </div>
        </section>

        <section id="product" className="bg-zinc-50 py-14 text-zinc-950 sm:py-20">
          <div className="page-shell">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <Badge tone="zinc">Recruiter-facing value</Badge>
                <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                  A portfolio project with real engineering depth.
                </h2>
              </div>
              <p className="max-w-3xl text-base leading-7 text-zinc-600">
                The app is intentionally scoped as an MVP, but the implementation touches the systems
                that matter in a working AI SaaS: auth, database modeling, job queues, vector search,
                realtime UX, deployment, and CI.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {recruiterHighlights.map((item) => (
                <Card className="p-5 sm:p-6" key={item.title} tone="light">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700">
                    ✓
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">{item.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-14 text-zinc-950 sm:py-20">
          <div className="page-shell">
            <div className="max-w-2xl">
              <Badge tone="zinc">Product story</Badge>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything needed to demo credible AI support operations.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {valueProps.map((item) => (
                <Card className="p-5 sm:p-6" key={item.title} tone="light">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">{item.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="bg-zinc-50 py-14 text-zinc-950 sm:py-20">
          <div className="page-shell">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <Badge tone="zinc">Workflow</Badge>
                <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                  Designed around reviewed support outcomes.
                </h2>
                <p className="mt-4 text-sm leading-7 text-zinc-600">
                  The AI assists the operator without hiding uncertainty or bypassing the support team.
                </p>
              </div>
              <div className="grid gap-4">
                {workflow.map((item) => (
                  <div
                    className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-5 sm:grid-cols-[5rem_1fr]"
                    key={item.step}
                  >
                    <span className="text-2xl font-semibold text-emerald-600">{item.step}</span>
                    <div>
                      <h3 className="font-semibold text-zinc-950">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-14 text-zinc-950 sm:py-20">
          <div className="page-shell grid min-w-0 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="p-5 sm:p-6" tone="light">
              <Badge tone="zinc">Customer intake</Badge>
              <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                Public ticket submission connected to a real backend workflow.
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                The customer form posts to NestJS, persists through Prisma, and enqueues AI jobs for
                triage without blocking ticket creation.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <ButtonLink className="w-full sm:w-auto" href="/submit-ticket">
                  Open Ticket Submission
                </ButtonLink>
                <ButtonLink className="w-full sm:w-auto" href="/dashboard" variant="secondary">
                  Review In Dashboard
                </ButtonLink>
              </div>
            </Card>
            <KnowledgeBasePreview />
          </div>
        </section>

        <section id="stack" className="bg-zinc-950 py-14 sm:py-20">
          <div className="page-shell">
            <SectionCard
              title="Implementation stack"
              description="A practical set of tools for a deployable AI SaaS MVP: typed frontend, structured API, vector retrieval, background jobs, and production packaging."
            >
              <div className="grid gap-4 md:grid-cols-3">
                {stackGroups.map((group) => (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4" key={group.label}>
                    <h3 className="text-sm font-semibold text-white">{group.label}</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <Badge key={item} tone={item === "Gemini" || item === "pgvector" ? "emerald" : "neutral"}>
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </section>

        <section id="safety" className="bg-zinc-950 pb-16 sm:pb-20">
          <div className="page-shell">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-6 sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <Badge tone="emerald">AI safety and review</Badge>
                  <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    AI suggestions are never sent directly to customers.
                  </h2>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-emerald-50/80 sm:text-base">
                    PulseDesk surfaces relevant snippets, summarizes context, and prepares drafts for
                    human review. The UI makes uncertainty and approval status visible.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <ButtonLink className="w-full sm:w-auto" href="/dashboard">
                    Inspect The Demo
                  </ButtonLink>
                  <ButtonLink className="w-full sm:w-auto" href="/submit-ticket" variant="secondary">
                    Create A Ticket
                  </ButtonLink>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
