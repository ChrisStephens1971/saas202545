# Setup Test Tenant - First Test Church

This guide explains how to set up the "First Test Church" tenant with sample data for testing.

## Prerequisites

- PostgreSQL database running and accessible
- Database migrations already applied
- `.env` file configured with database connection

## Running the Seed Script

**Command:**
```bash
cd packages/database
npm run seed
```

Or:
```bash
cd packages/database
npx tsx src/seed.ts
```

## What Gets Created

### Tenant
- **Name:** First Test Church
- **Slug:** `firsttest`
- **Email:** pastor@testchurch.local
- **Location:** Springfield, IL

### People (12 total)
- John & Jane Smith (members)
- Robert & Mary Johnson (members)
- Michael Davis (member)
- Sarah Wilson (attendee)
- David Martinez (member)
- Lisa Anderson (member)
- James Taylor (visitor)
- Patricia Thomas (visitor)
- William Moore (attendee)
- Jennifer Jackson (member)

### Sermon Series (2)
1. **Advent 2024** - "Preparing our hearts for the coming of Christ"
2. **Philippians: Joy in Chains** - Active series on Philippians

### Sermons (4)
1. "Hope in the Darkness" - Advent series (Isaiah 9:2-7)
2. "Joy in the Gospel" - Philippians 1:12-26
3. "The Mind of Christ" - Philippians 2:1-11
4. "Pressing On Toward the Goal" - Philippians 3:12-21

All sermons include:
- Full manuscript text
- Primary scripture references
- Some with audio/video URLs
- Tags for categorization

### Events (3)
1. **Sunday Morning Worship** - Next Sunday (upcoming)
2. **Church Workday** - 2 weeks ago
3. **Memorial Service for Helen Thompson** - 3 weeks ago

### Bulletin
- Created for next Sunday
- Includes service items (songs, sermon, prayer, offering, etc.)
- Sermon item is linked to most recent sermon in database

### Donations (6)
- Spread across past 6 weeks
- Amounts range from $50 to $250
- Various payment methods (check, online, cash)
- All tied to different people
- Status: completed

### Thank-You Notes (3)
1. **For donation** - Card sent 5 days ago to John Smith
2. **For event help** - Email sent 10 days ago for workday volunteer
3. **General service** - Phone call 3 days ago for children's ministry volunteer

### Additional Data
- **Brand Pack** - Church branding and contact info
- **Announcements** (3) - Potluck, Youth Group, Building Fund
- **Fund** - General Fund (default)

## Test User Access

### Tenant Access
- **URL parameter:** `?tenant=firsttest` (if using tenant selection)
- **Subdomain:** `firsttest.yourdomain.com` (if using subdomain routing)

### Login Credentials
The seed script does **NOT** create user accounts automatically.

**You must create a test user account separately** with:
- Email: `pastor@testchurch.local`
- Role: Admin or Editor (to access all features)
- Tenant ID: (matches the tenant created by seed script)

**How to create the user:**
- Use your auth provider's admin panel (e.g., Microsoft Entra, Auth0, etc.)
- Or add a user via SQL if using local auth:
  ```sql
  INSERT INTO users (email, name, role, tenant_id)
  VALUES ('pastor@testchurch.local', 'Pastor John', 'admin', 'YOUR_TENANT_ID_HERE');
  ```

## Verifying the Seed

After running the seed script, you should see output like:

```
✓ Created tenant: First Test Church (abc-123-def)
✓ Created household: xyz-789
✓ Created person: John Smith
✓ Created person: Jane Smith
... (12 people total)
✓ Created brand pack
✓ Created bulletin for Sun Dec 01 2024
✓ Created 9 service items
✓ Created 3 announcements
✓ Created default fund
✓ Created 2 sermon series
✓ Created 4 sermons
✓ Linked sermon to service item
✓ Created 3 events
✓ Created 6 donations
✓ Created 3 thank-you notes

✓ Database seeded successfully!

Test Credentials:
  Tenant: First Test Church
  Tenant Slug: firsttest
  Pastor Email: pastor@testchurch.local
```

## Re-Running the Seed

The seed script uses `ON CONFLICT DO NOTHING` for most inserts, so it's safe to run multiple times. However, for a clean slate:

1. Drop and recreate the database
2. Re-run migrations
3. Run seed script

## Troubleshooting

**Error: "Tenant already exists"**
- The seed script updates existing tenant if slug conflicts
- Data is not duplicated due to conflict handling

**Error: "Cannot connect to database"**
- Check `.env` file has correct DATABASE_URL
- Ensure PostgreSQL is running
- Verify network connectivity

**Missing data after seed**
- Check console output for errors
- Verify migrations were run first
- Check RLS policies if queries return empty

## Next Steps

After seeding:
1. Create the test user account (see above)
2. Log in with test credentials
3. Follow the [Pastor First Test Script](./PASTOR-FIRST-TEST-SCRIPT.md)
