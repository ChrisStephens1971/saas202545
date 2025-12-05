# Preach Mode (Run Service) Implementation

This document describes the Preach Mode feature that provides a full-screen presenter view for running church services live.

## Overview

Preach Mode transforms the bulletin's service items into a live presenter interface:

- **Full-screen dark mode UI** optimized for projection/presentation
- **Current item display** with all details prominently shown
- **Next item preview** for planning ahead
- **Keyboard navigation** for hands-free operation
- **Item list sidebar** for quick jumping to any item
- **Read-only mode** - no editing capability to prevent accidents
- **Slide control integration** - track and navigate slides for each item
- **Mobile companion view** - access from phone via QR code
- **Resilient offline-ish behavior** - fetch-once with graceful error handling
- **Change detection** - non-intrusive banner when service order updates
- **Duration indicator** - shows planned time through current item
- **Exit confirmation** - prevents accidental exits during service
- **Live timing** - records actual time per service item
- **Analytics view** - compare planned vs actual durations per session

## Routes

**Desktop:** `/bulletins/[id]/preach`
**Mobile:** `/bulletins/[id]/preach/mobile`
**Analytics:** `/bulletins/[id]/analytics`

**Entry Point:** "Preach Mode" button on bulletin detail page header

## Features

### Current Item Display

The current service item is displayed prominently with:
- Type icon and type label
- Title (large, bold)
- Section badge (if assigned)
- **Slide control panel** (if item has slides configured)
- Scripture reference (if applicable)
- Speaker name (if applicable)
- Artist (if applicable)
- Song title / Hymn number (if applicable)
- CCLI number (if applicable)
- Duration
- Content text (if any)
- Internal notes (highlighted in amber for visibility)

### Slide Control Panel

When a service item has `slidesCount > 0`, a slide control panel appears:
- **Slide indicator**: "Slide X of N" display
- **Previous Slide button**: Disabled at slide 1
- **Next Slide button**: Disabled at last slide
- **Auto-reset**: Slide index resets to 1 when navigating to a new item
- Styled in indigo to differentiate from item navigation controls

### Next Item Preview

Shows the upcoming item below the current item:
- Type icon
- Title
- Type label

### Navigation Controls

**Buttons:**
- Previous (disabled at first item)
- Next (large, primary button - disabled at last item)

**Keyboard Shortcuts:**
| Key | Action |
|-----|--------|
| `→` / `↓` / `Space` | Next item |
| `←` / `↑` | Previous item |
| `Home` | Jump to first item |
| `End` | Jump to last item |
| `PageDown` / `s` | Next slide (when item has slides) |
| `PageUp` / `S` | Previous slide (when item has slides) |
| `L` | Toggle item list sidebar |
| `Q` | Toggle QR code / mobile view modal |
| `Escape` | Show exit confirmation dialog |

**Exit Confirmation Dialog:**
| Key | Action |
|-----|--------|
| `Enter` / `Y` / `y` | Confirm exit |
| `Escape` / `N` / `n` | Cancel and stay |

### Item List Sidebar

Toggleable sidebar showing all service items with section grouping:
- **Section headers** - Sticky headers with section icon and name
- Item number
- Type icon
- Title
- Duration (if set)
- Current item highlighted
- Click any item to jump directly to it
- Total duration shown in header (if items have durations)

### Progress & Duration Indicators

Header shows:
- **Item progress**: "X of Y" (e.g., "3 of 12")
- **Duration indicator**: "X / Y min" showing planned time through current item vs total
- **Lock status badge**: "Locked" badge when bulletin is locked
- **Stale badge**: "Stale" badge when using cached data after dismissing updates

### QR Code / Open on Mobile

A mobile phone button in the header opens a modal with:
- **QR Code**: Scan with phone camera to open mobile view
- **Direct link**: "Open in new tab" link
- **Note**: Sign-in required on mobile device (no anonymous access)

Press `Q` to toggle the modal.

### Mobile Companion View

**Route:** `/bulletins/[id]/preach/mobile`

A mobile-optimized version of Preach Mode designed for phones:

**Features:**
- Compact header with church name and service date
- Full-screen item list (toggleable) with section grouping
- Large touch-friendly navigation buttons
- Slide control panel (same as desktop)
- Same authentication requirements as desktop
- Same resilience and change detection as desktop
- Compact duration indicator (X/Ym format)
- Locked badge when applicable

