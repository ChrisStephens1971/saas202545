# System Architecture & Choices - Elder-First Church Platform V1

**Target:** Minimal viable architecture for 50 concurrent tenants
**Cloud Provider:** Microsoft Azure
**Cost Target:** <$500/month (dev), <$2000/month (prod at 50 tenants)

---

## High-Level Architecture (ASCII Diagram)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         END USERS                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ Admin Web    │    │ Member PWA   │    │ Kiosk Mode   │          │
│  │ (Desktop)    │    │ (Mobile)     │    │ (Lobby)      │          │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘          │
└─────────┼────────────────────┼────────────────────┼─────────────────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Azure Front Door   │ ← CDN, WAF, SSL
                    │  (Standard)         │
                    └──────────┬──────────┘
                               │
          ┏━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━┓
          ┃                                           ┃
   ┌──────▼────────┐                         ┌───────▼────────┐
   │  App Service  │                         │  Static Web    │
   │  (Next.js)    │                         │  App (Assets)  │
   │  P1v2 (Linux) │                         │                │
   └──────┬────────┘                         └────────────────┘
          │
          │ tRPC + REST
          │
   ┌──────▼────────────────────────────────────────────────────┐
   │              Backend API Layer (tRPC)                      │
   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
   │  │ People/      │  │ Events/      │  │ Bulletin     │   │
   │  │ Groups       │  │ RSVP         │  │ Generator    │   │
   │  └──────────────┘  └──────────────┘  └──────────────┘   │
   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
   │  │ Messaging/   │  │ Giving       │  │ Import       │   │
   │  │ Announcements│  │ (Stripe)     │  │ (ICS/CSV)    │   │
   │  └──────────────┘  └──────────────┘  └──────────────┘   │
   └───────┬───────────────────────────────────────────────────┘
           │
   ┌───────┼──────────────────────────────────────┐
   │       │     Data & Services Layer            │
   │       │                                       │
   │  ┌────▼────────────────────────┐             │
   │  │ Azure Database for          │             │
   │  │ PostgreSQL Flexible Server  │             │
   │  │ (B1ms, 2 vCore)             │             │
   │  │ + RLS Multi-Tenancy         │             │
   │  └─────────────────────────────┘             │
   │                                               │
   │  ┌──────────────────────────────────────┐    │
   │  │ Azure Blob Storage (Hot Tier)        │    │
   │  │ - Bulletin PDFs/Slides               │    │
   │  │ - User uploads (images, attachments) │    │
   │  └──────────────────────────────────────┘    │
   │                                               │
   │  ┌──────────────────────────────────────┐    │
   │  │ Azure Container Apps                 │    │
   │  │ (Playwright Render Service)          │    │
   │  │ - PDF generation                     │    │
   │  │ - Slide rendering (JPG + MP4)        │    │
   │  │ - Email HTML inlining                │    │
   │  │ Consumption plan                     │    │
   │  └──────────────────────────────────────┘    │
   │                                               │
   │  ┌──────────────────────────────────────┐    │
   │  │ Azure Functions (Consumption)        │    │
   │  │ - Weekly digest cron (Mon 9am)       │    │
   │  │ - Auto-expire announcements (daily)  │    │
   │  │ - Stripe webhook processing          │    │
   │  │ - Email/SMS queue processor          │    │
   │  └──────────────────────────────────────┘    │
   │                                               │
   │  ┌──────────────────────────────────────┐    │
   │  │ Azure Key Vault (Standard)           │    │
   │  │ - DB connection strings              │    │
   │  │ - Stripe API keys                    │    │
   │  │ - SendGrid/Twilio secrets            │    │
   │  │ - JWT signing keys                   │    │
   │  └──────────────────────────────────────┘    │
   │                                               │
   │  ┌──────────────────────────────────────┐    │
   │  │ Entra External ID (B2C)              │    │
   │  │ - Email/Phone/Magic-link auth        │    │
   │  │ - Role claims (Admin/Editor/etc.)    │    │
   │  │ - MAU pricing (first 50k free)       │    │
   │  └──────────────────────────────────────┘    │
   │                                               │
   │  ┌──────────────────────────────────────┐    │
   │  │ Azure Service Bus (Basic)            │    │
   │  │ - Email send queue                   │    │
   │  │ - Render job queue                   │    │
   │  │ - Import processing queue            │    │
   │  └──────────────────────────────────────┘    │
   └───────────────────────────────────────────────┘

   ┌────────────────────────────────────────────────┐
   │        Observability & Monitoring              │
   │  ┌──────────────────────────────────────┐     │
   │  │ Application Insights                 │     │
   │  │ - Request telemetry                  │     │
   │  │ - Custom events (bulletin_locked)    │     │
   │  │ - Performance metrics                │     │
   │  │ - Exception tracking                 │     │
   │  └──────────────────────────────────────┘     │
   │                                                │
   │  ┌──────────────────────────────────────┐     │
   │  │ Log Analytics Workspace              │     │
   │  │ - Structured logs (JSON)             │     │
   │  │ - Audit trail queries                │     │
   │  │ - Cost analysis                      │     │
   │  └──────────────────────────────────────┘     │
   │                                                │
   │  ┌──────────────────────────────────────┐     │
   │  │ Azure Monitor Alerts                 │     │
   │  │ - API errors >5% in 5min             │     │
   │  │ - DB connection pool exhaustion      │     │
   │  │ - Render job failures                │     │
   │  │ - Daily cost threshold ($100)        │     │
   │  └──────────────────────────────────────┘     │
   └────────────────────────────────────────────────┘

   ┌────────────────────────────────────────────────┐
   │          External Services (SaaS)              │
   │  - Stripe (Payments)                           │
   │  - SendGrid (Email delivery)                   │
   │  - Twilio (SMS, optional for V1)               │
   └────────────────────────────────────────────────┘
