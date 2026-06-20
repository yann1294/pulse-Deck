import axios, { type AxiosRequestConfig } from "axios";
import type {
  AiSuggestionDTO,
  AiSuggestionStatus,
  CustomerDTO,
  PaginatedResponse,
  TicketCategory,
  TicketDTO,
  TicketPriority,
  TicketStatus
} from "@pulsedesk/shared";
import { toApiClientError } from "./api-errors";

type TokenProvider = () => Promise<string | null>;

let authTokenProvider: TokenProvider | null = null;

export function setApiAuthTokenProvider(provider: TokenProvider | null): void {
  authTokenProvider = provider;
}

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  timeout: 20_000
});

apiClient.interceptors.request.use(async (config) => {
  const token = authTokenProvider ? await authTokenProvider() : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export interface CreateTicketInput {
  customerName: string;
  customerEmail: string;
  company?: string;
  title: string;
  description: string;
  attachmentUrl?: string;
}

export interface ListTicketsParams {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AiSuggestionListItemDTO {
  id: string;
  ticketId: string;
  ticketTitle: string;
  customerName?: string;
  customerEmail?: string;
  status: AiSuggestionStatus;
  confidenceScore?: number;
  priority?: TicketPriority;
  category?: TicketCategory;
  suggestedReply?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListAiSuggestionsParams {
  status?: AiSuggestionStatus;
  minConfidence?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CustomerListItemDTO {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  ticketCount: number;
  openTicketCount?: number;
  latestTicketAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListCustomersParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminTicketDetailDTO {
  ticket: TicketDTO;
  customer: CustomerDTO;
  customerHistory: TicketDTO[];
  aiSuggestions: AiSuggestionDTO[];
}

export interface GenerateAiSuggestionResultDTO {
  ticket: TicketDTO;
  suggestion: AiSuggestionDTO & {
    summary?: string;
    retrievedContext?: unknown;
  };
}

export interface KnowledgeUploadResultDTO {
  title: string;
  sourceName: string;
  chunksCreated: number;
}

export interface KnowledgeDocumentGroupDTO {
  title: string;
  sourceName: string;
  sourceType: string;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export async function createTicket(input: CreateTicketInput): Promise<TicketDTO> {
  return request<TicketDTO>({
    method: "POST",
    url: "/tickets",
    data: input
  });
}

export async function listTickets(
  params: ListTicketsParams = {}
): Promise<PaginatedResponse<TicketDTO>> {
  return request<PaginatedResponse<TicketDTO>>({
    method: "GET",
    url: "/tickets",
    params
  });
}

export async function listAiSuggestions(
  params: ListAiSuggestionsParams = {}
): Promise<PaginatedResponse<AiSuggestionListItemDTO>> {
  // MVP fallback: derive suggestions from ticket list data until GET /ai-suggestions exists.
  const tickets = await listTickets({ page: 1, limit: params.limit ?? 100 });
  const search = params.search?.trim().toLowerCase();
  const suggestions = tickets.data
    .flatMap((ticket) => {
      if (ticket.aiSuggestions?.length) {
        return ticket.aiSuggestions.map((suggestion) => toAiSuggestionListItem(ticket, suggestion));
      }

      if (ticket.latestAiSuggestion) {
        return [toAiSuggestionListItem(ticket, ticket.latestAiSuggestion)];
      }

      return [];
    })
    .filter((suggestion) => !params.status || suggestion.status === params.status)
    .filter((suggestion) => {
      if (typeof params.minConfidence !== "number") {
        return true;
      }

      return typeof suggestion.confidenceScore === "number" && suggestion.confidenceScore >= params.minConfidence;
    })
    .filter((suggestion) => {
      if (!search) {
        return true;
      }

      return [
        suggestion.ticketTitle,
        suggestion.customerName,
        suggestion.customerEmail,
        suggestion.suggestedReply,
        suggestion.category,
        suggestion.priority
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });

  return {
    data: suggestions,
    page: params.page ?? 1,
    pageSize: params.limit ?? suggestions.length,
    totalItems: suggestions.length,
    totalPages: suggestions.length > 0 ? 1 : 0
  };
}

export async function listCustomers(
  params: ListCustomersParams = {}
): Promise<PaginatedResponse<CustomerListItemDTO>> {
  // MVP fallback: derive customers from ticket list data until the backend exposes GET /customers.
  const tickets = await listTickets({ page: 1, limit: params.limit ?? 100 });
  const search = params.search?.trim().toLowerCase();
  const customers = Array.from(
    tickets.data.reduce((summaries, ticket) => {
      if (!ticket.customer) {
        return summaries;
      }

      const existing = summaries.get(ticket.customer.id);
      const latestTicketAt =
        !existing?.latestTicketAt || ticket.updatedAt > existing.latestTicketAt
          ? ticket.updatedAt
          : existing.latestTicketAt;

      summaries.set(ticket.customer.id, {
        id: ticket.customer.id,
        name: ticket.customer.name,
        email: ticket.customer.email,
        ...(ticket.customer.companyName ? { companyName: ticket.customer.companyName } : {}),
        ticketCount: (existing?.ticketCount ?? 0) + 1,
        openTicketCount:
          (existing?.openTicketCount ?? 0) + (ticket.status === "resolved" ? 0 : 1),
        latestTicketAt,
        createdAt: ticket.customer.createdAt,
        updatedAt: ticket.customer.updatedAt
      });

      return summaries;
    }, new Map<string, CustomerListItemDTO>()).values()
  )
    .filter((customer) => {
      if (!search) {
        return true;
      }

      return [customer.name, customer.email, customer.companyName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    })
    .sort((left, right) => {
      const rightDate = right.latestTicketAt ?? right.updatedAt;
      const leftDate = left.latestTicketAt ?? left.updatedAt;
      return rightDate.localeCompare(leftDate);
    });

  return {
    data: customers,
    page: params.page ?? 1,
    pageSize: params.limit ?? customers.length,
    totalItems: customers.length,
    totalPages: customers.length > 0 ? 1 : 0
  };
}

export async function getTicket(ticketId: string): Promise<AdminTicketDetailDTO> {
  return request<AdminTicketDetailDTO>({
    method: "GET",
    url: `/tickets/${encodeURIComponent(ticketId)}`
  });
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus
): Promise<TicketDTO> {
  return request<TicketDTO>({
    method: "PATCH",
    url: `/tickets/${encodeURIComponent(ticketId)}/status`,
    data: { status }
  });
}

export async function generateAiSuggestion(
  ticketId: string
): Promise<GenerateAiSuggestionResultDTO> {
  return request<GenerateAiSuggestionResultDTO>({
    method: "POST",
    url: `/tickets/${encodeURIComponent(ticketId)}/generate-ai-suggestion`
  });
}

export async function uploadKnowledgeDocument(input: {
  file: File;
  title?: string;
}): Promise<KnowledgeUploadResultDTO> {
  const formData = new FormData();
  formData.append("file", input.file);

  if (input.title?.trim()) {
    formData.append("title", input.title.trim());
  }

  return request<KnowledgeUploadResultDTO>({
    method: "POST",
    url: "/knowledge-base/upload",
    data: formData
  });
}

export async function listKnowledgeDocuments(): Promise<KnowledgeDocumentGroupDTO[]> {
  return request<KnowledgeDocumentGroupDTO[]>({
    method: "GET",
    url: "/knowledge-base/documents"
  });
}

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await apiClient.request<T>(config);
    return response.data;
  } catch (error: unknown) {
    throw toApiClientError(error);
  }
}

function toAiSuggestionListItem(
  ticket: TicketDTO,
  suggestion: NonNullable<TicketDTO["latestAiSuggestion"]> | AiSuggestionDTO
): AiSuggestionListItemDTO {
  return {
    id: suggestion.id,
    ticketId: ticket.id,
    ticketTitle: ticket.subject,
    ...(ticket.customer?.name ? { customerName: ticket.customer.name } : {}),
    ...(ticket.customer?.email ? { customerEmail: ticket.customer.email } : {}),
    status: suggestion.status,
    ...(typeof suggestion.confidenceScore === "number"
      ? { confidenceScore: suggestion.confidenceScore }
      : {}),
    priority: "suggestedPriority" in suggestion && suggestion.suggestedPriority
      ? suggestion.suggestedPriority
      : ticket.priority,
    category: "suggestedCategory" in suggestion && suggestion.suggestedCategory
      ? suggestion.suggestedCategory
      : ticket.category,
    ...("suggestedReply" in suggestion && suggestion.suggestedReply
      ? { suggestedReply: suggestion.suggestedReply }
      : {}),
    createdAt: suggestion.createdAt,
    updatedAt: "updatedAt" in suggestion ? suggestion.updatedAt : suggestion.createdAt
  };
}
