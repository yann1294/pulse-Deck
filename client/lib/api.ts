import axios, { type AxiosRequestConfig } from "axios";
import type {
  AiSuggestionDTO,
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
