# AI Configuration

This document describes how AI (OpenAI-based features) are configured and controlled in the Elder-First Church Platform.

## Overview

AI features use a **two-layer configuration system**:

1. **Environment Gate** - AI is completely blocked in production environments (safety policy)
2. **Database Settings** - API key and enabled flag stored encrypted in the database

## Policy

AI features are **environment-gated** to prevent accidental usage and cost overruns in production:

| Environment | AI Allowed? | Requirements |
|-------------|-------------|--------------|
| Local dev   | Yes         | API key configured in Settings → AI |
| Staging     | Yes         | API key configured in Settings → AI |
| Production  | **No**      | Always disabled, regardless of settings |

## Configuration Methods

### Method 1: Admin UI (Recommended)

Navigate to **Settings → AI Configuration** in the web app:

1. Add your OpenAI API key (stored encrypted in database)
2. Toggle AI features ON
3. Save settings

The API key is encrypted using AES-256-GCM before storage and never exposed to the browser.

### Method 2: Environment Variables (Legacy/Fallback)

For initial setup or CI/CD pipelines, you can also use environment variables.

**Required for database encryption:**

```bash
# Generate a 32-byte encryption key (64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Set in your environment
APP_ENCRYPTION_KEY=<64-char-hex-key>
```

## Environment Variables

### `APP_ENCRYPTION_KEY` (Required for AI)

A 32-byte key (64 hex characters) used to encrypt API keys in the database.

Generate with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### `DEPLOY_ENV`

Controls the deployment environment. Takes precedence over `NODE_ENV` for AI decisions.

- `development` - AI allowed (if configured)
- `dev` - AI allowed (alias for development)
- `staging` - AI allowed (if configured)
- `production` - AI **always disabled**

If `DEPLOY_ENV` is not set, falls back to `NODE_ENV`.

### `NODE_ENV`

Standard Node.js environment variable. Used as fallback when `DEPLOY_ENV` is not set.

- `development` - AI allowed (default for local dev)
- `production` - AI disabled (unless `DEPLOY_ENV` overrides)

## Database Schema

AI settings are stored in the `ai_settings` table (singleton pattern):

```sql
CREATE TABLE ai_settings (
  id UUID PRIMARY KEY,
  provider TEXT DEFAULT 'openai',
  api_key_encrypted TEXT,  -- AES-256-GCM encrypted
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

Run migration `026_add_ai_settings.sql` to create this table.

## API Endpoints

### `aiSettings.get` (Admin only)

Returns current AI configuration:
```typescript
{
  provider: 'openai',
  enabled: boolean,
  hasKey: boolean,
  keyLast4?: string  // Last 4 chars of key (if configured)
}
```

### `aiSettings.update` (Admin only)

Update AI configuration:
```typescript
{
  enabled: boolean,
  apiKey?: string | null  // null to clear, undefined to keep existing
}
```

### `ai.aiConfig` (Authenticated users)

Check if AI is available for current environment:
```typescript
{
  enabled: boolean
}
```

## Related: Website Field Validation

When saving settings that include AI configuration (e.g., enabling AI on the Bulletin Settings page), the Organization Website field is also validated. The `WebsiteSchema` auto-normalizes bare hostnames like `mychurch.org` to `https://mychurch.org`.

See [Website Field Guide](settings/WEBSITE-FIELD-GUIDE.md) for full details on website validation behavior.

---

## Configuration Examples

### Local Development

1. Set `APP_ENCRYPTION_KEY` in `.env`
2. Start the app: `npm run dev`
3. Navigate to Settings → AI Configuration
4. Add your OpenAI API key
5. Enable AI features

### Staging

1. Set `APP_ENCRYPTION_KEY` in Azure Key Vault / environment
2. Set `DEPLOY_ENV=staging`
3. Deploy the app
4. Configure API key via Settings UI

### Production

```bash
# Production environment
NODE_ENV=production
DEPLOY_ENV=production
# AI is disabled regardless of any other settings
```

