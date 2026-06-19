"use client";

import type { ChangeEvent, DragEvent } from "react";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardShell, PageHeader } from "@/components/layout";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingSkeleton
} from "@/components/ui";
import {
  listKnowledgeDocuments,
  uploadKnowledgeDocument,
  type KnowledgeDocumentGroupDTO,
  type KnowledgeUploadResultDTO
} from "@/lib/api";
import { getUserFriendlyErrorMessage } from "@/lib/api-errors";
import { cn } from "@/lib/utils";

type UploadStatus = "processing" | "ready" | "failed";

interface UploadActivity {
  id: string;
  fileName: string;
  status: UploadStatus;
  chunksCreated?: number;
  title?: string;
  message?: string;
}

const acceptedExtensions = [".pdf", ".txt", ".md"] as const;
const acceptedMimeTypes = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown"
];

export function KnowledgeBaseWorkspace() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [activity, setActivity] = useState<UploadActivity[]>([]);
  const documentsQuery = useQuery({
    queryKey: ["knowledge-documents"],
    queryFn: listKnowledgeDocuments
  });
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadKnowledgeDocument({ file }),
    onMutate: (file) => {
      const activityId = getActivityId(file);
      setActivity((items) => [
        {
          id: activityId,
          fileName: file.name,
          status: "processing",
          message: "Extracting text, chunking content, and generating embeddings."
        },
        ...items.filter((item) => item.id !== activityId)
      ]);

      return { activityId, fileName: file.name };
    },
    onSuccess: (result, _file, context) => {
      setActivity((items) =>
        items.map((item) =>
          item.id === context?.activityId
            ? toReadyActivity(item, result)
            : item
        )
      );
      void queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
    },
    onError: (error, _file, context) => {
      setActivity((items) =>
        items.map((item) =>
          item.id === context?.activityId
            ? {
                ...item,
                status: "failed",
                message: getUserFriendlyErrorMessage(error)
              }
            : item
        )
      );
    }
  });
  const documents = documentsQuery.data ?? [];

  function handleFiles(files: FileList | File[]) {
    const [file] = Array.from(files);

    if (!file) {
      return;
    }

    const validationMessage = validateFile(file);

    if (validationMessage) {
      const activityId = getActivityId(file);
      setActivity((items) => [
        {
          id: activityId,
          fileName: file.name,
          status: "failed",
          message: validationMessage
        },
        ...items.filter((item) => item.id !== activityId)
      ]);
      return;
    }

    uploadMutation.mutate(file);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      handleFiles(event.target.files);
      event.target.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  return (
    <DashboardShell activeHref="/knowledge-base" title="Knowledge base">
      <PageHeader
        actions={<Badge tone="emerald">RAG source library</Badge>}
        description="Upload support PDFs, markdown, and text files that PulseDesk can retrieve when drafting human-reviewed AI replies."
        eyebrow="Protected workspace"
        title="Knowledge base"
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Upload documents</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  PulseDesk extracts text, creates overlapping chunks, embeds each chunk, and stores
                  it for semantic search during AI suggestion generation.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {acceptedExtensions.map((extension) => (
                  <FileTypeBadge extension={extension} key={extension} />
                ))}
              </div>
            </div>

            <label
              className={cn(
                "mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition",
                isDragging
                  ? "border-emerald-300 bg-emerald-400/10 shadow-glow"
                  : "border-zinc-700 bg-zinc-950/60 hover:border-emerald-400/50 hover:bg-zinc-900/70"
              )}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-lg font-black text-emerald-200">
                KB
              </span>
              <span className="mt-4 text-sm font-semibold text-white">
                Drop a PDF, TXT, or MD file here
              </span>
              <span className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
                Or click to browse. Uploaded documents become searchable RAG context for AI draft
                suggestions.
              </span>
              <input
                accept={acceptedExtensions.join(",")}
                className="sr-only"
                onChange={handleInputChange}
                ref={fileInputRef}
                type="file"
              />
            </label>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-zinc-500">
                Safety note: Do not upload sensitive production data in demo mode.
              </p>
              <Button
                disabled={uploadMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
                type="button"
                variant="secondary"
              >
                {uploadMutation.isPending ? "Uploading..." : "Choose file"}
              </Button>
            </div>
          </Card>

          {activity.length > 0 ? (
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">Recent ingestion</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Current upload state and latest chunk counts.
                  </p>
                </div>
                <Badge tone="teal">{activity.length} event{activity.length === 1 ? "" : "s"}</Badge>
              </div>
              <div className="mt-4 grid gap-3">
                {activity.map((item) => (
                  <ActivityCard activity={item} key={item.id} />
                ))}
              </div>
            </Card>
          ) : null}

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Ingested documents</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Ready documents are available to semantic search and AI suggestion prompts.
                </p>
              </div>
              <Badge tone="neutral">{documents.length} sources</Badge>
            </div>

            {documentsQuery.isLoading ? (
              <LoadingSkeleton label="Loading knowledge documents" rows={5} />
            ) : documentsQuery.isError ? (
              <ErrorState
                actionLabel="Retry"
                error={documentsQuery.error}
                onAction={() => void documentsQuery.refetch()}
                title="Could not load documents"
              />
            ) : documents.length === 0 ? (
              <EmptyState
                description="Upload a PDF, TXT, or MD support document to create searchable RAG context."
                title="No knowledge-base documents yet"
              />
            ) : (
              <DocumentResults documents={documents} />
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <HowItWorksCard />
          <Card className="border-amber-400/20 bg-amber-400/10 p-5">
            <Badge tone="amber">Demo safety</Badge>
            <h2 className="mt-4 text-sm font-semibold text-amber-100">
              Do not upload sensitive production data in demo mode.
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-100/75">
              Use realistic sample documents for portfolio demos. AI drafts are suggestions and
              must be reviewed before any customer-facing reply.
            </p>
          </Card>
        </aside>
      </div>
    </DashboardShell>
  );
}

function DocumentResults({ documents }: { documents: KnowledgeDocumentGroupDTO[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70 shadow-panel lg:block">
        <table className="w-full border-collapse text-left">
          <thead className="border-b border-zinc-800 bg-zinc-900/70 text-xs uppercase tracking-[0.16em] text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Document</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Chunks</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {documents.map((document) => (
              <tr className="transition hover:bg-zinc-900/70" key={getDocumentKey(document)}>
                <td className="max-w-md px-4 py-4">
                  <p className="truncate text-sm font-semibold text-zinc-100">{document.title}</p>
                  <p className="mt-1 truncate text-xs text-zinc-500">{document.sourceName}</p>
                </td>
                <td className="px-4 py-4">
                  <FileTypeBadge extension={document.sourceType} />
                </td>
                <td className="px-4 py-4 text-sm text-zinc-300">{document.chunkCount}</td>
                <td className="px-4 py-4">
                  <IngestionStatusBadge status="ready" />
                </td>
                <td className="px-4 py-4 text-sm text-zinc-400">
                  {formatDate(document.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {documents.map((document) => (
          <Card className="p-4" key={getDocumentKey(document)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-sm font-semibold text-white">{document.title}</h3>
                <p className="mt-1 truncate text-xs text-zinc-500">{document.sourceName}</p>
              </div>
              <IngestionStatusBadge status="ready" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <FileTypeBadge extension={document.sourceType} />
              <Badge tone="neutral">{document.chunkCount} chunks</Badge>
              <span className="text-xs text-zinc-500">Updated {formatDate(document.updatedAt)}</span>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function ActivityCard({ activity }: { activity: UploadActivity }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-100">
            {activity.title ?? activity.fileName}
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">{activity.message}</p>
        </div>
        <IngestionStatusBadge status={activity.status} />
      </div>
      {typeof activity.chunksCreated === "number" ? (
        <p className="mt-3 text-xs font-medium text-emerald-200">
          {activity.chunksCreated} chunks created
        </p>
      ) : null}
    </div>
  );
}

function HowItWorksCard() {
  const steps = [
    "Extract text",
    "Split into chunks",
    "Generate embeddings",
    "Search relevant snippets",
    "Draft human-reviewed replies"
  ];

  return (
    <Card className="p-5">
      <Badge tone="teal">RAG workflow</Badge>
      <h2 className="mt-4 text-base font-semibold text-white">
        How PulseDesk uses your knowledge base
      </h2>
      <div className="mt-5 space-y-3">
        {steps.map((step, index) => (
          <div className="flex gap-3" key={step}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-xs font-bold text-emerald-200">
              {index + 1}
            </span>
            <p className="pt-1 text-sm text-zinc-300">{step}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm leading-6 text-zinc-500">
        Retrieved snippets are used as grounding context. PulseDesk still keeps final replies under
        admin review.
      </p>
    </Card>
  );
}

function IngestionStatusBadge({ status }: { status: UploadStatus }) {
  const config: Record<UploadStatus, { label: string; tone: "emerald" | "amber" | "rose"; dot: string }> = {
    processing: {
      label: "Processing",
      tone: "amber",
      dot: "bg-amber-300"
    },
    ready: {
      label: "Ready",
      tone: "emerald",
      dot: "bg-emerald-300"
    },
    failed: {
      label: "Failed",
      tone: "rose",
      dot: "bg-rose-300"
    }
  };
  const current = config[status];

  return (
    <Badge className="gap-2" tone={current.tone}>
      <span className={cn("h-1.5 w-1.5 rounded-full", current.dot)} />
      {current.label}
    </Badge>
  );
}

function FileTypeBadge({ extension }: { extension: string }) {
  const normalized = normalizeExtension(extension);
  const tone = normalized === "PDF" ? "rose" : normalized === "MD" ? "teal" : "emerald";

  return <Badge tone={tone}>{normalized}</Badge>;
}

function validateFile(file: File): string | null {
  const fileName = file.name.toLowerCase();
  const hasSupportedExtension = acceptedExtensions.some((extension) => fileName.endsWith(extension));
  const hasSupportedMimeType = acceptedMimeTypes.includes(file.type);

  if (!hasSupportedExtension && !hasSupportedMimeType) {
    return "Unsupported file type. Upload a PDF, TXT, or MD document.";
  }

  return null;
}

function toReadyActivity(
  activity: UploadActivity,
  result: KnowledgeUploadResultDTO
): UploadActivity {
  return {
    ...activity,
    status: "ready",
    title: result.title,
    chunksCreated: result.chunksCreated,
    message: `${result.sourceName} is ready for RAG-based AI suggestions.`
  };
}

function getActivityId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function getDocumentKey(document: KnowledgeDocumentGroupDTO): string {
  return `${document.sourceName}-${document.title}-${document.createdAt}`;
}

function normalizeExtension(value: string): string {
  const cleanValue = value.trim().replace(/^\./, "");

  if (!cleanValue) {
    return "FILE";
  }

  if (cleanValue.includes("/")) {
    return cleanValue.split("/").pop()?.toUpperCase() ?? "FILE";
  }

  return cleanValue.toUpperCase();
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
