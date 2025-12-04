# Elder-First Church Platform - API Surface (V1)

**Version:** 1.0
**Date:** 2025-11-14
**Stack:** tRPC v11 + Zod validation + PostgreSQL RLS

---

## Overview

The Elder-First platform uses **tRPC** for type-safe API endpoints with automatic TypeScript inference from backend to frontend. REST endpoints are reserved for public-facing integrations (webhooks, ICS feeds).

### Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Next.js   │ ◄─tRPC─►│   tRPC API   │ ◄─RLS──►│  PostgreSQL │
│  Frontend   │         │  (Node/TS)   │         │  Flexible   │
└─────────────┘         └──────────────┘         └─────────────┘
                               │
                               │
                        ┌──────▼──────┐
                        │  Entra ID   │
                        │  B2C Auth   │
                        └─────────────┘
```

**Key Principles:**
- Row-Level Security (RLS) enforced via `app.tenant_id` session variable
- All mutations require authentication
- Public reads allowed for `is_public` resources
- Rate limiting per tenant: 100 req/min (queries), 30 req/min (mutations)

---

## tRPC Routers

### 1. **people** - People & Households Management

**Procedures:**
- `search` - Full-text search across people
- `get` - Get person by ID with household
- `upsert` - Create or update person
- `listHouseholds` - List households with members

**Input/Output Schemas:** See `P5_routers.ts`

---

### 2. **events** - Events & RSVP

**Procedures:**
- `list` - List upcoming events (filtered by date range)
- `get` - Get event details with RSVP list
- `create` - Create new event
- `update` - Update event details
- `delete` - Soft delete event
- `rsvp` - Submit/update RSVP for an event

**Business Rules:**
- RSVP limits enforced server-side
- ICS import deduplication via `external_calendar_id`

---

### 3. **announcements** - Announcements Feed

**Procedures:**
- `listActive` - Get active announcements (not expired, ordered by priority)
- `create` - Submit new announcement (auto-approval for Editors/Admins)
- `approve` - Approve pending announcement (Admin/Editor only)
- `delete` - Soft delete announcement

**Constraints:**
- `title` ≤ 60 chars (hard limit for bulletin rendering)
- `body` ≤ 300 chars (hard limit for bulletin rendering)
- Auto-expire based on `expires_at`

---

### 4. **services** - Service Planning & Order of Worship

**Procedures:**
- `listByDate` - Get service items for a specific Sunday
- `upsertItems` - Bulk upsert service items (idempotent)
- `enforceCCLI` - Validate that all songs have CCLI numbers before bulletin lock
- `delete` - Soft delete service item

**Business Rules:**
- CCLI required for `type='Song'` before bulletin lock
- `sequence` determines order in bulletin

---

### 5. **brandpack** - Branding & Visual Identity

**Procedures:**
- `getActive` - Get currently active brand pack
- `setForWeek` - Assign brand pack to a specific issue date
- `create` - Create new brand pack
- `update` - Update brand pack (logo, colors, fonts)

**Constraints:**
- Only one active brand pack per tenant
- Logo images ≤ 4MB, recommended 16:9 ratio

---

### 6. **bulletin** - Bulletin Generator Core

**Procedures:**
- `createIssue` - Create new bulletin issue for a Sunday
- `buildPreview` - Trigger render pipeline (watermarked PROOF)
- `lock` - Lock bulletin (removes watermark, immutable artifacts)
- `reopenEmergency` - Emergency reopen (Admin only, adds timestamp to outputs)
- `artifacts` - Download PDF, slides, loop, ProPresenter bundle

**State Machine:**
```
draft ──approve──> approved ──build──> built ──lock──> locked
                                                          │
                                                   reopen_emergency
                                                          │
                                                          ▼
                                                       locked*
                                          (* with "UPDATED [timestamp]" watermark)
