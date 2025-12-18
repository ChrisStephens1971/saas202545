# Environment URLs

This file is the **single source of truth** for all environment URLs (Local/Dev, Staging, Production) in the Elder-First Church Platform.

## Overview

The platform runs in three distinct environments:

| Environment | Naming Convention | Purpose |
|-------------|-------------------|---------|
| **Local/Dev** | `localhost:*` | Local development with Docker |
| **Staging** | `church-platform-*-staging.azurewebsites.net` | Pre-production testing with dev-mode auth |
| **Production** | `app-vrd-202545-prd-eus2-*` (CAF-style) | Live production with custom domain |

- **Staging** uses simplified Azure App Service names (`church-platform-*`) for quick testing.
- **Production** uses Cloud Adoption Framework (CAF) naming: `app-vrd-202545-prd-eus2-*`.
- **Production Custom Domain:** `https://www.elderfirstchurch.com`

---

## Environment URL Table

| Environment | Component | URL / Hostname | Source |
|-------------|-----------|----------------|--------|
| **Local/Dev** | Web | `http://localhost:3045` | `apps/web/.env.example` |
| **Local/Dev** | API | `http://localhost:8045` | `apps/api/.env.example` |
| **Local/Dev** | Database | `postgresql://postgres:postgres@localhost:5678/elder_first` | `apps/api/.env.example` |
| | | | |
| **Staging** | Web | `https://church-platform-web-staging.azurewebsites.net` | `apps/web/.env.staging.example` |
| **Staging** | API | `https://church-platform-api-staging.azurewebsites.net` | `apps/api/.env.staging.example` |
| **Staging** | Database | `postgresql://...@church-db-staging.postgres.database.azure.com:5432/elder_first` | `apps/api/.env.staging.example` |
| | | | |
| **Production** | Web (Azure) | `https://app-vrd-202545-prd-eus2-web.azurewebsites.net` | `docs/PRODUCTION-DEPLOYMENT.md` |
| **Production** | API (Azure) | `https://app-vrd-202545-prd-eus2-api.azurewebsites.net` | `docs/PRODUCTION-DEPLOYMENT.md` |
| **Production** | Database | `postgresql://...@postgres-vrd-202545-prd-eus2.postgres.database.azure.com:5432/elderfirst` | `docs/PRODUCTION-DEPLOYMENT.md` |
| **Production** | Custom Domain | `https://www.elderfirstchurch.com` | `docs/PRODUCTION-DEPLOYMENT.md` |

---

## AI / MCP Browser Automation

AI-controlled browser automation (Playwright MCP, Claude browser tools, Cursor, etc.) is allowed **ONLY** against the following **staging** URLs:

| Component | Staging URL |
|-----------|-------------|
| Web | `https://church-platform-web-staging.azurewebsites.net` |
| API | `https://church-platform-api-staging.azurewebsites.net` |

### Off Limits for AI Automation

The following URLs are **OFF LIMITS** for any AI-driven browser automation:

- **Production Azure App Services:**
  - `https://app-vrd-202545-prd-eus2-web.azurewebsites.net`
  - `https://app-vrd-202545-prd-eus2-api.azurewebsites.net`
- **Production Custom Domain:**
  - `https://www.elderfirstchurch.com`

### Guardrails Reference

For the full set of AI/MCP browser automation guardrails (including test accounts, data safety rules, and enforcement), see:

- [`docs/mcp/PLAYWRIGHT-GUARDRAILS.md`](../mcp/PLAYWRIGHT-GUARDRAILS.md)

---

## CORS Configuration (Dev)

### The Problem

When running the web app and API on different ports during local development, browser security blocks cross-origin requests. The web app on `http://localhost:3500` cannot call the API on `http://localhost:8045` without proper CORS headers.

### How It Works

CORS configuration lives in `apps/api/src/config/cors.ts`.

**In development**, the API allows requests from these localhost origins:
- `http://localhost:3045` (standard web port)
- `http://localhost:3500` (alternate web port)
- `http://localhost:3000` (Next.js default)

**In production**, CORS is strict:
- Only explicitly configured origins are allowed (via `ALLOWED_ORIGINS` env var)
- Wildcards (`*`) are rejected
- Rejected origins are logged for security monitoring

### Key Files

| File | Purpose |
|------|---------|
| `apps/api/src/config/cors.ts` | Centralized CORS config with `DEFAULT_DEV_ORIGINS` |
| `apps/api/src/index.ts` | Express middleware registration at line 170 |
| `apps/web/src/lib/trpc/Provider.tsx` | tRPC client pointing to API URL |

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | Web app: API endpoint URL | `http://localhost:8045` |
| `ALLOWED_ORIGINS` | API: Comma-separated list of allowed origins for production | Dev defaults |

### Troubleshooting

**Symptom:** Browser console shows "CORS policy: No 'Access-Control-Allow-Origin' header"

**Checklist:**
1. Restart the API server after changing `cors.ts`
2. Verify the web port is in `DEFAULT_DEV_ORIGINS` array
3. Check API logs for "CORS violation" warnings

---

## Related Documentation

- [`apps/web/.env.example`](../../apps/web/.env.example) - Local web environment template
- [`apps/api/.env.example`](../../apps/api/.env.example) - Local API environment template
- [`apps/web/.env.staging.example`](../../apps/web/.env.staging.example) - Staging web environment template
- [`apps/api/.env.staging.example`](../../apps/api/.env.staging.example) - Staging API environment template
- [`docs/PRODUCTION-DEPLOYMENT.md`](../PRODUCTION-DEPLOYMENT.md) - Full production deployment guide
- [`docs/mcp/PLAYWRIGHT-GUARDRAILS.md`](../mcp/PLAYWRIGHT-GUARDRAILS.md) - AI browser automation rules

---

## Last Reviewed

**Last Reviewed:** 2025-12-05

**Validation performed:**
- Cross-checked URLs against `apps/web/.env.example` and `apps/api/.env.example`
- Cross-checked staging URLs against `apps/web/.env.staging.example` and `apps/api/.env.staging.example`
- Cross-checked production URLs against `docs/PRODUCTION-DEPLOYMENT.md`
- Verified production custom domain is documented as `https://www.elderfirstchurch.com`
- Confirmed AI/MCP guardrails remain staging-only (no production URLs in allowed list)
- Verified `docs/mcp/PLAYWRIGHT-GUARDRAILS.md` does not reference production or custom domain URLs
