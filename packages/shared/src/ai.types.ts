import type { TicketCategory, TicketPriority } from "./ticket.types.js";

export type AiSuggestionStatus = "pending" | "generated" | "approved" | "edited" | "failed";

export interface AiSuggestionDTO {
  id: string;
  ticketId: string;
  status: AiSuggestionStatus;
  suggestedReply?: string;
  suggestedCategory?: TicketCategory;
  suggestedPriority?: TicketPriority;
  confidenceScore?: number;
  citations: KnowledgeSnippetDTO[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeSnippetDTO {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  content: string;
  score?: number;
}

export interface KnowledgeDocumentDTO {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  status: "uploaded" | "processing" | "ready" | "failed";
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}
