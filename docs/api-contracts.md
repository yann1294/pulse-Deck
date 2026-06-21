# PulseDesk API Contracts

This document describes the current implemented PulseDesk NestJS API. Routes are shown relative to the backend origin, for example `https://api.example.com/tickets`.

Protected routes require a Clerk session token:

```http
Authorization: Bearer <clerk-session-token>
```

The backend uses NestJS validation with `whitelist`, `forbidNonWhitelisted`, and `transform` enabled. Unknown request fields are rejected on validated DTOs.

## Common DTOs

### Enum Values

```ts
type TicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved";
type TicketPriority = "low" | "medium" | "high" | "urgent";
type TicketCategory = "billing" | "technical" | "account" | "bug" | "feature_request" | "other";
type AiSuggestionStatus = "pending" | "generated" | "approved" | "edited" | "failed";
type TicketMessageAuthorType = "customer" | "admin" | "ai" | "system";
type TicketSlaStatus = "ON_TRACK" | "DUE_SOON" | "OVERDUE";
```

`POST /tickets/:id/messages` accepts `authorType` as `"ADMIN"` or `"CUSTOMER"` in the request body. Responses return lowercase values such as `"admin"` and `"customer"`.

### Pagination

```json
{
  "data": [],
  "page": 1,
  "pageSize": 20,
  "totalItems": 0,
  "totalPages": 0
}
```

### Ticket

```json
{
  "id": "ticket_123",
  "subject": "CSV export fails",
  "description": "The export job fails after reaching 80%.",
  "attachmentUrl": "https://example.com/screenshot.png",
  "status": "open",
  "priority": "high",
  "category": "technical",
  "customerId": "customer_123",
  "customer": {
    "id": "customer_123",
    "name": "Mira Patel",
    "email": "mira@example.com",
    "companyName": "Northstar Labs",
    "ticketCount": 3,
    "createdAt": "2026-01-20T10:00:00.000Z",
    "updatedAt": "2026-01-20T10:00:00.000Z"
  },
  "latestAiSuggestion": {
    "id": "suggestion_123",
    "status": "generated",
    "confidenceScore": 0.82,
    "createdAt": "2026-01-20T10:02:00.000Z"
  },
  "sla": {
    "dueAt": "2026-01-20T14:00:00.000Z",
    "minutesRemaining": 180,
    "status": "ON_TRACK"
  },
  "createdAt": "2026-01-20T10:00:00.000Z",
  "updatedAt": "2026-01-20T10:02:00.000Z"
}
```

### API Errors

NestJS returns standard JSON errors. Common shapes:

```json
{
  "statusCode": 400,
  "message": ["description must be longer than or equal to 10 characters"],
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 404,
  "message": "Ticket not found",
  "error": "Not Found"
}
```

Common status codes:

- `400`: validation failure or invalid relationship.
- `401`: missing or invalid Clerk token on protected routes.
- `404`: requested ticket, customer, or suggestion was not found.
- `413`: uploaded file exceeds the configured upload limit.
- `503`: AI, embedding, or provider-dependent work failed.

## 1. Health

### GET `/health`

Purpose: verify that the NestJS API is running.

Auth: public.

Request: no body or query params.

Example response:

```json
{
  "status": "ok",
  "service": "pulsedesk-api"
}
```

Error cases:

- Platform-level `5xx` if the service is unavailable.

## 2. Tickets

### POST `/tickets`

Purpose: create a public customer support ticket. The backend upserts the customer by email, stores the ticket, and attempts to enqueue AI jobs. If queue enqueueing fails, ticket creation still succeeds.

Auth: public.

Request body:

```json
{
  "customerName": "Mira Patel",
  "customerEmail": "mira@example.com",
  "company": "Northstar Labs",
  "title": "CSV export fails",
  "description": "The monthly CSV export fails after reaching 80%.",
  "attachmentUrl": "https://example.com/export-error.png"
}
```