```

---

## Service Inventory with SKUs

### Compute

| Service | SKU | Purpose | Cost (est.) | Notes |
|---------|-----|---------|-------------|-------|
| **App Service Plan** | P1v2 (Linux, 1 instance) | Next.js frontend + API | ~$73/mo | Auto-scale to 3 instances in prod (~$219/mo) |
| **Azure Container Apps** | Consumption | Playwright render service | ~$20-50/mo | Pay per execution; idle = $0 |
| **Azure Functions** | Consumption (Node 18) | Cron jobs, webhooks | ~$5-10/mo | 1M executions free tier |

**Cost-Aware Notes:**
- **Dev/Staging:** Use B1 App Service (~$13/mo) instead of P1v2
- **Scale trigger:** CPU >70% for 5min → add instance
- **Container Apps:** Consider dedicated plan if >500 renders/day (break-even ~$80/mo)

### Data Services

| Service | SKU | Purpose | Cost (est.) | Notes |
|---------|-----|---------|-------------|-------|
| **Azure Database for PostgreSQL** | Flexible Server, B1ms (2 vCore, 1GB RAM) | Primary database with RLS | ~$28/mo | Burstable tier; upgrade to GP_Gen5_2 (~$140/mo) at 20+ tenants |
| **Azure Blob Storage** | Standard LRS, Hot tier | Bulletins, images, attachments | ~$20/mo (100GB) | Lifecycle policy: Hot → Cool after 90 days |
| **Azure Service Bus** | Basic tier | Queues for email, render jobs | ~$10/mo | Standard tier ($10/mo) adds topics if needed later |

**Cost-Aware Notes:**
- **Postgres backup:** 7-day retention included; 35-day = +$5/mo
- **Blob lifecycle:** Move bulletins >90 days to Cool tier (saves 50%)
- **Dev/Staging:** Share single Postgres server with separate databases

### Integration & Security

| Service | SKU | Purpose | Cost (est.) | Notes |
|---------|-----|---------|-------------|-------|
| **Entra External ID (B2C)** | MAU pricing | Authentication + roles | Free (<50k MAU) | $0.00325/MAU after 50k |
| **Azure Key Vault** | Standard tier | Secrets management | ~$3/mo | Premium tier ($30/mo) only if HSM needed |
| **Azure Front Door** | Standard tier | CDN, WAF, SSL | ~$35/mo + $0.01/GB egress | Or use App Service managed cert + Azure CDN (cheaper) |
| **Static Web App** | Free tier | Static assets (JS, CSS, images) | $0 | Upgrade to Standard ($9/mo) if >100GB bandwidth |

**Cost-Aware Notes:**
- **Alternative:** Skip Front Door in dev; use App Service built-in CDN
- **WAF:** Enable only in prod; dev can use NSG rules

### Observability

| Service | SKU | Purpose | Cost (est.) | Notes |
|---------|-----|---------|-------------|-------|
| **Application Insights** | Pay-as-you-go | APM, telemetry | ~$10-30/mo | First 5GB free; sampling reduces cost |
| **Log Analytics Workspace** | Pay-as-you-go | Centralized logs, audit queries | ~$10-20/mo | 5GB/mo free; retention 30 days default |
| **Azure Monitor** | Included | Alerts, dashboards | $0 (alerts free tier) | Email/webhook alerts included |

**Cost-Aware Notes:**
- **Sampling:** 20% sampling in prod reduces App Insights cost by 80%
- **Log retention:** 30 days free; 90 days = +$15/mo
- **Dev:** Disable Application Insights or use local OpenTelemetry

### Total Monthly Cost Estimates

| Environment | Monthly Cost | Notes |
|-------------|--------------|-------|
| **Dev** | ~$100-150 | B1 App Service, shared Postgres, no Front Door |
| **Staging** | ~$150-200 | B1 App Service, separate Postgres, minimal observability |
| **Production (0-10 tenants)** | ~$350-450 | P1v2, B1ms Postgres, Front Door, full observability |
| **Production (50 tenants)** | ~$800-1200 | 3x P1v2 instances, GP_Gen5_2 Postgres, increased bandwidth |

**Savings Opportunities:**
- Azure Reserved Instances (1-year): Save 30-40% on App Service, Postgres
- Dev/Test pricing: 50% off App Service in non-prod subscriptions
- Shutdown scripts: Stop dev/staging VMs nights/weekends (save 60%)

---

## Stack Details

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Deployment:** App Service (Node 18 runtime)
- **PWA:** Offline support for Simple Mode (service worker + IndexedDB)
- **UI Library:** Radix UI + Tailwind CSS (accessible by default)
- **State:** React Query (tRPC integration) + Zustand (local UI state)
- **Forms:** React Hook Form + Zod validation

**Justification:**
- Next.js provides SSR for bulletin rendering (SEO + printability)
- App Router enables React Server Components (reduce client JS)
- PWA gives near-native mobile UX without app store friction

### Backend
- **Runtime:** Node.js 18 + TypeScript
- **API:** tRPC (type-safe RPC) for internal, REST for public/webhooks
- **ORM:** Prisma (type-safe queries, RLS support via raw SQL)
- **Validation:** Zod schemas shared between client/server
- **Jobs:** Azure Functions (timer triggers, queue triggers)
- **Realtime:** Azure Web PubSub (optional for V1; use polling for announcements)

**Justification:**
- tRPC eliminates API contract drift (client/server types in sync)
- Prisma handles migrations, type generation, and connection pooling
- Functions scale to zero (cost-effective for cron jobs)

### Database
- **Service:** Azure Database for PostgreSQL Flexible Server
- **Version:** PostgreSQL 14+
- **Multi-Tenancy:** Row-Level Security (RLS) with `tenant_id` column
- **Connection Pooling:** PgBouncer (built-in to Flexible Server)
- **Backup:** 7-day point-in-time restore

**RLS Pattern:**
```sql
-- Set tenant context per request
SET LOCAL app.tenant_id = '<uuid>';

