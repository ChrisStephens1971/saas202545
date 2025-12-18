# Development Test Accounts

This document describes how to set up and use development test accounts for local development.

## Overview

Development test accounts are **in-memory only** and authenticated via NextAuth's CredentialsProvider. Passwords are loaded from environment variables at runtime - they are never stored in the database or committed to the repository.

## Prerequisites

For dev credentials to work, you need:

1. `NODE_ENV=development`
2. `ALLOW_DEV_USERS=true`

Both conditions must be true. If `ALLOW_DEV_USERS=true` is set but `NODE_ENV` is not `development`, authentication will fail with a security warning.

## Test Accounts

| Email | Role | Environment Variable |
|-------|------|---------------------|
| admin@dev.com | Admin | `DEV_ADMIN_PASSWORD` |
| editor@dev.com | Editor | `DEV_EDITOR_PASSWORD` |
| submitter@dev.com | Submitter | `DEV_SUBMITTER_PASSWORD` |
| viewer@dev.com | Viewer | `DEV_VIEWER_PASSWORD` |
| kiosk@dev.com | Kiosk | `DEV_KIOSK_PASSWORD` |
| pastor@testchurch.local | Admin | `DEV_PASTOR_PASSWORD` |

## Setup Instructions

### 1. Create `.env.development.local`

Create a file named `.env.development.local` in the `apps/web/` directory:

```bash
# apps/web/.env.development.local

# Required flags
ALLOW_DEV_USERS=true
NEXT_PUBLIC_DEV_MODE=true

# Dev account passwords (set your own - min 8 characters)
DEV_ADMIN_PASSWORD=your_admin_password_here
DEV_EDITOR_PASSWORD=your_editor_password_here
DEV_SUBMITTER_PASSWORD=your_submitter_password_here
DEV_VIEWER_PASSWORD=your_viewer_password_here
DEV_KIOSK_PASSWORD=your_kiosk_password_here
DEV_PASTOR_PASSWORD=your_pastor_password_here

# Optional: Dev tenant ID (defaults to First Test Church)
# DEV_TENANT_ID=00000000-0000-0000-0000-000000000001
```

### 2. Start the Development Server

```bash
npm run dev
```

### 3. Log In

Navigate to http://localhost:3045/login and use one of the test account emails with the password you set in `.env.development.local`.

## Validation Script

To verify your dev accounts are configured correctly:

```bash
npm run dev:check-accounts
```

This script will:
- Check that required environment variables are set
- Verify password length requirements (min 8 characters)
- Show which accounts are ready for use

## Reset Script (Database Sync)

To sync dev test accounts from environment variables **into the database**:

```bash
npm run dev:reset-accounts
```

This script will:
- Create `person` records for each dev account
- Create `role_assignment` records with proper roles
- Store bcrypt-hashed passwords in a `dev_credentials` table
- Skip accounts without configured passwords

**Why sync to database?**
- Currently, dev login uses in-memory authentication via NextAuth
- Database records enable future DB-backed authentication
- Provides person/role records for testing database queries

**Note:** Login still works through the in-memory NextAuth system. Database records are for compatibility and future enhancements.

## Security Notes

### DO NOT:

- Commit `.env.development.local` to git (it's in `.gitignore`)
- Use these accounts in staging or production
- Share your local passwords with others
- Use simple passwords like "password" or "admin"

### This is safe because:

- Passwords are loaded from local environment variables only
- The CredentialsProvider is only enabled when `NODE_ENV=development` AND `ALLOW_DEV_USERS=true`
- If env vars are not set, random passwords are generated (login won't work until you set them)
- No secrets are committed to the repository

## Troubleshooting

### "Invalid email or password" error

1. Check that `ALLOW_DEV_USERS=true` is set
2. Check that `NEXT_PUBLIC_DEV_MODE=true` is set
3. Verify password is at least 8 characters
4. Restart the dev server after changing env vars

### Dev mode panel not showing on login page

1. Check that `NEXT_PUBLIC_DEV_MODE=true` is set in `apps/web/.env.development.local`
2. Restart the dev server

### Console warning about random passwords

If you see warnings like `[DEV AUTH] DEV_ADMIN_PASSWORD not set or too short`, set the corresponding environment variable in `.env.development.local`.

## Related Files

- `apps/web/src/auth.ts` - Authentication configuration
- `apps/web/src/app/login/page.tsx` - Login page UI
- `apps/web/.env.development.local` - Your local dev passwords (not committed)
- `apps/api/scripts/check-dev-accounts.ts` - Validation script
- `apps/api/scripts/reset-dev-test-accounts.ts` - Database sync script
