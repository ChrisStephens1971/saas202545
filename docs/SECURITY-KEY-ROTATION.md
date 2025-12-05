# Encryption Key Rotation Runbook

This document describes how to safely rotate the `APP_ENCRYPTION_KEY` used for encrypting sensitive data (such as AI API keys) in the Elder-First Church Platform.

---

## Overview

The platform uses AES-256-GCM encryption for sensitive data stored in the database. The encryption key is stored in the `APP_ENCRYPTION_KEY` environment variable.

**Encrypted Data Locations:**
| Table | Column | Description |
|-------|--------|-------------|
| `ai_settings` | `api_key_encrypted` | OpenAI API key (global setting) |

**Key Format:**
- 32 bytes (256 bits)
- Stored as 64 hexadecimal characters
- Example: `4F94E005F1A0103F61D8068E8D6010FA70796A750CBCF559834F20A36FF31A77`

---

## Prerequisites

Before starting key rotation:

1. **Backup the database**
   ```bash
   pg_dump -h <host> -U <user> -d <database> -F c -f backup_$(date +%Y%m%d).dump
   ```

2. **Record the current encryption key**
   - Save the current `APP_ENCRYPTION_KEY` in a secure location (password manager, vault)
   - Label it with the date: `OLD_KEY_<YYYY-MM-DD>`

3. **Generate a new key**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Or in PowerShell:
   ```powershell
   [BitConverter]::ToString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).Replace("-","").ToLower()
   ```

4. **Test in staging first**
   - Never rotate production keys without testing the full process in staging

---

## Rotation Process

### Step 1: Prepare Environment

1. Set both keys in your rotation environment:
   ```bash
   export OLD_ENCRYPTION_KEY=<current-key>
   export NEW_ENCRYPTION_KEY=<new-key>
   ```

2. Ensure you have database access:
   ```bash
   export DATABASE_URL=<connection-string>
   ```

### Step 2: Run the Rotation Script

```bash
cd apps/api
npx tsx scripts/rotate-encryption-key.ts
```

The script will:
1. Read all rows with encrypted data
2. Decrypt using the old key
3. Re-encrypt using the new key
4. Update the database rows
5. Verify the migration

**Script options:**
```bash
# Dry run (no changes)
npx tsx scripts/rotate-encryption-key.ts --dry-run

# Force run (skip confirmation prompts)
npx tsx scripts/rotate-encryption-key.ts --force
```

### Step 3: Update Application Environments

1. **Staging:**
   ```bash
   # Update Azure App Service / Environment
   az webapp config appsettings set \
     --name <app-name> \
     --resource-group <rg-name> \
     --settings APP_ENCRYPTION_KEY=<new-key>
   ```

2. **Production:**
   - Schedule a maintenance window if needed
   - Update the environment variable in your deployment system
   - Restart the application

### Step 4: Verify

1. **Test decryption works:**
   - Log into the application
   - Navigate to Settings > AI Configuration
   - Verify the masked API key displays correctly
   - Test an AI feature to confirm the key decrypts properly

2. **Check logs:**
   ```bash
   # Look for decryption errors
   grep -i "decryption failed" /var/log/app/*.log
   ```

### Step 5: Clean Up

1. **Remove old key from secure storage** after 7-day observation period
2. **Update documentation** if key format or storage location changed
3. **Document the rotation** in your change log

---

## Rollback Plan

If rotation fails or causes issues:

### Immediate Rollback (within minutes)

1. **Restore the old key:**
   ```bash
   az webapp config appsettings set \
     --name <app-name> \
     --resource-group <rg-name> \
     --settings APP_ENCRYPTION_KEY=<old-key>
   ```

2. **Restart the application**

### Database Rollback (if data was corrupted)

1. **Restore from backup:**
   ```bash
   pg_restore -h <host> -U <user> -d <database> -c backup_YYYYMMDD.dump
   ```

2. **Restore the old encryption key**

### Partial Rollback (if only some rows failed)

1. **Re-run rotation script with old key:**
   ```bash
   export OLD_ENCRYPTION_KEY=<new-key>
   export NEW_ENCRYPTION_KEY=<old-key>
   npx tsx scripts/rotate-encryption-key.ts
   ```

---

## Rotation Script Details

**Location:** `apps/api/scripts/rotate-encryption-key.ts`

**What it does:**
1. Connects to the database using `DATABASE_URL`
2. Queries all rows with encrypted data from `ai_settings`
3. For each row:
   - Decrypts `api_key_encrypted` using `OLD_ENCRYPTION_KEY`
   - Re-encrypts the plaintext using `NEW_ENCRYPTION_KEY`
   - Updates the row
4. Verifies all rows can be decrypted with the new key
5. Reports success/failure statistics

**Safety features:**
- Dry-run mode to preview changes
- Transaction wrapping (all-or-nothing)
- Verification step after migration
- Detailed logging

---

## Rotation Schedule

**Recommended rotation frequency:**
- **Routine:** Every 12 months
- **After compromise:** Immediately
- **After personnel change:** Within 7 days (if person had key access)

**Triggers for immediate rotation:**
- Key exposed in logs or error messages
- Key committed to version control
- Suspected unauthorized access
- Security audit recommendation

---

## Audit Log

Document all key rotations here:

| Date | Reason | Rotated By | Verified By | Notes |
|------|--------|------------|-------------|-------|
| YYYY-MM-DD | Initial | - | - | First production key |

---

## Related Documentation

- [Security Baseline V1](./SECURITY-BASELINE-V1.md) - Section 7: Secrets & Encryption
- [Security Review Summary](./SECURITY-REVIEW-SUMMARY.md) - Item #7: Encryption Key Rotation
- [Encryption Implementation](../apps/api/src/utils/encryption.ts)
