# Tax-Compliant Donation Tracking - Testing Guide

## Overview

This guide explains how to test the new tax-compliant donation tracking feature that was added to the Church platform.

## Features Implemented

### Backend (Database & API)

1. **Database Migration (`007_add_tax_tracking_to_donations.sql`)**:
   - Added `fund_id UUID` FK to donations table (references fund table)
   - Added `is_tax_deductible BOOLEAN` (default true)
   - Created indexes for tax reporting performance
   - Backfilled existing donations with `is_tax_deductible = true`
   - Auto-creates "General Fund" for tenants without funds
   - Added database functions:
     - `get_tax_summary_by_person(tenant_id, person_id, year, include_fund_breakdown)`
     - `get_tax_summaries_for_year(tenant_id, year)`

2. **tRPC API Procedures** (in `apps/api/src/routers/donations.ts`):
   - `donations.getTaxSummaryByPerson`: Get tax summary for one person in a year
   - `donations.getTaxSummariesForYear`: Get bulk summaries for all givers in a year
   - `donations.listFunds`: List all active funds
   - `donations.getDefaultFund`: Get tenant's default fund
   - `donations.create`: Updated to accept `fundId` and `isTaxDeductible`

### Frontend (UI)

1. **Person Detail Page Enhancement** (`apps/web/src/app/people/[id]/page.tsx`):
   - Added "Giving Summary" section showing tax-deductible totals by year
   - Component: `GivingSummarySection`

2. **New Admin Tax Statements Page** (`apps/web/src/app/donations/tax-statements/page.tsx`):
   - Year selector (default to current year)
   - Table showing all donors with tax-deductible contributions
   - Summary stats (total donors, total amount, average per donor)
   - Placeholder "Export CSV" button (coming soon)

3. **Donation Form Updates** (`apps/web/src/app/donations/new/page.tsx`):
   - Fund selector dropdown (populated from funds table)
   - "Tax-deductible contribution" checkbox (default checked)

4. **Donations Page Link** (`apps/web/src/app/donations/page.tsx`):
   - Added "Tax Statements" button to main donations page

---

## Prerequisites for Testing

### 0. DB Schema Sanity Check

**IMPORTANT:** Before testing, verify the donation table has the required columns.

**Run this SQL command:**

```bash
# Connect to PostgreSQL
psql -U your_user -d your_database

# Check donation table schema
\d donation
```

**Expected columns (relevant ones):**

```
Column              | Type      | Nullable | Default
--------------------+-----------+----------+---------
fund_id             | uuid      | YES      |
is_tax_deductible   | boolean   | NO       | true
```

**If these columns are missing:**

The database migrations haven't been applied. Run migration 008:

```bash
psql -U your_user -d your_database -f packages/database/migrations/008_ensure_donation_tax_columns.sql
```

**Verify columns exist:**

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'donation'
  AND column_name IN ('fund_id', 'is_tax_deductible')
ORDER BY column_name;
```

**Expected output:**

```
 column_name        | data_type | is_nullable | column_default
--------------------+-----------+-------------+----------------
 fund_id            | uuid      | YES         |
 is_tax_deductible  | boolean   | NO          | true
(2 rows)
```

**Verify foreign key constraint:**

```sql
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'donation'
  AND constraint_name = 'fk_donation_fund';
```

**Expected output:**

```
 constraint_name  | table_name | column_name
------------------+------------+-------------
 fk_donation_fund | donation   | fund_id
(1 row)
```

✅ If all checks pass, proceed with testing.
❌ If any check fails, re-run migration 008.

---

### 1. Run Database Migration

```bash
# Connect to your PostgreSQL database
psql -U your_user -d your_database

# Run migration 007
\i packages/database/migrations/007_add_tax_tracking_to_donations.sql
```

**Expected Output:**
- `fund_id` column added to donation table
- `is_tax_deductible` column added (default true)
- Indexes created successfully
- Existing donations backfilled with `is_tax_deductible = true`
- "General Fund" created for tenants without funds
- Database functions created

### 2. Start Servers

```bash
# Terminal 1 - API Server
cd apps/api
npm run dev
# Should start on port 8045

# Terminal 2 - Web Server
cd apps/web
npm run dev
# Should start on port 3045
```

### 3. Login

Navigate to: `http://localhost:3045/login`

