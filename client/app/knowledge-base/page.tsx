import { DashboardShell, PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui";

export default function KnowledgeBasePage() {
  return (
    <DashboardShell activeHref="/dashboard/knowledge-base" title="Knowledge base">
      <PageHeader
        description="Protected workspace for uploaded markdown, text, and PDF support documents."
        eyebrow="Protected route"
        title="Knowledge base"
      />
      <div className="mt-8">
        <EmptyState
          description="Document upload and ingestion UI will connect to the existing protected API in the next frontend task."
          title="No documents in this frontend view yet"
        />
      </div>
    </DashboardShell>
  );
}
