# PulseDesk Recruiter Demo Script

This script is designed for a 3-5 minute screen-share demo. The goal is to show PulseDesk as a complete full-stack SaaS MVP: public ticket intake, authenticated support dashboard, AI/RAG workflow, ticket conversation, customer context, realtime updates, and clear AI safety boundaries.

## Pre-Demo Setup

Start local infrastructure:

```sh
docker compose up -d postgres redis
```

Apply migrations and seed demo data:

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

## 0:00-0:30 - Landing Page

Open `/`.

Say:

"PulseDesk is an AI-assisted customer support desk that combines public ticket intake, an authenticated admin dashboard, RAG-grounded reply suggestions, and human-reviewed support workflows."

Show:

- hero section and dashboard preview;
- recruiter-facing stack highlights;
- CTA to submit a ticket or open the dashboard.

Keep this brief. The landing page establishes the product and portfolio context; the real demo is the workflow.

## 0:30-1:00 - Customer Ticket Submission

Open `/submit-ticket`.

Say:

"This is the public customer intake route. A customer can submit a ticket without dashboard access. The backend validates the DTO, upserts the customer, stores the ticket, and queues AI jobs for classification, prioritization, and reply suggestion."

Submit a realistic ticket:

```text
Name: Jordan Patel
Email: jordan@example.com
Company: Apex Analytics
Title: Monthly CSV export has been queued for over an hour
Description: Our finance team needs the monthly CSV export today, but it has been queued for over an hour. We tried refreshing and starting a new export, but nothing completed.
```

Point out:

- validation and confirmation state;
- ticket creation is separate from AI processing;
- no AI response is sent to the customer automatically.

## 1:00-1:40 - Admin Dashboard

Open `/dashboard`.

Say:

"This is the support operator view. It shows operational KPIs, ticket volume, SLA pressure, AI status, and the current ticket queue. The dashboard uses TanStack Query for server state and Socket.IO to invalidate fresh data when background AI jobs complete."

Show:

- KPI cards;
- overdue and due-soon SLA indicators;
- ticket filters;
- AI status badges;
- live updates indicator;
- Demo Workspace banner if enabled.

Add:

"The design is intentionally B2B SaaS: dense enough for operations work, responsive across devices, and using graphite/zinc surfaces with emerald, teal, amber, and rose status colors."

## 1:40-2:05 - Tickets Section

Open `/dashboard/tickets`.

Say:

"The Tickets section is the focused queue view. Support teams can filter by status, priority, category, and search terms, then open any ticket for the full workspace."

Show:

- filters;
- desktop table;
- SLA badges;
- priority/category/status columns;
- AI status.

If time allows, mention:

"On mobile this switches to card-based rows to avoid horizontal overflow."

Open a ticket.

## 2:05-3:10 - Ticket Detail Workspace

Open `/dashboard/tickets/[id]`.

Say:

"This page is the real support workspace. It combines ticket metadata, customer context, SLA state, conversation history, internal notes, and AI review in one place."

Show:

- ticket title, status, priority, category, and SLA;
- customer info and customer history;
- conversation thread;
- reply composer;
- internal note composer.

If there is an internal note:

"Internal notes are stored in the same conversation model but marked as internal, so the UI can separate private team context from customer-visible replies."

## 3:10-4:05 - AI Suggestion Panel

Stay on the ticket detail page.

Say:

"The AI suggestion panel is deliberately human-in-the-loop. The model can summarize the issue, suggest a reply, and show the retrieved knowledge snippets that influenced it. But the admin has to review and approve the final text."

Show:

- summary;
- suggested reply textarea;
- retrieved knowledge-base snippets;
- confidence score;
- limitations and manual verification badge if context is weak;
- reset-to-draft control.

Edit the reply slightly, then approve it.

Say:

"When I approve this, PulseDesk stores the final approved reply and adds it to the ticket conversation as an admin message. It does not send an email in the MVP. If the text changed, the backend tracks that it was edited before approval."

After approval, show:

- approved or edited badge;
- new conversation message;
- explanation text that approval does not send email.

## 4:05-4:35 - Customers Section

Open `/dashboard/customers`, then open a customer detail page.

Say:

"The customer workspace gives support teams account context without leaving the dashboard. It shows profile details, ticket counts, recent ticket history, and an activity timeline derived from existing ticket, message, and AI suggestion records."

Show:

- customer search/list;
- customer detail metrics;
- recent tickets linking back to ticket detail;
- activity timeline events such as ticket created, message added, AI suggestion generated, and AI reply approved.

## 4:35-5:05 - Knowledge Base And RAG

Open `/knowledge-base`.

Say:

"The knowledge base powers the RAG flow. Admins can upload support documents. The backend parses the file, normalizes the text, chunks it, generates Gemini embeddings, and stores vectors in PostgreSQL with pgvector. When AI drafts a reply, PulseDesk searches those vectors for relevant snippets and includes them as grounding context."

Show:

- existing demo FAQ or policy document;
- upload area if you want to show ingestion;
- document list and chunk counts.

Add:

"pgvector is a pragmatic MVP choice because it keeps relational ticket data and vector search in the same PostgreSQL system."

## Architecture Summary

Use this if the interviewer asks for the technical view, or as a 20-second close if time allows.

Say:

"The frontend is Next.js App Router with Clerk auth and TanStack Query. The backend is NestJS with Prisma over PostgreSQL and pgvector. Redis and BullMQ handle AI jobs for classify, prioritize, and suggest-reply. Gemini provides embeddings and structured generation. Socket.IO pushes ticket update events into the dashboard. Docker Compose runs the local stack, and CI has separate client and server jobs for lint, build, tests, Prisma generation, Postgres, and Redis."

## AI Safety Summary

Say:

"The safety posture is intentionally conservative. RAG gives the model grounding, but it does not eliminate hallucinations. The UI shows snippets, confidence, limitations, and manual verification states. The admin must approve or edit every AI reply, and the MVP does not send customer emails automatically."

If asked what is missing:

"For production I would add stronger audit logs, prompt-injection scanning for uploaded documents, PII redaction, tenant isolation, role-based permissions, answer faithfulness scoring, and a larger retrieval and safety evaluation set."

## Strong Closing

Use this closing if the demo needs a clear finish:

"PulseDesk demonstrates the kind of production SaaS engineering I care about: typed frontend and backend, durable data modeling, background processing, realtime UX, RAG with pgvector, human-reviewed AI, deployment planning, and honest safety boundaries."

## Common Questions

**Why not send AI replies automatically?**

Because customer support replies can affect trust, billing, and operations. The MVP keeps AI assistive and requires human approval.

**Why pgvector instead of a dedicated vector database?**

For MVP scale, pgvector keeps embeddings close to relational support data and avoids adding another infrastructure component too early.

**What happens if AI fails?**

The ticket still exists. The backend records failed AI suggestion state where practical, and the support team can handle the ticket manually.

**How do you evaluate RAG quality?**

PulseDesk includes `pnpm eval:rag`, which checks top-1 and top-3 retrieval accuracy against a small support-question dataset. It is a retrieval sanity check, not a full answer-quality benchmark.
