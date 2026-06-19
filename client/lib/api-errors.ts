import axios from "axios";
import type { ApiErrorResponse } from "@pulsedesk/shared";

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

export class ApiClientError extends Error {
  statusCode?: number;
  requestId?: string;

  constructor(message: string, options?: { statusCode?: number; requestId?: string }) {
    super(message);
    this.name = "ApiClientError";
    this.statusCode = options?.statusCode;
    this.requestId = options?.requestId;
  }
}

export function toApiClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (axios.isAxiosError<ApiErrorResponse | { message?: unknown }>(error)) {
    const statusCode = error.response?.status;
    const responseData = error.response?.data;
    const responseMessage = normalizeResponseMessage(responseData?.message);
    const requestId = isApiErrorResponse(responseData) ? responseData.requestId : undefined;

    return new ApiClientError(
      responseMessage ?? getStatusMessage(statusCode) ?? FALLBACK_MESSAGE,
      {
        statusCode,
        requestId
      }
    );
  }

  if (error instanceof Error && error.message) {
    return new ApiClientError(error.message);
  }

  return new ApiClientError(FALLBACK_MESSAGE);
}

export function getUserFriendlyErrorMessage(error: unknown): string {
  return toApiClientError(error).message;
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

function normalizeResponseMessage(message: unknown): string | undefined {
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }

  if (Array.isArray(message)) {
    const firstMessage = message.find((item) => typeof item === "string" && item.trim());
    return typeof firstMessage === "string" ? firstMessage : undefined;
  }

  return undefined;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return Boolean(value && typeof value === "object" && "statusCode" in value);
}

function getStatusMessage(statusCode: number | undefined): string | undefined {
  switch (statusCode) {
    case 400:
      return "Please check the submitted information and try again.";
    case 401:
      return "Please sign in to continue.";
    case 403:
      return "You do not have access to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return "This request conflicts with existing data.";
    case 413:
      return "The uploaded file is too large.";
    case 500:
    case 502:
    case 503:
      return "The service is temporarily unavailable. Please try again shortly.";
    default:
      return undefined;
  }
}