## Testing Environments Locally

### Simulate Staging

```bash
# Windows PowerShell
$env:DEPLOY_ENV="staging"
npm run dev

# Linux/Mac
DEPLOY_ENV=staging npm run dev
```

### Simulate Production (AI disabled)

```bash
# Windows PowerShell
$env:DEPLOY_ENV="production"
npm run dev

# Linux/Mac
DEPLOY_ENV=production npm run dev
```

AI buttons should appear disabled with tooltips explaining AI is not available.

## Implementation Details

### Key Files

- `apps/api/src/routers/ai.ts` - AI router with environment gating
- `apps/api/src/routers/aiSettings.ts` - Admin settings router
- `apps/api/src/utils/encryption.ts` - AES-256-GCM encryption utilities
- `packages/database/migrations/026_add_ai_settings.sql` - Database migration
- `apps/web/src/app/settings/ai/page.tsx` - Settings UI

### AI Gating Logic (`ai.ts`)

- `getDeployEnv()` - Determines current environment from `DEPLOY_ENV` or `NODE_ENV`
- `isAiAllowedInEnvironment()` - Returns `true` if environment allows AI
- `getEffectiveApiKey()` - Fetches and decrypts API key from database
- `isAiConfigured()` - Returns `true` if environment allows AND key is configured
- `assertAiConfigured()` - Throws `PRECONDITION_FAILED` if AI unavailable, returns apiKey
- `ai.aiConfig` query - Returns `{ enabled: boolean }` for frontend use

### Encryption (`encryption.ts`)

- `isEncryptionConfigured()` - Check if `APP_ENCRYPTION_KEY` is set
- `encryptSecret(plaintext)` - Returns base64(IV + authTag + ciphertext)
- `decryptSecret(ciphertext)` - Decrypts and returns plaintext

## Frontend Behavior

The SermonBuilder component (`apps/web/src/components/sermons/SermonBuilder.tsx`) uses `trpc.ai.aiConfig.useQuery()` to check AI availability:

- When `enabled: true` - AI buttons are active and functional
- When `enabled: false` - AI buttons are disabled with a tooltip explaining AI is not configured

## Security Notes

- API keys are encrypted at rest using AES-256-GCM
- `APP_ENCRYPTION_KEY` should be stored securely (Azure Key Vault recommended)
- API keys are never logged or exposed to the frontend
- Production environments will never make OpenAI API calls
- Only admin users can view/update AI settings
- The full API key is never returned to the client (only `keyLast4`)

## Troubleshooting

### "Failed to fetch" Error When Saving Settings

**Symptom:** Clicking Save on the AI Settings page shows "Failed to fetch" error toast.

**Root Causes (fixed in Dec 2025):**

1. **CORS header mismatch** - The `X-Tenant-Id` header was not in the CORS `allowedHeaders` list, causing preflight requests to fail.

2. **Stale auth token** - The tRPC client was capturing stale closure values for the auth token and tenant ID in its `headers()` function.

**Fix applied:**
- Added `X-Tenant-Id` to `apps/api/src/config/cors.ts` allowedHeaders
- Updated `apps/web/src/lib/trpc/Provider.tsx` to use refs for dynamic header values

**Verification:**
```bash
# Test CORS preflight
curl -X OPTIONS "http://localhost:8045/trpc/aiSettings.update" \
  -H "Origin: http://localhost:3045" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization,X-Tenant-Id" \
  -v

# Should return 200 with Access-Control-Allow-Headers including X-Tenant-Id
```

### API Key Not Persisting

**Symptom:** API key appears to save but is gone on page refresh.

**Check:**
1. Verify `APP_ENCRYPTION_KEY` is set in the API environment
2. Check the `ai_settings` table: `SELECT * FROM ai_settings;`
3. Look for errors in API logs related to encryption

### AI Features Disabled Despite Configuration

**Symptom:** AI buttons show disabled even after configuring API key.

