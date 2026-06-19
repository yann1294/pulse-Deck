import { DashboardShell, PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui";

interface TicketDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { id } = await params;

  return (
    <DashboardShell activeHref="/dashboard/tickets" title="Ticket detail">
      <PageHeader
        description="Ticket detail, customer history, and AI suggestion review will be connected in the next dashboard task."
        eyebrow="Ticket detail"
        title={`Ticket ${id}`}
      />
      <div className="mt-8">
        <EmptyState
          description="The dashboard list now routes here. The detailed API view will be wired to this page next."
          title="Ticket detail view placeholder"
        />
      </div>
    </DashboardShell>
  );
}
