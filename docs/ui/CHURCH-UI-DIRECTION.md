# Church Platform UI Direction

This document captures the canonical UI direction for the Elder-First Church Platform.

## Implementation Status

### Phase 1-2: Core Shell & Sunday Planner Layout (Complete)
- [x] Teal TopBar with area name, search, admin toggle, user avatar
- [x] Icon-only SidebarRail with tooltips
- [x] PageContainer for centered content
- [x] Sunday Planner page with stub data
- [x] ServicePlanHeader, ServicePlanActions components
- [x] OrderOfService with sections and items
- [x] Teal color palette in Tailwind config

### Phase 3: UX Refinements (Complete)
- [x] Sidebar expand/pin mode with localStorage persistence
- [x] ItemEditorDrawer (right-hand panel, no full-screen modals)
- [x] Inline section title editing
- [x] Elder/Standard density toggle in user menu
- [x] Density-aware styling in ServiceSection, ServiceItem, OrderOfService

### Phase 4: Service Items Power-Up (Complete)
- [x] Standardized item types with canonical config (9 types)
- [x] Quick-add bar for rapid item creation (Song, Prayer, Note)
- [x] Time calculation utilities (start times, end time, total duration)
- [x] Plan-level and section-level empty states
- [x] Type selector in ItemEditorDrawer with all 9 types
- [x] End time display in ServicePlanHeader

### Phase 5: Reordering & Sections UX (Complete)
- [x] Drag-and-drop reordering for sections
- [x] Drag-and-drop reordering for items within sections
- [x] Add Section functionality with generated IDs
- [x] Time recalculation after reordering
- [x] Visual drag feedback (ring highlight, opacity)
- [x] Keyboard accessibility for drag-and-drop

### Phase 6: Persistence & Cross-Section Moves (Complete)
- [x] Backend API for service plans (`servicePlans` router with `get`, `getCurrent`, `save`, `list`)
- [x] Data mapper layer (`servicePlanMappers.ts`) for DB ↔ API DTO conversion
- [x] Load service plan from backend API with loading/error states
- [x] Save action with success/error feedback
- [x] Unsaved changes indicator ("Unsaved" label, save button state)
- [x] Cross-section item moves via unified DnD context
- [x] Drag overlay for item preview during cross-section moves
- [x] Database migration for `start_time` column on `bulletin_issue`

### Phase 7: Print & Export UX (Complete)
- [x] Print view route (`/sunday-planner/print`) with clean, print-optimized layout
- [x] Print button opens print view in new tab
- [x] `@media print` CSS for clean paper output
- [x] Download dropdown with multiple export formats
- [x] JSON export (`downloadUtils.ts`) for debugging/import
- [x] Text outline export for human-readable sharing
- [x] Edge case handling (empty plan, no sections)

### Phase 8: Templates & Plan Library UX (Complete)
- [x] Service Plan Library page (`/sunday-planner/plans`)
  - Lists all plans with filtering (Upcoming, Past, Templates tabs)
  - Shows plan date, time, item count, status badge
  - Click to open plan in planner
- [x] Templates infrastructure (separate database tables)
  - `service_plan_template` table for template metadata
  - `service_plan_template_item` table for template items
  - Backend API: `listTemplates`, `getTemplate`, `saveAsTemplate`, `createFromTemplate`, `deleteTemplate`
- [x] Save as Template modal from planner
  - Enter template name and optional description
  - Creates new template from current plan structure
- [x] Create Plan from Template flow
  - "Use Template" button in Templates tab
  - Creates new plan for next Sunday from template
  - Redirects to planner to edit new plan
- [x] Dynamic route support (`/sunday-planner/[planId]`)
  - Load any plan by ID
  - Shared `ServicePlanEditor` component for both routes
- [x] Plan Library button in action bar