```

**Lock Requirements:**
1. All songs must have CCLI numbers
2. At least 1 announcement selected
3. Service date ≥ today
4. Brand pack assigned

**Artifacts Generated:**
- `pdf_url` - Standard bulletin PDF
- `pdf_large_print_url` - 120% scaled PDF
- `slides_json` - Array of 1920x1080 JPG slide URLs
- `loop_mp4_url` - 10-second looping video
- `email_html` - Inline-styled HTML for email
- `propresenter_bundle_url` - Zipped ProPresenter 7 package

---

### 7. **giving** - Contributions & Funds (V1 Basic)

**Procedures:**
- `createContribution` - Record one-time or recurring gift
- `listFunds` - Get active giving funds
- `statementExport` - Generate CSV/PDF statement (stub for V1)

**Payment Methods:**
- Card (Stripe)
- ACH
- Cash/Check (manual entry)
- ApplePay / GooglePay

**V1 Limitations:**
- No full general ledger
- Basic fund tracking only
- Statement export is CSV-only (PDF in V2)

---

### 8. **import** - External Data Importers

**Procedures:**
- `icsUpload` - Import events from ICS calendar file
- `planningCenterCsv` - Import service items from Planning Center CSV

**Idempotency:**
- ICS: Uses `external_calendar_id` (UID field)
- Planning Center: Uses `planning_center_id`
- Repeated imports update existing records, don't duplicate

**Validation:**
- Returns line-by-line report with errors/warnings
- Skips invalid rows, imports valid ones

---

## Zod Input/Output Schemas

All schemas are defined in `P5_routers.ts` using Zod for runtime validation and TypeScript inference.

**Example:**
```typescript
const CreateAnnouncementInput = z.object({
  title: z.string().max(60),
  body: z.string().max(300),
  priority: z.enum(['Urgent', 'High', 'Normal']).default('Normal'),
  category: z.string().max(100).optional(),
  expires_at: z.date().optional(),
});
```

---

## Error Taxonomy

All tRPC procedures follow a consistent error structure using `TRPCError`.

### Error Codes

| Code | HTTP | Use Case | Example |
|------|------|----------|---------|
| `BAD_REQUEST` | 400 | Validation failure | Invalid date format, missing required field |
| `UNAUTHORIZED` | 401 | Not authenticated | Missing/invalid session token |
| `FORBIDDEN` | 403 | Insufficient permissions | Non-admin trying to lock bulletin |
| `NOT_FOUND` | 404 | Resource doesn't exist | Person ID not found |
| `CONFLICT` | 409 | Business rule violation | Bulletin already locked, RSVP limit exceeded |
| `PRECONDITION_FAILED` | 412 | Lock state mismatch | Trying to lock bulletin in 'draft' state |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded | >100 req/min for queries |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected error | Database timeout, render service down |

### Error Response Format

```typescript
{
  "error": {
    "message": "Bulletin must be in 'built' state to lock",
    "code": "PRECONDITION_FAILED",
    "data": {
      "currentState": "draft",
      "requiredState": "built"
    }
  }
}
```

### Common Error Scenarios

**Validation Errors:**
```typescript
throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Announcement title exceeds 60 characters',
  cause: zodError,
});
```

**Permission Errors:**
```typescript
throw new TRPCError({
  code: 'FORBIDDEN',
  message: 'Only Admin role can lock bulletins',
  cause: { userRole: 'Editor', requiredRole: 'Admin' },
});
```

**Business Logic Errors:**
```typescript
throw new TRPCError({
  code: 'CONFLICT',
  message: 'RSVP limit reached for this event',
  cause: { limit: 50, current: 50 },
});
```

**Lock State Errors:**
```typescript
throw new TRPCError({
  code: 'PRECONDITION_FAILED',
  message: 'Cannot build bulletin: missing CCLI numbers for 2 songs',
  cause: {
    state: 'approved',
    missingCCLI: ['Amazing Grace', 'How Great Thou Art']
  },
});
```

---

## Rate Limiting

**Per-Tenant Limits:**
- **Queries:** 100 requests/minute
- **Mutations:** 30 requests/minute
- **Bulletin Render:** 10 builds/hour (preview), 5 locks/hour

**Implementation:**
- Redis-backed sliding window
- Returns `429 TOO_MANY_REQUESTS` with `Retry-After` header
- Admin exemption via `rate_limit_exempt` flag

**Rate Limit Response:**
```typescript
{
  "error": {
    "message": "Rate limit exceeded",
    "code": "TOO_MANY_REQUESTS",
    "data": {
      "limit": 100,
      "window": "1m",
      "retryAfter": 42 // seconds
    }
  }
}
```

---

## Authentication & Authorization

**Session Context:**
```typescript
type Context = {
  user: {
    id: string;           // Person ID
    tenantId: string;     // Tenant UUID
    role: 'Admin' | 'Editor' | 'Submitter' | 'Viewer' | 'Kiosk';
    email: string;
  } | null;
  db: PrismaClient;
};
```

**Role Permissions:**

| Action | Admin | Editor | Submitter | Viewer | Kiosk |
|--------|-------|--------|-----------|--------|-------|
| Read public data | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read private data | ✓ | ✓ | ✓ | ✓ | ✗ |
| Create announcements | ✓ | ✓ | ✓ | ✗ | ✗ |
| Approve announcements | ✓ | ✓ | ✗ | ✗ | ✗ |
| Create events | ✓ | ✓ | ✗ | ✗ | ✗ |
| Lock bulletins | ✓ | ✗ | ✗ | ✗ | ✗ |
| Emergency reopen | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage roles | ✓ | ✗ | ✗ | ✗ | ✗ |

**Middleware:**
- `requireAuth` - Ensures user is authenticated
- `requireRole(['Admin', 'Editor'])` - Ensures user has one of specified roles
- `setTenantContext` - Sets `app.tenant_id` for RLS

---

## Example Requests/Responses

### Create Announcement

**Request:**
```typescript
trpc.announcements.create.mutate({
  title: "Thanksgiving Potluck",
  body: "Join us November 24th at 5pm for our annual Thanksgiving potluck. Bring your favorite dish!",
  priority: "High",
  category: "Events",
  expires_at: new Date("2025-11-25"),
});
```

**Response:**
```typescript
{
  id: "a1b2c3d4-...",
  title: "Thanksgiving Potluck",
  body: "Join us November 24th...",
  priority: "High",
  category: "Events",
  is_active: true,
  approved_at: "2025-11-14T10:30:00Z", // Auto-approved for Editor
  created_at: "2025-11-14T10:30:00Z",
}
```

### Lock Bulletin

**Request:**
```typescript
trpc.bulletin.lock.mutate({
  issueId: "issue-uuid",
});
```

**Success Response:**
```typescript
{
  id: "issue-uuid",
  status: "locked",
  locked_at: "2025-11-14T14:00:00Z",
  locked_by: "user-uuid",
  content_hash: "sha256:abc123...",
  artifacts: {
    pdf_url: "https://cdn.../bulletin-2025-11-17.pdf",
    pdf_large_print_url: "https://cdn.../bulletin-2025-11-17-large.pdf",
    slides_json: ["https://cdn.../slide-1.jpg", "https://cdn.../slide-2.jpg"],
    loop_mp4_url: "https://cdn.../loop.mp4",
    propresenter_bundle_url: "https://cdn.../propresenter.zip",
  }
}
```

**Error Response (missing CCLI):**
```typescript
{
  "error": {
    "message": "Cannot lock: 2 songs missing CCLI numbers",
    "code": "PRECONDITION_FAILED",
    "data": {
      "missingCCLI": [
        { id: "...", title: "Amazing Grace" },
        { id: "...", title: "How Great Thou Art" }
      ]
    }
  }
}
```

### Search People

**Request:**
```typescript
trpc.people.search.query({
  query: "john smith",
  limit: 10,
});
```

**Response:**
```typescript
{
  results: [
    {
      id: "person-uuid",
      first_name: "John",
      last_name: "Smith",
      email: "john.smith@example.com",
      phone: "(555) 123-4567",
      household: {
        id: "household-uuid",
        name: "Smith Family",
        address_line1: "123 Main St",
      },
    }
  ],
  total: 1,
}
```

---

## Public REST Endpoints (Non-tRPC)

For external integrations and webhooks:

### ICS Calendar Feed
```
GET /api/public/calendar/{tenant_slug}.ics
```
Returns public events in iCalendar format.

### Giving Webhooks
```
POST /api/webhooks/stripe
POST /api/webhooks/plaid
```
Webhook handlers for payment processors (signature verification required).

### ProPresenter API
```
GET /api/public/propresenter/{issue_id}/bundle.zip
```
Download ProPresenter 7 bundle for a locked bulletin.

---

## Development Notes

**tRPC Setup:**
- tRPC v11
- Next.js App Router integration (`/api/trpc/[trpc]`)
- Batching enabled (max 10 requests)
- Timeout: 30s for queries, 120s for mutations (render jobs)

**Database:**
- Prisma ORM with raw SQL for RLS
- Connection pooling: max 20 connections
- Read replicas for heavy queries (future)

**Caching:**
- React Query on frontend (5min stale time for queries)
- Redis for rate limiting and session storage
- CDN caching for public endpoints (ICS feeds)

**Observability:**
- Structured logging (Winston)
- App Insights integration
- Trace ID propagation for distributed tracing

---

## Acceptance Criteria Checklist

- [x] Zod schemas defined for all inputs/outputs
- [x] Error taxonomy documented with examples
- [x] Rate limits specified per tenant
- [x] Example handler for each router (see `P5_routers.ts`)
- [x] Authentication/authorization model defined
- [x] Lock state machine documented
- [x] CCLI validation rules specified

---

**Next Steps:**
- P6: Admin UI Wireframes (map routes to these endpoints)
- P8: Bulletin Generator Task Breakdowns (implement render pipeline)
- P11: Locking & Audit (implement state machine server-side)
