# Security Remediation Phase 3 - Medium Priority + Hardening

**Date:** 2025-12-04
**Branch:** `feature/security-phase-3-hardening`
**Status:** Complete

## Overview

Phase 3 addresses medium-priority security issues and implements hardening measures identified in the security audit. This phase focuses on defense-in-depth strategies that complement the critical and high-priority fixes from Phases 1 and 2.

## Changes Implemented

### M1: CORS Hardening

**Files:**
- `apps/api/src/config/cors.ts` (New)
- `apps/api/src/config/__tests__/cors.test.ts` (New)
- `apps/api/src/index.ts` (Modified)

**Changes:**
- Created centralized CORS configuration module
- Implemented strict origin validation (exact match only)
- No wildcards allowed in production environments
- Proper whitespace trimming when parsing ALLOWED_ORIGINS
- Origin validation (must be valid URL with http/https scheme)
- Logging for rejected origins via security logger

**Usage:**
```typescript
// Origins are configured via environment variable
ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com

// Default in development
DEFAULT_DEV_ORIGINS = [
  'http://localhost:3045',
  'http://127.0.0.1:3045',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
```

### M2: CSRF Protection

**Files:**
- `apps/api/src/security/csrf.ts` (New)
- `apps/api/src/security/__tests__/csrf.test.ts` (New)
- `apps/api/src/index.ts` (Modified)
- `apps/api/package.json` (Modified - added cookie-parser)

**Changes:**
- Implemented double-submit cookie pattern for CSRF protection
- Added `cookie-parser` middleware for reading CSRF cookies
- Cryptographically secure token generation (32 bytes = 256 bits)
- Constant-time token comparison to prevent timing attacks
- Automatic token cookie on all responses
- Validation on state-changing requests (POST, PUT, PATCH, DELETE)
- Exempt paths for public/webhook endpoints

**How it works:**
1. Server sets `XSRF-TOKEN` cookie (HttpOnly: false so JS can read it)
2. Client reads cookie and sends value in `X-CSRF-Token` header
3. Server validates header matches cookie using constant-time comparison

**Configuration:**
```typescript
// Cookie options
{
  httpOnly: false,     // JS readable for double-submit
  secure: IS_PROD_LIKE, // HTTPS only in production
  sameSite: 'lax',     // Prevent third-party CSRF
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
}

// Exempt paths (no CSRF check)
CSRF_EXEMPT_PATHS = [
  '/health',
  '/trpc/bulletins.getPublicBulletin',
  '/trpc/bulletins.trackInteraction',
];
```

### M3: Secrets Scanning in CI

**Files:**
- `.github/workflows/ci.yml` (Modified)
- `.gitleaks.toml` (New)

**Changes:**
- Added Gitleaks secrets scanning job to CI pipeline
- Scans full git history for accidentally committed secrets
- Blocks builds if secrets are detected
- Custom rules for Azure, JWT, encryption keys, database passwords
- Allowlist for example files and test fixtures
- Generates SARIF report on failures

**CI Job:**
```yaml
secrets-scan:
  name: Secrets Scan
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0  # Full history
    - uses: gitleaks/gitleaks-action@v2
```

### M4: Security Logging/Audit Log

**Files:**
- `apps/api/src/logging/securityLogger.ts` (New)
- `apps/api/src/logging/__tests__/securityLogger.test.ts` (New)
- `apps/api/src/config/cors.ts` (Modified - uses security logger)
- `apps/api/src/security/csrf.ts` (Modified - uses security logger)

**Changes:**
- Created structured security event logging module
- Event categorization: AUTH, ACCESS, THREAT, AUDIT, CONFIG
- Severity levels: INFO, WARN, ERROR, CRITICAL
- Automatic sensitive data masking
- Pre-defined loggers for common security events
- Integration with CORS and CSRF modules

**Event Types:**
```typescript
// Authentication
logAuthSuccess({ userId, tenantId, ip })
logAuthFailure({ reason, attemptedUser, ip })
logJwtVerificationFailure({ reason, ip })

// Authorization
logAccessDenied({ userId, resource, action, reason })
logTenantViolation({ userId, requestedTenantId, userTenantId })

// Threats
logCorsViolation({ origin, path })
logCsrfFailure({ reason, ip, path, method })
logRateLimitExceeded({ ip, path, limitType })
logSuspiciousActivity({ activityType, description })

// Audit
logSensitiveDataAccess({ userId, tenantId, dataType, action })
logSecurityConfigChange({ userId, setting })
```

