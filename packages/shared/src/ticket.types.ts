import type { AiSuggestionDTO, AiSuggestionStatus } from "./ai.types.js";
import type { CustomerDTO } from "./customer.types.js";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_customer"
  | "resolved";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TicketCategory =
  | "billing"
  | "technical"
  | "account"
  | "bug"
  | "feature_request"
  | "other";

export interface TicketDTO {
  id: string;
  subject: string;
  description: string;
  attachmentUrl?: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  customerId: string;
  customer?: CustomerDTO;
  latestAiSuggestion?: AiSuggestionSummaryDTO;
  aiSuggestions?: AiSuggestionDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface AiSuggestionSummaryDTO {
  id: string;
  status: AiSuggestionStatus;
  suggestedReply?: string;
  confidenceScore?: number;
  createdAt: string;
}
