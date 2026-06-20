import { CustomerDetailWorkspace } from "@/components/dashboard/CustomersWorkspace";

interface CustomerDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;

  return <CustomerDetailWorkspace customerId={id} />;
}
