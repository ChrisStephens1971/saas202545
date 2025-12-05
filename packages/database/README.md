# @elder-first/database

Database package for Elder-First Church Platform.

## Setup

1. Create a PostgreSQL database:
```bash
createdb elder_first
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Run migrations:
```bash
npm run migrate
```

## Migrations

Migrations are SQL files in `migrations/` directory, executed in alphabetical order.

- `npm run migrate` - Run pending migrations
- `npm run migrate:up` - Run pending migrations (same as above)
- `npm run migrate:down` - Rollback migrations (not implemented)

## Development

### Local PostgreSQL with Docker

```bash
docker run --name postgres-elder-first \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=elder_first \
  -p 5445:5432 \
  -d postgres:14
```

### Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

Example:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5445/elder_first
```

## Row-Level Security (RLS)

All tables (except `tenant`) have RLS enabled. Set tenant context before queries:

```typescript
import { pool, setTenantContext } from '@elder-first/database';

await setTenantContext(pool, tenantId);
// Now all queries are scoped to this tenant
```
