# Service Analytics Dashboard

The Service Analytics Dashboard provides aggregated timing insights across services, allowing staff to analyze patterns by preacher, sermon series, and service time.

## Overview

When Preach Mode is used during a service, timing data is automatically captured for each service item. The Service Analytics Dashboard aggregates this data to answer questions like:

- "Do we systematically run over/under for this preacher?"
- "How does this sermon series behave vs planned?"
- "Is the 11am service always longer than planned vs the 9am?"

## Data Captured

### Preach Sessions

Each time someone enters Preach Mode and navigates through the service, a **preach_session** is created:

| Field | Description |
|-------|-------------|
| `id` | Unique session identifier |
| `bulletin_issue_id` | Which bulletin this session is for |
| `started_at` | When Preach Mode was entered |
| `ended_at` | When Preach Mode was exited |
| `created_by_user_id` | Who started the session |

### Item Timings

For each service item visited during a session, timing is recorded in **service_item_timing**:

| Field | Description |
|-------|-------------|
| `preach_session_id` | Which session this timing belongs to |
| `service_item_id` | Which service item was timed |
| `started_at` | When the presenter moved to this item |
| `ended_at` | When the presenter moved away |
| `duration_seconds` | Computed actual duration |

## Accessing the Dashboard

Navigate to: `/analytics/services`

**Required Role:** Admin or Editor

## Dashboard Features

### Date Range Filter

By default, the dashboard shows the last 90 days. You can adjust:
- **From date:** Start of the analysis period
- **To date:** End of the analysis period

### Filter Options

Narrow the data using optional filters:
- **Series:** Filter to a specific sermon series
- **Preacher:** Filter to a specific preacher
- **Service Time:** Filter to a specific service slot (e.g., 09:00, 11:00)

### Summary Cards

At the top, four cards show aggregate statistics:
- **Sessions:** Total completed Preach Mode sessions
- **Avg Planned:** Average planned service duration
- **Avg Actual:** Average actual service duration
- **Avg Delta:** Average difference (positive = over time)

### Stats Tables

Three tables show breakdowns by category:

#### By Preacher
Shows statistics grouped by preacher:
- Preacher name
- Number of sessions
- Average planned duration
- Average actual duration
- Average delta (color-coded)

#### By Series
Shows statistics grouped by sermon series:
- Series name
- Number of sessions
- Average planned/actual/delta

#### By Service Time
Shows statistics grouped by service slot:
- Service time (e.g., "09:00 Service")
- Number of sessions
- Average planned/actual/delta

### Detail Drill-Down

Click any row in the stats tables to see a list of matching sessions:

| Column | Description |
|--------|-------------|
| Date | Service date |
| Service | Service time slot |
| Series / Sermon | Series and sermon title |
| Preacher | Who preached |
| Planned | Planned total duration |
| Actual | Actual total duration |
| Delta | Difference (color-coded) |
| Actions | Link to bulletin analytics |

## Interpreting the Data

### Delta Color Coding

- **Green:** Under time or on time
- **Amber:** Slightly over time (1-5 minutes)
- **Red:** Significantly over time (>5 minutes)

### What the Numbers Mean

**Avg Planned** is calculated from `duration_minutes` set on each service item in the Service Order.

**Avg Actual** is calculated from the actual time spent on each item as recorded by Preach Mode.

**Avg Delta** = Actual - Planned
- Positive delta: Running over time
- Negative delta: Running under time
- Zero: On time

### Limitations

1. **Only Preach Mode services:** Analytics only include services where Preach Mode was used
2. **Requires completed sessions:** Only includes sessions where the user exited properly
3. **Sermon data required:** Preacher/series stats only work for services with linked sermons
4. **Duration estimates:** Service items must have `duration_minutes` set for meaningful comparisons

## Cross-Navigation

### From Bulletin Analytics

Each bulletin's analytics page (`/bulletins/[id]/analytics`) has an "All Services" button that links to the global dashboard.

### From Service Analytics

In the detail view, each session row has a "View Details" link that opens the specific bulletin's analytics page.

## API Endpoints

The analytics router provides these read-only endpoints:

| Endpoint | Description |
|----------|-------------|
| `analytics.getOverview` | Overall stats for the filtered period |
| `analytics.getPreacherStats` | Stats grouped by preacher |
| `analytics.getSeriesStats` | Stats grouped by series |
| `analytics.getServiceTimeStats` | Stats grouped by service time slot |
| `analytics.getDetailForFilter` | Session list for a specific filter |
| `analytics.getPreachers` | List of preachers for dropdown |
| `analytics.getSeries` | List of series for dropdown |
| `analytics.getServiceSlots` | List of service slots for dropdown |

All endpoints respect tenant isolation via RLS policies.

## Database Indexes

Performance indexes support analytics queries:

| Index | Purpose |
|-------|---------|
| `idx_preach_session_tenant_ended_at` | Completed sessions by tenant |
| `idx_preach_session_started_at` | Service slot grouping |
| `idx_sermon_tenant_preacher` | Preacher analytics |
| `idx_sermon_tenant_series` | Series analytics |
| `idx_bulletin_issue_tenant_date` | Date range queries |
| `idx_service_item_tenant_date_sermon` | Sermon timing queries |

## Manual Testing Checklist

### Prerequisites
1. Have at least 2-3 bulletins with service items that have `duration_minutes` set
2. Have at least one sermon linked with preacher and series
3. Have completed multiple Preach Mode sessions at different times

### Test Steps

1. **Run test services:**
   - Open a bulletin and enter Preach Mode
   - Navigate through all items (wait a few seconds on each)
   - Exit properly to complete the session
   - Repeat for different service times (e.g., 9am, 11am)

2. **Check session recording:**
   - Go to `/bulletins/[id]/analytics`
   - Verify sessions appear in the list
   - Verify timing data shows for each item

3. **Test global analytics:**
   - Navigate to `/analytics/services`
   - Verify summary cards show correct totals
   - Check preacher table shows your test preacher
   - Check series table shows your test series
   - Check service time table shows your test times

4. **Test filtering:**
   - Change date range and verify stats update
   - Select a preacher filter and verify only matching data shows
   - Select a series filter and verify filtering works
   - Select a service time and verify filtering works

5. **Test drill-down:**
   - Click a row in any stats table
   - Verify detail view shows matching sessions
   - Click "View Details" on a session
   - Verify navigation to bulletin analytics works

6. **Test cross-navigation:**
   - From bulletin analytics, click "All Services"
   - Verify navigation to global dashboard works

## Related Documentation

- [Preach Mode](./PREACH-MODE.md) - How timing data is captured
- [Service Order](../service-order.md) - Setting up service items with durations
