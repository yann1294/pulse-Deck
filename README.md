# PulseDesk

PulseDesk is an AI-powered customer support ticketing SaaS MVP.

This repository is initialized as a pnpm monorepo for:

- `client`: Next.js App Router frontend
- `server`: NestJS backend
- `packages/shared`: shared TypeScript utilities and types

## Documentation

- Local setup: [docs/local-development.md](docs/local-development.md)
- Deployment: [docs/deployment.md](docs/deployment.md)
- AI safety: [docs/ai-safety.md](docs/ai-safety.md)

## Common Commands

```sh
pnpm install
pnpm lint
pnpm build
pnpm --filter @pulsedesk/server test
```

Copy the relevant example environment files before running the apps locally:

```sh
cp .env.example .env
cp client/.env.local.example client/.env.local
cp server/.env.example server/.env
```
