# P17: Test Data CSV Files

**Note:** This document describes the CSV files that would be included in `P17_csvs.zip` for manual import testing.

---

## CSV Files Included

1. `households.csv` - 20 household records
2. `people.csv` - 50 person records
3. `groups.csv` - 6 group records
4. `events.csv` - 12 event records
5. `announcements.csv` - 12 announcement records
6. `service_plan.csv` - Service plan with 5 items (3 songs with CCLI)
7. `brand_pack.csv` - Brand configuration

---

## 1. households.csv

**Format:**
```csv
id,tenant_id,name,address,city,state,zip,phone,created_at
household-1,00000000-0000-0000-0000-000000000001,Smith Family,"100 Oak Street",Springfield,IL,62701,(555) 100-1000,2025-11-14T00:00:00Z
household-2,00000000-0000-0000-0000-000000000001,Johnson Family,"110 Oak Street",Springfield,IL,62701,(555) 101-1010,2025-11-14T00:00:00Z
...
```

**Sample Data:** 20 rows total

---

## 2. people.csv

**Format:**
```csv
id,tenant_id,household_id,first_name,last_name,email,phone,birth_date,member_since,role,created_at
person-1,00000000-0000-0000-0000-000000000001,household-1,John,Smith,john.smith@example.com,(555) 100-1000,1960-01-15,2015-01-01,member,2025-11-14T00:00:00Z
person-2,00000000-0000-0000-0000-000000000001,household-1,Mary,Smith,mary.smith@example.com,,,1965-03-20,2015-01-01,member,2025-11-14T00:00:00Z
...
```

**Sample Data:** 50 rows total
- 20 households
- First 10 households have 3 people (30 people)
- Last 10 households have 2 people (20 people)
- Total: 50 people

---

## 3. groups.csv

**Format:**
```csv
id,tenant_id,name,description,category,meeting_day,meeting_time,location,leader_id,is_active,created_at
group-1,00000000-0000-0000-0000-000000000001,Sunday School - Adults,Sunday morning Bible study for adults,education,Sunday,9:00 AM,Fellowship Hall,person-1,true,2025-11-14T00:00:00Z
group-2,00000000-0000-0000-0000-000000000001,Small Group - North Side,Weekly small group meeting for fellowship and prayer,small_group,Wednesday,7:00 PM,Smith Home,person-2,true,2025-11-14T00:00:00Z
...
```

**Sample Data:** 6 rows
1. Sunday School - Adults
2. Small Group - North Side
3. Youth Group
4. Prayer Team
5. Women's Bible Study
6. Men's Breakfast

---

## 4. events.csv

**Format:**
```csv
id,tenant_id,title,description,start_time,end_time,location,category,requires_rsvp,max_attendees,created_at
event-1,00000000-0000-0000-0000-000000000001,Sunday Morning Worship,Weekly worship service,2025-11-17T10:00:00Z,2025-11-17T11:30:00Z,Main Sanctuary,worship,false,,2025-11-14T00:00:00Z
event-2,00000000-0000-0000-0000-000000000001,Sunday Morning Worship,Weekly worship service,2025-11-24T10:00:00Z,2025-11-24T11:30:00Z,Main Sanctuary,worship,false,,2025-11-14T00:00:00Z
...
```

**Sample Data:** 12 rows
- 4 Sunday Services (next 4 Sundays at 10 AM)
- 4 Wednesday Prayer Meetings (next 4 Wednesdays at 7 PM)
- 4 Special Events:
  - Church Potluck (in 14 days)
  - Youth Game Night (in 7 days)
  - Men's Breakfast (in 5 days)
  - Community Service Day (in 21 days)

---

## 5. announcements.csv

**Format:**
```csv
id,tenant_id,title,body,priority,category,expires_at,target_audience,created_at
announcement-1,00000000-0000-0000-0000-000000000001,Service Time Change This Sunday,"Due to building maintenance, service will start at 11 AM this week. Regular 10 AM time resumes next Sunday.",urgent,general,2025-11-16T00:00:00Z,all,2025-11-14T00:00:00Z
announcement-2,00000000-0000-0000-0000-000000000001,Church Potluck Next Week,"Join us for a potluck dinner on November 24th at 6 PM. Bring a dish to share! Sign up online to help us plan.",high,events,2025-11-28T00:00:00Z,all,2025-11-14T00:00:00Z
...
```

**Sample Data:** 12 rows
- **Priorities:**
  - 1 Urgent (service time change)
  - 3 High (potluck, community service, food drive)
  - 7 Normal
  - 1 Low
- **Categories:**
  - 3 General
  - 3 Events
  - 2 Volunteers
  - 2 Outreach
  - 1 Groups
  - 1 Giving
  - 1 Prayer

---

## 6. service_plan.csv

