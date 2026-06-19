import { PublicNavbar, SiteFooter } from "@/components/layout";
import { DemoTicketCta } from "@/components/tickets/DemoTicketCta";
import { Badge, Card } from "@/components/ui";

export default function SubmitTicketPage() {
  return (
    <div className="app-background min-h-screen">
      <PublicNavbar />
      <main className="page-shell grid gap-8 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:py-20">
        <section className="self-center">
          <Badge tone="emerald">Public demo flow</Badge>
          <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Submit a support ticket without signing in.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300">
            Customer intake stays public for the MVP demo, while admin dashboard and knowledge-base
            workflows are protected by Clerk.
          </p>
        </section>
        <Card className="p-3">
          <DemoTicketCta />
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