Validation:

- `customerName`: required, 1-120 chars.
- `customerEmail`: required email, max 255 chars.
- `company`: optional, max 120 chars.
- `title`: required, 1-180 chars.
- `description`: required, 10-5000 chars.
- `attachmentUrl`: optional URL with protocol, max 2048 chars.

Example response:

```json
{
  "id": "ticket_123",
  "subject": "CSV export fails",
  "description": "The monthly CSV export fails after reaching 80%.",
  "status": "open",
  "priority": "medium",
  "category": "other",
  "customerId": "customer_123",
  "customer": {
    "id": "customer_123",
    "name": "Mira Patel",
    "email": "mira@example.com",
    "companyName": "Northstar Labs",
    "ticketCount": 1,
    "createdAt": "2026-01-20T10:00:00.000Z",
    "updatedAt": "2026-01-20T10:00:00.000Z"
  },
  "aiStatus": "PENDING",
  "sla": {
    "dueAt": "2026-01-21T10:00:00.000Z",
    "minutesRemaining": 1440,
    "status": "ON_TRACK"
  },
  "createdAt": "2026-01-20T10:00:00.000Z",
  "updatedAt": "2026-01-20T10:00:00.000Z"
}
```

Error cases:

- `400`: invalid request body or unknown fields.

### GET `/tickets`

Purpose: list dashboard tickets with filters, pagination, latest AI suggestion summary, customer data, and dynamic SLA.

Auth: Clerk-protected.

Query params:

- `status`: optional `TicketStatus`.
- `priority`: optional `TicketPriority`.
- `category`: optional `TicketCategory`.
- `search`: optional string, max 120 chars. Searches ticket subject, description, customer name, email, and company.
- `page`: optional integer, default `1`, min `1`.
- `limit`: optional integer, default `20`, min `1`, max `100`.

Example response:

```json
{
  "data": [
    {
      "id": "ticket_123",
      "subject": "CSV export fails",
      "description": "The monthly CSV export fails after reaching 80%.",
      "status": "open",
      "priority": "high",
      "category": "technical",
      "customerId": "customer_123",
      "customer": {
        "id": "customer_123",
        "name": "Mira Patel",
        "email": "mira@example.com",
        "companyName": "Northstar Labs",
        "ticketCount": 3,
        "createdAt": "2026-01-20T10:00:00.000Z",
        "updatedAt": "2026-01-20T10:00:00.000Z"
      },
      "latestAiSuggestion": {
        "id": "suggestion_123",
        "status": "generated",
        "suggestedReply": "Thanks for the report. We are checking the export job logs.",
        "confidenceScore": 0.82,
        "createdAt": "2026-01-20T10:02:00.000Z"
      },
      "sla": {
        "dueAt": "2026-01-20T14:00:00.000Z",
        "minutesRemaining": 180,
        "status": "ON_TRACK"
      },
      "createdAt": "2026-01-20T10:00:00.000Z",
      "updatedAt": "2026-01-20T10:02:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalItems": 1,
  "totalPages": 1
}
```

Error cases:

- `400`: invalid query param.
- `401`: missing or invalid Clerk token.

### GET `/tickets/:id`

Purpose: fetch a ticket detail workspace payload with ticket, customer, customer ticket history, and all AI suggestions.

Auth: Clerk-protected.

Path params:

- `id`: ticket id.

Example response:

```json
{
  "ticket": {
    "id": "ticket_123",
    "subject": "CSV export fails",
    "description": "The monthly CSV export fails after reaching 80%.",
    "status": "open",
    "priority": "high",
    "category": "technical",
    "customerId": "customer_123",
    "sla": {
      "dueAt": "2026-01-20T14:00:00.000Z",
      "minutesRemaining": 180,
      "status": "ON_TRACK"
    },
    "createdAt": "2026-01-20T10:00:00.000Z",
    "updatedAt": "2026-01-20T10:02:00.000Z"
  },
  "customer": {
    "id": "customer_123",
    "name": "Mira Patel",
    "email": "mira@example.com",
    "companyName": "Northstar Labs",
    "ticketCount": 3,
    "createdAt": "2026-01-10T09:00:00.000Z",
    "updatedAt": "2026-01-20T10:02:00.000Z"
  },
  "customerHistory": [],
  "aiSuggestions": [
    {
      "id": "suggestion_123",
      "ticketId": "ticket_123",
      "status": "generated",
      "summary": "Customer cannot complete CSV export.",
      "suggestedReply": "Thanks for the report. We are checking the export job logs.",
      "originalSuggestedReply": "Thanks for the report. We are checking the export job logs.",
      "editedBeforeApproval": false,
      "suggestedCategory": "technical",
      "suggestedPriority": "high",
      "confidenceScore": 0.82,
      "citations": [],
      "ragSnippets": [],
      "retrievedContext": {
        "snippets": []
      },
      "createdAt": "2026-01-20T10:02:00.000Z",
      "updatedAt": "2026-01-20T10:02:00.000Z"
    }
  ]
}
```

Error cases:

- `401`: missing or invalid Clerk token.
- `404`: ticket not found.

### PATCH `/tickets/:id/status`

Purpose: update a ticket status. Setting status to `resolved` also sets `resolvedAt`; other statuses clear `resolvedAt`.

Auth: Clerk-protected.

Request body:

```json
{
  "status": "resolved"
}
```

Example response: `Ticket` DTO.

Error cases:

- `400`: invalid status.
- `401`: missing or invalid Clerk token.
- `404`: ticket not found.

### POST `/tickets/:id/generate-ai-suggestion`

Purpose: synchronously generate an AI suggestion for a ticket. This endpoint retrieves RAG context, classifies category, predicts priority, stores the suggestion, updates the ticket, and emits realtime events.

Auth: Clerk-protected.

Request: no body.

Example response:

```json
{
  "ticket": {
    "id": "ticket_123",
    "subject": "CSV export fails",
    "description": "The monthly CSV export fails after reaching 80%.",
    "status": "open",
    "priority": "high",
    "category": "technical",
    "customerId": "customer_123",
    "sla": {
      "dueAt": "2026-01-20T14:00:00.000Z",
      "minutesRemaining": 180,
      "status": "ON_TRACK"
    },
    "createdAt": "2026-01-20T10:00:00.000Z",
    "updatedAt": "2026-01-20T10:02:00.000Z"
  },
  "suggestion": {
    "id": "suggestion_123",
    "ticketId": "ticket_123",
    "status": "generated",
    "summary": "Customer cannot complete CSV export.",
    "suggestedReply": "Thanks for the report. We are checking the export job logs.",
    "originalSuggestedReply": "Thanks for the report. We are checking the export job logs.",
    "editedBeforeApproval": false,
    "suggestedCategory": "technical",
    "suggestedPriority": "high",
    "confidenceScore": 0.82,
    "citations": [],
    "retrievedContext": {
      "snippets": []
    },
    "createdAt": "2026-01-20T10:02:00.000Z",
    "updatedAt": "2026-01-20T10:02:00.000Z"
  }
}
```

Error cases:

- `401`: missing or invalid Clerk token.
- `404`: ticket not found.
- `503`: Gemini, embedding, or RAG-dependent generation failed. A failed suggestion record is saved.

## 3. Ticket Messages / Conversation

### GET `/tickets/:id/messages`

Purpose: list a ticket conversation, including internal notes, sorted oldest first.

Auth: Clerk-protected.

Example response:

```json
[
  {
    "id": "message_123",
    "ticketId": "ticket_123",
    "authorType": "customer",
    "authorName": "Mira Patel",
    "authorEmail": "mira@example.com",
    "body": "The export is still failing this morning.",
    "isInternal": false,
    "createdAt": "2026-01-20T10:05:00.000Z",
    "updatedAt": "2026-01-20T10:05:00.000Z"
  }
]
```

