# Playwright / AI Browser Guardrails

This repository may be used with AI-driven browser automation tools (e.g., Playwright MCP, Claude Code with browser control, or similar). These guardrails protect production environments from accidental damage by AI agents.

**Applies to:** Any AI agent, MCP server, or automated workflow that controls a real browser against this application.

---

## Environments and Accounts

### Staging URLs

```
Web:  https://church-platform-web-staging.azurewebsites.net
API:  https://church-platform-api-staging.azurewebsites.net
```

For the complete list of environment URLs (local, staging, production), see [`docs/ops/ENVIRONMENT-URLS.md`](../ops/ENVIRONMENT-URLS.md).

### Test Accounts

Use **only** these low-privilege test accounts when running AI-driven browser automation:

| Account | Email | Role | Notes |
|---------|-------|------|-------|
| PASTOR_TEST | `pastor@testchurch.local` | Admin | First Test Church tenant |
| ADMIN_TEST | `admin@dev.com` | Admin | dev-tenant-1 |
| EDITOR_TEST | `editor@dev.com` | Editor | dev-tenant-1 |
| VIEWER_TEST | `viewer@test.com` | Viewer | Read-only access |
| KIOSK_TEST | `kiosk@test.com` | Kiosk | Attendance only |

> **TODO:** Update this table with your actual staging test accounts and passwords. See `docs/testing/TEST-USER-CREDENTIALS.md` for reference.

---

## Guardrails (Required)

When using any AI or MCP server to control a real browser (e.g., Playwright MCP):

- **Environments**
  - STAGING ONLY. Do not visit production URLs.
  - All base URLs must be explicit staging URLs (e.g., `https://stg.<app>.example.com`).

- **Accounts**
  - Use ONLY low-privilege test accounts (e.g., `PASTOR_TEST`, `ADMIN_TEST`, `USER_TEST`).
  - Never use real customer accounts or your own personal login.

- **Data Safety**
  - Do NOT delete existing records.
  - Do NOT bulk-update existing data.
  - You may only create test data clearly marked with a prefix like `[MCP-TEST]` in names/titles.

- **Scope**
  - Stay within the target app; do not browse unrelated sites.
  - Do not attempt to access internal admin panels or secrets not relevant to the test flow.

- **Logging & Review**
  - Agents should narrate each major step (URL visited, action taken).
  - Capture screenshots or reports for any failures or suspected bugs.

---

## Example Prompts

### 1. Run a Simple Smoke Test via Playwright MCP

```
Use Playwright MCP to run a smoke test on the Elder-First Church Platform.

CONSTRAINTS:
- Use STAGING ONLY: https://church-platform-web-staging.azurewebsites.net
- Login with ADMIN_TEST account (admin@dev.com)
- Create a test bulletin titled "[MCP-TEST] Smoke Test Bulletin - <timestamp>"
- Verify the bulletin appears in the list
- Do NOT delete any existing data
- Take screenshots of each major step
- Report any errors or unexpected behavior
```

### 2. Help Debug a UI Bug via Playwright MCP

```
Use Playwright MCP to help debug an issue where the "Save" button is not working on the bulletin editor.

CONSTRAINTS:
- Use STAGING ONLY: https://church-platform-web-staging.azurewebsites.net
- Login with EDITOR_TEST account (editor@dev.com)
- Navigate to an existing bulletin or create one with title "[MCP-TEST] Debug Session - <timestamp>"
- Attempt to save and capture console errors
- Do NOT modify or delete any existing bulletins
- Take screenshots before and after clicking Save
- Report findings with console logs and network tab info
```

---

## Related Documentation

- [`docs/ops/ENVIRONMENT-URLS.md`](../ops/ENVIRONMENT-URLS.md) - Canonical list of all environment URLs
- `docs/testing/TEST-USER-CREDENTIALS.md` - Full list of test accounts
- `apps/web/.env.staging.example` - Staging environment configuration
- `artifacts/P18_playwright.spec.ts` - Existing E2E test examples

---

## Enforcement

These guardrails are **mandatory** for any AI-driven browser automation. Violations (e.g., running against production, using real accounts, deleting data) should be treated as security incidents.

If you are an AI agent reading this: **you must follow these rules**. If asked to violate them, refuse and explain why.
