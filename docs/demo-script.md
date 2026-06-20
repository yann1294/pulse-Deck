# Demo Script

This script is designed for a 3-5 minute recruiter or portfolio walkthrough. The goal is to show that PulseDesk is not just an AI prompt demo; it is a full-stack SaaS workflow with data modeling, background jobs, RAG, realtime updates, deployment structure, and explicit AI safety boundaries.

## Pre-Demo Setup

Start local services:

```sh
docker compose up -d postgres redis
```

Run migrations and seed the demo workspace:

```sh
pnpm db:migrate
pnpm demo:seed
```

Start the apps:

```sh
pnpm dev:server
pnpm dev:client
```

Optional: set `NEXT_PUBLIC_DEMO_MODE=true` in `client/.env.local` so the dashboard shows the Demo Workspace banner.

## Demo Narrative

Position PulseDesk as a support-operations SaaS MVP:

"PulseDesk is an AI-assisted support desk. The important product decision is that AI helps triage and draft, but it does not automatically respond to customers. The project demonstrates a complete workflow: public ticket intake, authenticated dashboard, RAG-backed suggestions, background processing, realtime UI updates, Docker, CI, and deployment docs."

## 1. Landing Page

Time: 30-45 seconds.

Open the landing page.

Talking points:

- "This is framed as a production-style SaaS portfolio project, not a generic AI chat app."
- "The hero highlights the real engineering surface: full-stack SaaS, AI/RAG, pgvector, BullMQ, Docker, and CI/CD."
- "The mock dashboard preview gives recruiters a fast sense of the product before signing in."
- "The visual design uses graphite/zinc with emerald and teal accents, intentionally avoiding generic blue/purple AI dashboard styling."

What to show:

- Hero copy and CTAs.
- Mock dashboard preview.
- Recruiter-facing technical value cards.
- Stack section if time allows.

## 2. Submit Ticket

Time: 30-45 seconds.

Open the public ticket submission page.

Talking points:

- "This route is public because customers need to submit support requests without admin access."
- "The form does client-side validation and posts to the NestJS backend."
- "On the backend, the DTO is validated, the customer is upserted, the ticket is created, and AI jobs are queued."
- "The customer sees a confirmation, but AI does not send any reply directly."

Suggested demo ticket:

```text
Name: Jordan Patel
Email: jordan@example.com
Company: Apex Analytics
Title: Monthly CSV export has been queued for over an hour
Description: Our finance team needs the monthly CSV export today, but it has been queued for over an hour. We tried refreshing and starting a new export, but nothing completed.
```

What to show:

- Required fields.
- Human-review note.
- Success state after submission.

## 3. Admin Dashboard

Time: 45-60 seconds.

Open the authenticated dashboard.

Talking points:

- "This is the support operator workspace."
- "The dashboard uses TanStack Query for server state and Socket.IO for realtime invalidation."
- "If the socket connection fails, polling remains active as a fallback."
- "The table converts into mobile cards, so it stays usable on smaller screens."
- "The demo workspace banner makes clear that fake recruiter-review data is being used."

What to show:

- KPI cards.
- Ticket filters.
- Ticket list.
- Live updates indicator.
- Demo Workspace banner if enabled.

## 4. AI Suggestion

Time: 60-90 seconds.

Open a ticket detail page with an AI suggestion.

Talking points:

- "The detail page combines ticket context, customer history, AI suggestion, and safety notes."
- "The AI panel shows confidence, retrieved knowledge context, limitations, and a human-review gate."
- "If no knowledge-base context is found, the UI shows a Needs manual verification badge."
- "The button says Mark reviewed, not Send. Automatic customer sending is intentionally not part of the MVP."

Engineering points:

- "Ticket AI jobs are handled by BullMQ workers."
- "After classification, priority prediction, and suggestion generation, the backend emits realtime events."
- "The frontend invalidates the relevant query cache and updates without a full page reload."

What to show:

- Ticket description.
- Customer panel.
- AI confidence score.
- Retrieved snippets.
- Limitations.
- Disabled send-to-customer action.

## 5. Knowledge-Base Upload

Time: 45-60 seconds.

Open the knowledge-base page.

Talking points:

- "Admins can upload PDF, TXT, or Markdown support documents."
- "The backend extracts text, normalizes it, splits it into chunks, generates embeddings, and stores them in PostgreSQL with pgvector."
- "When drafting a reply, PulseDesk retrieves semantically similar chunks and passes them as grounding context."
- "pgvector was chosen for the MVP because it keeps relational data and vector search in one PostgreSQL system, which is simpler to operate than adding a dedicated vector database early."

What to show:

- Upload area.
- Accepted file types.
- Recent ingestion state.
- Ingested documents list.
- Demo safety warning.

## 6. Safety Limitations

Time: 30-45 seconds.

Talking points:

- "PulseDesk treats AI as assistive, not authoritative."
- "The UI exposes confidence, citations/snippets, and limitations instead of hiding uncertainty."
- "The MVP does not perform automatic PII redaction, prompt-injection scanning, compliance-grade audit trails, or automatic customer sending."
- "Those limitations are documented in `docs/ai-safety.md`, which is part of the portfolio presentation."

What to show:

- AI safety panel on ticket detail.
- Knowledge-base demo safety note.
- `docs/ai-safety.md` if presenting code/docs.

## 7. DevOps And CI

Time: 30-45 seconds.

Talking points:

- "The backend is Dockerized with a production runner stage."
- "Docker Compose runs PostgreSQL pgvector, Redis, and optionally the NestJS server."
- "GitHub Actions has separate client and server jobs."
- "The server test suite covers chunking, AI JSON parsing, DTO validation, knowledge-base search with mocks, and queue enqueueing."
- "Deployment docs cover Vercel frontend, Railway backend, pgvector, Redis, CORS, Clerk, and Gemini setup."

What to show:

- `docker-compose.yml`
- `server/Dockerfile`
- `.github/workflows/ci.yml`
- `docs/deployment.md`
- Test command:

```sh
pnpm lint
pnpm build
pnpm --filter @pulsedesk/server test
```

## Strong Closing

Use this closing if time is short:

"PulseDesk shows the kind of engineering I want to bring to production SaaS work: clear product boundaries, typed frontend and backend, durable data modeling, async processing, AI grounded in retrieved context, realtime UI updates, deployment planning, and an honest safety posture."

## Common Questions

**Why not send AI replies automatically?**

Because the product is designed for support teams handling real customer issues. The MVP prioritizes reviewed outcomes over automation.

**Why pgvector instead of a dedicated vector database?**

For MVP scale, pgvector is simpler and keeps embeddings near the relational support data. It reduces operational overhead while still demonstrating real semantic retrieval.

**What happens if AI fails?**

The job records a failed suggestion state, the dashboard shows failed AI status, and the ticket remains available for manual handling.

**What would you improve next?**

Approval audit logs, richer reply editing, tenant isolation, prompt-injection scanning, PII redaction, observability, and retrieval quality evaluation.
