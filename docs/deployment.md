# PulseDesk Deployment Guide

PulseDesk is a pnpm monorepo with a Next.js frontend, NestJS backend, PostgreSQL/pgvector database, Redis-backed BullMQ jobs, Gemini AI integration, Clerk authentication, Socket.IO realtime updates, Prisma migrations, demo seed data, and a lightweight RAG retrieval evaluation script.

This guide describes a practical production-style deployment for the current implementation.

## 1. Deployment Overview

Recommended deployment split:

- Frontend: Vercel, deployed from `client/`.
- Backend API: Railway or another container platform, deployed from `server/` with the repository root available as build context.
- PostgreSQL: Railway, Supabase, Neon, or another provider with pgvector support.
- Redis: Railway Redis or a managed Redis provider.
- AI provider: Gemini API.
- Auth provider: Clerk.

The current backend runs the NestJS API and BullMQ worker in the same service process. That keeps the MVP simple. A future production setup can split the API and worker into separate containers that share the same codebase, Redis instance, and database.

The repository also includes an optional Docker Compose local stack for PostgreSQL pgvector, Redis, and the server profile.

## 2. Frontend Deployment On Vercel

Create a Vercel project from this repository.

Recommended settings:

- Root directory: `client`
- Framework preset: Next.js
- Build command:

```bash
pnpm --filter @pulsedesk/shared build && pnpm --filter @pulsedesk/client build
```

If Vercel installs from inside `client/` and cannot resolve `@pulsedesk/shared`, configure the project as a monorepo deployment from the repository root while keeping `client/` as the app directory.

Frontend environment variables:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_API_URL=https://your-backend.example.com
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_DEMO_MODE=false
```

Notes:

- `NEXT_PUBLIC_API_URL` must point to the public NestJS backend URL. The frontend uses it for REST requests and Socket.IO.
- `CLERK_SECRET_KEY` is included because Clerk's Next.js integration may require it for server-side auth helpers.
- If you deploy a recruiter demo, set `NEXT_PUBLIC_DEMO_MODE=true` to show the Demo Workspace banner.
- Configure Clerk allowed domains for the Vercel production domain and any custom domain.
- Update backend `CLIENT_URL` to match the Vercel origin exactly.

## 3. Backend Deployment On Railway

Create a Railway service for the NestJS backend.

Docker deployment:

- Build context: repository root
- Dockerfile path: `server/Dockerfile`
- Public port: `3001`

The Dockerfile expects the monorepo root so it can copy `server/`, `packages/shared/`, and workspace lockfiles. Do not use `server/` as the only Docker build context unless the Dockerfile is rewritten for that layout.

If not using Docker, use these commands:

```bash
pnpm install --frozen-lockfile
pnpm --filter @pulsedesk/shared build
pnpm --filter @pulsedesk/server prisma:generate
pnpm --filter @pulsedesk/server build
pnpm --filter @pulsedesk/server start
```

Backend environment variables:

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
REDIS_HOST=your-redis-host
REDIS_PORT=6379
CLIENT_URL=https://your-vercel-app.vercel.app

CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_JWT_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
CLERK_AUTHORIZED_PARTY=https://your-vercel-app.vercel.app

GEMINI_API_KEY=...
GEMINI_GENERATION_MODEL=gemini-3.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIM=768

DEMO_MODE=false
```

Use Railway variable references where available instead of copying database and Redis credentials manually.

## 4. PostgreSQL + pgvector Setup

PulseDesk requires PostgreSQL with the `vector` extension enabled. The Prisma schema stores embeddings as `vector(768)`.

The migration setup should create the extension if configured, but provider support still matters. Not every hosted PostgreSQL plan allows extensions by default.

