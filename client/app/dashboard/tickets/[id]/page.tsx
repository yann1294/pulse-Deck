import { TicketDetailWorkspace } from "@/components/tickets/TicketDetailWorkspace";

interface TicketDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { id } = await params;

  return <TicketDetailWorkspace ticketId={id} />;
}