Error cases:

- `401`: missing or invalid Clerk token.
- `404`: ticket not found.

### POST `/tickets/:id/messages`

Purpose: add a non-internal message to a ticket conversation. Admin dashboard usage defaults to `ADMIN`.

Auth: Clerk-protected.

Request body:

```json
{
  "body": "Thanks for the update. We are reviewing the export logs now.",
  "authorType": "ADMIN",
  "authorName": "Support Admin",
  "authorEmail": "support@example.com"
}
```

Validation:

- `body`: required, 1-5000 chars.
- `authorType`: optional, `"ADMIN"` or `"CUSTOMER"`, defaults to `"ADMIN"`.
- `authorName`: optional, max 120 chars.
- `authorEmail`: optional email, max 255 chars.

Example response:

```json
{
  "id": "message_124",
  "ticketId": "ticket_123",
  "authorType": "admin",
  "authorName": "Support Admin",
  "authorEmail": "support@example.com",
  "body": "Thanks for the update. We are reviewing the export logs now.",
  "isInternal": false,
  "createdAt": "2026-01-20T10:10:00.000Z",
  "updatedAt": "2026-01-20T10:10:00.000Z"
}
```

Error cases:

- `400`: invalid body or author metadata.
- `401`: missing or invalid Clerk token.
- `404`: ticket not found.

### POST `/tickets/:id/internal-notes`

Purpose: add an internal admin-only note to a ticket.

Auth: Clerk-protected.

Request body:

```json
{
  "body": "Check whether this account is hitting the export row limit."
}
```

Example response:

```json
{
  "id": "message_125",
  "ticketId": "ticket_123",
  "authorType": "admin",
  "body": "Check whether this account is hitting the export row limit.",
  "isInternal": true,
  "createdAt": "2026-01-20T10:12:00.000Z",
  "updatedAt": "2026-01-20T10:12:00.000Z"
}
```

Error cases:

- `400`: invalid body.
- `401`: missing or invalid Clerk token.
- `404`: ticket not found.

## 4. AI Reply Approval

### POST `/tickets/:ticketId/ai-suggestions/:suggestionId/approve`

Purpose: approve an AI suggestion as-is or save an edited human-approved reply. Approval creates a non-internal admin message. If `note` is provided, it also creates an internal note. The MVP does not send external customer email.

Auth: Clerk-protected.

Request body:

```json
{
  "finalReply": "Thanks for flagging this. We found a delayed export worker and are retrying the job now.",
  "note": "Edited the AI draft to remove unsupported timing claims."
}
```

Validation:

- `finalReply`: required, 1-10000 chars after trimming.
- `note`: optional, max 2000 chars.

Example response:

```json
{
  "suggestion": {
    "id": "suggestion_123",
    "ticketId": "ticket_123",
    "status": "edited",
    "suggestedReply": "Thanks for the report. We are checking the export job logs.",
    "originalSuggestedReply": "Thanks for the report. We are checking the export job logs.",
    "finalApprovedReply": "Thanks for flagging this. We found a delayed export worker and are retrying the job now.",
    "approvedAt": "2026-01-20T10:15:00.000Z",
    "approvedByUserId": "user_clerk_123",
    "editedBeforeApproval": true,
    "confidenceScore": 0.82,
    "citations": [],
    "createdAt": "2026-01-20T10:02:00.000Z",
    "updatedAt": "2026-01-20T10:15:00.000Z"
  },
  "ticketMessage": {
    "id": "message_126",
    "ticketId": "ticket_123",
    "authorType": "admin",
    "body": "Thanks for flagging this. We found a delayed export worker and are retrying the job now.",
    "isInternal": false,
    "createdAt": "2026-01-20T10:15:00.000Z",
    "updatedAt": "2026-01-20T10:15:00.000Z"
  },
  "internalNote": {
    "id": "message_127",
    "ticketId": "ticket_123",
    "authorType": "admin",
    "body": "Edited the AI draft to remove unsupported timing claims.",
    "isInternal": true,
    "createdAt": "2026-01-20T10:15:00.000Z",
    "updatedAt": "2026-01-20T10:15:00.000Z"
  }
}
```