**Use Cases:**
- Stage manager following along on phone
- Worship leader checking next item
- Tech team member monitoring service flow
- Second device for personal reference

**Security:**
- Same authentication required as desktop Preach Mode
- No anonymous or token-based access
- User must be logged in on mobile device
- Same tenant isolation via RLS

### Resilience & Offline Behavior

Preach Mode is designed to be resilient during live services:

**Fetch-Once Pattern:**
- Service items are fetched once on initial load
- Data is stored in stable local state (`stableItems`)
- UI always uses stable state, not live API data
- Prevents mid-service disruption from network issues

**Lock-Aware Refetching:**
- **Locked bulletins**: No automatic refetching (service is immutable)
- **Unlocked bulletins**: Background refetch every 60 seconds
- Never refetches on window focus (prevents disruption)

**Connection Status:**
- Shows "Offline - using cached data" banner if network fails after initial load
- Service continues normally using cached items
- Retry button on initial load failure

**Error Handling:**
- Initial load failure shows error with Retry button
- Background failures show amber warning banner
- Never crashes or shows empty state after successful initial load

### Change Detection (Unlocked Bulletins)

For bulletins not yet locked, Preach Mode detects when the service order has been updated elsewhere:

**Detection Methods:**
- Compares bulletin `updatedAt` timestamps
- Compares item count changes
- Compares item ID ordering

**User Experience:**
- Non-intrusive blue banner: "Service order has been updated"
- "Reload now" button to apply changes
- "Dismiss" button to continue with current data (shows "Stale" badge)
- Reload maintains current position by item ID when possible

**Why This Matters:**
- Allows last-minute changes before service starts
- Presenter decides when to apply updates
- No surprise reordering mid-presentation

### Exit Confirmation

Pressing Escape or clicking the X button shows a confirmation dialog:
- Prevents accidental exits during live service
- Keyboard shortcuts: Y/Enter to confirm, N/Escape to cancel
- Click buttons: "Stay (N)" or "Exit (Y)"

## Data Integration

### API Endpoints Used

Preach Mode uses existing endpoints (no new API changes required):

- **`bulletins.get`** - Fetch bulletin metadata (service date)
- **`serviceItems.list`** - Fetch all service items for the bulletin
- **`org.get`** - Fetch organization name for header

### Service Item Fields Displayed

All existing service item fields are supported:
- `type` - Service item type (Welcome, Song, Prayer, etc.)
- `title` - Item title
- `content` - Description/content text
- `scriptureRef` - Scripture reference
- `speaker` - Speaker name
- `artist` - Song artist
- `songTitle` - Song title
- `songHymnNumber` - Hymn number
- `songCcliNumber` / `ccliNumber` - CCLI license number
- `durationMinutes` - Estimated duration
- `section` - Section grouping (pre-service, worship, message, etc.)
- `notes` - Internal notes (prominently displayed in Preach Mode)
- `slidesCount` - Number of presentation slides (enables slide control panel)

## UI Components

### Page Component

**Location:** `apps/web/src/app/bulletins/[id]/preach/page.tsx`

**Structure:**
```
<ProtectedPage>
  <ConnectionBanner /> (conditional - offline warning)
  <ChangesBanner /> (conditional - updates available)
  <Header>
    - Exit button (X) → triggers confirmation
    - Church name & service date
    - Lock status badge (conditional)
    - Stale badge (conditional)
    - Duration indicator (X / Y min)
    - Progress indicator (X of Y)
    - Mobile QR button
    - Item list toggle
  </Header>
  <Main>
    <CurrentItemCard>
      - Section badge
      - Type icon & title
      - Slide control panel (conditional)
      - Item details
      - Notes
    </CurrentItemCard>
    <NavigationControls />
    <NextItemPreview />
  </Main>
  <ItemListSidebar /> (conditional, with section grouping)
  <ExitConfirmModal /> (conditional)
  <QRCodeModal /> (conditional)
  <Footer>
    - Keyboard hints
  </Footer>
</ProtectedPage>
```

### Icon Mappings

