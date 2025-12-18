# Environment Policy

**Last Updated:** 2025-12-08
**Applies To:** Elder-First Church Platform (saas202545)
**Maintained By:** Platform Operations

---

## Purpose

This document defines the standard environment strategy for the Elder-First Church Platform and the broader Verdaio SaaS fleet. It governs:

- Which environments exist
- Their purpose and access rules
- Data handling requirements
- Deployment flow
- Security expectations
- Forbidden practices

All team members, CI/CD pipelines, and AI/MCP tooling **MUST** adhere to this policy.

---

## Environment Model

### Local (Developer Machine)

| Aspect | Policy |
|--------|--------|
| **Visibility** | Private to developer |
| **Network Access** | Never exposed publicly (no tunnels to localhost) |
| **Data** | Fake/seed data only; never real customer data |
| **Stability** | Can be unstable; anything can break |
| **Authentication** | Dev-mode auth with test accounts |
| **Purpose** | Individual development, unit testing, rapid iteration |

**Local URLs:**
- Web: `http://localhost:3045`
- API: `http://localhost:8045`
- Database: `localhost:5678`

---

### Dev (Optional Internal Environment)

| Aspect | Policy |
|--------|--------|
| **Visibility** | Internal only (VPN, IP allowlist, or SSO) |
| **Network Access** | No public URLs; requires authentication to access |
| **Data** | Synthetic/anonymized data only |
| **Stability** | May be unstable; for integration testing |
| **Authentication** | SSO or dev-mode auth |
| **Purpose** | Shared development, cross-service integration, feature branches |

> **Note:** For Elder-First, we currently skip a dedicated Dev environment and go directly from Local → Staging.

---

### Staging (Pre-Production)

| Aspect | Policy |
|--------|--------|
| **Visibility** | Public URL **but login required** |
| **Network Access** | HTTPS only; no anonymous browsing |
| **Data** | Fake/anonymized data only; production-like volume for testing |
| **Stability** | Should be stable; production rehearsal |
| **Authentication** | Dev-mode auth or pre-configured test accounts |
| **Purpose** | QA testing, UAT, performance testing, production rehearsal |

**Staging URLs:**
- Web: `https://church-platform-web-staging.azurewebsites.net`
- API: `https://church-platform-api-staging.azurewebsites.net`

**Critical Rule:** Staging must **never** behave like public-open production. All access requires authentication, even if using dev-mode credentials.

---

### Production

| Aspect | Policy |
|--------|--------|
| **Visibility** | Public and customer-facing |
| **Network Access** | HTTPS only; WAF/DDoS protection enabled |
| **Data** | Real customer data; treat as confidential |
| **Stability** | High availability required; SLA commitments |
| **Authentication** | Azure AD B2C / production auth provider |
| **Purpose** | Live service for end users |

**Production URLs:**
- Web (Azure): `https://app-vrd-202545-prd-eus2-web.azurewebsites.net`
- API (Azure): `https://app-vrd-202545-prd-eus2-api.azurewebsites.net`
- Custom Domain: `https://www.elderfirstchurch.com`

**Critical Rules:**
- All changes flow: Local → (Dev) → Staging → Production
- No direct deployments to production without staging validation
- Production database never accessed from local/dev machines

---

## Forbidden Practices

The following practices are **STRICTLY FORBIDDEN** across all Verdaio projects:

### 1. Public Exposure of Dev/Local Environments

- **NEVER** use ngrok, localtunnel, or similar tools to expose localhost publicly
- **NEVER** configure dev environments with public DNS
- **NEVER** share local URLs externally

### 2. Production Data in Non-Production Environments

- **NEVER** copy production database to local/dev/staging
- **NEVER** use real customer emails, names, or financial data for testing
- **NEVER** export production data for debugging (anonymize first)

### 3. Staging as Public Production

- **NEVER** share staging URLs publicly without authentication gate
- **NEVER** allow anonymous access to staging
- **NEVER** point production traffic to staging

### 4. Uncontrolled Configuration Drift

- **NEVER** manually configure production without IaC
- **NEVER** use different security settings between staging and production
- **NEVER** skip staging validation for "urgent" deployments