**Test Users:**
- **Admin/Editor:** `pastor@testchurch.local` / `test123`
- **Viewer:** `viewer@testchurch.local` / `test123`

---

## Test Cases

### Test 1: Verify Database Migration

**Purpose:** Ensure database changes were applied correctly

**Steps:**
1. Connect to PostgreSQL:
   ```bash
   psql -U your_user -d your_database
   ```

2. Check donation table schema:
   ```sql
   \d donation
   ```

3. Verify new columns exist:
   ```sql
   SELECT
     column_name,
     data_type,
     column_default
   FROM information_schema.columns
   WHERE table_name = 'donation'
     AND column_name IN ('fund_id', 'is_tax_deductible');
   ```

4. Check if indexes were created:
   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'donation'
     AND indexname IN ('idx_donation_tax_reporting', 'idx_donation_fund');
   ```

5. Verify database functions exist:
   ```sql
   SELECT proname, prosrc
   FROM pg_proc
   WHERE proname IN ('get_tax_summary_by_person', 'get_tax_summaries_for_year');
   ```

6. Check if "General Fund" was created:
   ```sql
   SELECT id, tenant_id, name, description, is_default
   FROM fund
   WHERE name = 'General Fund';
   ```

**Expected Results:**
- ✅ `fund_id` column exists (UUID, nullable)
- ✅ `is_tax_deductible` column exists (BOOLEAN, default true, NOT NULL)
- ✅ Both indexes exist
- ✅ Both database functions exist
- ✅ "General Fund" created for tenants without funds

---

### Test 2: Create Test Data

**Purpose:** Create donations with various configurations for testing

**Manual SQL Test Data:**

```sql
-- Get tenant_id and person_id for testing
SELECT id, first_name, last_name FROM person LIMIT 1;
SELECT id FROM tenant LIMIT 1;
SELECT id, name FROM fund WHERE name = 'General Fund' LIMIT 1;

-- Create tax-deductible donation (completed, with fund)
INSERT INTO donation (
  tenant_id, person_id, amount, donation_method, donation_frequency,
  status, fund_id, is_tax_deductible, donation_date
) VALUES (
  '<tenant_id>',
  '<person_id>',
  150.00,
  'check',
  'one_time',
  'completed',
  '<general_fund_id>',
  true,
  '2024-03-15'
);

-- Create non-tax-deductible donation (completed)
INSERT INTO donation (
  tenant_id, person_id, amount, donation_method, donation_frequency,
  status, is_tax_deductible, donation_date
) VALUES (
  '<tenant_id>',
  '<person_id>',
  25.00,
  'cash',
  'one_time',
  'completed',
  false,
  '2024-05-20'
);

-- Create pending donation (should not appear in tax summaries)
INSERT INTO donation (
  tenant_id, person_id, amount, donation_method, donation_frequency,
  status, is_tax_deductible, donation_date
) VALUES (
  '<tenant_id>',
  '<person_id>',
  100.00,
  'credit_card',
  'one_time',
  'pending',
  true,
  '2024-06-10'
);