**Service Item Type Icons:**
| Type | Icon |
|------|------|
| Welcome | 👋 |
| CallToWorship | 🙌 |
| Song | 🎵 |
| Prayer | 🙏 |
| Scripture | 📖 |
| Sermon | 🎤 |
| Offering | 💝 |
| Communion | 🍞 |
| Benediction | ✨ |
| Announcement | 📢 |
| Event | 📅 |
| Heading | 📌 |
| Other | 📋 |

**Section Icons:**
| Section | Icon |
|---------|------|
| pre-service | 🕐 |
| worship | 🎵 |
| message | 📖 |
| response | 🙏 |
| closing | 👋 |
| announcements | 📢 |
| other | 📋 |

## Security & Permissions

### Authentication

Uses `ProtectedPage` component with roles: `['admin', 'editor', 'submitter', 'viewer']`

This means:
- All authenticated users with a tenant role can access Preach Mode
- Kiosk users are NOT granted access
- Unauthenticated users are redirected to login

### Tenant Isolation

- Bulletin must belong to user's current tenant
- Service items are filtered by tenant via existing RLS policies
- No cross-tenant access possible

### Read-Only Mode

Preach Mode is completely read-only:
- No edit buttons or forms
- No mutation endpoints called
- No state changes to bulletin or service items
- Safe to use during live service

## Testing

### Unit Tests

**Location:** `apps/api/src/__tests__/preachMode.test.ts`

**Test Coverage (148 tests):**

1. **Navigation Logic**
   - goToNext boundary handling
   - goToPrev boundary handling
   - Single item list handling

2. **Item Access**
   - getCurrentItem for all positions
   - getNextItem availability
   - getPrevItem availability

3. **Keyboard Navigation**
   - All key bindings (Arrow keys, Space, Home, End)
   - Boundary prevention
   - Unrecognized key handling

4. **Icon Mapping**
   - All 13 type icons
   - All 7 section icons
   - Null/undefined handling
   - Default fallback icon

5. **Section Label Formatting**
   - Capitalization
   - Hyphen replacement

6. **Current Item Rendering**
   - Required fields
   - Optional fields (song, scripture, sermon specific)

7. **Edge Cases**
   - Empty items list
   - Single item list
   - Items without optional fields

8. **Slide Navigation**
   - goToNextSlide / goToPrevSlide boundaries
   - hasSlides detection (null, 0, positive values)
   - Slide keyboard shortcuts (PageUp/PageDown, s/S)
   - Slide progress formatting
   - Auto-reset on item change

9. **Mobile View**
   - Mobile URL generation
   - Same auth requirements
   - No kiosk access

10. **QR Code Feature**
    - QR URL generation
    - Q key toggle

11. **Duration Calculations** (NEW)
    - Total planned minutes
    - Duration through current item
    - Items without duration
    - Empty items array

12. **Section Grouping** (NEW)
    - Groups items by section
    - Preserves original indices
    - Handles items without section
    - Mixed section/no-section items
    - Section display names

13. **Lock Detection** (NEW)
    - Status-based lock detection
    - lockedAt-based detection
    - Null bulletin handling

14. **Change Detection** (NEW)
    - Item count changes
    - Item ID changes
    - Reordering detection
    - Position maintenance after reload

15. **Exit Confirmation** (NEW)
    - Keyboard shortcuts (Y/N/Enter/Escape)
    - Escape triggers dialog (not immediate exit)

16. **Resilience** (NEW)
    - Stable items after initial load
    - Lock-aware refetch behavior
    - Connection status handling

17. **Route Protection** (NEW)
    - Required roles verification
    - Kiosk role exclusion
    - ProtectedPage usage

**Run tests:**
```bash
cd apps/api
npm test -- --testPathPattern=preachMode.test
```

### Manual Testing Checklist

1. **Access Preach Mode**
   - [ ] Navigate to `/bulletins/{id}`
   - [ ] Click "Preach Mode" button
   - [ ] Verify full-screen dark UI loads

2. **Navigation**
   - [ ] Click Next button to advance
   - [ ] Click Previous button to go back
   - [ ] Verify buttons disable at boundaries
   - [ ] Press Arrow Right to advance
   - [ ] Press Arrow Left to go back
   - [ ] Press Space to advance
   - [ ] Press Home to go to first item
   - [ ] Press End to go to last item

3. **Item List**
   - [ ] Press L to show sidebar
   - [ ] Click any item to jump to it
   - [ ] Verify current item is highlighted
   - [ ] Press L again to hide sidebar

