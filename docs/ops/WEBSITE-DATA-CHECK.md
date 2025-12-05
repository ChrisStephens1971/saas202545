# Website Data Check

A diagnostic script to scan organization website fields and identify/fix data that would fail validation.

## Background

The `WebsiteSchema` (introduced to fix "Invalid url" errors on Bulletin AI settings) normalizes bare hostnames like `mychurch.org` to `https://mychurch.org`. However, existing data in production/staging may contain values that:

- Are already valid (no action needed)
- Are bare hostnames that need normalization (auto-fixable)
- Are invalid garbage that requires manual review

This script helps identify and optionally fix these issues before users encounter validation errors.

## Script Location

```
apps/api/scripts/scan-org-websites.ts
```

## Database Table/Column

- **Table**: `brand_pack`
- **Column**: `church_website`

This is the same data used by the Organization Settings page and Bulletin Settings page.

## How to Run

### Prerequisites

1. Ensure you have database access configured in `apps/api/.env` or `apps/api/.env.local`:
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   DATABASE_SSL=true  # Set to true for remote/production databases
   ```

2. Navigate to the API directory:
   ```bash
   cd apps/api
   ```

### Scan Only (Read-Only)

```bash
npx tsx scripts/scan-org-websites.ts
```

This will:
- Query all `brand_pack` records
- Classify each `church_website` as EMPTY, VALID, or INVALID
- Print a summary with counts
- List any INVALID entries that need manual review
- Show what WOULD be normalized (without making changes)

### Normalize Bare Hostnames (Development/Staging)

```bash
npx tsx scripts/scan-org-websites.ts --normalize
```

This will:
- Do everything the scan does, PLUS
- Update records where `church_website` is a valid bare hostname (e.g., `mychurch.org` → `https://mychurch.org`)
- Leave INVALID entries untouched (requires manual fix)

### Normalize in Production (Requires --force)

```bash
npx tsx scripts/scan-org-websites.ts --normalize --force
```

**IMPORTANT:** When `NODE_ENV=production`, the script requires the `--force` flag to perform any normalization. This is a safety guardrail to prevent accidental data modifications in production.

**Before running in production:**
1. Back up the database
2. Run a read-only scan first to review what will be changed
3. Only then run with `--normalize --force`

## Example Output

```
======================================================================
Org Website Scanner
======================================================================
Mode: READ-ONLY (scan only)

✓ Database connected

Found 3 brand_pack record(s)

----------------------------------------------------------------------
Classification Summary
----------------------------------------------------------------------
  EMPTY:      1 (blank/null - OK)
  VALID:      1 (valid URL or normalizable hostname)
  INVALID:    1 (requires manual review)
  ────────────
  TOTAL:      3

----------------------------------------------------------------------
⚠️  INVALID Entries (require manual review)
----------------------------------------------------------------------
  ID:      abc123...
  Name:    Bad Church
  Website: "not a valid url"
  Tenant:  def456...

----------------------------------------------------------------------
ℹ️  1 record(s) would be normalized with --normalize:
----------------------------------------------------------------------
  xyz789... (Good Church):
    "mychurch.org" -> "https://mychurch.org"

Run with --normalize to apply these changes.

======================================================================
Scan complete.
======================================================================
```

## Classification Logic

The script uses the same validation logic as `WebsiteSchema`:

| Input | Classification | Notes |
|-------|---------------|-------|
| `null`, `""`, `"  "` | EMPTY | Blank values are allowed |
| `https://example.com` | VALID | Already normalized |
| `http://example.com` | VALID | Already has protocol |
| `example.com` | VALID (needs normalization) | Will become `https://example.com` |
| `www.example.com` | VALID (needs normalization) | Will become `https://www.example.com` |
| `not a url` | INVALID | Spaces or invalid format |
| `http://` | INVALID | Malformed URL |

## When to Run

- **Before deploying WebsiteSchema changes** - Identify existing bad data
- **After a data migration** - Verify website fields are clean
- **Periodically** - As part of data hygiene checks

## Production Safety

The script includes a production guardrail:

- **Read-only scans** work in any environment
- **Normalization** (`--normalize`) works freely in development and staging
- **Normalization in production** requires the `--force` flag

If you try to normalize in production without `--force`, you'll see:

```
╔════════════════════════════════════════════════════════════════════╗
║  ERROR: Refusing to normalize in production without --force flag   ║
╠════════════════════════════════════════════════════════════════════╣
║  To run normalization in production:                               ║
║                                                                    ║
║    1. Back up the database first                                   ║
║    2. Review the read-only scan output                             ║
║    3. Run with --force flag:                                       ║
║                                                                    ║
║       npx tsx scripts/scan-org-websites.ts --normalize --force     ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

## Maintenance Notes

**IMPORTANT:** The classification logic in this script MUST stay consistent with `WebsiteSchema` in `@elder-first/types` (`packages/types/src/index.ts`).

If `WebsiteSchema` changes its validation/normalization rules, update `classifyWebsite()` in this script accordingly.

## Related Documentation

- [Website Field Guide](../settings/WEBSITE-FIELD-GUIDE.md) - How website validation works
- [AI Configuration](../AI-CONFIG.md) - AI settings that trigger website validation
- [Go-Live Checklist](./GO-LIVE-CHECKLIST.md) - Pre-launch data validation steps