-- Create 2023 donation (for testing year filtering)
INSERT INTO donation (
  tenant_id, person_id, amount, donation_method, donation_frequency,
  status, fund_id, is_tax_deductible, donation_date
) VALUES (
  '<tenant_id>',
  '<person_id>',
  200.00,
  'online',
  'one_time',
  'completed',
  '<general_fund_id>',
  true,
  '2023-12-31'
);
```

**Or use the UI:**
- Navigate to `/donations/new`
- Create donations with various:
  - Tax-deductible: checked / unchecked
  - Status: completed / pending / failed
  - Dates: different years (2023, 2024, 2025)
  - Funds: General Fund, or create new funds

---

### Test 3: Individual Person Tax Summary

**Purpose:** Test per-person tax summary on person detail page

**Steps:**

1. Navigate to `/people` page
2. Click on a person who has donations
3. Scroll to "Giving Summary" section
4. Verify year selector shows current year by default
5. Click "Show Fund Breakdown" button
6. Change year selector to previous year

**Expected Results:**

- ✅ "Giving Summary" card is visible
- ✅ Year selector defaults to current year (2024)
- ✅ Total tax-deductible amount displays correctly
- ✅ Amount formatted as currency (e.g., "$150.00")
- ✅ Shows person name below total
- ✅ "Show Fund Breakdown" button toggles fund table
- ✅ Fund breakdown table shows correct fund names and amounts
- ✅ Only completed + tax-deductible donations are included
- ✅ Changing year updates the summary
- ✅ Non-tax-deductible donations are excluded
- ✅ Pending donations are excluded

**Test Scenarios:**

| Year | Expected Total | Notes |
|------|----------------|-------|
| 2024 | $150.00 | Only tax-deductible + completed |
| 2023 | $200.00 | Previous year donation |
| 2022 | $0.00 | No donations |

**Edge Cases:**
- Person with zero donations → Shows $0.00
- Person with only non-tax-deductible donations → Shows $0.00
- Person with only pending donations → Shows $0.00

---

### Test 4: Admin Tax Statements Page

**Purpose:** Test bulk year-end tax reporting page

**Steps:**

1. Navigate to `/donations` page
2. Click "Tax Statements" button
3. Verify year selector defaults to current year
4. Review summary stats cards
5. Review donor table
6. Click year selector and change to previous year
7. Click "View Details" on a donor row
8. Click "Export CSV" button

**Expected Results:**

- ✅ Page loads at `/donations/tax-statements`
- ✅ Protected by admin/editor roles (viewers get 403)
- ✅ Year selector defaults to current year
- ✅ Summary stats show:
  - Total number of donors with tax-deductible gifts
  - Total tax-deductible amount for year
  - Average per donor
- ✅ Donor table shows:
  - Donor name (linked to person detail page)
  - Email (or "—" if missing)
  - Number of donations
  - Total tax-deductible amount
- ✅ Clicking donor name navigates to `/people/[id]`
- ✅ "View Details" button navigates to person page
- ✅ Changing year updates all data
- ✅ "Export CSV" shows alert (feature coming soon)
- ✅ Empty state shows if no donors for selected year

**Test Scenarios:**

| Year | Expected Donors | Expected Total | Notes |
|------|-----------------|----------------|-------|
| 2024 | 1+ | $150.00+ | Current year |
| 2023 | 1+ | $200.00+ | Previous year |
| 2022 | 0 | $0.00 | No donations |

**Edge Cases:**
- No donations at all → Shows empty state with "Record Donation" button
- Only non-tax-deductible donations → Shows empty state
- Only pending donations → Shows empty state

---

### Test 5: Donation Form with Fund & Tax-Deductible

**Purpose:** Test updated donation creation form

**Steps:**

1. Navigate to `/donations/new`
2. Fill in donation form:
   - Select donor from dropdown
   - Enter amount: $100.00
   - Select fund from "Fund" dropdown
   - Verify "Tax-deductible contribution" checkbox is checked by default
   - Click "Record Donation"
3. Verify redirect to donation detail page
4. Return to `/donations/new`
5. Create another donation:
   - Uncheck "Tax-deductible contribution"
   - Select a different fund
   - Submit
6. Navigate to `/people/[id]` for that donor
7. Check "Giving Summary" section

**Expected Results:**

- ✅ Fund dropdown is populated with funds from database
- ✅ "General Fund" appears in dropdown
- ✅ "Tax-deductible contribution" checkbox defaults to checked
- ✅ Can uncheck "Tax-deductible contribution"
- ✅ Form submits successfully with fundId and isTaxDeductible
- ✅ Donation created with correct fund and tax-deductible status
- ✅ Tax-deductible donation appears in tax summary
- ✅ Non-tax-deductible donation does NOT appear in tax summary

**Test Combinations:**

| Fund | Tax-Deductible | Status | Should Appear in Tax Summary? |
|------|----------------|--------|-------------------------------|
| General Fund | ✅ Yes | Completed | ✅ Yes |
| General Fund | ❌ No | Completed | ❌ No |
| General Fund | ✅ Yes | Pending | ❌ No |
| (none) | ✅ Yes | Completed | ✅ Yes |

---

### Test 6: tRPC API Procedures (Direct Testing)

**Purpose:** Test API endpoints directly using tRPC client

**Using Browser DevTools Console:**

1. Open `/people/[id]` page
2. Open DevTools → Console
3. Run these commands:

```javascript
// Test getTaxSummaryByPerson
const result1 = await window.trpc.donations.getTaxSummaryByPerson.query({
  personId: '<person-uuid>',
  year: 2024,
  includeBreakdownByFund: true
});
console.log('Person Tax Summary:', result1);

