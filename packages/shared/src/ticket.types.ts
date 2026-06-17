import type { AiSuggestionDTO } from "./ai.types.js";
import type { CustomerDTO } from "./customer.types.js";

export type TicketStatus =
  | "new"
  | "open"
  | "in_progress"
  | "waiting_on_customer"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "normal" | "high" | "urgent";

export type TicketCategory =
  | "general"
  | "billing"
  | "technical"
  | "account"
  | "feature_request"
  | "bug";

export interface TicketDTO {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  customerId: string;
  customer?: CustomerDTO;
  aiSuggestions?: AiSuggestionDTO[];
  createdAt: string;
  updatedAt: string;
}