### Phase 9: Planner Core Package & Template-System Seed (Complete)
- [x] Created `@elder-first/planner-core` package (`packages/planner-core/`)
  - Core type definitions (`PlannerItem`, `PlannerSection`, `PlannerPlan`)
  - Item type definitions with labels and default durations
  - Time calculation utilities (start times, end time, duration)
  - Outline/text generation for exports
- [x] Refactored church planner to use `planner-core`
  - `types.ts` extends core types with church-specific fields (`ccliNumber`, `scriptureRef`)
  - `itemTypeConfig.ts` adds UI configuration (icons, colors) on top of core definitions
  - `timeUtils.ts` re-exports from core for backward compatibility
  - `downloadUtils.ts` uses core outline generator with customization
- [x] Template-system documentation (`docs/template-system/PLANNER-PATTERN.md`)
  - Describes the planner pattern architecture
  - Documents how to reuse `planner-core` in other projects
  - Lists fleet integration TODOs for future extraction

### Phase 10: Planner Blueprint Formalization (Complete)
- [x] Planner blueprint formalized in `.template-system/planner/`
  - `blueprint.md` provides step-by-step implementation spec for new verticals
  - Example specs for meeting planner and event rundown use cases
- [x] Church Planner is now the canonical reference implementation
  - Other verticals should follow the same extension pattern
  - Icons and colors stay in vertical-specific config, not core

### Not Yet Implemented
- [ ] PDF generation (currently relies on browser print-to-PDF)
- [ ] Template editing (edit existing templates)
- [ ] Template preview before use

---

## Overview

The Church Platform UI follows a clean, accessible design with:

1. **Teal Header (TopBar)** - Consistent top navigation bar
2. **Icon Sidebar (SidebarRail)** - Vertical icon-only rail with tooltips and pin/expand
3. **Centered Content Column** - Light background with max-width constraint
4. **Card-Based Layouts** - Rounded corners, soft shadows, no dense tables
5. **Elder/Standard Density Toggle** - User-selectable interface sizing

## Component Map

### Shell Components (`components/layout/church-shell/`)

| Component | Description |
|-----------|-------------|
| **ChurchAppShell** | Main wrapper combining TopBar, SidebarRail, and content area. Handles auth context and routing. |
| **TopBar** | Teal header bar with area name, global search, admin view toggle, and user avatar dropdown with density toggle. |
| **SidebarRail** | Icon-only nav rail (72px collapsed, 200px expanded). Config-driven V1 nav: Dashboard, Sunday Planner, Bulletins, Sermons, People, Settings. Lucide icons with tooltips. Pin button persists state to localStorage. Mobile: slide-out drawer. |
| **PageContainer** | Centered content column with max-width and responsive padding. |

### Sunday Planner Components (`components/sunday-planner/`)

| Component | Description |
|-----------|-------------|
| **ServicePlanHeader** | Page header showing date, start time, total duration, and status pill (Draft/Published). |
| **ServicePlanActions** | Action bar with Download, Print, Save as Template, and Clear buttons. |
| **OrderOfService** | Main card containing list of sections with "add section" drop zones. |
| **ServiceSection** | Section card with inline-editable title, item list, duplicate/delete actions. |
| **ServiceItem** | Item row with type icon, title, subtitle, timing, and edit/more actions. Clickable to open editor. |
| **ItemEditorDrawer** | Right-hand slide-in panel for editing item details (title, subtitle, type, duration, notes). |

### Hooks (`hooks/`)

| Hook | Description |
|------|-------------|
| **useDensityPreference** | Manages Standard/Elder density mode with localStorage persistence. Provides density classes helper. |

---

## Design Principles

### Elder-Friendly Typography
- Page titles: 24-28px
- Section titles: 20px
- Body text: 16px minimum
- Generous line-height (1.5)

### Accessibility First
- High contrast text and icons
- Minimum 40x40px click targets (48px in elder mode)
- Visible focus rings for keyboard navigation
- Support for reduced motion preferences

### Visual Hierarchy
- Off-white background (`#f9fafb`) for main content area
- Teal (`#0d9488`) as primary brand color
- Cards with rounded corners (`rounded-xl`) and soft shadows
- Generous whitespace between sections

