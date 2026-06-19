import { Badge, SectionCard } from "@/components/ui";

const documents = ["Billing FAQ.md", "Security Runbook.pdf", "Webhook Guide.txt"];

export function KnowledgeBasePreview() {
  return (
    <SectionCard
      title="Knowledge base ingestion"
      description="Markdown, text, and PDF docs become searchable RAG context."
      tone="light"
    >
      <div className="grid gap-3 md:grid-cols-3">
        {documents.map((document) => (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4" key={document}>
            <div className="h-10 w-10 rounded-xl bg-zinc-900" />
            <h3 className="mt-4 break-words text-sm font-semibold text-zinc-950">{document}</h3>
            <p className="mt-1 text-xs text-zinc-500">Chunked, embedded, and indexed</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Badge tone="zinc">pgvector</Badge>
        <Badge tone="zinc">Gemini embeddings</Badge>
        <Badge tone="zinc">Human-reviewed replies</Badge>
      </div>
    </SectionCard>
  );
}
