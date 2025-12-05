# Bulletin Generator

The Bulletin Generator is the **recommended weekly workflow** for creating church bulletins. It uses a data-driven approach with a fixed 4-page "classic" layout that automatically populates content from your service plan, announcements, and events.

## Overview

### What is the Bulletin Generator?

The Generator is a layout engine that:

- **Automatically pulls content** from your service items, sermons, announcements, and events
- Supports **two layout modes**: Classic (4-page) and Simple Text (2-page traditional liturgy)
- Provides **preflight validation** to catch errors before printing
- Generates **print-ready PDFs** in flat or booklet format

### When to Use Generator vs Canvas

| Use Case | Recommended Layout |
|----------|-------------------|
| Weekly Sunday bulletin | **Generator (Classic)** |
| Traditional liturgy with responsive readings | **Generator (Simple Text)** |
| Regular midweek service | **Generator (Classic)** |
| Presbyterian/Reformed worship | **Generator (Simple Text)** |
| Easter service | Canvas |
| Christmas Eve service | Canvas |
| Special events (revivals, concerts) | Canvas |
| Memorial services | Canvas |

**Rule of thumb:** If the bulletin will look similar each week with updated content, use the Generator. If you need full creative control for a one-time special service, use Canvas.

### Layout Modes

The Generator supports two layout modes:

| Layout Mode | Description | Best For |
|-------------|-------------|----------|
| **Classic (4-Page)** | Standard booklet with cover, service order, sermon/announcements, events | Contemporary/evangelical churches |
| **Simple Text (2-Page)** | Traditional liturgy with printed text for responsive readings | Traditional/liturgical churches |

Switch between modes using the **Layout** dropdown in the Generator toolbar.

## How It Works

### 1. Content Sources

The Generator pulls content from these sources:

| Content | Source | Page |
|---------|--------|------|
| Church name, logo, address | Organization Settings (Brand Pack) | 1 (Cover) |
| Service date & label | Bulletin issue | 1 (Cover) |
| Order of service | Service Items linked to bulletin | 2 |
| Sermon title, preacher, scripture | Service Item type "sermon" | 3 |
| Announcements | Active announcements (not expired) | 3 |
| Upcoming events | Events within 7 days of service date | 4 (Back) |
| Contact info | Organization Settings | 4 (Back) |
| Giving info | Organization Settings | 4 (Back) |

### 2. The 4-Page Layout

The "classic" layout organizes content across 4 pages:

```
┌─────────────┐  ┌─────────────┐
│   PAGE 1    │  │   PAGE 2    │
│             │  │             │
│    COVER    │  │   ORDER OF  │
│  - Logo     │  │   SERVICE   │
│  - Church   │  │  - Songs    │
│  - Date     │  │  - Prayers  │
│  - Time     │  │  - Scripture│
│             │  │  - Sermon   │
└─────────────┘  └─────────────┘

┌─────────────┐  ┌─────────────┐
│   PAGE 3    │  │   PAGE 4    │
│             │  │             │
│   SERMON &  │  │   EVENTS &  │
│ANNOUNCEMENTS│  │   CONTACT   │
│             │  │             │
│  - Sermon   │  │  - Events   │
│  - Ann. 1   │  │  - Contact  │
│  - Ann. 2   │  │  - Giving   │
│  - ...      │  │  - QR Code  │
└─────────────┘  └─────────────┘
```

### 3. Booklet Printing

When printed as a booklet, pages are imposed (rearranged) for folding:

**Front sheet (landscape):**
```
┌─────────────────────────────┐
│    PAGE 4    │    PAGE 1    │
│   (Events)   │   (Cover)    │
└─────────────────────────────┘
```

**Back sheet (landscape):**
```
┌─────────────────────────────┐
│    PAGE 2    │    PAGE 3    │
│  (Service)   │  (Sermon)    │
└─────────────────────────────┘
```

Print double-sided, flip on SHORT edge, then fold in half.

### 3. The Simple Text Layout (Traditional Liturgy)

The "Simple Text" layout is designed for churches that use **printed liturgy** in their bulletins, such as responsive readings, calls to worship, and creeds. Instead of 4 pages, this layout creates a streamlined 2-page bulletin.