---

## App Shell Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  TopBar (Teal)                                              │
│  ┌──────────┬─────────────────────────────┬────────────────┐│
│  │ Area Name│  Search Input               │ Toggle │Avatar ││
│  └──────────┴─────────────────────────────┴────────────────┘│
├────┬────────────────────────────────────────────────────────┤
│    │                                                        │
│ S  │                                                        │
│ i  │           Content Area                                 │
│ d  │           (centered, max-width ~1000px)                │
│ e  │                                                        │
│ b  │           ┌─────────────────────────┐                  │
│ a  │           │  Page Content Card      │                  │
│ r  │           │  (rounded, shadow)      │                  │
│    │           └─────────────────────────┘                  │
│ R  │                                                        │
│ a  │           ┌─────────────────────────────────┐          │
│ i  │           │  ItemEditorDrawer (right panel) │          │
│ l  │           └─────────────────────────────────┘          │
│    │                                                        │
└────┴────────────────────────────────────────────────────────┘
```

### Component Structure

```
ChurchAppShell
├── TopBar
│   ├── AreaName (current section label)
│   ├── SearchInput (global search)
│   ├── ViewModeToggle (Admin View toggle)
│   └── UserAvatar (user menu dropdown)
│       └── DensityToggle (Standard/Elder)
├── SidebarRail
│   ├── NavIcon (Dashboard)
│   ├── NavIcon (Sunday Planner)
│   ├── NavIcon (Bulletins)
│   ├── NavIcon (Sermons)
│   ├── NavIcon (People)
│   ├── NavIcon (Settings)
│   └── PinToggle (expand/collapse)
└── ContentArea
    └── PageContainer (centered column)
        └── {children}
```

---

## Sidebar Behavior

### Desktop
- **Collapsed (default)**: 72px wide, icons only with hover tooltips
- **Expanded (pinned)**: 200px wide, icons + labels
- **Pin button**: At bottom of rail, toggles between modes
- **Persistence**: Saved to localStorage (`church-sidebar-expanded`)

### Mobile
- Hidden by default
- Hamburger trigger in TopBar
- Slide-out drawer with icons + labels (always expanded)
- Overlay backdrop when open

---

## Density Modes

The UI supports two density modes, toggled via the user avatar dropdown:

### Standard Mode
- Text: base (16px), sm (14px)
- Padding: p-3 for items, p-4 for sections
- Touch targets: 44px minimum
- Gaps: gap-3

### Elder Mode
- Text: lg (18px), base (16px)
- Padding: p-4 for items, p-6 for sections
- Touch targets: 52px minimum
- Gaps: gap-4
- Icon sizes: h-6 w-6

The `useDensityPreference` hook provides:
- `density`: Current mode ('standard' | 'elder')
- `setDensity()`: Change mode
- `toggleDensity()`: Switch between modes
- `isElderMode`: Boolean convenience prop

The `getDensityClasses()` helper returns Tailwind classes for current density.

---

## Item Editor Drawer

The ItemEditorDrawer slides in from the right (no full-screen modals):

- **Trigger**: Click item row or edit icon
- **Width**: max-w-md (448px)
- **Fields**: Type (6 options), Title, Subtitle, Duration, Notes
- **Actions**: Save, Cancel
- **Escape key**: Closes drawer

---

## Sunday Service Plan Page

### Page Structure

```
ServicePlanPage
├── ServicePlanHeader
│   ├── Title ("Service Plan")
│   ├── Date (e.g., "December 8, 2024")
│   ├── Start Time (e.g., "10:00 AM")
│   ├── Total Duration (e.g., "1h 15m")
│   └── StatusPill (Draft | Published)
├── ServicePlanActions
│   ├── Download Button
│   ├── Print Button
│   ├── Save as Template Button
│   └── Clear Button
├── OrderOfServiceCard
│   ├── Card Title ("Order of Service")
│   └── SectionsList
│       ├── AddSectionDropzone
│       ├── ServiceSection (Pre-Service)
│       │   ├── SectionHeader (editable title, summary, actions)
│       │   ├── ServiceItem (clickable → opens drawer)
│       │   └── AddItemLink
│       ├── AddSectionDropzone
│       └── ...
└── ItemEditorDrawer (conditional)
```

### Section Header Features
- **Editable title**: Click title to edit inline (Enter to save, Escape to cancel)
- **Summary**: Item count + total duration
- **Actions**: Edit, Duplicate, Delete

### Item Row Features
- **Clickable**: Opens ItemEditorDrawer
- **Type icons**: Color-coded by type (song=purple, reading=blue, prayer=pink, etc.)
- **Timing**: Calculated start time + duration
- **Hover actions**: Edit, Attachments, More menu

---

## Design Tokens

### Colors

```css
/* Primary - Teal */
--teal-600: #0d9488;  /* Primary brand color */

