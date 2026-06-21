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
import { ApiClientError, isApiClientError, toApiClientError } from "./api-errors";

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
  summary?: string;
  status: AiSuggestionStatus;
  model?: string;
  confidence?: number;
  confidenceScore?: number;
  priority?: TicketPriority;
  category?: TicketCategory;
  suggestedReply?: string;
  originalSuggestedReply?: string;
  finalApprovedReply?: string;
  approvedAt?: string;
  approvedByUserId?: string;
  editedBeforeApproval?: boolean;
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

export interface CustomerDetailDTO extends CustomerListItemDTO {
  resolvedTicketCount: number;
  tickets: TicketDTO[];
}

interface CustomerApiListItemDTO {
  id: string;
  name: string;
  email: string;
  company?: string;
  companyName?: string;
  createdAt: string;
  ticketCount: number;
  openTicketCount: number;
  resolvedTicketCount?: number;
  latestTicketAt?: string;
}

interface CustomerApiDetailDTO {
  customer: CustomerApiListItemDTO;
  metrics: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
  };
  recentTickets: Array<{
    id: string;
    title: string;
    status: TicketStatus;
    priority: TicketPriority;
    category: TicketCategory;
    createdAt: string;
    latestAiSuggestionStatus?: AiSuggestionStatus;
  }>;
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

export type TicketMessageAuthorType = "customer" | "admin" | "ai" | "system";

export interface TicketMessageDTO {
  id: string;
  ticketId: string;
  authorType: TicketMessageAuthorType;
  authorName?: string;
  authorEmail?: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
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
  const response = await requestWithMessage<PaginatedResponse<AiSuggestionListItemDTO>>(
    {
      method: "GET",
      url: "/ai-suggestions",
      params: {
        status: params.status,
        search: params.search,
        page: params.page,
        limit: params.limit
      }
    },
    "AI suggestions could not be loaded. Please retry in a moment."
  );

  if (typeof params.minConfidence !== "number") {
    return response;
  }

  const filteredSuggestions = response.data.filter((suggestion) => {
    const confidence = suggestion.confidenceScore ?? suggestion.confidence;

    return typeof confidence === "number" && confidence >= params.minConfidence!;
  });

  return {
    ...response,
    data: filteredSuggestions,
    totalItems: filteredSuggestions.length,
    totalPages: filteredSuggestions.length > 0 ? 1 : 0
  };
}

export async function listCustomers(
  params: ListCustomersParams = {}
): Promise<PaginatedResponse<CustomerListItemDTO>> {
  const response = await requestWithMessage<PaginatedResponse<CustomerApiListItemDTO>>(
    {
      method: "GET",
      url: "/customers",
      params
    },
    "Customers could not be loaded. Please retry in a moment."
  );

  return {
    ...response,
    data: response.data.map(toCustomerListItem)
  };
}

export async function getCustomer(customerId: string): Promise<CustomerDetailDTO | null> {
  let response: CustomerApiDetailDTO;

  try {
    response = await requestWithMessage<CustomerApiDetailDTO>(
      {
        method: "GET",
        url: `/customers/${encodeURIComponent(customerId)}`
      },
      "Customer details could not be loaded. Please retry in a moment."
    );
  } catch (error: unknown) {
    if (isApiClientError(error) && error.statusCode === 404) {
      return null;
    }

    throw error;
  }
  const customer = toCustomerListItem(response.customer);

  return {
    ...customer,
    ticketCount: response.metrics.totalTickets,
    openTicketCount: response.metrics.openTickets,
    resolvedTicketCount: response.metrics.resolvedTickets,
    tickets: response.recentTickets.map((ticket) => ({
      id: ticket.id,
      subject: ticket.title,
      description: "",
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      customerId,
      ...(ticket.latestAiSuggestionStatus
        ? {
            latestAiSuggestion: {
              id: `${ticket.id}-latest-ai-suggestion`,
              status: ticket.latestAiSuggestionStatus,
              createdAt: ticket.createdAt
            }
          }
        : {}),
      createdAt: ticket.createdAt,
      updatedAt: ticket.createdAt
    }))
  };
}

export async function getTicket(ticketId: string): Promise<AdminTicketDetailDTO> {
  return request<AdminTicketDetailDTO>({
    method: "GET",
    url: `/tickets/${encodeURIComponent(ticketId)}`
  });
}

export async function getTicketMessages(ticketId: string): Promise<TicketMessageDTO[]> {
  return requestWithMessage<TicketMessageDTO[]>(
    {
      method: "GET",
      url: `/tickets/${encodeURIComponent(ticketId)}/messages`
    },
    "Ticket conversation could not be loaded. Please retry in a moment."
  );
}

export async function createTicketMessage(ticketId: string, body: string): Promise<TicketMessageDTO> {
  return requestWithMessage<TicketMessageDTO>(
    {
      method: "POST",
      url: `/tickets/${encodeURIComponent(ticketId)}/messages`,
      data: { body }
    },
    "Reply could not be sent. Please try again."
  );
}

export async function createInternalNote(ticketId: string, body: string): Promise<TicketMessageDTO> {
  return requestWithMessage<TicketMessageDTO>(
    {
      method: "POST",
      url: `/tickets/${encodeURIComponent(ticketId)}/internal-notes`,
      data: { body }
    },
    "Internal note could not be saved. Please try again."
  );
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

async function requestWithMessage<T>(config: AxiosRequestConfig, message: string): Promise<T> {
  try {
    return await request<T>(config);
  } catch (error: unknown) {
    const apiError = toApiClientError(error);

    if (apiError.statusCode === 401 || apiError.statusCode === 403 || apiError.statusCode === 404) {
      throw apiError;
    }

    throw new ApiClientError(message, {
      statusCode: apiError.statusCode,
      requestId: apiError.requestId
    });
  }
}

function toCustomerListItem(customer: CustomerApiListItemDTO): CustomerListItemDTO {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    ...(customer.companyName ?? customer.company ? { companyName: customer.companyName ?? customer.company } : {}),
    ticketCount: customer.ticketCount,
    openTicketCount: customer.openTicketCount,
    ...(typeof customer.resolvedTicketCount === "number"
      ? { resolvedTicketCount: customer.resolvedTicketCount }
      : {}),
    ...(customer.latestTicketAt ? { latestTicketAt: customer.latestTicketAt } : {}),
    createdAt: customer.createdAt,
    updatedAt: customer.latestTicketAt ?? customer.createdAt
  };
}