-- RLS policy on all tables
CREATE POLICY tenant_isolation ON announcements
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

**Justification:**
- RLS prevents data leakage between tenants (DB-level isolation)
- Flexible Server offers better performance than Single Server
- Burstable tier (B1ms) cost-effective for <20 tenants

### File Storage
- **Service:** Azure Blob Storage (Standard LRS)
- **Containers:**
  - `bulletins`: PDF, JPG, MP4 outputs (public read via CDN)
  - `uploads`: User images, attachments (private, signed URLs)
  - `templates`: Handlebars/EJS files for bulletin rendering
- **CDN:** Azure Front Door (or Azure CDN Standard for lower cost)
- **Lifecycle:** Auto-tier to Cool storage after 90 days

**Justification:**
- Blob storage is cheapest option ($0.018/GB Hot, $0.01/GB Cool)
- CDN reduces egress costs and improves global performance
- Signed URLs enable time-limited private access

### Jobs & Background Processing
- **Service:** Azure Functions (Consumption plan)
- **Triggers:**
  - **Timer:** Weekly digest (Mon 9am), auto-expire announcements (daily)
  - **Queue:** Email send queue, render job queue, import processing
  - **HTTP:** Stripe webhooks
- **Runtime:** Node.js 18

**Example Cron:**
```javascript
// Weekly digest - Mondays 9am Eastern
export default async function weeklyDigest(
  context: InvocationContext,
  timer: Timer
): Promise<void> {
  const tenants = await getAllActiveTenants();
  for (const tenant of tenants) {
    await generateDigest(tenant.id);
  }
}
```