4. **Content Display**
   - [ ] Verify type icon displays correctly
   - [ ] Verify title displays prominently
   - [ ] Verify section badge shows (if set)
   - [ ] Verify all applicable fields display (scripture, speaker, etc.)
   - [ ] Verify notes display in amber highlight

5. **Exit Confirmation**
   - [ ] Press Escape - verify confirmation dialog appears
   - [ ] In dialog, press N or Escape - verify stays in Preach Mode
   - [ ] Press Escape again, then Y or Enter - verify exits
   - [ ] Click X button - verify confirmation dialog appears
   - [ ] Click "Stay (N)" - verify stays in Preach Mode
   - [ ] Click "Exit (Y)" - verify returns to bulletin detail page

6. **Slide Control**
   - [ ] Add slides count to a service item (Song, Scripture, or Sermon)
   - [ ] Verify slide panel appears in Preach Mode
   - [ ] Click Next Slide and Previous Slide buttons
   - [ ] Verify buttons disable at boundaries
   - [ ] Press PageDown to advance slide
   - [ ] Press PageUp to go back
   - [ ] Navigate to next item, verify slide resets to 1
   - [ ] Return to item with slides, verify still at slide 1

7. **Mobile View & QR Code**
   - [ ] Press Q to open QR code modal
   - [ ] Verify QR code displays
   - [ ] Click "Open in new tab" link
   - [ ] Verify mobile view loads
   - [ ] Test navigation on mobile view
   - [ ] Test slide controls on mobile view
   - [ ] Toggle item list on mobile

8. **Security**
   - [ ] Log out and try to access Preach Mode URL directly
   - [ ] Verify redirect to login
   - [ ] Log out and try to access mobile Preach Mode URL directly
   - [ ] Verify redirect to login
   - [ ] Try accessing another tenant's bulletin
   - [ ] Verify error/not found response

9. **Duration Indicator**
   - [ ] Add durations to multiple service items
   - [ ] Verify duration indicator shows in header (X / Y min)
   - [ ] Navigate through items, verify "through current" updates
   - [ ] Verify total duration shown in sidebar header

10. **Section Grouping**
    - [ ] Add sections to service items
    - [ ] Open item list sidebar (L key)
    - [ ] Verify sticky section headers appear
    - [ ] Verify section icons and names display correctly
    - [ ] Scroll list, verify headers stay visible

11. **Lock Status & Badges**
    - [ ] View locked bulletin - verify "Locked" badge in header
    - [ ] Verify no auto-refetch for locked bulletins
    - [ ] View unlocked bulletin - verify no badge

12. **Resilience & Offline**
    - [ ] Load Preach Mode successfully
    - [ ] Disconnect network (airplane mode)
    - [ ] Verify navigation still works with cached data
    - [ ] Verify amber "Offline" banner appears
    - [ ] Reconnect network

13. **Change Detection (Unlocked Only)**
    - [ ] Open Preach Mode for unlocked bulletin
    - [ ] In another tab, edit service order
    - [ ] Wait up to 60 seconds
    - [ ] Verify blue "Updated" banner appears
    - [ ] Click "Reload now" - verify items update
    - [ ] OR click "Dismiss" - verify "Stale" badge appears
    - [ ] Navigate items - verify position maintained

## Files

### New Files
- `apps/web/src/app/bulletins/[id]/preach/page.tsx` - Desktop Preach Mode page component
- `apps/web/src/app/bulletins/[id]/preach/mobile/page.tsx` - Mobile Preach Mode page component
- `apps/web/src/app/bulletins/[id]/analytics/page.tsx` - Timing analytics page
- `apps/api/src/routers/preach.ts` - Preach timing TRPC router
- `apps/api/src/__tests__/preachMode.test.ts` - Preach Mode test suite (148 tests)
- `apps/api/src/__tests__/preachTiming.test.ts` - Preach timing test suite (46 tests)
- `packages/database/migrations/032_add_slides_count_to_service_item.sql` - Slides count migration
- `packages/database/migrations/033_add_preach_timing_tables.sql` - Timing tables migration
- `docs/bulletins/PREACH-MODE.md` - This documentation