/* Neutral */
--gray-50: #f9fafb;   /* Content background */
--gray-200: #e5e7eb;  /* Borders */
--gray-900: #111827;  /* Primary text */
```

### Spacing

```css
/* Standard mode */
--spacing-sm: 0.5rem;   /* 8px */
--spacing-md: 1rem;     /* 16px */

/* Elder mode */
--spacing-md: 1rem;     /* 16px */
--spacing-lg: 1.5rem;   /* 24px */
```

---

## File Locations

| Component | Path |
|-----------|------|
| ChurchAppShell | `components/layout/church-shell/ChurchAppShell.tsx` |
| TopBar | `components/layout/church-shell/TopBar.tsx` |
| SidebarRail | `components/layout/church-shell/SidebarRail.tsx` |
| PageContainer | `components/layout/PageContainer.tsx` |
| useDensityPreference | `hooks/useDensityPreference.ts` |
| ServicePlanPage | `app/sunday-planner/page.tsx` |
| ServicePlanHeader | `components/sunday-planner/ServicePlanHeader.tsx` |
| ServicePlanActions | `components/sunday-planner/ServicePlanActions.tsx` |
| OrderOfService | `components/sunday-planner/OrderOfService.tsx` |
| ServiceSection | `components/sunday-planner/ServiceSection.tsx` |
| ServiceItem | `components/sunday-planner/ServiceItem.tsx` |
| ItemEditorDrawer | `components/sunday-planner/ItemEditorDrawer.tsx` |
| itemTypeConfig | `components/sunday-planner/itemTypeConfig.ts` |
| timeUtils | `components/sunday-planner/timeUtils.ts` |

---

## Phase 4: Service Item Types

### Canonical Item Types

The planner supports 9 standardized item types:

| Type | Label | Icon | Default Duration | Description |
|------|-------|------|------------------|-------------|
| `song` | Song | Music | 4 min | Hymns, worship songs, special music |
| `scripture` | Scripture | BookOpen | 3 min | Bible readings, responsive readings |
| `prayer` | Prayer | Heart | 3 min | Opening, pastoral, closing prayers |
| `communion` | Communion | Grape | 10 min | Lord's Supper, communion elements |
| `announcement` | Announcement | Megaphone | 3 min | Church announcements, news |
| `offering` | Offering | HandCoins | 5 min | Collection, giving moment |
| `sermon` | Sermon | Mic | 25 min | Message, homily, teaching |
| `transition` | Transition | Clock | 2 min | Musical interludes, moment of silence |
| `note` | Note | StickyNote | 3 min | Generic items, instructions |

### Item Type Configuration

```typescript
// components/sunday-planner/itemTypeConfig.ts

export interface ServiceItemTypeConfig {
  type: ServiceItemType;
  label: string;
  description: string;
  icon: LucideIcon;
  defaultDurationMinutes: number;
  iconBgClass: string;
  iconTextClass: string;
}

