# CI/CD Security Setup Guide

This document describes the security tooling configured in the CI/CD pipelines for the Elder-First Church Platform.

---

## Overview

The CI pipeline includes multiple security checks that run automatically on every push and pull request:

| Tool | Purpose | Fails Build | Location |
|------|---------|-------------|----------|
| Security Tests | Verify auth, tenant isolation, SQL injection protection | Yes | `ci.yml` |
| npm audit | Dependency vulnerability scanning | Warn only | `ci.yml` |
| CodeQL | Static application security testing (SAST) | No (reports) | `codeql.yml` |
| Secret Scanning | Detect committed secrets | N/A (repo setting) | GitHub Settings |

---

## Security Tests

**Workflow:** `.github/workflows/ci.yml` (security-tests job)

**What it tests:**
- SQL injection prevention (`db.security.test.ts`)
- Platform role authorization (`security.test.ts`)
- CSRF protection model (`security.test.ts`)
- Error handling sanitization (`security.test.ts`)

**Commands:**
```bash
# Run locally
npm run test:security

# Run from API directory
cd apps/api && npm run test:security
```

**Build Impact:** Tests must pass for the build to succeed.

**What to do on failure:**
1. Review the test output to identify which test failed
2. Check if the failure is in production code or the test itself
3. Fix the security issue - do NOT just update the test to pass
4. Re-run the tests locally before pushing

---

## npm Audit

**Workflow:** `.github/workflows/ci.yml` (security-audit job)

**What it checks:**
- Known vulnerabilities in npm dependencies
- Security advisories from the npm registry

**Commands:**
```bash
# Run locally
npm audit

# Check for high/critical only
npm audit --audit-level=high

# Auto-fix where possible
npm audit fix
```

**Build Impact:** Currently set to `continue-on-error: true` (warns but doesn't fail).

**Policy Decision:**
- Consider setting `--audit-level=critical` to fail on critical vulnerabilities
- Review all high/critical findings and document accepted risks

**What to do on audit findings:**
1. Review the vulnerability details: `npm audit`
2. Check if the vulnerable code path is actually used
3. Options:
   - Update the dependency: `npm update <package>`
   - Replace with alternative package
   - Accept risk with documented justification

---

## CodeQL Analysis

**Workflow:** `.github/workflows/codeql.yml`

**What it scans:**
- JavaScript/TypeScript code for security vulnerabilities
- Common issues like:
  - SQL injection
  - Cross-site scripting (XSS)
  - Path traversal
  - Insecure randomness
  - Prototype pollution

**When it runs:**
- On every push to main/master
- On every pull request to main/master
- Weekly scheduled scan (Sunday at midnight UTC)

**Build Impact:** Does not fail the build. Results are reported in the GitHub Security tab.

**Where to find results:**
1. Go to the repository on GitHub
2. Click "Security" tab
3. Click "Code scanning alerts"
4. Review and triage findings

**What to do on CodeQL alerts:**
1. Review the alert in the Security tab
2. Understand the vulnerability and data flow
3. Options:
   - **Fix:** Update the code to remediate
   - **Dismiss:** Mark as false positive with reason
   - **Accept:** Document as accepted risk (rare)

---

## Secret Scanning

**Location:** GitHub repository/organization settings

**What it detects:**
- API keys
- Tokens
- Passwords
- Private keys
- Cloud credentials

**Setup (must be done in GitHub UI):**
1. Go to Repository Settings > Security & analysis
2. Enable "Secret scanning"
3. Enable "Push protection" to block commits with secrets
4. Configure custom patterns if needed

**What to do on secret detection:**
1. Rotate the exposed credential immediately
2. Revoke the old credential
3. Check logs for unauthorized use
4. Remove the secret from git history (if needed)
5. Update the code to use environment variables

---

## Required Status Checks

The following should be configured as required status checks for merging:

| Check | Required | Notes |
|-------|----------|-------|
| Security Tests | Yes | Must pass |
| lint-and-typecheck | Yes | Must pass |
| build | Yes | Must pass |
| security-audit | No | Review only |
| CodeQL | No | Review only |

**To configure (repo admin):**
1. Go to Repository Settings > Branches
2. Add branch protection rule for `main`/`master`
3. Check "Require status checks to pass before merging"
4. Select the required checks

---

## Local Development

Developers should run security checks locally before pushing:

```bash
# Full security check
npm run test:security && npm audit --audit-level=high

# Quick check (security tests only)
npm run test:security
```

Consider adding a pre-push hook (`.githooks/pre-push`):
```bash
#!/bin/bash
echo "Running security tests..."
npm run test:security || exit 1
echo "Checking for vulnerabilities..."
npm audit --audit-level=critical || exit 1
```

---

## Responding to Security Findings

### Severity Definitions

| Severity | Response Time | Examples |
|----------|--------------|----------|
| Critical | Immediate | SQL injection in production code |
| High | Within 24 hours | Authentication bypass |
| Medium | Within 1 week | XSS in admin-only feature |
| Low | Next sprint | Informational disclosure |

### Workflow

1. **Triage:** Review finding, confirm it's real
2. **Assess:** Determine severity and impact
3. **Prioritize:** Schedule fix based on severity
4. **Fix:** Implement remediation
5. **Verify:** Confirm fix resolves the issue
6. **Document:** Update security docs if needed

---

## Adding New Security Checks

To add new security tools to CI:

1. Create or update workflow file in `.github/workflows/`
2. Decide if it should block builds (fail-fast) or just report
3. Update this document
4. Test in a branch first

**Recommended additions:**
- Trivy for container scanning (when Docker is used)
- OWASP Dependency-Check for deeper CVE scanning
- Snyk for comprehensive vulnerability management

---

## Related Documentation

- [Security Baseline V1](./SECURITY-BASELINE-V1.md) - Section 10: CI/CD
- [Security Review Summary](./SECURITY-REVIEW-SUMMARY.md) - CI security tooling status
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [CodeQL Documentation](https://codeql.github.com/docs/)