**Check:**
1. Verify `DEPLOY_ENV` is not set to `production`
2. Check the `trpc.ai.aiConfig` response in browser DevTools Network tab
3. Ensure the `enabled` flag is `true` in the database

### UNAUTHORIZED Error on AI Settings Page

**Symptom:** Browser DevTools Console shows `TRPCClientError: UNAUTHORIZED` when loading `/settings/ai`.

**Root Cause:** JWT secret mismatch between web app and API server.

The web app signs JWT tokens using `NEXTAUTH_SECRET`, and the API server verifies them using the same secret. If these values don't match, token verification fails and you get UNAUTHORIZED.

**Check:**
```bash
# Compare secrets (they MUST be identical)
grep NEXTAUTH_SECRET apps/web/.env.local
grep NEXTAUTH_SECRET apps/api/.env
```

**Fix:**
Ensure both files have the **exact same** `NEXTAUTH_SECRET` value:
```bash
# apps/web/.env.local
NEXTAUTH_SECRET=local-dev-secret-for-jwt-signing-must-be-32-chars-or-more

# apps/api/.env
NEXTAUTH_SECRET=local-dev-secret-for-jwt-signing-must-be-32-chars-or-more
```

After updating, restart both servers:
```bash
npx kill-port 8045 3045
npm run dev
```

**Note:** The secret must be at least 32 characters. In production, use a cryptographically random secret stored in Azure Key Vault.

### Access Denied / Insufficient Permissions

**Symptom:** "Insufficient permissions" or "FORBIDDEN" error on AI settings.

**Cause:** AI Settings is admin-only. Only users with the `admin` role can access this page.

**Check:**
1. Verify you're logged in as an admin user (e.g., `admin@dev.com`)
2. Check the session in browser DevTools: Application → Cookies → look for session token
3. Verify the dev account has admin role configured

**Dev account roles:**
| Email | Role |
|-------|------|
| admin@dev.com | Admin |
| editor@dev.com | Editor |
| viewer@dev.com | Viewer |

Only `admin@dev.com` can access AI Settings.

### 429 Too Many Requests

**Symptom:** Browser DevTools Network tab shows `429 Too Many Requests` when saving AI settings or making other API calls.

**Root Cause:** Rate limiting is applied to all tRPC endpoints. In local development with older versions, the limit was 100 requests per 15 minutes per IP address, which could be exhausted during normal development browsing.

**Fix Applied (Dec 2025):** Environment-aware rate limiting:

| Environment | Window | Max Requests | Auth Max |
|-------------|--------|--------------|----------|
| Development | 1 minute | 1000 | 100 |
| Production | 15 minutes | 100 | 10 |

**If you still hit rate limits in development:**

1. Check that `NODE_ENV=development` in `apps/api/.env`
2. Restart the API server after changing environment variables
3. Wait 1 minute for the rate limit window to reset

**Production rate limits:**

In production, rate limits can be configured via environment variables:
- `RATE_LIMIT_WINDOW_MS` - Time window in ms (default: 900000 = 15 min)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)
- `AUTH_RATE_LIMIT_MAX_REQUESTS` - Max auth attempts per window (default: 10)

**See:** `apps/api/src/index.ts` and `apps/api/src/__tests__/rateLimiting.test.ts`

---

## Browser Automation (Playwright MCP)

For any AI workflows that control a real browser (Playwright MCP or similar), you **MUST** follow:

- [`docs/mcp/PLAYWRIGHT-GUARDRAILS.md`](mcp/PLAYWRIGHT-GUARDRAILS.md) - Full rules for AI browser automation
- [`docs/ops/ENVIRONMENT-URLS.md`](ops/ENVIRONMENT-URLS.md) - Canonical list of all environment URLs

These guardrails ensure AI agents only run against **staging environments** with test accounts and cannot accidentally damage production data. The production custom domain (`https://www.elderfirstchurch.com`) and production Azure App Service URLs are **off limits** for AI-driven browser automation.