// Ordered list of all types
export const SERVICE_ITEM_TYPES: ServiceItemTypeConfig[];

// Map for O(1) lookups
export const SERVICE_ITEM_TYPE_MAP: Record<ServiceItemType, ServiceItemTypeConfig>;

// Get config with fallback
export function getItemTypeConfig(type: ServiceItemType): ServiceItemTypeConfig;

// Quick-add types shown in section bar
export const QUICK_ADD_TYPES: ServiceItemType[] = ['song', 'prayer', 'note'];
```

### Quick-Add Bar

Each section displays a Quick-Add bar under the header with buttons for:
- **+ Song** - Creates a new song item
- **+ Prayer** - Creates a new prayer item
- **+ Note** - Creates a generic note item

Quick-add creates the item with default title/duration and opens the ItemEditorDrawer.

---

## Time Calculation Utilities

### Module: `components/sunday-planner/timeUtils.ts`

Pure functions for computing service timing:

```typescript
// Parse "10:00 AM" to minutes since midnight
parseTimeToMinutes(timeStr: string): number

// Format minutes to "10:00 AM"
formatMinutesToTime(totalMinutes: number): string

// Get Map of itemId → start time string
computeItemStartTimes(plan: ServicePlanData): Map<string, string>

// Sum all item durations
computeTotalDurationMinutes(plan: ServicePlanData): number

// Compute end time from start + total duration
computeEndTime(plan: ServicePlanData): string

// Format "45 min" or "1h 15m"
formatDurationDisplay(minutes: number): string
```

### Time Display Behavior

- **ServicePlanHeader**: Shows start time → end time, total duration
- **ServiceItem**: Shows computed start time based on position
- **Recalculation**: Times update when items are added/removed/reordered or durations change

---

## Empty States

### Plan-Level Empty State (OrderOfService)

When the plan has no sections:
- Title: "Start planning your service"
- Description: Guidance text about adding sections and items
- CTA: "Add your first section" button

### Section-Level Empty State (ServiceSection)

When a section has no items:
- Message: "No items in this section yet."
- Help text: "Use the quick-add buttons above..."

---

## Adopting This Shell for Other Pages

To create a new page using this shell:

1. **Create the page route** at `apps/web/src/app/[feature]/page.tsx`
2. **Wrap with ChurchAppShell** (or use existing root layout)
3. **Use PageContainer** for consistent layout
4. **Follow the header + actions + content pattern** from Service Plan

Example:

```tsx
import { ChurchAppShell } from '@/components/layout/church-shell';
import { PageContainer } from '@/components/layout/PageContainer';