Error cases:

- `400`: empty `finalReply`, suggestion has no original reply, or suggestion does not belong to the ticket.
- `401`: missing or invalid Clerk token.
- `404`: ticket or AI suggestion not found.

## 5. AI Suggestions Review

### GET `/ai-suggestions`

Purpose: list AI suggestions across tickets for the review page.

Auth: Clerk-protected.

Query params:

- `status`: optional `AiSuggestionStatus`.
- `search`: optional string, max 120 chars. Searches suggestion text, error message, ticket subject, customer name/email/company.
- `page`: optional integer, default `1`, min `1`.
- `limit`: optional integer, default `20`, min `1`, max `100`.

Example response:

```json
{
  "data": [
    {
      "id": "suggestion_123",
      "ticketId": "ticket_123",
      "ticketTitle": "CSV export fails",
      "customerName": "Mira Patel",
      "customerEmail": "mira@example.com",
      "summary": "Customer cannot complete CSV export.",
      "confidence": 0.82,
      "confidenceScore": 0.82,
      "status": "generated",
      "model": "gemini-3.5-flash",
      "createdAt": "2026-01-20T10:02:00.000Z",
      "updatedAt": "2026-01-20T10:02:00.000Z",
      "priority": "high",
      "category": "technical",
      "suggestedReply": "Thanks for the report. We are checking the export job logs.",
      "originalSuggestedReply": "Thanks for the report. We are checking the export job logs.",
      "editedBeforeApproval": false
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalItems": 1,
  "totalPages": 1
}
```

Error cases:

- `400`: invalid query param.
- `401`: missing or invalid Clerk token.

## 6. Customers

### GET `/customers`

Purpose: list customers with ticket counts, open ticket counts, latest ticket date, and pagination.

Auth: Clerk-protected.

Query params:

- `search`: optional string, max 120 chars. Searches name, email, and company.
- `page`: optional integer, default `1`, min `1`.
- `limit`: optional integer, default `20`, min `1`, max `100`.

Example response:

```json
{
  "data": [
    {
      "id": "customer_123",
      "name": "Mira Patel",
      "email": "mira@example.com",
      "company": "Northstar Labs",
      "companyName": "Northstar Labs",
      "createdAt": "2026-01-10T09:00:00.000Z",
      "ticketCount": 3,
      "openTicketCount": 2,
      "latestTicketAt": "2026-01-20T10:02:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalItems": 1,
  "totalPages": 1
}
```

Error cases:

- `400`: invalid query param.
- `401`: missing or invalid Clerk token.

### GET `/customers/:id`

Purpose: fetch customer profile, ticket metrics, and recent ticket history.

Auth: Clerk-protected.

Example response:

```json
{
  "customer": {
    "id": "customer_123",
    "name": "Mira Patel",
    "email": "mira@example.com",
    "company": "Northstar Labs",
    "companyName": "Northstar Labs",
    "createdAt": "2026-01-10T09:00:00.000Z",
    "ticketCount": 3,
    "openTicketCount": 2,
    "resolvedTicketCount": 1,
    "latestTicketAt": "2026-01-20T10:02:00.000Z"
  },
  "metrics": {
    "totalTickets": 3,
    "openTickets": 2,
    "resolvedTickets": 1
  },
  "recentTickets": [
    {
      "id": "ticket_123",
      "title": "CSV export fails",
      "status": "open",
      "priority": "high",
      "category": "technical",
      "createdAt": "2026-01-20T10:00:00.000Z",
      "sla": {
        "dueAt": "2026-01-20T14:00:00.000Z",
        "minutesRemaining": 180,
        "status": "ON_TRACK"
      },
      "latestAiSuggestionStatus": "generated"
    }
  ]
}
```