**Justification:**
- Consumption plan scales to zero (no idle cost)
- Queue triggers decouple render service from API (resilience)
- Built-in retry and dead-letter queue support

### Authentication & Authorization
- **Service:** Entra External ID (Azure AD B2C)
- **Flows:**
  - Email + password (with email verification)
  - Phone (SMS OTP)
  - Magic link (passwordless email link)
  - Passkeys (WebAuthn, optional for V1)
- **Token:** JWT with custom claims (roles, tenant_id)
- **Session:** 30-day sliding window; re-auth required for Lock actions

**Custom Policy (Role Claims):**
```json
{
  "roles": ["Admin"],
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Middleware:**
```typescript
export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { roles } = req.user; // from JWT
    if (!roles.some(r => allowedRoles.includes(r))) {
      throw new ForbiddenError('Insufficient permissions');
    }
    next();
  };
};
```

**Justification:**
- B2C eliminates custom auth code (security risk)
- MAU pricing scales with usage (first 50k MAU free)
- Custom policies enable magic-link and passkeys without code

### Render Service
- **Service:** Azure Container Apps (Consumption)
- **Base Image:** mcr.microsoft.com/playwright:focal
- **Runtime:** Node.js + Playwright (Chromium headless)
- **Endpoints:**
  - `POST /render/pdf` → Returns Blob URL
  - `POST /render/slides` → Returns array of JPG URLs
  - `POST /render/loop` → Returns MP4 URL
  - `POST /render/email` → Returns HTML with inlined CSS

**Scaling:**
- Min replicas: 0 (scale to zero when idle)
- Max replicas: 10
- Concurrency: 1 (one render per container for stability)
- Timeout: 60 seconds per render

**Justification:**
- Container Apps cheaper than AKS for low-volume workloads
- Playwright provides pixel-perfect PDF rendering
- Dedicated service isolates heavy compute from API

---

## Environment Strategy

### Multi-Environment Layout

| Environment | Purpose | Data | Infra | Cost |
|-------------|---------|------|-------|------|
| **dev** | Local development, CI tests | Synthetic seed data | Shared resources (B-tier) | ~$100/mo |
| **stage** | Pre-prod testing, demos | Sanitized prod copy (weekly refresh) | Mirrors prod (smaller SKUs) | ~$200/mo |
| **prod** | Live customer data | Real tenant data | Dedicated, auto-scale | ~$800/mo (50 tenants) |

### Per-Tenant Strategy

**Shared Database, Isolated via RLS:**
- All tenants share one Postgres server
- Each request sets `app.tenant_id` session variable
- RLS policies enforce tenant isolation at row level
- Migration to dedicated DB if tenant >10k records or custom SLA

**Blob Storage:**
- Shared storage account
- Containers partitioned by tenant: `bulletins/{tenant_id}/...`
- CDN cache key includes tenant_id

**Subdomain Routing:**
- Pattern: `{church-slug}.elderfirst.app`
- Front Door rules route to same App Service
- Next.js middleware extracts tenant from hostname

**Example Tenant Resolution:**
```typescript
export function getTenantId(req: Request): string {
  const host = req.headers.host; // "gracechurch.elderfirst.app"
  const slug = host.split('.')[0]; // "gracechurch"
  return lookupTenantBySlug(slug); // Query DB for tenant_id
}
```

### Migration Path (Future)
If tenant requires isolation:
1. Provision dedicated Postgres Flexible Server
2. Migrate tenant data via `pg_dump` + `pg_restore`
3. Update connection string in tenant metadata
4. No code changes (ORM abstracts connection)

---

## Observability Plan

### Application Insights (APM)

**Tracked Metrics:**
- Request duration (P50, P95, P99)
- Error rate by endpoint
- Dependency calls (Postgres, Blob, external APIs)
- Custom events:
  - `bulletin_locked` (properties: tenant_id, issue_id, duration_ms)
  - `rsvp_submitted`
  - `donation_completed` (properties: amount, fund, payment_method)

**Sampling Strategy:**
- Dev: 100% (all requests)
- Prod: 20% adaptive sampling (reduces cost by 80%)
- Always sample errors and custom events (100%)

**Alerts:**
- Error rate >5% in 5min → Slack + email
- P95 latency >2s for 10min → Slack
- Dependency failure (Postgres unreachable) → PagerDuty

### Structured Logging

**Log Format (JSON):**
```json
{
  "timestamp": "2025-11-14T12:34:56Z",
  "level": "info",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-123",
  "action": "bulletin.lock",
  "issue_id": "issue-456",
  "ip": "203.0.113.42",
  "user_agent": "Mozilla/5.0..."
}
```

**Log Levels:**
- **ERROR:** Unhandled exceptions, critical failures
- **WARN:** Validation failures, rate limits hit, retry attempts
- **INFO:** Business events (bulletin locked, user created)
- **DEBUG:** Detailed execution flow (dev/staging only)

**Retention:**
- Application Insights: 90 days
- Log Analytics: 30 days (default), 1 year for audit logs

### Audit Tables (Database)

**Schema:**
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  action VARCHAR(100) NOT NULL, -- "bulletin.lock", "announcement.approve"
  entity_type VARCHAR(50),
  entity_id UUID,
  changes JSONB, -- { "status": { "old": "built", "new": "locked" } }
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_action ON audit_log(tenant_id, action, created_at DESC);
```

