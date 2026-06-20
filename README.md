# PulseDesk

PulseDesk is a full-stack AI customer-support desk MVP for teams that want faster ticket triage without removing human judgment from customer communication.

It demonstrates a production-shaped SaaS workflow: public ticket intake, authenticated support dashboard, knowledge-base powered AI suggestions, PostgreSQL pgvector search, BullMQ background jobs, realtime updates, Dockerized services, and deployment-ready documentation.

## Live Demo

- Frontend: `https://your-vercel-demo-url.example.com`
- Backend health check: `https://your-railway-api-url.example.com/health`
- Demo credentials: `Add Clerk demo user credentials here`

## Demo Workspace

PulseDesk includes a recruiter-friendly demo mode with fake customers, tickets, knowledge-base documents, and pre-generated AI suggestions.

1. Start PostgreSQL and Redis:

```sh
docker compose up -d postgres redis
```

2. Copy and update local env files:

```sh
cp .env.example .env
cp client/.env.local.example client/.env.local
cp server/.env.example server/.env
```

3. Run migrations and seed demo data:

```sh
pnpm install
pnpm db:migrate
pnpm demo:seed
```

4. Enable the dashboard demo banner in `client/.env.local`:

```sh
NEXT_PUBLIC_DEMO_MODE=true
```

## Problem

Support teams often lose time switching between tickets, customer history, internal docs, and AI tools. Generic AI chat workflows can produce unsupported answers, hide uncertainty, and encourage direct automation where human review is still required.

PulseDesk treats AI as an internal support assistant, not an autonomous customer agent.

## Solution

PulseDesk centralizes ticket intake, triage, customer context, knowledge retrieval, and AI-generated draft suggestions in one dashboard. AI jobs run asynchronously, retrieved snippets are shown for review, and customer-facing replies remain human-controlled.

## Features

- Public support ticket submission form.
- Authenticated admin dashboard with filtering, KPI cards, and responsive mobile cards.
- Ticket detail workspace with customer history and AI safety indicators.
- Knowledge-base upload for PDF, TXT, and Markdown files.
- Text chunking, embeddings, and pgvector similarity search.
- Gemini-powered classification, priority prediction, and reply drafting.
- BullMQ background jobs backed by Redis.
- Socket.IO realtime updates with polling fallback.
- Demo workspace seed data for portfolio review.
- Docker Compose stack for PostgreSQL pgvector, Redis, and optional NestJS server.
- CI workflow for client and server checks.

## Architecture

```mermaid
flowchart LR
  Customer[Customer] --> Client[Next.js Client]
  Admin[Support Admin] --> Client
  Client -->|REST API| API[NestJS API]
  Client <-->|Socket.IO| Realtime[Realtime Gateway]
  Realtime --> API
  API --> Prisma[Prisma ORM]
  Prisma --> Postgres[(PostgreSQL + pgvector)]
  API --> Queue[BullMQ Queue]
  Queue --> Redis[(Redis)]
  Worker[Ticket AI Processor] --> Queue
  Worker --> Gemini[Gemini API]
  Worker --> Postgres
  Worker --> Realtime
  API --> Clerk[Clerk Auth]
```

## Tech Stack And Rationale

- Next.js, React, TypeScript: typed frontend with App Router, dashboard pages, and public intake flow.
- Tailwind CSS: consistent custom design system without heavy UI dependencies.
- TanStack Query: server-state caching, invalidation, and polling fallback.
- Socket.IO: realtime ticket and AI suggestion updates.
- NestJS: structured backend modules, DTO validation, and clear service boundaries.
- Prisma: typed database access and migrations.
- PostgreSQL pgvector: stores embeddings and supports semantic knowledge retrieval.
- Redis + BullMQ: reliable background AI job processing outside the request path.
- Gemini: generation and embedding provider for the MVP AI workflow.
- Clerk: authentication for protected dashboard routes.
- Docker and GitHub Actions: production-oriented packaging and repeatable checks.

## Product Design

PulseDesk uses a modern B2B SaaS visual system designed for support operations rather than a generic AI dashboard. The UI is responsive across mobile, tablet, and desktop, with dashboard tables converting into mobile-friendly cards.

The palette intentionally avoids generic blue and purple AI styling. Graphite and zinc neutrals create the operational base, while emerald and teal accents communicate live status, AI readiness, and successful workflow states.

## Local Setup

Requirements:

- Node.js 20+
- pnpm 11.8.0 or compatible pnpm 9+
- Docker Desktop or another Docker runtime

