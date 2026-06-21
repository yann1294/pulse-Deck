import { expect, type Page, type Route, test } from "@playwright/test";

const customer = {
  id: "customer_e2e_1",
  name: "Mira Patel",
  email: "mira@example.com",
  companyName: "Northstar Labs",
  createdAt: "2026-01-12T10:00:00.000Z",
  updatedAt: "2026-01-20T10:00:00.000Z",
  ticketCount: 2,
  openTicketCount: 1,
  resolvedTicketCount: 1,
  latestTicketAt: "2026-01-20T10:00:00.000Z"
};

const ticket = {
  id: "ticket_e2e_1",
  subject: "Checkout webhooks are delayed",
  description: "Customer reports delayed checkout webhook delivery in production.",
  status: "open",
  priority: "urgent",
  category: "technical",
  customerId: customer.id,
  customer,
  latestAiSuggestion: {
    id: "suggestion_e2e_1",
    status: "generated",
    suggestedReply: "We are checking webhook delivery logs and will follow up shortly.",
    confidenceScore: 0.84,
    createdAt: "2026-01-20T10:00:00.000Z"
  },
  createdAt: "2026-01-20T10:00:00.000Z",
  updatedAt: "2026-01-20T10:00:00.000Z"
};

const paginatedTickets = {
  data: [ticket],
  page: 1,
  pageSize: 25,
  totalItems: 1,
  totalPages: 1
};

async function mockDashboardApi(page: Page): Promise<void> {
  // Dashboard tests run with PLAYWRIGHT_MOCK_AUTH=true from playwright.config.ts.
  // API calls are mocked when the browser requests the local NestJS origin; if the
  // app renders before data arrives, route assertions still guard against 404 regressions.
  const apiResponses = new Map<string, unknown>([
    ["/tickets", paginatedTickets],
    [
      `/tickets/${ticket.id}`,
      {
        ticket,
        customer,
        customerHistory: [],
        aiSuggestions: [
          {
            id: "suggestion_e2e_1",
            ticketId: ticket.id,
            status: "generated",
            summary: "Webhook delivery delay needs investigation.",
            suggestedReply: "We are checking webhook delivery logs and will follow up shortly.",
            confidenceScore: 0.84,
            citations: [],
            createdAt: "2026-01-20T10:02:00.000Z",
            updatedAt: "2026-01-20T10:02:00.000Z"
          }
        ]
      }
    ],
    [`/tickets/${ticket.id}/messages`, []],
    [
      "/customers",
      {
        data: [customer],
        page: 1,
        pageSize: 100,
        totalItems: 1,
        totalPages: 1
      }
    ],
    [
      `/customers/${customer.id}`,
      {
        customer,
        metrics: {
          totalTickets: 2,
          openTickets: 1,
          resolvedTickets: 1
        },
        recentTickets: [
          {
            id: ticket.id,
            title: ticket.subject,
            status: ticket.status,
            priority: ticket.priority,
            category: ticket.category,
            createdAt: ticket.createdAt,
            latestAiSuggestionStatus: "generated"
          }
        ]
      }
    ],
    [`/customers/${customer.id}/timeline`, []],
    [
      "/ai-suggestions",
      {
        data: [
          {
            id: "suggestion_e2e_1",
            ticketId: ticket.id,
            ticketTitle: ticket.subject,
            customerName: customer.name,
            customerEmail: customer.email,
            summary: "Webhook delivery delay needs investigation.",
            confidence: 0.84,
            confidenceScore: 0.84,
            status: "generated",
            model: "gemini-3.5-flash",
            createdAt: "2026-01-20T10:02:00.000Z",
            priority: ticket.priority,
            category: ticket.category,
            suggestedReply: "We are checking webhook delivery logs and will follow up shortly."
          }
        ],
        page: 1,
        pageSize: 100,
        totalItems: 1,
        totalPages: 1
      }
    ],
    ["/knowledge-base/documents", []]
  ]);

  await page.route("**/socket.io/**", (route) => route.abort());
  await page.route(/^http:\/\/localhost:4000\/.*/, (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname.replace(/\/$/, "");
    const response = apiResponses.get(pathname);

    if (response === undefined) {
      return fulfillJson(route, {
        data: [],
        page: 1,
        pageSize: 0,
        totalItems: 0,
        totalPages: 0
      });
    }

    return fulfillJson(route, response);
  });
}

async function fulfillJson(route: Route, json: unknown): Promise<void> {
  await route.fulfill({
    contentType: "application/json",
    json
  });
}

async function expectNoNextNotFound(page: Page): Promise<void> {
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("This page could not be found");
}

test("landing page loads", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expectNoNextNotFound(page);
  await expect(page.getByRole("heading", { name: /production SaaS product/i })).toBeVisible();
});

test("/submit-ticket loads", async ({ page }) => {
  await page.goto("/submit-ticket", { waitUntil: "domcontentloaded" });
  await expectNoNextNotFound(page);
  await expect(page.getByRole("heading", { name: /blocking your team/i })).toBeVisible();
});

test("dashboard renders with mocked auth and exposes primary navigation", async ({ page }) => {
  await mockDashboardApi(page);
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expectNoNextNotFound(page);

  await expect(page.getByRole("link", { name: "Tickets" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "AI Suggestions" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Customers" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Knowledge Base" }).first()).toBeVisible();
});

test("/dashboard/tickets is not a Next.js 404 page", async ({ page }) => {
  await mockDashboardApi(page);
  await page.goto("/dashboard/tickets", { waitUntil: "domcontentloaded" });
  await expectNoNextNotFound(page);
  await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();
});

test("/dashboard/ai-suggestions is not a Next.js 404 page", async ({ page }) => {
  await mockDashboardApi(page);
  await page.goto("/dashboard/ai-suggestions", { waitUntil: "domcontentloaded" });
  await expectNoNextNotFound(page);
  await expect(page.getByRole("heading", { name: "AI suggestions" })).toBeVisible();
});

test("/dashboard/customers is not a Next.js 404 page", async ({ page }) => {
  await mockDashboardApi(page);
  await page.goto("/dashboard/customers", { waitUntil: "domcontentloaded" });
  await expectNoNextNotFound(page);
  await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
});

test("ticket detail route is not a Next.js 404 page", async ({ page }) => {
  await mockDashboardApi(page);
  await page.goto(`/dashboard/tickets/${ticket.id}`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/dashboard/tickets/${ticket.id}$`));
  await expectNoNextNotFound(page);
  await expect(page.locator("body")).toContainText("Ticket detail");
});

test("customer detail route is not a Next.js 404 page", async ({ page }) => {
  await mockDashboardApi(page);
  await page.goto(`/dashboard/customers/${customer.id}`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/dashboard/customers/${customer.id}$`));
  await expectNoNextNotFound(page);
  await expect(page.locator("body")).toContainText("Customer detail");
});
