# Architecture

## Overview

TODO: Summarize the PulseDesk MVP architecture and major system boundaries.

## Planned System Flow

```text
Next.js -> NestJS -> PostgreSQL/pgvector -> Redis/BullMQ -> Gemini -> Socket.IO -> Next.js
```

TODO: Expand this flow as implementation decisions are finalized.

## Frontend

TODO: Document the Next.js App Router structure, authentication flow, and dashboard polling/Socket.IO approach.

## Backend

TODO: Document the NestJS module structure, validation strategy, and API boundaries.

## Data Layer

TODO: Document PostgreSQL, Prisma, pgvector usage, migrations, and local development setup.

## Background Jobs

TODO: Document Redis, BullMQ queues, retry behavior, and AI processing jobs.

## AI Integration

TODO: Document provider-agnostic AI service boundaries, Gemini defaults, embeddings, RAG, and fallbacks.

## Security

TODO: Document Clerk authentication, authorization model, secret handling, and data isolation assumptions.