### Modified Files
- `apps/web/src/app/bulletins/[id]/page.tsx` - Added "Preach Mode" button to header
- `apps/web/src/components/bulletins/ServiceOrderPanel.tsx` - Added slides count editing
- `apps/api/src/routers/serviceItems.ts` - Added slidesCount to TRPC types and endpoints
- `apps/api/src/routers/index.ts` - Added preach router

## Usage Example

1. Create a bulletin with service items
2. Add slide counts to items (Songs, Scriptures, Sermons) that have presentation slides
3. Optionally add durations, sections, and notes to items
4. Navigate to bulletin detail page
5. Click "Preach Mode" button
6. Press Q to show QR code, scan with phone to open mobile companion view
7. Use during service to guide worship leaders through the order of service
8. Navigate items using buttons or keyboard (Arrow keys, Space)
9. Navigate slides using PageUp/PageDown or s/S keys
10. Press Escape to exit when done

## Design Decisions

### Dark Mode Only
- Dark UI reduces eye strain during projection
- High contrast text improves readability
- Consistent with other presenter applications

### Large Touch Targets
- Next button is extra large for easy clicking
- Item list has generous padding
- Suitable for touch screen operation

### Keyboard-First Navigation
- Designed for hands-free operation
- Presenter clicker compatibility (sends arrow keys)
- All functions accessible via keyboard

### Notes Prominence
- Internal notes are highlighted in amber
- Not hidden - actively surfaced during service
- Helps worship leaders remember important details

## Live Timing & Sessions

Preach Mode now includes live timing and analytics capabilities:

### Session Management

Each time Preach Mode is opened, a new **preach session** is created:
- Session tracks start and end times
- Multiple sessions per bulletin (e.g., 9am and 11am services)
- Sessions are automatically created when entering Preach Mode
- Sessions are ended when user confirms exit

### Timing Recording

As the presenter moves through service items, timing is recorded:
- **Item Start**: When an item becomes the current item
- **Item End**: When moving to the next item
- **Duration**: Automatically computed (end - start)

**Important Notes:**
- Timing is **best-effort and non-blocking**
- API failures do NOT disrupt Preach Mode navigation
- Timing calls are fire-and-forget
- Multiple calls for same item are idempotent

### Recording Indicator

A subtle "REC" badge appears in the header when timing is active:
- Red dot with pulse animation
- Tooltip: "Recording timing data"
- Indicates session is tracking time

### Analytics Page

View timing analytics at `/bulletins/[id]/analytics`:

**Session List:**
- All recorded sessions for the bulletin
- Start time, item count, total duration
- "In Progress" badge for active sessions

**Session Detail:**
- Summary cards: Planned vs Actual vs Difference
- Item-by-item breakdown table
- Columns: Item, Planned, Actual, Difference
- Color-coded differences (green = under, amber = over)
- Session metadata (start, end, duration)

### API Endpoints

New TRPC router: `preach`

| Endpoint | Description |
|----------|-------------|
| `preach.startSession` | Create new preach session |
| `preach.endSession` | Mark session as ended |
| `preach.recordItemTiming` | Record start/end for item |
| `preach.getSessionSummary` | Get detailed session with timings |
| `preach.listSessions` | List all sessions for bulletin |

### Database Schema

Two new tables with RLS enabled:

**`preach_session`:**
- `id` (UUID, PK)
- `tenant_id` (FK → tenant)
- `bulletin_issue_id` (FK → bulletin_issue)
- `started_at` (TIMESTAMPTZ)
- `ended_at` (TIMESTAMPTZ, nullable)
- `created_by_user_id` (VARCHAR)

**`service_item_timing`:**
- `id` (UUID, PK)
- `tenant_id` (FK → tenant)
- `preach_session_id` (FK → preach_session)
- `service_item_id` (FK → service_item)
- `started_at` (TIMESTAMPTZ)
- `ended_at` (TIMESTAMPTZ)
- `duration_seconds` (INTEGER, auto-computed)
- Unique constraint: (preach_session_id, service_item_id)

### Security

- Same authentication as Preach Mode (admin, editor, submitter, viewer)
- Kiosk excluded
- Tenant isolation via RLS policies
- Sessions can only be accessed by same tenant

### Testing

**Test file:** `apps/api/src/__tests__/preachTiming.test.ts`

**Coverage (46 tests):**
- Session management (start, end, idempotency)
- Item timing recording (start, end events)
- Duration calculations
- Totals aggregation
- Formatting helpers
- Tenant isolation
- Integration scenarios
- API response formats