export default function MyFeaturePage() {
  return (
    <ChurchAppShell>
      <PageContainer>
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Page Title</h1>
          <p className="text-gray-600">Page description</p>
        </div>

        {/* Action Bar */}
        <div className="flex gap-3 mb-6">
          <button className="...">Primary Action</button>
        </div>

        {/* Main Content Card */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          {/* Content here */}
        </div>
      </PageContainer>
    </ChurchAppShell>
  );
}
```

---

## Future Phases

- **Bulletin Planner** using the same shell and patterns
- **Sermon Planner** integration with existing sermon features
- **Service plan templates** - Save/load common service orders
- **Multi-plan management** - List, select, and manage multiple plans
- **Real-time collaboration** with Azure Web PubSub (optional)

---

## Migration Notes

The Church Platform UI shell is implemented as a third variant alongside the existing Modern and Accessible shells. Pages can opt into this shell by using the ChurchAppShell component directly.

The existing dual-shell architecture (Modern/Accessible) remains available for backward compatibility.

### Layout Architecture (Avoiding Duplicate Sidebars)

The app has two shell systems:

1. **Legacy Shells** (Modern/Accessible via `AppShell`)
   - Full-width sidebar (w-64) with text labels
   - Controlled by `AppLayout.tsx` at the root level
   - Used for pages NOT listed in `CHURCH_SHELL_ROUTES`

2. **Church Shell** (`ChurchAppShell` with `SidebarRail`)
   - Icon-only sidebar (72px) with tooltips and expand/pin
   - Teal top bar with area name
   - Applied via route-level `layout.tsx` files

**Routes using ChurchAppShell (as of 2025-12-08):**

| Route | Layout File |
|-------|------------|
| `/dashboard` | `app/dashboard/layout.tsx` |
| `/sunday-planner` | `app/sunday-planner/layout.tsx` |
| `/bulletins` | `app/bulletins/layout.tsx` |
| `/sermons` | `app/sermons/layout.tsx` |
| `/people` | `app/people/layout.tsx` |
| `/settings` | `app/settings/layout.tsx` |

**To prevent duplicate sidebars**, `AppLayout.tsx` excludes routes that use `ChurchAppShell`:

```typescript
// apps/web/src/components/layout/AppLayout.tsx
const CHURCH_SHELL_ROUTES = [
  '/dashboard',
  '/sunday-planner',
  '/bulletins',
  '/sermons',
  '/people',
  '/settings',
];

// These routes render their own shell via layout.tsx, so we skip the legacy AppShell
if (isChurchShellRoute(pathname)) {
  return <>{children}</>;
}
```

**When adding new pages that use ChurchAppShell:**

1. Add the route prefix to `CHURCH_SHELL_ROUTES` in `AppLayout.tsx`
2. Create a `layout.tsx` in your route folder that wraps with `ChurchAppShell`
3. Add to `CHURCH_NAV_ITEMS` in `SidebarRail.tsx` if it should appear in sidebar nav
4. Keep your `page.tsx` focused on content only (no shell wrapper)

---

## Phase 5-6: Drag-and-Drop Implementation

### Library Used

The planner uses `@dnd-kit` for drag-and-drop functionality:
- `@dnd-kit/core` - Core drag-and-drop primitives
- `@dnd-kit/sortable` - Sortable list utilities
- `@dnd-kit/utilities` - CSS transform helpers

This library was already installed in the repo and is used by the Bulletin canvas for element reordering.

### DnD Architecture (Phase 6 - Unified Context)

Phase 6 refactored to a **unified DnD context** for cross-section item moves:

```
OrderOfService
├── DndContext (unified for both sections and items)
│   ├── SortableContext (all section and item IDs)
│   ├── SortableSectionWrapper (for each section)
│   │   └── ServiceSection
│   │       └── SortableItemWrapper (for each item)
│   │           └── ServiceItem
│   └── DragOverlay (shows item preview during cross-section drag)
```

Key changes from Phase 5:
- Single DnD context handles both section reordering and item moves
- All section and item IDs in one SortableContext
- Custom collision detection (`combinedCollisionDetection`) combining `pointerWithin`, `rectIntersection`, and `closestCenter`
- `handleDragEnd` detects whether the drag was a section reorder, within-section item reorder, or cross-section item move

### Key Components

| Component | Responsibility |
|-----------|----------------|
| **OrderOfService** | Manages unified DndContext, collision detection, drag handlers |
| **SortableSectionWrapper** | Wraps ServiceSection with `useSortable` |
| **SortableItemWrapper** | Wraps ServiceItem with `useSortable` |
| **ServiceSection** | Renders items, no longer has its own DnD context |
| **ServiceItem** | Renders drag handle, receives `isDragging` state |

### Cross-Section Item Moves

When an item is dragged between sections:
1. `handleDragStart` sets `activeType` to 'item' and stores `activeId`
2. `DragOverlay` shows a preview of the item being dragged
3. `handleDragEnd` checks if `active` and `over` are in different sections
4. If cross-section: calls `onMoveItemBetweenSections(itemId, fromSectionId, toSectionId, toIndex)`
5. Page handler removes item from source section, inserts into target at `toIndex`

### Sensors

DnD context uses:
- **PointerSensor** with 8px activation distance (prevents accidental drags)
- **KeyboardSensor** with sortable coordinate getter (arrow keys to reorder)

### Time Recalculation

Time recalculation after any edit is automatic:
1. Edit handlers call `setPlan()` with new state
2. React re-renders with updated `plan` state
3. `calculateStartTimes(plan)` recomputes item start times
4. `computeEndTime(plan)` recomputes service end time

No manual recalculation triggers needed - derived state pattern.

### Add Section Flow

1. User clicks "Add Section" button (in header or empty state)
2. `handleAddSection()` creates new section with:
   - Generated ID: `section-${Date.now()}`
   - Default title: "New Section"
   - Empty items array
3. Section is appended to end of sections list
4. User can click title to edit inline (existing Phase 3 feature)

---

## Template System TODO

> **Note:** Phase 9 delivered the initial extraction of planner core logic into `@elder-first/planner-core`.
> See `docs/template-system/PLANNER-PATTERN.md` for full documentation.

### Extracted to `planner-core` (Phase 9)

The following have been extracted into the reusable `@elder-first/planner-core` package:

1. **Core Types** - `PlannerItem`, `PlannerSection`, `PlannerPlan` interfaces
2. **Item Type Definitions** - Labels, descriptions, default durations (without UI)
3. **Time Utilities** - `computeItemStartTimes`, `computeEndTime`, `formatDurationDisplay`, etc.
4. **Outline Generation** - `generatePlanOutline` with customization options

### Remaining Patterns for Future Extraction

The following patterns remain in the church-specific implementation but could be generalized:

1. **Quick-Add Pattern** - Section-level quick-add bars with type-specific defaults
2. **Empty State Pattern** - Consistent empty states with title, description, and CTA
3. **Sortable List Pattern** - DnD wiring with @dnd-kit for reorderable lists
4. **Nested DnD Context Pattern** - Pattern for DnD at multiple levels (sections containing items)
5. **Print View Pattern** - Dedicated print route with `@media print` CSS and action bar
6. **Dropdown Menu Pattern** - Simple dropdown with click-outside/escape close

### Fleet Integration (Future)

See `docs/template-system/PLANNER-PATTERN.md` for TODOs related to:
- Generic "planner" blueprint in `.template-system`
- Shared documentation in ai-guidance repo
- Example implementations for other verticals

---

## Print & Export (Phase 7)

### Print View

The print view is accessible at `/sunday-planner/print` and provides a clean, print-optimized layout:

- **Route**: `/sunday-planner/print`
- **Data Source**: Uses `servicePlans.getCurrent` API (same as main planner)
- **Features**:
  - Fixed action bar (hidden when printing) with Back and Print buttons
  - Clean header with date, times, duration, status
  - Sections with numbered headings
  - Items in tabular format showing time, type, title, duration
  - `@media print` CSS for paper output

### Export Formats

The Download button provides a dropdown with two export options:

1. **JSON Export** (`service-plan-YYYY-MM-DD.json`)
   - Full plan DTO as JSON
   - Useful for debugging, archiving, future import

2. **Text Outline** (`service-plan-YYYY-MM-DD.txt`)
   - Human-readable outline format
   - Shows header with times and duration
   - Numbered sections with item details

### Limitations

- PDF export relies on browser's "Save as PDF" via print dialog
- Print view loads the "current" plan (next Sunday) only
- No support for printing historical plans by ID yet

---

## Phase 8: Templates & Plan Library

### Plan Library Page

The Plan Library provides a central location for managing service plans and templates.

**Route:** `/sunday-planner/plans`

**Features:**
- **Filter Tabs:** Upcoming, Past, Templates
- **Plan List:** Date, time, item count, status (Draft/Published)
- **Template List:** Name, time, item count, description
- **Actions:**
  - Click plan to open in planner
  - "Use Template" button to create plan from template
  - "Current Plan" button to go to main planner

**File Location:** `apps/web/src/app/sunday-planner/plans/page.tsx`

### Templates Data Model

Templates are stored separately from service plans (bulletin_issue + service_item):

```sql
-- Template metadata
service_plan_template (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_time VARCHAR(20) DEFAULT '10:00 AM',
  created_at, updated_at, deleted_at
)

-- Template items (mirrors service_item structure)
service_plan_template_item (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  template_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  sequence INT NOT NULL,
  title VARCHAR(255),
  content TEXT,
  ccli_number VARCHAR(50),
  scripture_ref VARCHAR(100),
  duration_minutes INT DEFAULT 3,
  section VARCHAR(100),
  notes TEXT,
  created_at, updated_at, deleted_at
)
```

**Migration:** `packages/database/migrations/042_add_service_plan_template.sql`

### Template API Endpoints

Added to `servicePlans` router:

| Endpoint | Description |
|----------|-------------|
| `listTemplates` | List all templates for tenant (pagination support) |
| `getTemplate` | Get single template by ID with items |
| `saveAsTemplate` | Create new template from sections/items |
| `createFromTemplate` | Create new plan from template for specified date |
| `deleteTemplate` | Soft-delete a template |

### Save as Template Flow

1. User clicks "Save as Template" in planner action bar
2. Modal opens with name input (pre-filled with date) and optional description
3. User confirms → `saveAsTemplate` mutation
4. Template created with sections/items copied from current plan
5. Success toast and modal closes

**Component:** `apps/web/src/components/sunday-planner/SaveAsTemplateModal.tsx`

### Create Plan from Template Flow

1. User navigates to Plan Library → Templates tab
2. Clicks "Use Template" on desired template
3. `createFromTemplate` mutation creates new bulletin_issue + service_items
4. Date defaults to next Sunday
5. User redirected to `/sunday-planner/[newPlanId]`

### Dynamic Route Support

Two entry points to the planner:

| Route | Behavior |
|-------|----------|
| `/sunday-planner` | Loads current (next upcoming) plan via `getCurrent` |
| `/sunday-planner/[planId]` | Loads specific plan by ID via `get` |

Both routes use the shared `ServicePlanEditor` component.

**Files:**
- `apps/web/src/app/sunday-planner/page.tsx` - Main planner (loads current)
- `apps/web/src/app/sunday-planner/[planId]/page.tsx` - Dynamic route (loads by ID)
- `apps/web/src/components/sunday-planner/ServicePlanEditor.tsx` - Shared editor

### ServicePlanEditor Component

Shared component containing all planner logic:

```typescript
interface ServicePlanEditorProps {
  planId?: string; // If provided, loads by ID; otherwise loads current
}
```

Features:
- Loads plan from API (getCurrent or get by ID)
- Full editing: sections, items, reordering, cross-section DnD
- Save, Print, Download actions
- Save as Template modal
- View Library navigation
- Unsaved changes tracking

---

## Template-System TODOs (Templates & Library)

The following Phase 8 patterns are candidates for `.template-system` extraction:

1. **Plan Library Pattern**
   - Tabbed filter view (Upcoming/Past/Templates)
   - Date-based sorting and filtering
   - Item count and status badges
   - Click-to-open navigation

2. **Template Data Model Pattern**
   - Separate template tables vs. flagging existing records
   - Template → Instance cloning
   - Section/item structure copying

3. **Save as Template Flow**
   - Modal for naming/describing templates
   - Clone current state to template record
   - Success feedback

4. **Create from Template Flow**
   - Template selection in library view
   - Date selection for new instance
   - Clone template to instance
   - Navigate to new instance

5. **Shared Editor Component Pattern**
   - Single component for multiple routes
   - Optional ID prop for loading different records
   - Fallback to "current" record when no ID

6. **Dynamic Route + Shell Composition**
   - `[id]/page.tsx` pattern with params unwrapping
   - Shared shell wrapping (ChurchAppShell + PageContainer)

These patterns apply to any planner-like feature:
- Bulletin templates
- Sermon outlines
- Event rundowns
- Meeting agendas
