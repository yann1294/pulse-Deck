# Local Development

This guide covers the local PostgreSQL and Redis services used by PulseDesk during development.

## Start Services

From the repository root:

```sh
docker compose up -d
```

Optional: copy `.env.example` to `.env` at the repository root before starting services if you want to override the local Docker defaults.

Check service status:

```sh
docker compose ps
```

The local service defaults are:

- PostgreSQL: `localhost:5432`
- Database: `pulsedesk`
- User: `pulsedesk`
- Password: `pulsedesk`
- Redis: `localhost:6379`

## Verify PostgreSQL

Run a simple PostgreSQL query inside the container:

```sh
docker compose exec postgres psql -U pulsedesk -d pulsedesk -c "select version();"
```

You can also verify readiness with:

```sh
docker compose exec postgres pg_isready -U pulsedesk -d pulsedesk
```

## Enable And Check Pgvector

The `pgvector/pgvector:pg16` image includes the pgvector extension, but each database still needs the extension enabled.

Enable pgvector in the local database:

```sh
docker compose exec postgres psql -U pulsedesk -d pulsedesk -c "create extension if not exists vector;"
```

Check that pgvector is enabled:

```sh
docker compose exec postgres psql -U pulsedesk -d pulsedesk -c "select extname, extversion from pg_extension where extname = 'vector';"
```

## Verify Redis

Run:

```sh
docker compose exec redis redis-cli ping
```

Expected output:

```text
PONG
```

## Stop Services

Stop containers while keeping local data volumes:

```sh
docker compose down
```

## Reset Containers And Data

Remove containers and local PostgreSQL/Redis volumes:

```sh
docker compose down -v
```

This deletes local database and Redis data. Use it only when you want a clean local environment.