// Test getTaxSummariesForYear
const result2 = await window.trpc.donations.getTaxSummariesForYear.query({
  year: 2024
});
console.log('All Donors Tax Summary:', result2);

// Test listFunds
const result3 = await window.trpc.donations.listFunds.query({
  includeInactive: false
});
console.log('Active Funds:', result3);

// Test getDefaultFund
const result4 = await window.trpc.donations.getDefaultFund.query();
console.log('Default Fund:', result4);
```

**Expected Outputs:**

- `getTaxSummaryByPerson`: Returns object with `totalAmount`, `currency`, `fundBreakdown`
- `getTaxSummariesForYear`: Returns array of donor summaries
- `listFunds`: Returns array of fund objects
- `getDefaultFund`: Returns the default fund or first active fund

---

### Test 7: Database Function Verification

**Purpose:** Test database functions directly

**SQL Test Queries:**

```sql
-- Test get_tax_summary_by_person
SELECT * FROM get_tax_summary_by_person(
  '<tenant_id>'::uuid,
  '<person_id>'::uuid,
  2024,
  true  -- include fund breakdown
);

-- Expected Output:
-- person_id | year | total_amount | currency | fund_breakdown
-- Shows total and optional fund breakdown as JSONB

-- Test get_tax_summaries_for_year
SELECT * FROM get_tax_summaries_for_year(
  '<tenant_id>'::uuid,
  2024
);

-- Expected Output:
-- person_id | first_name | last_name | email | total_amount | currency | donation_count
-- Shows all donors with tax-deductible gifts in 2024
```

**Expected Results:**
- ✅ Functions return correct data
- ✅ Only completed donations included
- ✅ Only tax-deductible donations included
- ✅ Date filtering works correctly
- ✅ Fund breakdown is valid JSONB

---

### Test 8: Permission & Role Checking

**Purpose:** Verify role-based access control

**Test Scenarios:**

| Role | Can Access Tax Statements? | Can Create Donation? | Can View Person Tax Summary? |
|------|----------------------------|----------------------|------------------------------|
| Admin | ✅ Yes | ✅ Yes | ✅ Yes |
| Editor | ✅ Yes | ✅ Yes | ✅ Yes |
| Submitter | ❌ No | ❌ No | ✅ Yes (if can view people) |
| Viewer | ❌ No | ❌ No | ✅ Yes (if can view people) |

**Steps:**

1. Login as **Admin** (`pastor@testchurch.local`):
   - Navigate to `/donations/tax-statements` → Should load
   - Navigate to `/donations/new` → Should load

2. Login as **Viewer** (`viewer@testchurch.local`):
   - Navigate to `/donations/tax-statements` → Should redirect to `/auth/forbidden`
   - Navigate to `/donations/new` → Should redirect to `/auth/forbidden`
   - Navigate to `/people/[id]` → Should show person details with giving summary

**Expected Results:**
- ✅ Admin/Editor can access all tax features
- ✅ Viewer cannot access admin tax statements page
- ✅ Viewer cannot create donations
- ✅ All roles can view person-level tax summaries (on person detail page)

---

### Test 9: Edge Cases & Error Handling

**Purpose:** Test unusual scenarios and error conditions

**Test Cases:**

1. **Person with zero donations:**
   - Navigate to person with no donations
   - Check "Giving Summary" section
   - **Expected:** Shows "$0.00" with message "No tax-deductible contributions found for [year]"

2. **Person with only non-tax-deductible donations:**
   - Create donations with `is_tax_deductible = false`
   - Check "Giving Summary"
   - **Expected:** Shows "$0.00"

3. **Person with only pending donations:**
   - Create donations with `status = 'pending'`
   - Check "Giving Summary"
   - **Expected:** Shows "$0.00" (pending not counted)

4. **Tax statements for year with no donations:**
   - Go to `/donations/tax-statements`
   - Select year 2020 (or any year with no data)
   - **Expected:** Empty state with message

5. **Invalid year selection:**
   - Try to manipulate year selector to set invalid year
   - **Expected:** Form validation or empty results

6. **Database function with NULL values:**
   - Test with person who has NULL email
   - **Expected:** Shows "—" or handles gracefully

7. **Deleted donations:**
   - Soft-delete a donation (`UPDATE donation SET deleted_at = NOW() WHERE id = '...'`)
   - **Expected:** Deleted donation does NOT appear in tax summaries

---

### Test 10: Performance & Data Volume

**Purpose:** Test with larger datasets

**Setup:**

Create bulk test data:

```sql
-- Create 100 donations for testing
DO $$
DECLARE
  i INTEGER;
  tenant_id UUID := '<your-tenant-id>';
  person_id UUID := '<your-person-id>';
  fund_id UUID := '<your-fund-id>';
