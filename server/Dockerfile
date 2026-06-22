# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN apk add --no-cache openssl \
  && corepack enable \
  && corepack prepare pnpm@11.8.0 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared/tsconfig.json ./packages/shared/tsconfig.json
COPY packages/shared/src ./packages/shared/src
COPY server/nest-cli.json server/tsconfig.json server/tsconfig.build.json ./server/
COPY server/prisma ./server/prisma
COPY server/src ./server/src
RUN pnpm --filter @pulsedesk/server prisma:generate
RUN pnpm --filter @pulsedesk/shared build
RUN pnpm --filter @pulsedesk/server build

FROM node:22-alpine AS runner
ENV NODE_ENV="production"
ENV PORT="3001"
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN apk add --no-cache openssl \
  && corepack enable \
  && corepack prepare pnpm@11.8.0 --activate \
  && addgroup -S nodejs \
  && adduser -S nestjs -G nodejs

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --prod --frozen-lockfile --filter @pulsedesk/server...

COPY --from=build --chown=nestjs:nodejs /app/server/dist ./server/dist
COPY --from=build --chown=nestjs:nodejs /app/server/prisma ./server/prisma
COPY --from=build --chown=nestjs:nodejs /app/packages/shared/dist ./packages/shared/dist
RUN pnpm --filter @pulsedesk/server prisma:generate
RUN chown -R nestjs:nodejs /app

USER nestjs
WORKDIR /app/server
EXPOSE 3001
CMD ["node", "dist/main.js"]