### M5: Docker Security Flags

**Files:**
- `docker-compose.yml` (Modified)

**Changes:**
- Added `security_opt: no-new-privileges:true` to both containers
- Dropped all unnecessary Linux capabilities
- Added only required capabilities for postgres (CHOWN, SETUID, SETGID, FOWNER, DAC_OVERRIDE)
- Redis runs as non-root user with read-only filesystem
- Added tmpfs for Redis temporary files

**Security Options:**
```yaml
# Postgres
security_opt:
  - no-new-privileges:true
cap_drop:
  - ALL
cap_add:
  - CHOWN
  - SETUID
  - SETGID
  - FOWNER
  - DAC_OVERRIDE

# Redis
security_opt:
  - no-new-privileges:true
user: "redis"
cap_drop:
  - ALL
read_only: true
tmpfs:
  - /tmp:mode=1777,size=10m
```

## Verification Steps

### 1. CORS Verification
```bash
# Should be rejected (unknown origin)
curl -H "Origin: https://evil.com" http://localhost:8045/health

# Should be allowed (configured origin)
curl -H "Origin: http://localhost:3045" http://localhost:8045/health
```

### 2. CSRF Verification
```bash
# GET requests work without CSRF token
curl http://localhost:8045/health

# POST requests without CSRF token fail in production
# (Disabled in development by default)
```

### 3. Secrets Scanning Verification
```bash
# Simulate a secret detection (use a fake key pattern)
echo "API_KEY=sk_test_FAKE_KEY_FOR_TESTING_ONLY" > temp-secret.txt
gitleaks detect --source . --verbose

# Clean up
rm temp-secret.txt
```

### 4. Docker Security Verification
```bash
# Verify security options are applied
docker inspect elder-first-postgres | grep -A5 "SecurityOpt"
docker inspect elder-first-redis | grep -A5 "SecurityOpt"

# Verify redis is read-only
docker exec elder-first-redis touch /testfile 2>&1 | grep "Read-only"
```

## Dependencies Added

```json
{
  "dependencies": {
    "cookie-parser": "^1.4.6"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.6"
  }
}
```

## Files Changed Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `apps/api/src/config/cors.ts` | New | Centralized CORS configuration |
| `apps/api/src/config/__tests__/cors.test.ts` | New | CORS config tests |
| `apps/api/src/security/csrf.ts` | New | CSRF protection middleware |
| `apps/api/src/security/__tests__/csrf.test.ts` | New | CSRF tests |
| `apps/api/src/logging/securityLogger.ts` | New | Security event logger |
| `apps/api/src/logging/__tests__/securityLogger.test.ts` | New | Security logger tests |
| `apps/api/src/index.ts` | Modified | Added CORS, CSRF, cookie-parser |
| `apps/api/package.json` | Modified | Added cookie-parser |
| `.github/workflows/ci.yml` | Modified | Added secrets scan job |
| `.gitleaks.toml` | New | Gitleaks configuration |
| `docker-compose.yml` | Modified | Added security options |

## Security Impact

| Area | Before | After |
|------|--------|-------|
| CORS | Basic split on comma | Strict validation, logging |
| CSRF | None | Double-submit cookie pattern |
| Secrets | No scanning | Full history scanning in CI |
| Logging | Basic | Structured security events |
| Docker | Default options | Hardened with capabilities dropped |

## Next Steps (Phase 4 - Future)

1. **Session Management**: Implement token rotation on session refresh
2. **JWT Expiry**: Reduce from 12 hours to 1-2 hours
3. **Public Endpoint Rate Limiting**: Add per-endpoint rate limits
4. **SECURITY.md**: Create vulnerability disclosure policy
5. **Comprehensive Audit Logging**: Database-backed audit trail

## Related Documentation

- `docs/SECURITY-AUDIT-2025-12-04.md` - Full security audit
- `docs/SECURITY-REMEDIATION-PHASE-1-2025-12-04.md` - Critical fixes
- `docs/SECURITY-REMEDIATION-PHASE-2-2025-12-04.md` - High-priority fixes
- `docs/SECURITY-REMEDIATION-PHASE-2-5-2025-12-04.md` - NODE_ENV typing cleanup
