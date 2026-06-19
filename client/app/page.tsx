import { DashboardPreview } from "@/components/dashboard/DashboardPreview";
import { KnowledgeBasePreview } from "@/components/knowledge-base/KnowledgeBasePreview";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DemoTicketCta } from "@/components/tickets/DemoTicketCta";
import { Badge, ButtonLink, Card, PageHeader, SectionCard } from "@/components/ui";

const valueProps = [
  {
    title: "AI triage without auto-sending",
    description:
      "Classify, prioritize, and draft replies while keeping every customer response under human approval."
  },
  {
    title: "RAG grounded in your support docs",
    description:
      "Upload FAQs, policy notes, runbooks, and PDF documentation for contextual reply suggestions."
  },
  {
    title: "Built for a real SaaS workflow",
    description:
      "Queue-based AI jobs, admin review states, customer history, and a dashboard-ready API surface."
  }
];

const workflow = [
  {
    step: "01",
    title: "Customer submits a ticket",
    description: "PulseDesk captures the request, customer details, attachments, and status metadata."
  },
  {
    step: "02",
    title: "AI jobs run in the background",
    description: "BullMQ workers classify, prioritize, retrieve KB snippets, and draft a reply."
  },
  {
    step: "03",
    title: "Admin reviews and approves",
    description: "Support admins edit or approve the draft before any message reaches the customer."
  }
];

const stack = [
  "Next.js",
  "TypeScript",
  "Tailwind CSS",
  "NestJS",
  "PostgreSQL",
  "pgvector",
  "Prisma",
  "BullMQ",
  "Redis",
  "Gemini",
  "Socket.IO",
  "Clerk"
];

export default function Home() {
  return (
    <div className="app-background">
      <PublicNavbar />
      <main>
        <section className="page-shell pb-16 pt-14 sm:pb-20 sm:pt-20 lg:pb-28">
          <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <PageHeader
                eyebrow="AI support ticketing SaaS"
                title="PulseDesk turns support queues into reviewed, context-aware reply workflows."
                description="A portfolio-ready B2B support desk MVP with background AI triage, knowledge-base retrieval, and human-approved response drafting."
                actions={
                  <>
                    <ButtonLink href="#submit-ticket" size="lg">
                      Submit Demo Ticket
                    </ButtonLink>
                    <ButtonLink href="#dashboard" size="lg" variant="secondary">
                      View Admin Dashboard
                    </ButtonLink>
                  </>
                }
              />
              <div className="mt-8 flex flex-wrap gap-2">
                <Badge tone="emerald">Human-in-the-loop</Badge>
                <Badge tone="teal">RAG-powered drafts</Badge>
                <Badge tone="neutral">Queue-based AI jobs</Badge>
              </div>
            </div>
            <DashboardPreview />
          </div>
        </section>

        <section id="product" className="bg-zinc-50 py-16 text-zinc-950 sm:py-20">
          <div className="page-shell">
            <div className="max-w-2xl">
              <Badge tone="zinc">Product value</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything needed to demo credible AI support operations.
              </h2>
              <p className="mt-4 text-base leading-7 text-zinc-600">
                PulseDesk keeps the MVP focused: ticket intake, admin visibility, customer history,
                knowledge retrieval, and AI suggestions that never bypass review.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {valueProps.map((item) => (
                <Card className="border-zinc-200 bg-white p-6 text-zinc-950" key={item.title}>
                  <div className="h-10 w-10 rounded-2xl bg-emerald-100 ring-1 ring-emerald-200" />
                  <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">{item.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="bg-white py-16 text-zinc-950 sm:py-20">
          <div className="page-shell">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <Badge tone="zinc">Workflow</Badge>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Designed around support teams, not fully automated replies.
                </h2>
              </div>
              <div className="grid gap-4">
                {workflow.map((item) => (
                  <div
                    className="grid gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:grid-cols-[5rem_1fr]"
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

        <section className="bg-zinc-50 py-16 text-zinc-950 sm:py-20">
          <div className="page-shell grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div id="submit-ticket">
              <DemoTicketCta />
            </div>
            <KnowledgeBasePreview />
          </div>
        </section>

        <section id="stack" className="bg-zinc-950 py-16 sm:py-20">
          <div className="page-shell">
            <SectionCard
              title="Portfolio-grade implementation stack"
              description="Chosen for a realistic AI SaaS MVP that can be deployed to Vercel, Railway, PostgreSQL, and Redis."
            >
              <div className="flex flex-wrap gap-2">
                {stack.map((item) => (
                  <Badge key={item} tone={item === "Gemini" || item === "pgvector" ? "emerald" : "neutral"}>
                    {item}
                  </Badge>
                ))}
              </div>
            </SectionCard>
          </div>
        </section>

        <section id="safety" className="bg-zinc-950 pb-20">
          <div className="page-shell">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-6 sm:p-8">
              <Badge tone="emerald">AI safety and limitations</Badge>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                AI drafts are support suggestions, not customer replies.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-emerald-50/80 sm:text-base">
                PulseDesk is designed to surface relevant snippets, summarize context, and prepare
                drafts for human review. It should clearly flag insufficient context, avoid unsupported
                claims, and never send a reply automatically.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