**Triggers:**
```sql
-- Auto-audit for BulletinIssue state changes
CREATE TRIGGER audit_bulletin_status
AFTER UPDATE OF status ON bulletin_issue
FOR EACH ROW
EXECUTE FUNCTION log_audit('bulletin.status_change');
```

**Queries:**
```sql
-- Who locked this bulletin?
SELECT user_id, created_at FROM audit_log
WHERE entity_id = '...' AND action = 'bulletin.lock';

-- All actions by user in last 7 days
SELECT action, entity_type, created_at FROM audit_log
WHERE user_id = '...' AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Cost Monitoring

**Daily Spend Report:**
- Azure Cost Management API → Email report to ops@
- Alert if daily spend >$100 (prod) or >$30 (dev/staging)
- Group by resource type (Compute, Storage, Network)

**Tenant Cost Allocation (Future):**
- Tag resources with tenant_id where possible
- Track Blob storage per tenant (usage metrics API)
- Render job costs via App Insights custom metrics

### Dashboards

**Ops Dashboard (Azure Monitor):**
- Uptime (SLA target: 99.5%)
- Active users (last 24h)
- Bulletin lock rate (per day)
- Top errors (last 1h)
- Database connection pool usage

**Business Dashboard (Custom App):**
- Tenants by plan (free trial, paid)
- Weekly bulletin completion rate
- Top features by usage
- Churn indicators (no login in 14 days)

---

## Data Flow Examples

### Bulletin Lock Flow

```
1. Admin clicks "Lock Bulletin" in UI
   ↓
2. Next.js API route → tRPC `bulletin.lock` mutation
   ↓
3. Middleware checks: user has Admin role
   ↓
4. Service validates: status = "built", CCLI present on all songs
   ↓
5. Update DB: status → "locked", locked_at → NOW(), locked_by → user_id
   ↓
6. Trigger: audit_log entry created
   ↓
7. Queue job: "Remove PROOF watermark from PDF"
   ↓
8. Container App: Re-render PDF without watermark, upload to Blob
   ↓
9. Update DB: pdf_url → new Blob URL
   ↓
10. Emit event: Application Insights custom event "bulletin_locked"
   ↓
11. Return success to UI → Show "Locked" badge, disable editing
```

### Weekly Digest Flow

```
1. Azure Function timer trigger (Mon 9am cron)
   ↓
2. Query DB: SELECT * FROM tenants WHERE status = 'active'
   ↓
3. For each tenant:
   ↓
4. Query: Upcoming events (next 7 days)
   ↓
5. Query: Active announcements (priority High/Urgent)
   ↓
6. Query: This Sunday's bulletin (if published)
   ↓
7. Generate HTML email from template (Handlebars)
   ↓
8. Queue message: Service Bus "email-send" queue
   ↓
9. Email Function (queue trigger): Send via SendGrid
   ↓
10. Log: audit_log entry "digest.sent"
   ↓
