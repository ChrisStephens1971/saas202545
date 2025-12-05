# Go-Live Checklist

Pre-launch checklist for deploying the Elder-First Church Platform to a new tenant or environment.

---

## Pre-Launch Data Validation

Before going live, run these data validation checks to ensure data integrity:

### Website Data Check

- [ ] **Scan organization websites** (read-only)
  ```bash
  cd apps/api
  npx tsx scripts/scan-org-websites.ts
  ```
  - Review INVALID entries and fix manually
  - Note how many records need normalization

- [ ] **Normalize bare hostnames** (if any found)
  ```bash
  # Development/Staging
  npx tsx scripts/scan-org-websites.ts --normalize

  # Production (requires --force)
  npx tsx scripts/scan-org-websites.ts --normalize --force
  ```

- [ ] **Verify no INVALID entries remain**
  - INVALID entries will cause "Invalid url" errors on Settings pages
  - Fix manually in database or via Admin UI before go-live

**Documentation:** [Website Data Check](./WEBSITE-DATA-CHECK.md)

---

## Database Migrations

- [ ] **Run all pending migrations**
  ```bash
  cd packages/database
  npm run migrate
  ```

- [ ] **Verify migration status**
  - Check that all migrations completed successfully
  - Verify no pending migrations remain

---

## Environment Configuration

- [ ] **Verify environment variables**
  - `DATABASE_URL` - Points to production database
  - `DATABASE_SSL=true` - SSL enabled for production
  - `APP_ENCRYPTION_KEY` - Set for AI settings encryption
  - `DEPLOY_ENV=production` - Environment gate for AI features

- [ ] **Verify secrets in Key Vault**
  - Database connection string
  - API keys (if applicable)
  - Encryption keys

---

## AI Configuration

- [ ] **Confirm AI is disabled in production** (if policy requires)
  - `DEPLOY_ENV=production` automatically disables AI features
  - Verify via Settings → AI Configuration shows "AI not available"

- [ ] **Or configure AI for production** (if approved)
  - Set `APP_ENCRYPTION_KEY` in environment
  - Add OpenAI API key via Admin UI
  - Enable AI features

**Documentation:** [AI Configuration](../AI-CONFIG.md)

---

## Authentication

- [ ] **Verify auth provider configuration**
  - Azure AD B2C / Entra External ID configured
  - Callback URLs point to production domain
  - Test sign-in flow

- [ ] **Verify role assignments**
  - Admin users can access Settings
  - Editors can create/edit content
  - Viewers have read-only access

---

## Infrastructure

- [ ] **Verify Azure resources**
  - App Service running
  - PostgreSQL Flexible Server accessible
  - Blob Storage configured
  - CDN enabled (if applicable)

- [ ] **Verify SSL/TLS**
  - Custom domain configured
  - SSL certificate valid
  - HTTPS enforced

- [ ] **Verify backups**
  - Database backup configured
  - Retention policy set
  - Test restore procedure (staging)

---

## Monitoring

- [ ] **Application Insights enabled**
  - Instrumentation key configured
  - Availability tests created
  - Alert rules configured

- [ ] **Log Analytics workspace**
  - Diagnostic settings enabled
  - Query access verified

---

## Performance

- [ ] **Load testing completed** (if applicable)
  - Concurrent user targets met
  - Response times acceptable
  - No memory leaks

- [ ] **CDN caching verified**
  - Static assets cached
  - Cache headers correct

---

## Final Verification

- [ ] **Smoke tests passed**
  - Login flow works
  - Dashboard loads
  - Bulletins list/create works
  - People list/create works
  - Settings pages load without errors

- [ ] **No console errors**
  - Browser dev tools clean
  - No unhandled exceptions

- [ ] **GitHub Actions green**
  - All workflows passing
  - No pending security alerts

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product Owner | | | |

---

**Last Updated:** 2025-12-02