Verify pgvector manually:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
SELECT extname FROM pg_extension WHERE extname = 'vector';
```

If the extension cannot be created:

- enable extensions in the provider dashboard if available;
- switch to a pgvector-enabled PostgreSQL image or plan;
- use a provider such as Supabase, Neon, or Railway configuration that supports pgvector.

## 5. Redis / BullMQ Setup

Redis is required for AI background jobs. Ticket creation stores the ticket immediately, then BullMQ runs classification, priority prediction, and reply suggestion work asynchronously.

Production requirements:

- Provision Railway Redis or another managed Redis service.
- Set `REDIS_HOST` to the provider's internal/private hostname when backend and Redis run on the same platform.
- Set `REDIS_PORT`, usually `6379`.
- Do not use `localhost` in production unless Redis is intentionally running in the same container.

The current MVP runs API and worker together. If you split workers later, the worker container must run the same server build with access to:

- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- Gemini environment variables
- Clerk variables if protected workflow code needs them

## 6. Prisma Production Migration Steps

Run Prisma generation during build:

```bash
pnpm --filter @pulsedesk/server prisma:generate
```

Run production migrations before serving traffic:

```bash
pnpm --filter @pulsedesk/server db:migrate
```

The root equivalent is also available:

```bash
pnpm db:migrate
```

Seed commands are available, but use them only in local, staging, or recruiter demo environments:

```bash
pnpm db:seed
pnpm demo:seed
```

Do not run `pnpm db:reset` or Prisma reset commands against production. They are destructive and can remove production data.

## 7. Socket.IO / Realtime Deployment Notes

PulseDesk uses Socket.IO for dashboard updates.

Requirements:

- The backend hosting platform must support WebSocket connections.
- `CLIENT_URL` on the backend must exactly match the deployed frontend origin.
- `NEXT_PUBLIC_API_URL` on the frontend must point to the backend origin.
- CORS must allow the frontend origin for both HTTP and Socket.IO.

Example:

```bash
CLIENT_URL=https://your-vercel-app.vercel.app
NEXT_PUBLIC_API_URL=https://your-backend.example.com
```

If Socket.IO cannot connect, the dashboard still has polling fallback, but realtime AI status updates will feel delayed.

## 8. Clerk Production Checklist

In Clerk:

- Add the Vercel domain and any custom domain to authorized domains.
- Use the same Clerk application for frontend and backend.
- Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in Vercel.
- Set `CLERK_SECRET_KEY` where frontend server-side Clerk helpers require it.
- Set backend `CLERK_SECRET_KEY`.
- Set backend `CLERK_PUBLISHABLE_KEY`.
- Set backend `CLERK_AUTHORIZED_PARTY` to the exact frontend origin.
- Configure and copy `CLERK_JWT_KEY` if using JWT public-key verification.

Common mismatch: the user can sign in, but API requests return `401`. Check that the frontend origin, `CLERK_AUTHORIZED_PARTY`, Clerk app keys, and backend environment all refer to the same production Clerk application.

## 9. Gemini Production Checklist

Set:

```bash
GEMINI_API_KEY=...
GEMINI_GENERATION_MODEL=gemini-3.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIM=768
```

Production notes:

- Confirm the API key has access to the configured generation and embedding models.
- Monitor quota, billing, and rate limits.
- Keep `EMBEDDING_DIM` aligned with the pgvector column dimension.
- AI failures should not crash ticket submission. The current backend records failed AI suggestion state and emits ticket update events so the admin dashboard can show the failure.

## 10. Demo Workspace Deployment

For a recruiter demo, use a separate staging database and seed fake data:

```bash
pnpm demo:seed
```

`demo:seed` runs the existing seed script with `DEMO_MODE=true`. The regular command is also available:

```bash
pnpm db:seed
```

Recommended demo setup:

- Use a dedicated demo database, not production.
- Set `NEXT_PUBLIC_DEMO_MODE=true` in Vercel so the dashboard shows the Demo Workspace banner.
- Keep backend `DEMO_MODE=false` for normal runtime; use `DEMO_MODE=true` only when running the demo seed command.
- Do not upload real customer data, private company policies, or sensitive documents in demo mode.

## 11. RAG Evaluation In Staging

PulseDesk includes a lightweight retrieval evaluation script:

```bash
pnpm eval:rag
```

Run it after seeding knowledge-base data in a local or staging environment. The script checks whether the expected knowledge-base document appears in the top retrieved results for representative questions.

Use it as a retrieval sanity check:

- Top-1 accuracy means the expected document was the first result.
- Top-3 accuracy means the expected document appeared in the first three results.

This does not prove answer quality, faithfulness, prompt-injection resistance, or production readiness. It only checks whether retrieval is finding the expected source material.

## 12. Optional Docker Compose Local Stack

For local infrastructure, use Docker Compose from the repository root.

Start PostgreSQL pgvector and Redis:

```bash
docker compose up -d postgres redis
```

Start the optional server profile:

```bash
docker compose --profile server up --build
```

In Docker Compose, backend database and Redis hostnames should use service names:

```bash
DATABASE_URL=postgresql://pulsedesk:pulsedesk@postgres:5432/pulsedesk?schema=public
REDIS_HOST=redis
REDIS_PORT=6379
```

For local commands run on the host machine, use the exposed localhost port from `docker-compose.yml`.

## 13. Common Deployment Issues And Fixes

**CORS errors in the browser**

Set backend `CLIENT_URL` to the exact Vercel origin. Include `https://`; do not include a path.

**Clerk `401` errors**

Verify Clerk keys, authorized domains, `CLERK_AUTHORIZED_PARTY`, and that frontend/backend use the same Clerk application.

**Redis connection errors**

Check `REDIS_HOST` and `REDIS_PORT`. On Railway, prefer the internal Redis hostname when available.

**pgvector extension missing**

Run `CREATE EXTENSION IF NOT EXISTS vector;` or enable pgvector through the provider. If the provider blocks extensions, move to a pgvector-capable database.

**Prisma migration failure**

Check `DATABASE_URL`, database permissions, network access, and pgvector availability. Use `pnpm --filter @pulsedesk/server db:migrate` for production migrations, not `migrate dev`.

**Gemini invalid API key or model error**

Confirm `GEMINI_API_KEY`, model names, billing, quota, and regional/model availability.

**Socket.IO connection blocked**

Confirm WebSocket support on the backend platform, `CLIENT_URL` CORS settings, and `NEXT_PUBLIC_API_URL`.

**`NEXT_PUBLIC_API_URL` points to the wrong backend**

Update the Vercel environment variable and redeploy the frontend. Browser-exposed `NEXT_PUBLIC_*` variables are compiled into the deployed client bundle.

**Railway build cannot find monorepo files**

Use repository root as the Docker build context and `server/Dockerfile` as the Dockerfile path.

**`Cannot find module '@nestjs/common'` at runtime**

Use the production Dockerfile or ensure production dependencies are installed in the runtime image before running `node dist/main.js`.

## Release Checklist

- Vercel has all frontend environment variables.
- Railway or the backend platform has all backend environment variables.
- PostgreSQL supports pgvector and migrations have run.
- Redis is reachable by the backend.
- Prisma Client is generated during build.
- `CLIENT_URL` matches the frontend origin.
- Clerk authorized domains and authorized party are correct.
- Gemini key and model names are valid.
- `GET /health` returns OK.
- Demo data is seeded only into demo or staging databases.
- `pnpm eval:rag` has been run in staging after knowledge-base seed data is available.