```
┌─────────────────────────────────────┐
│              PAGE 1                 │
│                                     │
│         ORDER OF SERVICE            │
│                                     │
│  * Call to Worship                  │
│    Leader: The Lord is good...      │
│    All: His love endures forever... │
│                                     │
│  † Hymn #342 - "Great Is..."        │
│    (verses 1, 2, 4)                 │
│                                     │
│  * Prayer of Confession             │
│    Almighty God, we confess...      │
│                                     │
│  Scripture Reading - John 3:16      │
│                                     │
│  Sermon: "Amazing Grace"            │
│    Pastor John Smith                │
│                                     │
│  ────────────────────────────       │
│  Legend:                            │
│  * = Please Stand                   │
│  † = Please Sing                    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│              PAGE 2                 │
│                                     │
│         ANNOUNCEMENTS               │
│                                     │
│  • Women's Bible Study - Tuesday    │
│  • Youth Group - Wednesday 6pm      │
│                                     │
│         UPCOMING EVENTS             │
│                                     │
│  Nov 24 - Thanksgiving Service      │
│  Dec 1  - Advent Begins             │
│                                     │
│         CONTACT                     │
│  123 Main St, Anytown               │
│  www.example-church.org             │
│  office@example-church.org          │
└─────────────────────────────────────┘
```

#### Simple Text Features

**Printed Liturgy Text (`printedText`)**
- Add the actual text for responsive readings, prayers, or creeds
- Each service item can have optional `printedText` that appears below the title
- Use blank lines to separate leader/congregation parts

**Markers**
- Single letter/symbol (*, †, ‡, etc.) that appears before an item
- Indicates congregational actions (stand, sit, sing)
- Define meaning in the **Marker Legend** which prints at the bottom

**Child Items (Compound Parts)**
- Break a single service item into multiple sub-parts
- Useful for compound liturgy items (e.g., "Opening Liturgy" with 3 parts)
- Each child can have its own label, leader, and marker

#### Editing Simple Text Content

1. Select **Simple Text (Traditional Liturgy)** from the Layout dropdown
2. In the Order of Service section, click the **expand arrow** on any item
3. Enter:
   - **Marker**: Symbol like `*` or `†`
   - **Printed Liturgy Text**: The actual text to print
   - **Sub-parts**: Click "Add Part" for compound items
4. Edit the **Marker Legend** section to define what each marker means
5. Preview changes in the right-hand panel

## Weekly Workflow

### Step 1: Create or Open Bulletin

1. Go to **Bulletins** list
2. Click **New Bulletin** for the upcoming Sunday
3. Click **Open Bulletin Generator**

### Step 2: Populate Content

If this is a new bulletin:
1. The Generator will **automatically generate** content from your service plan
2. Review each section in the left panel
3. Make any manual adjustments as needed

If you already have content:
1. Click **Regenerate** to pull fresh data from service plan/announcements
2. Or continue editing your existing content

### Step 3: Check Preflight

The Generator runs validation checks automatically:

**Errors (must fix):**
- Missing church name
- Songs without CCLI numbers
- Announcement title too long (>60 chars)
- Announcement body too long (>300 chars)

**Warnings (review):**
- No sermon information
- No announcements
- No upcoming events
- Content may overflow page

### Step 4: Generate PDF

Once preflight shows "Ready":
1. Click **Download Booklet PDF** for print-ready output
2. Or click **Flat PDF** for a standard multi-page PDF

### Step 5: Print

**Booklet printing settings:**
- Paper: US Letter (8.5" × 11")
- Orientation: Landscape
- Print on both sides: Enabled
- Flip on: SHORT edge
- Do NOT enable "Booklet" mode in your printer (the PDF is already imposed)

## API Reference

### Endpoints

| Endpoint | Method | Role Required | Description |
|----------|--------|---------------|-------------|
| `bulletins.getGeneratorPayload` | Query | viewer+ | Get the current view model for a bulletin |
| `bulletins.saveGeneratorPayload` | Mutation | editor+ | Save changes to the view model |
| `bulletins.generateFromService` | Mutation | editor+ | Regenerate view model from service content |
| `bulletins.generateGeneratorPdf` | Mutation | viewer+ | Generate PDF from view model |
| `bulletins.switchToCanvas` | Mutation | editor+ | Switch layout engine to Canvas mode |
| `bulletins.getPreflightValidation` | Query | viewer+ | Get validation errors/warnings |
| `bulletins.getByPublicToken` | Query | (public) | Get published public bulletin by token |