### 5. AI/MCP Automation Against Production

- **NEVER** point Playwright MCP, Claude browser tools, or similar at production URLs
- **NEVER** use AI to create/modify production data
- See: [Playwright Guardrails](mcp/PLAYWRIGHT-GUARDRAILS.md)

---

## Deployment Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌────────────┐
│  Local  │ ──► │   Dev   │ ──► │ Staging │ ──► │ Production │
│ (dev)   │     │ (opt.)  │     │  (QA)   │     │  (live)    │
└─────────┘     └─────────┘     └─────────┘     └────────────┘

Gate 1:         Gate 2:         Gate 3:         Gate 4:
- Typecheck     - CI Green      - QA Sign-off   - Approval
- Lint          - Tests Pass    - UAT Complete  - Smoke Tests
- Unit Tests    - Security OK   - Perf OK       - Monitoring
```

### Deployment Gates

| Gate | Environment | Requirements |
|------|-------------|--------------|
| **Gate 1** | Local → CI | Typecheck passes, lint passes, unit tests pass |
| **Gate 2** | CI → Staging | All CI checks green, security scans pass |
| **Gate 3** | Staging → Production | QA approval, UAT complete, performance validated |
| **Gate 4** | Production Deploy | Manual approval, smoke tests pass, monitoring verified |

---

## Security Expectations by Environment

| Security Control | Local | Dev | Staging | Production |
|------------------|-------|-----|---------|------------|
| **HTTPS** | No (HTTP OK) | Yes | Yes | Yes |
| **WAF** | No | No | Optional | Required |
| **DDoS Protection** | No | No | Optional | Required |
| **Authentication** | Dev-mode | SSO/Dev | Required | Production Auth |
| **Secrets in KeyVault** | No | Optional | Yes | Yes |
| **Audit Logging** | Optional | Optional | Yes | Yes |
| **Rate Limiting** | Optional | Yes | Yes | Yes |
| **RLS Enforcement** | Yes | Yes | Yes | Yes |

---

## Project-Specific Status (Elder-First)

### Current State

| Environment | Status | Notes |
|-------------|--------|-------|
| **Local** | Active | Docker Compose for DB, Redis |
| **Dev** | Skipped | Going directly Local → Staging |
| **Staging** | Planned | Azure App Service, dev-mode auth |
| **Production** | Planned | Azure App Service, Azure AD B2C |

### Expected Infrastructure

- **Staging:** Simplified Azure names (`church-platform-*-staging`)
- **Production:** CAF naming (`app-vrd-202545-prd-eus2-*`)
- **Custom Domain:** `www.elderfirstchurch.com` (production only)

### Environment Variables

See:
- [Environment URLs](ops/ENVIRONMENT-URLS.md) - Complete URL table
- [Production Deployment](PRODUCTION-DEPLOYMENT.md) - Production setup

---

## Compliance with This Policy

### For Developers

1. **Before starting work:** Verify you're targeting the correct environment
2. **Before committing:** Ensure no production URLs or real data in code
3. **Before deploying:** Confirm deployment gates are satisfied

### For CI/CD Pipelines

1. **Validate environment targets** in workflow configuration
2. **Block deployments** that skip required gates
3. **Log environment transitions** for audit trail

### For AI/MCP Tooling

1. **Only staging URLs** are allowed for browser automation
2. **Never generate** test data with real-looking PII
3. **Mark all test data** with `[MCP-TEST]` prefix

---

## Related Documentation

- [Environment URLs](ops/ENVIRONMENT-URLS.md) - URL reference table
- [Playwright Guardrails](mcp/PLAYWRIGHT-GUARDRAILS.md) - AI automation rules
- [MCP Servers Guide](dev/MCP-SERVERS.md) - MCP server configuration
- [Production Deployment](PRODUCTION-DEPLOYMENT.md) - Production setup guide
- [Security Status](SECURITY-STATUS.md) - Security posture overview

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-08 | 1.0 | Initial environment policy |

---

**Policy Owner:** Platform Operations
**Review Cycle:** Quarterly or on major infrastructure changes