Install dependencies:

```sh
pnpm install
```

Start local infrastructure:

```sh
docker compose up -d postgres redis
```

Run the apps:

```sh
pnpm dev:server
pnpm dev:client
```

Default URLs:

- Client: `http://localhost:3000`
- Server: `http://localhost:4000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Environment Variables

Use the example files as the source of truth:

- `.env.example`: Docker Compose defaults.
- `client/.env.local.example`: Next.js and Clerk frontend settings.
- `server/.env.example`: NestJS, database, Redis, Clerk, Gemini, and AI settings.

Common client variables:

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

Common server variables:

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

Do not commit real secrets.

## Running With Docker

Start PostgreSQL pgvector and Redis:

```sh
docker compose up -d postgres redis
```

Run the optional NestJS server container alongside the data services:

```sh
docker compose --profile server up --build
```

The server container listens on `SERVER_PORT`, defaulting to `3001`.

## Database Migrations And Seed Data

Generate Prisma client:

```sh
pnpm db:generate
```

Apply migrations:

```sh
pnpm db:migrate
```

Seed standard local data:

```sh
pnpm db:seed
```

Seed the demo workspace:

```sh
pnpm demo:seed
```

The demo seed is idempotent and can be re-run safely.

## AI/RAG Workflow

1. Admin uploads a knowledge-base document.
2. The server extracts text from PDF, TXT, or Markdown files.
3. Text is normalized and split into overlapping chunks.
4. Gemini embeddings are generated for each chunk.
5. Chunks and embeddings are stored in PostgreSQL using pgvector.
6. When a ticket needs a reply draft, PulseDesk embeds the ticket query and retrieves similar chunks.
7. Retrieved snippets are provided to Gemini as grounding context.
8. The dashboard shows the draft, confidence score, retrieved snippets, limitations, and review-required status.

AI output is always treated as a suggestion.

## Queue Workflow

Ticket creation enqueues three BullMQ jobs:

- `classify`: predicts ticket category.
- `prioritize`: predicts support priority.
- `suggest-reply`: retrieves knowledge context and drafts a reply.

Redis backs the queue. The NestJS ticket AI processor runs jobs asynchronously, updates ticket AI status, stores suggestion records, and emits realtime Socket.IO events so the dashboard can refresh without relying only on polling.

## Deployment

Recommended production split:

- Frontend: Vercel project rooted at `client/`.
- Backend: Railway service using `server/Dockerfile` with repository root as the Docker build context.
- Database: PostgreSQL provider with pgvector support.
- Queue: managed Redis.

Deployment details are documented in [docs/deployment.md](docs/deployment.md).

## AI Safety And Limitations

PulseDesk is intentionally human-in-the-loop:

- AI drafts are never automatically sent to customers.
- Retrieved snippets and limitations are shown to reviewers.
- Missing knowledge context triggers manual verification indicators.
- Failed AI jobs are surfaced instead of hidden.
- Demo mode should use fake or non-sensitive data.

MVP limitations:

- No automatic PII redaction before model calls.
- No advanced prompt-injection scanner for uploaded documents.
- No compliance guarantees for regulated environments.
- No provider failover across model vendors.
- No production-grade approval audit trail yet.

See [docs/ai-safety.md](docs/ai-safety.md) for the detailed safety posture.

## Screenshots

Add screenshots after deployment:

- Landing page: `docs/screenshots/landing.png`
- Dashboard: `docs/screenshots/dashboard.png`
- Ticket detail AI safety panel: `docs/screenshots/ticket-detail.png`
- Knowledge base: `docs/screenshots/knowledge-base.png`
- Mobile dashboard: `docs/screenshots/mobile-dashboard.png`

## Future Improvements

- Full reply editor and send workflow with approval audit logs.
- Tenant/workspace model with stricter authorization boundaries.
- Document versioning and knowledge-base review workflow.
- Prompt-injection and secret scanning for uploaded documents.
- Higher-quality evaluation set for AI classification and response drafts.
- Admin analytics for AI failure rate, reviewer edits, and retrieval quality.
- Production observability with structured logs, tracing, and queue metrics.

## Author And Portfolio Note

PulseDesk is a portfolio-grade full-stack SaaS project built to demonstrate practical product engineering: typed frontend and backend, AI/RAG integration, background jobs, realtime UX, PostgreSQL pgvector, Docker, CI/CD, deployment documentation, and clear AI safety boundaries.