### Security & Access Control

The Generator V2 implements strict role-based access control:

**Role Hierarchy:**
- `admin` - Full access to all operations
- `editor` - Can edit bulletins, generate content, switch layouts
- `submitter` - Read access to bulletins (viewer+ endpoints)
- `viewer` - Read-only access to bulletins (viewer+ endpoints)
- `kiosk` - Special display-only role (no generator access)

**Tenant Isolation:**
- All queries use `queryWithTenant()` which enforces Row-Level Security (RLS)
- RLS policies ensure users can only access bulletins belonging to their organization
- Tenant ID is passed via `set_config('app.tenant_id', ...)` for transaction-scoped isolation

**Locked Bulletin Protection:**
- Write operations (`saveGeneratorPayload`, `generateFromService`, `switchToCanvas`) are blocked when `locked_at IS NOT NULL`
- Read operations continue to work on locked bulletins
- Unlocking requires admin privileges (separate endpoint)

**Public Access:**
- `getByPublicToken` requires no authentication but only returns bulletins where:
  - `is_public = true`
  - `is_published = true`
  - `deleted_at IS NULL`
- Public tokens are globally unique UUIDs

### BulletinViewModel Schema

The Generator stores all content in a JSON `generator_payload` column using this schema:

```typescript
interface BulletinViewModel {
  bulletinId: string;
  layoutKey: 'classic' | 'simpleText';  // Layout mode selector
  version: number;
  generatedAt: string;

  // Page 1 (Cover)
  churchInfo: {
    churchName: string;
    serviceLabel: string;
    serviceDate: string;
    serviceTime?: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    website?: string;
    email?: string;
  };

  // Page 2 (Order of Service)
  serviceItems: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    ccliNumber?: string;
    scriptureRef?: string;    // e.g., "John 3:16" (from service_item.scripture_ref)
    scriptureText?: string;   // Optional full passage text (view-model only)
    speaker?: string;
    sequence: number;

    // Simple Text layout fields (view-model only)
    printedText?: string;     // Full liturgy text for responsive readings
    marker?: string;          // Symbol like "*" or "†" (max 3 chars)
    children?: Array<{        // Sub-parts for compound items
      id: string;
      label: string;
      leader?: string;
      marker?: string;
    }>;
  }>;

  // Marker Legend (Simple Text layout only)
  markerLegend?: Array<{
    marker: string;           // e.g., "*"
    description: string;      // e.g., "Please stand"
  }>;

  // Page 3 (Sermon & Announcements)
  sermon?: {
    title: string;
    preacher?: string;
    primaryScripture?: string;  // e.g., "John 3:16"
    seriesTitle?: string;
    bigIdea?: string;
  };
  announcements: Array<{
    id: string;
    title: string;
    body: string;
    priority: 'high' | 'normal' | 'low';
    category?: string;
  }>;

  // Page 4 (Events & Contact)
  upcomingEvents: Array<{
    id: string;
    title: string;
    description?: string;
    startAt: string;
    endAt?: string;
    allDay: boolean;
    locationName?: string;
  }>;
  prayerRequests?: Array<{...}>;
  contactInfo?: {...};
  givingInfo?: {...};
  footerText?: string;
}
```

#### Simple Text Layout Fields

The following fields are used exclusively by the Simple Text layout and are stored in `generator_payload` JSON (not as database columns):

| Field | Location | Description |
|-------|----------|-------------|
| `layoutKey` | BulletinViewModel | `'simpleText'` for traditional liturgy layout |
| `printedText` | serviceItems[] | Full text for responsive readings, prayers, creeds |
| `marker` | serviceItems[] | Symbol (*, †, ‡) indicating congregational action |
| `children` | serviceItems[] | Array of sub-parts for compound liturgy items |
| `markerLegend` | BulletinViewModel | Array of marker/description pairs for legend |

**Why view-model only?** These fields are stored in the JSON payload rather than database columns to:
- Keep the database schema simple
- Allow flexible per-bulletin customization
- Avoid schema changes for optional features
- Support future layout modes without migrations

## Database Schema

The migration adds these columns to `bulletin_issue`:

```sql
-- Layout engine type (generator is default)
layout_engine layout_engine_type DEFAULT 'generator'
-- Values: 'generator', 'canvas', 'legacy'

-- JSON payload for generator content
generator_payload JSONB NULL
```

Existing bulletins are migrated:
- `use_canvas_layout = true` → `layout_engine = 'canvas'`
- Has `canvas_layout_json` → `layout_engine = 'legacy'`
- All others → `layout_engine = 'generator'`

## Canvas Mode (Special Services)

Canvas mode remains available for special services but is **demoted** from the primary workflow:

### When Canvas is Shown

- If `layout_engine = 'canvas'`
- If user explicitly switches via confirmation modal

### Canvas Warning Banner

When using Canvas, a warning banner appears:

> **Canvas Layout Mode (Special Services Only)**
> Canvas layouts do not auto-update from service plan or announcements. Use this for Easter, Christmas, or other special occasions. For weekly bulletins, use the Bulletin Generator instead.

### Switching to Canvas

1. Click **Canvas Layout (Advanced)** on bulletin detail page
2. Read the warning modal explaining:
   - Canvas does not auto-update
   - Requires manual content updates
   - Intended for special occasions
3. Confirm to switch

Once switched, `layout_engine` is set to `'canvas'` and the bulletin will always open in Canvas mode.

## Service & Sermon Data

### Scripture Reference vs Scripture Text

The Generator handles scripture in two distinct ways:

| Field | Source | Purpose |
|-------|--------|---------|
| `scriptureRef` | Database (`service_item.scripture_ref`) | Short reference like "John 3:16" |
| `scriptureText` | View model only (`generator_payload`) | Optional full passage text |

**Important notes:**

1. **Scripture reference** is automatically pulled from the `scripture_ref` column on service items. This is the verse citation (e.g., "Psalm 23:1-6") and is stored in the database.

2. **Scripture text** (the actual passage content) is **NOT** automatically imported from any external source:
   - It is stored only in the bulletin's `generator_payload` JSON (view-model only)
   - Staff can optionally paste or edit scripture text directly in the Generator UI
   - The system does not fetch passage text from Bible APIs
   - On initial generation, `scriptureText` is set to `null`

3. For **sermon scripture**, the `primaryScripture` field comes from:
   - The service item with type "sermon" → `scripture_ref`
   - Or from a linked sermon record → `primary_scripture`

### Why Scripture Text is View-Model Only

This design choice keeps the Generator simple and fast:
- No external Bible API dependencies
- No copyright concerns with storing full passage text
- Staff can paste exactly the translation/version they want
- Works offline

If you need scripture passages printed, manually paste the text into the Generator UI after generating from service.

## Troubleshooting

### "No content generated"

The Generator couldn't find any linked content. Check:
- Service items are linked to this bulletin (by `bulletin_issue_id` or `service_date`)
- Announcements exist and are marked active
- Events exist within 7 days of service date

### "Songs missing CCLI numbers"

All songs must have CCLI numbers before PDF generation. Edit the service item to add the CCLI number.

### Simple Text: "No printed liturgy text"

This warning appears when using Simple Text layout but no service items have `printedText`:
- Expand each service item in the Order of Service section
- Add the liturgy text (responsive readings, prayers, etc.)
- Not every item needs text—only items with congregation participation

### Simple Text: "Markers without legend"

Markers appear on items but no legend is defined:
- Go to the **Marker Legend** section
- Add entries like: `*` = "Please stand", `†` = "Please sing"
- The legend prints at the bottom of Page 1

### PDF too long for booklet

The booklet format requires exactly 4 pages. If content overflows:
- Reduce the number of announcements
- Shorten announcement text
- Remove some events
- Use shorter descriptions

### Content not updating

If you make changes in the service plan but don't see them in Generator:
1. Click **Regenerate** to pull fresh content
2. Note: Regenerating will overwrite any manual edits

## Related Documentation

- [Canvas Architecture](./canvas/CANVAS_ARCHITECTURE_DOCUMENTATION.md) - Technical docs for Canvas mode
- [Booklet PDF Implementation](../BOOKLET-PDF-IMPLEMENTATION-SUMMARY.md) - PDF generation details
- [API Documentation](../API-DOCUMENTATION.md) - Full API reference
