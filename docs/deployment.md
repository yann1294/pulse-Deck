# Deployment

PulseDesk is a pnpm monorepo with three deployable concerns:

- `client/`: Next.js dashboard and public ticket submission UI.
- `server/`: NestJS API, Socket.IO gateway, BullMQ workers, Prisma.
- `packages/shared/`: shared TypeScript DTOs used by both apps.

The recommended production split is Vercel for the frontend, Railway for the backend, Railway PostgreSQL with pgvector, and Railway Redis.

## Frontend: Vercel

Create a Vercel project from this repository and set the project root to `client/`.

Use the default Next.js build unless Vercel asks for explicit commands:

```bash
pnpm install --frozen-lockfile
pnpm --filter @pulsedesk/shared build
pnpm --filter @pulsedesk/client build
```

If Vercel cannot resolve `@pulsedesk/shared`, configure the project as a monorepo project from the repository root and keep `client/` as the app directory. The shared package must be built before the client.

### Frontend Environment Variables

Set these in Vercel:

```bash
NEXT_PUBLIC_API_URL=https://your-railway-api.example.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_DEMO_MODE=false
```

`NEXT_PUBLIC_API_URL` must point at the public Railway backend URL. The same URL is used by REST calls and Socket.IO.

Set `NEXT_PUBLIC_DEMO_MODE=true` only for portfolio/demo deployments where the dashboard should show the Demo Workspace banner.

## Backend: Railway

Create a Railway service for the NestJS server.

Because the server depends on `packages/shared`, the Docker build context must be the repository root. Use:

- Build context: repository root
- Dockerfile path: `server/Dockerfile`
- Public port: `3001`

Do not configure Railway with `server/` as the only build context unless the Dockerfile is rewritten to copy only files inside `server/`. The current production Dockerfile intentionally builds from the monorepo root.

The container starts with:

```bash
node dist/main.js
```

Run Prisma migrations during deployment, before accepting traffic:

```bash
pnpm --filter @pulsedesk/server db:migrate
```

On Railway this can be a pre-deploy command or a one-off release command after provisioning the database.

### Backend Environment Variables

Set these in Railway:

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

Use Railway variable references when possible instead of copying credentials manually.

Set `DEMO_MODE=true` only when running the demo seed command. Keep it `false` for normal production operation.

## PostgreSQL pgvector

PulseDesk uses Prisma with PostgreSQL and pgvector-backed embeddings. Production PostgreSQL must support the `vector` extension.

Before running migrations, confirm pgvector is available:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Railway's standard PostgreSQL may not include pgvector in every plan or image. If pgvector is unavailable, use a Railway-compatible Postgres image/provider that includes pgvector, or host Postgres on a provider with pgvector support.

Run migrations with:

```bash
pnpm --filter @pulsedesk/server db:migrate
```

Do not use `prisma migrate dev` in production.

## Redis

Redis is required for BullMQ ticket AI processing.

Production requirements:

- Use a managed Redis service or a Railway Redis plugin.
- Set `REDIS_HOST` to the internal/private Redis hostname when backend and Redis are on Railway.
- Set `REDIS_PORT` to the provider port, usually `6379`.
- Do not use `localhost` in production unless Redis runs in the same container, which is not recommended.

If Redis is unreachable, ticket creation can still succeed, but AI jobs and realtime AI updates will not process reliably.

## CORS And Realtime

The NestJS backend uses `CLIENT_URL` for both HTTP CORS and Socket.IO CORS.

Set:

```bash
CLIENT_URL=https://your-vercel-app.vercel.app
```

The value must exactly match the frontend origin, including scheme and domain. Do not include a trailing path.

If you use a custom frontend domain, update `CLIENT_URL` to that domain and redeploy the backend.

## Clerk Setup

In Clerk, configure the production application with the Vercel domain or custom domain.

Backend settings:

- `CLERK_SECRET_KEY`: backend secret key.
- `CLERK_PUBLISHABLE_KEY`: publishable key.
- `CLERK_JWT_KEY`: JWT public key from Clerk, recommended for verification.
- `CLERK_AUTHORIZED_PARTY`: frontend origin, for example `https://app.example.com`.

Frontend settings:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- sign-in/sign-up route variables listed above.

Common Clerk mismatch: the frontend works, but API requests return unauthorized. Check that `CLERK_AUTHORIZED_PARTY` exactly matches the browser origin and that the frontend is using the same Clerk application as the backend.

## Gemini Setup

Create a Gemini API key in Google AI Studio or the Google Cloud setup used by the team.

Set:

```bash
GEMINI_API_KEY=...
GEMINI_GENERATION_MODEL=gemini-3.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIM=768
```

`EMBEDDING_DIM` must match the pgvector column dimension in Prisma migrations. The current schema expects `vector(768)`.

## Common Blockers And Fixes

**`Cannot find module '@pulsedesk/shared'` during frontend or backend build**

Build `packages/shared` before building the app, and make sure the deployment platform can access the monorepo root.

**Railway build cannot find `server/src`**

The Dockerfile path can be `server/Dockerfile`, but the build context must be the repository root.

**`Cannot find module '@nestjs/common'` at runtime**

Rebuild with the current Dockerfile. The runner stage must install production dependencies and run Prisma generation in the final image.

**`@prisma/client did not initialize yet`**

Run `pnpm --filter @pulsedesk/server prisma:generate` during image build. The current Dockerfile already does this in the runner stage.

**`Can't reach database server`**

Check `DATABASE_URL`. In Railway, use the database service's internal host. In Docker Compose, use `postgres`, not `localhost`.

**pgvector migration fails**

Ensure the production database supports `CREATE EXTENSION vector`. If not, switch to a pgvector-enabled PostgreSQL provider.

**AI jobs stay pending**

Check Redis connectivity and `REDIS_HOST`/`REDIS_PORT`. BullMQ requires Redis.

**Browser CORS or Socket.IO connection errors**

Check backend `CLIENT_URL`. It must exactly match the deployed frontend origin.

**API returns unauthorized in production**

Check Clerk keys, `CLERK_AUTHORIZED_PARTY`, and allowed domains in the Clerk dashboard.

**Gemini calls fail**

Check `GEMINI_API_KEY`, model names, billing/quota, and whether the Railway service has the variable in the production environment.

## Release Checklist

Before promoting a deployment:

- Vercel has all frontend environment variables.
- Railway backend has all backend environment variables.
- PostgreSQL has pgvector enabled.
- Prisma migrations have run successfully.
- Redis is reachable by the backend.
- `CLIENT_URL` matches the frontend origin.
- Clerk authorized party and allowed domains match the deployed frontend.
- `GET /health` on the backend returns OK.
