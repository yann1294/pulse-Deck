import type { Route } from "next";

export const routes = {
  home: () => "/" as Route,
  submitTicket: () => "/submit-ticket" as Route,
  dashboard: () => "/dashboard" as Route,
  tickets: () => "/dashboard/tickets" as Route,
  ticketDetail: (id: string) => `/dashboard/tickets/${encodeURIComponent(id)}` as Route,
  aiSuggestions: () => "/dashboard/ai-suggestions" as Route,
  customers: () => "/dashboard/customers" as Route,
  customerDetail: (id: string) => `/dashboard/customers/${encodeURIComponent(id)}` as Route,
  knowledgeBase: () => "/knowledge-base" as Route,
  signIn: () => "/sign-in" as Route,
  signUp: () => "/sign-up" as Route
} as const;