### Manual Testing Checklist (Timing)

1. **Session Recording**
   - [ ] Enter Preach Mode
   - [ ] Verify "REC" badge appears in header
   - [ ] Navigate through several items
   - [ ] Exit Preach Mode (confirm)
   - [ ] Re-enter Preach Mode (new session)

2. **Analytics View**
   - [ ] Navigate to `/bulletins/{id}/analytics`
   - [ ] Verify session list shows recorded sessions
   - [ ] Click a session to view details
   - [ ] Verify item timings are displayed
   - [ ] Check planned vs actual calculations

3. **Data Accuracy**
   - [ ] Note actual time spent on items
   - [ ] Compare to analytics report
   - [ ] Verify totals are correct

## Future Enhancements

Potential improvements for future iterations:

1. **Timer Integration**
   - Running clock showing elapsed time per item
   - Service end time projection
   - Countdown timer for each item

2. **Synchronized Remote Control**
   - WebSocket sync between desktop and mobile views
   - Real-time navigation state sharing
   - Multiple devices stay in sync

3. **Presentation Mode**
   - Output to second screen/projector
   - Lyrics display for songs

4. **Voice Commands**
   - "Next" / "Previous" voice navigation
   - Accessibility improvement

5. **True Offline Support**
   - Service Worker for complete offline capability
   - Pre-cache service items before service starts
   - *(Current version has offline-ish resilience - continues working with cached data if network fails)*

6. **External Presentation Integration**
   - ProPresenter API integration
   - Actual slide advancement (not just tracking)

## Completed Enhancements (v2)

These features were added in the hardening update:

1. **Resilience/Offline Behavior** - Fetch-once pattern with stable local state
2. **Change Detection** - Non-intrusive banner for unlocked bulletin updates
3. **Exit Confirmation** - Prevents accidental exits with Y/N dialog
4. **Duration Indicator** - Shows planned time through current item
5. **Section Grouping** - Sidebar groups items by section with sticky headers
6. **Lock-Aware Refetching** - Locked bulletins never auto-refetch

## Completed Enhancements (v3)

These features were added in the Live Timing & Analytics update:

1. **Live Timing** - Automatically records actual time per service item
2. **Session Management** - Tracks separate sessions for each service (9am, 11am, etc.)
3. **Analytics Page** - View planned vs actual duration comparison
4. **Recording Indicator** - "REC" badge shows when timing is active
5. **Non-Blocking API** - Timing calls never disrupt Preach Mode navigation
6. **Idempotent Recording** - Safe for duplicate calls and network retries
7. **Duration Computation** - Automatic calculation via database trigger

## Analytics Integration

Using Preach Mode automatically feeds the Service Analytics Dashboard, which provides aggregated insights across multiple services.

### How It Works

1. When you enter Preach Mode, a **preach session** is created
2. As you navigate through items, **timing data** is recorded
3. When you exit, the session is marked complete
4. This data feeds into the **Service Analytics Dashboard**

### Service Analytics Dashboard

Navigate to: `/analytics/services`

The dashboard aggregates timing data to answer questions like:

- "Does Pastor John consistently run over?" (By Preacher)
- "How does the Advent series compare to others?" (By Series)
- "Is the 11am service always longer than 9am?" (By Service Time)

### Cross-Navigation

- **From Bulletin Analytics:** Click "All Services" to view global analytics
- **From Service Analytics:** Click "View Details" on any session row to see bulletin-level breakdown

### What Gets Captured

| Data | Source |
|------|--------|
| Preacher | `sermon.preacher` field |
| Series | `sermon.series_id` → `sermon_series.title` |
| Service Time | Derived from `preach_session.started_at` hour |
| Planned Duration | Sum of `service_item.duration_minutes` |
| Actual Duration | Sum of `service_item_timing.duration_seconds` |

### Requirements for Full Analytics

For analytics to work fully:

1. **Use Preach Mode** - Timing only captured when Preach Mode is used
2. **Exit properly** - Use the exit button or Escape key to end sessions
3. **Link sermons** - Set `sermon_id` on Sermon service items for preacher/series tracking
4. **Set durations** - Add `duration_minutes` to service items for planned comparisons

### Learn More

See [Service Analytics](./SERVICE-ANALYTICS.md) for complete dashboard documentation.
