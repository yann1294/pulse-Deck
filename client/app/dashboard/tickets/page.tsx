import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { routes } from "@/lib/routes";

export default function TicketsPage() {
  return <AdminDashboard activeHref={routes.tickets()} title="Tickets" />;
}
