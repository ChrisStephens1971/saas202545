# Security Operations Runbook – Elder-First Church Platform

**Created:** 2025-12-04
**Last Updated:** 2025-12-04

---

## Purpose

This runbook provides operational procedures for security monitoring, incident response, and routine security tasks. It serves as a quick-reference for developers and operators.

---

## Quick Reference

| Task | Where to Look |
|------|---------------|
| Check security posture | [SECURITY-STATUS.md](SECURITY-STATUS.md) |
| View audit findings | [SECURITY-AUDIT-2025-12-04.md](SECURITY-AUDIT-2025-12-04.md) |
| Rotate secrets | [SECURITY-KEY-ROTATION.md](SECURITY-KEY-ROTATION.md) |
| CI security setup | [CI-SECURITY-SETUP.md](CI-SECURITY-SETUP.md) |

---

## First Steps When Investigating an Issue

### 1. Check Application Logs
Security events are logged with `securityEvent: true` marker.

**What to look for:**
- `SECURITY_WARN` — Policy violations, failed auth attempts
- `SECURITY_ERROR` — Blocked actions, tenant violations
- `SECURITY_CRITICAL` — Active attacks, potential breaches

**Log locations:**
- Development: Console output
- Production: Application logging service (configure per deployment)

### 2. Check CI Pipeline
Review recent GitHub Actions runs:
```bash
gh run list --limit 10
```

**Key checks:**
- `secrets-scan` job — Gitleaks findings
- `security-audit` job — npm audit results
- `security-tests` job — Security test results

### 3. Review Recent Changes
```bash
# Recent commits
git log --oneline -20

# Changes to security-sensitive files
git log --oneline -- apps/api/src/auth/ apps/api/src/security/ apps/api/src/config/
```

---

## Security Event Types

The security logger (`apps/api/src/logging/securityLogger.ts`) emits structured events:

| Event Type | Severity | Description |
|------------|----------|-------------|
| `AUTH_LOGIN_SUCCESS` | INFO | Successful authentication |
| `AUTH_LOGIN_FAILURE` | WARN | Failed authentication attempt |
| `JWT_VERIFICATION_FAILURE` | WARN | Invalid or expired token |
| `ACCESS_DENIED` | WARN | Permission/role denial |
| `TENANT_ISOLATION_VIOLATION` | ERROR | Cross-tenant access attempt |
| `CORS_VIOLATION` | WARN | Blocked cross-origin request |
| `CSRF_VALIDATION_FAILURE` | WARN | Missing or invalid CSRF token |
| `RATE_LIMIT_EXCEEDED` | WARN | Rate limit triggered |
| `SENSITIVE_DATA_ACCESS` | INFO | Audit trail for data access |

---

## Common Scenarios

### Suspected Brute Force Attack
1. Check logs for `AUTH_LOGIN_FAILURE` events from same IP
2. Review rate limit events (`RATE_LIMIT_EXCEEDED`)
3. Consider temporary IP block at infrastructure level
4. Notify team lead

### Secrets Detected in CI
1. CI will fail with Gitleaks findings
2. Do NOT force-push or bypass
3. Rotate the exposed credential immediately
4. Use `git filter-branch` or BFG to remove from history
5. See [SECURITY-KEY-ROTATION.md](SECURITY-KEY-ROTATION.md)

### Suspected Cross-Tenant Access
1. Check logs for `TENANT_ISOLATION_VIOLATION` events
2. Verify RLS policies are active in database
3. Review `context.ts` for tenant context handling
4. Check if issue is in application code or data

---

## Notification Contacts

<!-- TODO: Update with actual contacts -->

| Role | Contact |
|------|---------|
| Security Lead | TBD |
| Platform Admin | TBD |
| On-Call | TBD |

---

## Routine Security Tasks

### Weekly
- [ ] Review CI security job results
- [ ] Check for npm audit advisories

### Monthly
- [ ] Review security event logs for patterns
- [ ] Update dependencies with security patches
- [ ] Verify backup integrity

### Quarterly
- [ ] Rotate application secrets
- [ ] Review access permissions
- [ ] Update this runbook as needed

---

## Related Documentation

- [SECURITY-STATUS.md](SECURITY-STATUS.md) — Current security posture
- [SECURITY-AUDIT-2025-12-04.md](SECURITY-AUDIT-2025-12-04.md) — Full audit findings
- [SECURITY-KEY-ROTATION.md](SECURITY-KEY-ROTATION.md) — Key rotation procedures
- Phase remediation docs for implementation details
