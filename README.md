# PulseDesk

PulseDesk is a full-stack AI-assisted customer support desk that combines public ticket intake, authenticated operations dashboards, RAG-grounded AI suggestions, and human-reviewed support workflows.

## Live Demo

- Frontend: `https://your-vercel-demo-url.example.com`
- Backend health check: `https://your-railway-api-url.example.com/health`
- Demo credentials: `Add Clerk demo user credentials here`

## Screenshots

Add screenshots after deployment:

- Landing page: `docs/screenshots/landing.png`
- Dashboard: `docs/screenshots/dashboard.png`
- Ticket detail + AI panel: `docs/screenshots/ticket-detail-ai-panel.png`
- Knowledge-base page: `docs/screenshots/knowledge-base.png`
- Customer detail page: `docs/screenshots/customer-detail.png`

## Problem

Support teams often work across disconnected tools: public ticket intake, customer history, internal notes, knowledge-base articles, AI assistants, and SLA tracking. Generic AI chat tools can speed up drafting, but they often hide source context, overstate confidence, and encourage automation before a human has reviewed the response.

## Solution

PulseDesk centralizes the support workflow in one SaaS-style product. Customers submit tickets publicly, admins manage tickets in a protected dashboard, background jobs classify and prioritize tickets, RAG retrieves relevant knowledge-base snippets, and AI-generated replies remain editable drafts until a human approves them.

The MVP is intentionally human-in-the-loop: approving an AI reply adds it to the ticket conversation, but does not send customer email automatically.

## Core Features

- Public customer ticket submission.
- Clerk-protected admin dashboard.
- Ticket filters for status, priority, category, and search.
- Customer profiles with ticket metrics, recent ticket history, and activity timeline.
- AI category classification and priority prediction.
- RAG-based reply suggestions with retrieved knowledge snippets.
- Editable AI approval flow with edited-vs-approved tracking.
- Ticket conversation threads.
- Internal notes.
- SLA badges for on-track, due-soon, and overdue tickets.
- Knowledge-base upload, chunking, embeddings, and pgvector search.
- Socket.IO realtime updates with polling fallback.
- Demo workspace seed data for recruiter review.
- RAG retrieval evaluation script.
- Docker Compose local infrastructure.
- GitHub Actions CI for client and server checks.

## Architecture

```mermaid
flowchart TB
  subgraph Frontend["Next.js App Router"]
    Landing["Landing Page"]
    SubmitTicket["Customer Ticket Form"]
    Dashboard["Admin Dashboard"]
    Tickets["Tickets Workspace"]
    Customers["Customer Workspace"]
    AiReview["AI Suggestions Review"]
    KnowledgeBase["Knowledge Base"]
  end

  Clerk["Clerk Auth"]
  Api["NestJS API"]
  Realtime["Socket.IO Gateway"]
  Prisma["Prisma ORM"]
  Postgres[("PostgreSQL")]
  Pgvector[("pgvector")]
  Redis[("Redis")]
  BullMQ["BullMQ Worker"]
  Gemini["Gemini API"]

  Landing --> SubmitTicket
  SubmitTicket -->|POST /tickets| Api
  Dashboard -->|REST + Clerk token| Api
  Tickets -->|REST + Clerk token| Api
  Customers -->|REST + Clerk token| Api
  AiReview -->|REST + Clerk token| Api
  KnowledgeBase -->|REST + Clerk token| Api

  Dashboard <-->|ticket.updated / ticket.aiSuggestionReady| Realtime
  Tickets <-->|ticket.updated / ticket.aiSuggestionReady| Realtime
  Realtime --> Api

  Api --> Clerk
  Api --> Prisma
  Prisma --> Postgres
  Postgres --- Pgvector

  Api -->|enqueue classify / prioritize / suggest-reply| Redis
  Redis --> BullMQ
  BullMQ --> Gemini
  BullMQ --> Prisma
  BullMQ --> Realtime
  Api -->|embeddings + generation| Gemini
```

## Tech Stack And Rationale

- Next.js App Router: modern React frontend with public pages and protected dashboard routes.
- TypeScript: shared type safety across frontend, backend, and common DTOs.
- Tailwind CSS: custom responsive B2B SaaS interface without a heavy component dependency.
- Clerk: authentication for protected dashboard workflows.
- TanStack Query: server-state fetching, cache invalidation, and polling fallback.
- Socket.IO: realtime dashboard updates when AI jobs complete.
- NestJS: modular backend architecture with DTO validation and clear service boundaries.
- Prisma: typed PostgreSQL access and migrations.
- PostgreSQL + pgvector: relational support data and vector retrieval in one database.
- Redis + BullMQ: asynchronous AI processing outside the request path.
- Gemini: embeddings and structured AI generation.
- Docker Compose: local PostgreSQL pgvector and Redis stack.
- GitHub Actions: separate client and server CI jobs.

## Product Design

PulseDesk uses a modern B2B SaaS visual system built for support operations. The UI is responsive across mobile, tablet, and desktop, with dense dashboard tables converting to mobile-friendly cards.

The palette intentionally avoids generic blue or purple AI dashboard styling. Graphite and zinc neutrals provide the operational base, while emerald and teal indicate healthy/generated states, amber indicates review states, and rose indicates failures or urgent risk.

## Local Setup

Requirements:

- Node.js 20+
- pnpm 9+; the repo is pinned to `pnpm@11.8.0`
- Docker Desktop or another Docker runtime
- Clerk application keys
- Gemini API key

Install dependencies:

```sh
pnpm install
```

Start PostgreSQL pgvector and Redis:

```sh
docker compose up -d postgres redis
```

Create local env files:

```sh
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.local.example client/.env.local
```

Server env highlights in `server/.env`:

```sh
PORT=4000
DATABASE_URL=postgresql://pulsedesk:pulsedesk@localhost:5432/pulsedesk?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
CLIENT_URL=http://localhost:3000
CLERK_SECRET_KEY=sk_test_replace_me
CLERK_PUBLISHABLE_KEY=pk_test_replace_me
CLERK_JWT_KEY="-----BEGIN PUBLIC KEY-----\nreplace_me\n-----END PUBLIC KEY-----"
CLERK_AUTHORIZED_PARTY=http://localhost:3000
GEMINI_API_KEY=replace_me
GEMINI_GENERATION_MODEL=gemini-3.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIM=768
DEMO_MODE=false
```

Client env highlights in `client/.env.local`:

```sh
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_replace_me
CLERK_SECRET_KEY=sk_test_replace_me
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_DEMO_MODE=false
```

Generate Prisma Client and apply migrations:

```sh
pnpm db:generate
pnpm db:migrate
```

Seed local data:

```sh
pnpm db:seed
```

Seed the recruiter demo workspace:

```sh
pnpm demo:seed
```

Run the backend:

```sh
pnpm dev:server
```

Run the frontend:

```sh
pnpm dev:client
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Health check: `http://localhost:4000/health`

## Docker Setup

Start only PostgreSQL pgvector and Redis:

```sh
docker compose up -d postgres redis
```

Run the optional NestJS server profile alongside PostgreSQL and Redis:

```sh
docker compose --profile server up --build
```

The server service uses `server/Dockerfile` with the repository root as Docker build context, depends on PostgreSQL and Redis, and exposes port `3001` by default for the containerized API.

## Testing

Run all package builds:

```sh
pnpm build
```

Run all package lint/type checks:

```sh
pnpm lint
```

Run backend tests:

```sh
pnpm --filter @pulsedesk/server test
```

Run frontend Playwright tests:

```sh
pnpm test:e2e
```

Open Playwright UI:

```sh
pnpm test:e2e:ui
```

Run the RAG retrieval evaluation after migrations and seed data:

```sh
pnpm eval:rag
```

`eval:rag` reports top-1 and top-3 retrieval accuracy for representative support questions. It is a retrieval sanity check, not a full AI answer-quality benchmark.

## AI / RAG Workflow

1. An admin uploads a knowledge-base document.
2. The backend parses text, normalizes it, and splits it into chunks.
3. Gemini generates embeddings for each chunk.
4. PostgreSQL stores chunks and vectors with pgvector.
5. Ticket AI jobs classify category, predict priority, and retrieve relevant snippets.
6. Gemini drafts a suggested reply using retrieved context.
7. The dashboard shows the draft, summary, confidence, snippets, and limitations.
8. An admin edits or approves the reply.
9. Approval stores the final reply in the ticket conversation without sending email.

## Queue Workflow

Ticket creation enqueues BullMQ jobs backed by Redis:

- `classify`: predicts ticket category.
- `prioritize`: predicts support priority.
- `suggest-reply`: retrieves RAG context and drafts a response.

The worker updates tickets and AI suggestions, then emits Socket.IO events so the dashboard can refresh relevant TanStack Query caches.

## Deployment

Recommended deployment split:

- Frontend: Vercel project rooted at `client/`.
- Backend API: Railway or another container platform using `server/Dockerfile`.
- Database: PostgreSQL provider with pgvector support.
- Queue: managed Redis.
- Auth: Clerk production application.
- AI: Gemini API key and model configuration.

Detailed deployment steps are in [docs/deployment.md](docs/deployment.md).

## AI Safety And Limitations

PulseDesk is an MVP and does not claim production-grade AI safety.

Implemented safety boundaries:

- AI suggestions are drafts only.
- Admins must review, edit, and approve replies.
- Approved replies are added to the conversation but are not emailed automatically.
- Retrieved knowledge snippets, confidence, limitations, and manual verification states are visible in the UI.
- AI failure states are surfaced instead of hidden.

Known MVP limitations:

- no automatic PII or secret redaction before model calls;
- no full prompt-injection defense for uploaded knowledge-base documents;
- no answer faithfulness scoring yet;
- no advanced RBAC or regulated audit log;
- no compliance guarantees.

See [docs/ai-safety.md](docs/ai-safety.md) for the detailed safety posture.

## Demo Script

Use [docs/demo-script.md](docs/demo-script.md) for a 3-5 minute recruiter walkthrough covering the landing page, ticket submission, dashboard, ticket workspace, AI approval flow, customers, knowledge base, architecture, and AI safety.

## Additional Documentation

- [Architecture](docs/architecture.md)
- [API contracts](docs/api-contracts.md)
- [Deployment](docs/deployment.md)
- [AI safety](docs/ai-safety.md)
- [Case study](docs/case-study.md)

## Future Improvements

- Email sending integration after human approval.
- Advanced RBAC and tenant/workspace isolation.
- Append-only audit logs for prompts, snippets, edits, approvals, and sent messages.
- Separate API and worker deployments.
- Stronger RAG evaluation with larger human-reviewed datasets.
- Prompt-injection detection and document sanitization for uploaded knowledge-base files.
- Answer faithfulness scoring against retrieved snippets.
- PII and secret redaction before AI calls.
- Production observability for queues, AI failures, latency, and reviewer override rates.

## Portfolio Note

PulseDesk is a portfolio-grade full-stack SaaS project built to demonstrate production-aware engineering: responsive Next.js UI, NestJS APIs, Clerk authentication, PostgreSQL pgvector search, Prisma data modeling, Redis/BullMQ background jobs, Gemini AI/RAG integration, Socket.IO realtime updates, Docker, CI/CD, deployment planning, and honest AI safety boundaries.
