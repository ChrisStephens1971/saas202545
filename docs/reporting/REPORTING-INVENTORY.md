# Reporting Inventory

**Last Updated**: 2025-12-12
**Purpose**: Catalog all reporting/analytics surfaces in the application

---

## Overview

This document tracks all reporting and analytics capabilities available in **Elder-First Church Platform**. Keep this current as new features are added.

**Inventory Summary:**

| Category | Count |
|----------|-------|
| Backend API Endpoints | 0 |
| Frontend Pages | 0 |
| Frontend Services | 0 |
| Data Export Capabilities | 0 |

---

## Backend API Endpoints

<!-- Add endpoints as they're created. Example format: -->

### #1: Example Metrics Endpoint

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/v1/metrics/example` |
| **Purpose** | Example metrics endpoint |
| **Auth** | Tenant-scoped (requires auth + tenant context) |
| **Rate Limit** | 30/min per tenant |
| **Pagination** | Yes (max 100) |
| **Date Range** | Default 30 days, max 365 days |
| **Response** | `{ items: [], total: number, page: number }` |
| **Test Coverage** | `api/src/__tests__/example.test.ts` |

<!-- Copy template above for each new endpoint -->

---

## Frontend Pages

<!-- Add pages as they're created. Example format: -->

### Example Dashboard Page

| Property | Value |
|----------|-------|
| **Route** | `/dashboard` |
| **Purpose** | Main dashboard overview |
| **Service** | `dashboard.service.ts` |
| **Components** | StatsCards, ActivityTable, QuickActions |
| **Auth** | Requires login |
| **Test Coverage** | None (add path to test file when created) |

<!-- Copy template above for each new page -->

---

## Frontend Services

<!-- Add services as they're created. Example format: -->

### Example Service

| Property | Value |
|----------|-------|
| **File** | `app/src/services/example.service.ts` |
| **APIs Called** | `/api/v1/example/*` |
| **Key Functions** | `getExampleData()`, `exportExample()` |
| **Caching** | None |

<!-- Copy template above for each new service -->

---

## Data Export Capabilities

<!-- Add export capabilities as they're created. Example format: -->

### Example CSV Export

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/v1/example/export` |
| **Format** | CSV |
| **Auth** | Tenant-scoped |
| **Rate Limit** | 10/min per tenant |
| **Size Limit** | Requires date range (max 90 days) |
| **Audit Logging** | Yes (EXAMPLE_EXPORT action) |

<!-- Copy template above for each new export -->

---

## API Contract: Hardening Constraints

All reporting endpoints must follow these constraints:

### Authentication & Authorization

| Requirement | Implementation |
|-------------|----------------|
| Authentication | All endpoints require `authenticate` middleware |
| Tenant Isolation | All endpoints require `withTenant` middleware |
| Admin Restrictions | Admin-only endpoints use `requireTenantAdmin` |

### Rate Limiting

| Endpoint Category | Limit | Rationale |
|-------------------|-------|-----------|
| View endpoints | 30-60/min | Prevent scraping |
| Export endpoints | 10/min | Heavy operations |

### Pagination

| Constraint | Value |
|------------|-------|
| Default page size | 20 |
| Maximum page size | 100 |
| Enforcement | Server-side (client cannot override) |

### Date Range Limits

| Constraint | Value |
|------------|-------|
| Default range | 30 days (if unbounded query) |
| Maximum range | 365 days |
| Required for exports | Yes |

### Input Validation (Allowlists)

All filter parameters must be validated against allowlists:

```typescript
// Example allowlist validation
const VALID_TYPES = ['type_a', 'type_b', 'type_c'];
const type = VALID_TYPES.includes(req.query.type)
  ? req.query.type
  : undefined; // Silent fallback to no filter
```

### Security: Sensitive Data Handling

| Requirement | Implementation |
|-------------|----------------|
| No raw provider errors | Map to safe error codes |
| No tokens in responses | Never include auth tokens |
| No stack traces | Log server-side, return safe message |
| Audit logging | Log all exports and status changes |

---

## Related Documentation

- [GAP-ANALYSIS.md](./GAP-ANALYSIS.md) - What's missing
- [API Contract Guide](../api/API-CONTRACT-GUIDE.md) - API documentation standards
