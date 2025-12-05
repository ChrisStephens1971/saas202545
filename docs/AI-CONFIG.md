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