11. Track: Application Insights metric "digest_emails_sent"
```

---

## Security & Compliance

### Data Encryption
- **In transit:** TLS 1.2+ for all HTTPS, enforced via Front Door
- **At rest:** Azure Storage encryption (AES-256), Postgres TDE enabled

### Network Security
- **App Service:** VNet integration (backend only accessible from VNet)
- **Postgres:** Private endpoint (no public IP)
- **Key Vault:** Firewall rules (only App Service managed identity)

### Secrets Management
- **Never in code:** All secrets in Azure Key Vault
- **Managed Identity:** App Service uses MSI to access Key Vault (no credentials)
- **Rotation:** 90-day rotation for Stripe keys, DB passwords

### GDPR & Data Residency
- **Region:** All resources in East US 2 (can deploy EU region per tenant)
- **Data export:** User can request CSV export of all personal data
- **Data deletion:** Soft delete (30-day grace), then hard delete via cron

### PCI Compliance (Payments)
- **Stripe Elements:** Tokenization on client (no card data touches our servers)
- **Webhooks:** Verify Stripe signature to prevent replay attacks
- **Logging:** Never log card numbers or CVV

---

## Deployment & CI/CD

### Git Branching
- `main` → Production (protected, requires PR + approval)
- `staging` → Staging environment (auto-deploy on push)
- `dev` → Dev environment (auto-deploy on push)
- Feature branches → PR to `dev`

### Pipeline Stages (GitHub Actions)

```yaml
1. Lint & Type Check (on every PR)
   - ESLint, Prettier
   - TypeScript tsc --noEmit
   - Zod schema validation

2. Unit Tests (Jest)
   - 80% coverage requirement
   - tRPC resolver tests
   - Utility function tests

3. Integration Tests (Testcontainers)
   - Postgres + Redis containers
   - API endpoint tests
   - RLS policy verification

4. Build
   - Next.js production build
   - Docker image (render service)
   - Prisma migrations

5. Deploy (Blue/Green)
   - Swap deployment slots
   - Run smoke tests on green slot
   - Swap traffic (100% to green)
   - Keep blue slot for 24h (rollback ready)

6. E2E Tests (Playwright, staging only)
   - Intake → Lock → Download
   - Full RSVP flow
   - Donation + receipt
```

### Rollback Plan
1. Detect issue (monitoring alert or manual report)
2. Swap App Service slots (blue ← green) - takes 30 seconds
3. If DB migration issue: Restore from point-in-time backup
4. Notify team via Slack
5. Post-mortem within 24h

---

## Open Questions & Risks

### Open Questions
1. **Realtime updates:** Polling (simple) vs. Azure Web PubSub (complex)? → **Decision: Polling for V1**
2. **Email provider:** SendGrid vs. Mailgun vs. Azure Communication Services? → **Decision: SendGrid (familiar, good free tier)**
3. **Mobile:** PWA only or build React Native wrapper for V1? → **Decision: PWA only, RN in V2**

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Render service slow (>10s for PDF) | High | Medium | Pre-warm containers; cache rendered templates; optimize fonts |
| Postgres RLS performance hit | Medium | Low | Index on tenant_id; monitor query plans; shard if >100 tenants |
| Azure cost overruns | High | Medium | Daily cost alerts; shutdown scripts for dev; reserved instances |
| Stripe webhook failures | Medium | Low | Idempotent handlers; dead-letter queue; manual reconciliation tool |

---

## Decision Log (ADRs)

### ADR-001: Multi-Tenancy via RLS (not separate DBs)
**Status:** Accepted
**Context:** Need cost-effective isolation for <100 tenants
**Decision:** Use PostgreSQL RLS with tenant_id on all tables
**Consequences:** Simpler ops, lower cost; migration path exists for large tenants

### ADR-002: tRPC over REST for internal APIs
**Status:** Accepted
**Context:** Reduce API contract drift, improve DX
**Decision:** Use tRPC for Next.js ↔ backend; REST only for public/webhooks
**Consequences:** Type safety, faster development; learning curve for team

### ADR-003: Container Apps for Render Service (not Functions)
**Status:** Accepted
**Context:** Playwright requires full browser; Functions timeout = 10min
**Decision:** Use Container Apps with Consumption plan
**Consequences:** Better isolation, no timeout issues; slightly higher cost

### ADR-004: Azure Front Door (not App Gateway)
**Status:** Accepted
**Context:** Need global CDN + WAF
**Decision:** Use Front Door Standard (not Premium unless DDoS required)
**Consequences:** $35/mo base cost; simpler config than App Gateway

---

**Document Version:** 1.0
**Last Updated:** 2025-11-14
**Owner:** Platform Architect
**Reviewers:** Engineering Lead, DevOps Lead
