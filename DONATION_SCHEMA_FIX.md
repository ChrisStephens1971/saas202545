# Donation Schema Fix - Column Missing Error

## Problem

When submitting a new donation via `/donations/new`, the backend threw:

```
column "fund_id" of relation "donation" does not exist
```

## Root Cause

Migration 007 (`007_add_tax_tracking_to_donations.sql`) was created but **never applied** to the database. The donation table was missing:
- `fund_id UUID` column
- `is_tax_deductible BOOLEAN` column

The backend code was already correct and expecting these columns to exist.

## Solution

Created **Migration 008** (`008_ensure_donation_tax_columns.sql`) which:
1. Adds the missing columns with safe guards
2. Creates foreign key constraint
3. Creates indexes for performance
4. Backfills existing data
5. Creates database functions for tax reporting

This migration is **idempotent** and safe to run multiple times.

## Files Changed

### Created:
1. ✅ `packages/database/migrations/008_ensure_donation_tax_columns.sql`

### Modified:
2. ✅ `TAX_TRACKING_TESTING.md` - Added DB schema sanity check section

### Verified (no changes needed):
- ✅ `apps/api/src/routers/donations.ts` - Backend code already correct
- ✅ `apps/web/src/app/donations/new/page.tsx` - Frontend code already correct

## How to Apply the Fix

### Step 1: Run Migration 008

```bash
# Connect to your database
psql -U your_user -d your_database

# Run the migration
\i packages/database/migrations/008_ensure_donation_tax_columns.sql
```

### Step 2: Verify Columns Exist

```sql
-- Check columns
\d donation

-- Should show:
--   fund_id             | uuid    |
--   is_tax_deductible   | boolean | not null default true
```

### Step 3: Test Donation Creation

1. Start servers:
   ```bash
   cd apps/api && npm run dev  # Terminal 1
   cd apps/web && npm run dev  # Terminal 2
   ```

2. Navigate to: `http://localhost:3045/donations/new`

3. Fill out form:
   - Select a donor
   - Enter amount
   - **Select a fund** from dropdown
   - Ensure "Tax-deductible" checkbox is checked
   - Submit

4. ✅ **Expected:** Donation saves successfully, no errors

## Verification Checklist

- [ ] Migration 008 applied to database
- [ ] `fund_id` column exists on `donation` table
- [ ] `is_tax_deductible` column exists on `donation` table
- [ ] Foreign key `fk_donation_fund` constraint exists
- [ ] Indexes created successfully
- [ ] Can create donation with fund selected
- [ ] Can create donation without fund selected (fund_id = NULL)
- [ ] Tax-deductible checkbox works correctly

## Next Steps

After applying migration 008, all donation form submissions should work correctly with fund tracking and tax-deductible status.
