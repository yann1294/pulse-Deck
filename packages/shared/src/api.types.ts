export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  requestId?: string;
  details?: Record<string, unknown>;
}
