import { PublicNavbar, SiteFooter } from "@/components/layout";
import { CustomerTicketForm } from "@/components/tickets/CustomerTicketForm";
import { Badge, Card } from "@/components/ui";

const workflowSteps = [
  "We confirm the request and route it by category.",
  "AI may help summarize and prioritize the issue.",
  "A human reviews the draft before any reply is sent."
];

const trustIndicators = [
  "Human-reviewed replies",
  "Secure admin workspace",
  "Context-aware triage"
];

export default function SubmitTicketPage() {
  return (
    <div className="app-background min-h-screen">
      <PublicNavbar />
      <main className="page-shell grid gap-8 py-10 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:py-20">
        <section className="self-start lg:sticky lg:top-24">
          <Badge tone="emerald">PulseDesk support portal</Badge>
          <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Tell us what is blocking your team.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300">
            Submit a support request and our team will review it shortly. PulseDesk may use AI to
            help triage the issue, but customer replies stay human-reviewed.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {trustIndicators.map((indicator) => (
              <div
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-100"
                key={indicator}
              >
                {indicator}
              </div>
            ))}
          </div>
          <Card className="mt-8 p-5">
            <h2 className="text-base font-semibold text-white">What happens next</h2>
            <div className="mt-5 space-y-4">
              {workflowSteps.map((step, index) => (
                <div className="flex gap-3" key={step}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-400/20">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm leading-6 text-zinc-400">{step}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
        <CustomerTicketForm />
      </main>
      <SiteFooter />
    </div>
  );
}