Error cases:

- `401`: missing or invalid Clerk token.
- `404`: customer not found.

### GET `/customers/:id/timeline`

Purpose: return a derived customer activity timeline. No separate timeline table is used; events are built from customer, ticket, AI suggestion, and ticket message records.

Auth: Clerk-protected.

Event types:

- `CUSTOMER_CREATED`
- `TICKET_CREATED`
- `TICKET_UPDATED`
- `AI_SUGGESTION_GENERATED`
- `AI_REPLY_APPROVED`
- `MESSAGE_ADDED`
- `INTERNAL_NOTE_ADDED`
- `TICKET_RESOLVED`

Example response:

```json
[
  {
    "id": "ai-reply-approved-suggestion_123",
    "type": "AI_REPLY_APPROVED",
    "title": "Edited AI reply approved",
    "description": "A human-approved reply was added for \"CSV export fails\".",
    "timestamp": "2026-01-20T10:15:00.000Z",
    "ticketId": "ticket_123",
    "metadata": {
      "suggestionId": "suggestion_123",
      "status": "edited",
      "editedBeforeApproval": true,
      "approvedByUserId": "user_clerk_123"
    }
  }
]
```

Error cases:

- `401`: missing or invalid Clerk token.
- `404`: customer not found.

## 7. Knowledge Base

### POST `/knowledge-base/upload`

Purpose: upload a knowledge-base document, parse text, chunk it, generate embeddings, and store chunks in PostgreSQL pgvector.

Auth: Clerk-protected.

Request: `multipart/form-data`.

Fields:

- `file`: required file field. Supported extensions are `.txt`, `.md`, and `.pdf`.
- `title`: optional string title override.

Example response:

```json
{
  "title": "Refund Policy",
  "sourceName": "refund-policy.md",
  "chunksCreated": 6
}
```

Error cases:

- `400`: missing `file`, unsupported/unparseable document, empty parsed content, or document produces no chunks.
- `401`: missing or invalid Clerk token.
- `413`: file exceeds 25 MB upload limit.
- `503`: embedding provider fails or returns invalid vectors.

### GET `/knowledge-base/documents`

Purpose: list grouped knowledge-base documents by source file and title.

Auth: Clerk-protected.

Example response:

```json
[
  {
    "title": "Refund Policy",
    "sourceName": "refund-policy.md",
    "sourceType": "md",
    "chunkCount": 6,
    "createdAt": "2026-01-20T09:00:00.000Z",
    "updatedAt": "2026-01-20T09:00:00.000Z"
  }
]
```

Error cases:

- `401`: missing or invalid Clerk token.

### GET `/knowledge-base/search?q=...`

Purpose: run semantic search over active embedded knowledge-base chunks.

Auth: Clerk-protected.

Query params:

- `q`: required search query.
- `limit`: optional integer-like string. Defaults to `5`; invalid values also fall back to `5`; max effective value is `25`.

Example request:

```http
GET /knowledge-base/search?q=refund%20window&limit=3
```

Example response:

```json
[
  {
    "id": "chunk_123",
    "title": "Refund Policy",
    "content": "Customers can request a refund within 30 days...",
    "score": 0.84,
    "sourceName": "refund-policy.md"
  }
]
```

Error cases:

- `400`: missing or blank `q`.
- `401`: missing or invalid Clerk token.
- `503`: embedding provider fails or returns invalid vectors.

## Frontend-Only Or Realtime Behavior

Socket.IO events are implemented by the backend, but they are not REST endpoints:

- `ticket.updated`
- `ticket.aiSuggestionReady`

The Next.js dashboard listens for these events and invalidates TanStack Query caches. If Socket.IO fails, polling remains as a fallback.