**Format:**
```csv
plan_id,tenant_id,service_date,service_time,title,status,item_id,position,type,item_title,duration_minutes,ccli_number,notes,speaker
service-plan-1,00000000-0000-0000-0000-000000000001,2025-11-17,10:00 AM,Sunday Morning Worship,draft,item-1,1,song,Amazing Grace,5,22025,"Key of G, verses 1-4",
service-plan-1,00000000-0000-0000-0000-000000000001,2025-11-17,10:00 AM,Sunday Morning Worship,draft,item-2,2,song,How Great Thou Art,5,14181,"Key of C, all verses",
service-plan-1,00000000-0000-0000-0000-000000000001,2025-11-17,10:00 AM,Sunday Morning Worship,draft,item-3,3,reading,Psalm 23,3,,"Read by Elder Smith",
service-plan-1,00000000-0000-0000-0000-000000000001,2025-11-17,10:00 AM,Sunday Morning Worship,draft,item-4,4,sermon,Living with Purpose,30,,"Part 1 of new series",Pastor Johnson
service-plan-1,00000000-0000-0000-0000-000000000001,2025-11-17,10:00 AM,Sunday Morning Worship,draft,item-5,5,song,Blessed Assurance,4,22324,"Key of D, verses 1 & 3",
```

**Sample Data:** 5 service items
- **3 Songs with CCLI numbers:**
  1. Amazing Grace (CCLI #22025)
  2. How Great Thou Art (CCLI #14181)
  3. Blessed Assurance (CCLI #22324)
- **1 Reading:**
  - Psalm 23
- **1 Sermon:**
  - Living with Purpose (30 minutes)

---

## 7. brand_pack.csv

**Format:**
```csv
id,tenant_id,name,is_active,logo_url,primary_color,secondary_color,accent_color,text_color,background_color,font_family,font_headline,created_at
brandpack-1,00000000-0000-0000-0000-000000000001,Default Brand,true,https://via.placeholder.com/300x150/2563eb/ffffff?text=First+Community+Church,#2563eb,#dc2626,#059669,#1a1a1a,#ffffff,"Georgia, serif","Arial, sans-serif",2025-11-14T00:00:00Z
```

**Sample Data:** 1 row
- **Logo:** Placeholder image (300x150, blue background)
- **Colors:**
  - Primary: #2563eb (Blue)
  - Secondary: #dc2626 (Red)
  - Accent: #059669 (Green)
- **Fonts:**
  - Body: Georgia, serif
  - Headlines: Arial, sans-serif

---

## Usage

### Import via Seed Script

```bash
# Run TypeScript seed script (recommended)
npm run db:seed

# Or with custom tenant ID
SEED_TENANT_ID=your-tenant-id npm run db:seed
```

### Manual Import (CSV)

**For Planning Center Import Testing:**
1. Extract `P17_csvs.zip`
2. Use `service_plan.csv` to test Planning Center importer
3. Verify 3 songs have CCLI numbers
4. Verify import creates ServicePlan + 5 ServiceItems

**For ICS Import Testing:**
1. Convert `events.csv` to ICS format
2. Test ICS importer
3. Verify recurring events handled correctly

---

## Data Validation

After seeding, verify:

- [ ] 50 people exist
- [ ] 20 households exist
- [ ] People linked to correct households
- [ ] 6 groups exist with leaders
- [ ] 12 events in next 30 days
- [ ] 12 announcements with various priorities
- [ ] 1 service plan with 5 items
- [ ] 3 songs have CCLI numbers (22025, 14181, 22324)
- [ ] 1 brand pack exists

---

## SQL Verification Queries

```sql
-- Count people
SELECT COUNT(*) FROM Person WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
-- Expected: 50

-- Count households
SELECT COUNT(*) FROM Household WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
-- Expected: 20

-- Count groups
SELECT COUNT(*) FROM "Group" WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
-- Expected: 6

-- Count events
SELECT COUNT(*) FROM Event WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
-- Expected: 12

-- Count announcements
SELECT COUNT(*) FROM Announcement WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
-- Expected: 12

-- Verify service plan with CCLI numbers
SELECT
  sp.title AS plan_title,
  si.position,
  si.type,
  si.title AS item_title,
  si.ccli_number
FROM ServicePlan sp
JOIN ServiceItem si ON si.service_plan_id = sp.id
WHERE sp.id = 'service-plan-1'
ORDER BY si.position;
-- Expected: 5 rows, 3 with CCLI numbers
```

---

## Notes

- All dates are relative to current date (uses `addDays`, `nextSunday`)
- Tenant ID defaults to `00000000-0000-0000-0000-000000000001`
- Email addresses are example.com (not real)
- Phone numbers are (555) format (not real)
- CCLI numbers are real/valid song numbers:
  - 22025 = Amazing Grace
  - 14181 = How Great Thou Art
  - 22324 = Blessed Assurance

---

**Artifact:** `P17_csvs_README.md`
**Version:** 1.0
**Date:** 2025-11-14
**Note:** Actual CSV files would be generated from P17_seed.ts