BEGIN
  FOR i IN 1..100 LOOP
    INSERT INTO donation (
      tenant_id, person_id, amount, donation_method, donation_frequency,
      status, fund_id, is_tax_deductible, donation_date
    ) VALUES (
      tenant_id,
      person_id,
      (random() * 500 + 10)::DECIMAL(10,2),  -- Random amount between $10-$510
      'online',
      'one_time',
      'completed',
      fund_id,
      true,
      ('2024-01-01'::date + (random() * 365)::integer)::date  -- Random date in 2024
    );
  END LOOP;
END $$;
```

**Test:**
1. Navigate to person detail page with 100+ donations
2. Check "Giving Summary" loads in <2 seconds
3. Navigate to `/donations/tax-statements`
4. Check page loads in <3 seconds
5. Toggle fund breakdown

**Expected Results:**
- ✅ Pages load quickly with indexed queries
- ✅ No timeouts or hanging
- ✅ Totals calculated correctly
- ✅ Fund breakdown displays properly

---

## Troubleshooting

### Issue: Migration fails with "relation does not exist"

**Solution:**
- Ensure fund table exists first
- Run migrations in order: 001 → 007

### Issue: "Tax Statements" button not visible

**Solution:**
- Check user role (must be admin or editor)
- Clear browser cache
- Verify `/donations/page.tsx` was updated

### Issue: Fund dropdown is empty

**Solution:**
- Verify "General Fund" was created by migration
- Check: `SELECT * FROM fund WHERE deleted_at IS NULL;`
- Create fund manually if needed:
  ```sql
  INSERT INTO fund (tenant_id, name, description, is_active, is_default)
  VALUES ('<tenant-id>', 'General Fund', 'General church giving', true, true);
  ```

### Issue: Tax summary shows $0 but donations exist

**Checklist:**
- ✅ Donation status is 'completed' (not 'pending')
- ✅ `is_tax_deductible` is true
- ✅ Donation date is within selected year
- ✅ Donation is not soft-deleted (`deleted_at IS NULL`)

### Issue: tRPC procedure not found

**Solution:**
- Restart API server: `cd apps/api && npm run dev`
- Check TypeScript compilation errors
- Verify router exports in `apps/api/src/routers/donations.ts`

---

## Success Criteria

### ✅ All Tests Pass When:

1. **Database:**
   - Migration 007 runs without errors
   - New columns and indexes exist
   - Database functions return correct data

2. **API:**
   - All 4 new tRPC procedures work correctly
   - `donations.create` accepts fundId and isTaxDeductible
   - Proper error handling for invalid inputs

3. **Frontend:**
   - Person detail page shows "Giving Summary" section
   - Tax statements page loads and displays data correctly
   - Donation form includes fund selector and tax-deductible checkbox
   - All UI elements styled consistently

4. **Business Logic:**
   - Only completed + tax-deductible donations included in summaries
   - Year filtering works correctly
   - Fund breakdown is accurate
   - Soft-deleted donations excluded

5. **Performance:**
   - Pages load in <3 seconds with 100+ donations
   - Indexed queries execute efficiently

6. **Security:**
   - Tax statements page restricted to admin/editor roles
   - RLS policies enforce tenant isolation

---

## Next Steps (Future Enhancements)

1. **CSV Export:** Implement actual CSV generation for tax statements
2. **PDF Generation:** Generate printable tax letters per donor
3. **Email Delivery:** Send tax statements automatically to donors
4. **Fund Management UI:** Create admin page to manage funds
5. **Multi-year Summaries:** Show tax summaries for multiple years at once
6. **Chart Visualization:** Add graphs showing giving trends by fund

---

## Questions or Issues?

If you encounter any issues during testing:

1. Check browser DevTools console for JavaScript errors
2. Check API server logs for backend errors
3. Check PostgreSQL logs for database errors
4. Verify all environment variables are set correctly
5. Ensure both servers (API + Web) are running

**Happy Testing!** 🎉
