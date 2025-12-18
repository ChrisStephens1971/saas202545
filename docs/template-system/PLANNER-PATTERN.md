# Planner Pattern

This document describes the **Planner Pattern** - a reusable architecture for building service/event planning applications. This pattern has been extracted from the Church Platform's Sunday Planner and can be reused across the Verdaio fleet.

## Overview

The Planner Pattern is a hierarchical structure for managing time-based plans:

```
Plan
├── Metadata (id, date, startTime, status)
└── Sections[]
    ├── Section Metadata (id, title)
    └── Items[]
        └── Item (id, type, title, duration, notes, etc.)
```

### Key Concepts

1. **Plan** - The top-level container representing a scheduled event (e.g., service, meeting, ceremony)
2. **Sections** - Logical groupings within a plan (e.g., "Pre-Service", "Worship", "Closing")
3. **Items** - Individual elements with duration (e.g., songs, prayers, announcements)
4. **Item Types** - Canonical categories with default durations and semantic meaning

## The `@elder-first/planner-core` Package

The core planner logic has been extracted into a reusable package at `packages/planner-core/`.

### Package Structure

```
packages/planner-core/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts       # Main exports
    ├── types.ts       # Core type definitions
    ├── itemTypes.ts   # Item type definitions
    ├── time.ts        # Time calculation utilities
    └── outline.ts     # Text outline generation
```

### Core Types

```typescript
// Base item type enum
type PlannerItemType =
  | 'song' | 'scripture' | 'prayer' | 'communion'
  | 'announcement' | 'offering' | 'sermon'
  | 'transition' | 'note';

// Base interfaces
interface PlannerItem {
  id: string;
  type: PlannerItemType;
  title: string;
  subtitle?: string;
  duration: number; // minutes
  startTime?: string;
  notes?: string;
}

interface PlannerSection<TItem extends PlannerItem = PlannerItem> {
  id: string;
  title: string;
  items: TItem[];
}

interface PlannerPlan<TSection extends PlannerSection = PlannerSection> {
  id: string;
  date: string;
  startTime: string;
  status: 'draft' | 'published';
  sections: TSection[];
}
```

### Item Type Definitions

```typescript
interface PlannerItemTypeDefinition {
  type: PlannerItemType;
  label: string;
  description: string;
  defaultDurationMinutes: number;
}

// Pre-defined types with sensible defaults
PLANNER_ITEM_TYPES: PlannerItemTypeDefinition[]
PLANNER_ITEM_TYPE_MAP: Record<PlannerItemType, PlannerItemTypeDefinition>
```

### Time Utilities

```typescript
// Parse/format time strings
parseTimeToMinutes(timeStr: string): number
formatMinutesToTime(totalMinutes: number): string

// Compute plan timing
computeItemStartTimes<TPlan>(plan: TPlan): Map<string, string>
computeTotalDurationMinutes<TPlan>(plan: TPlan): number
computeEndTime<TPlan>(plan: TPlan): string

// Format display
formatDurationDisplay(minutes: number): string
```

### Outline Generation

```typescript
interface OutlineOptions {
  headerPrefix?: string;
  includeNotes?: boolean;
  includeExtraDetails?: boolean;
  footerText?: string;
  dateFormatter?: (dateStr: string) => string;
  getItemTypeLabel?: (type: string) => string;
}

generatePlanOutline<TPlan>(plan: TPlan, options?: OutlineOptions): string
generateMinimalOutline<TPlan>(plan: TPlan): string
```

## How to Reuse This Pattern

### Step 1: Add Dependency

Add `@elder-first/planner-core` to your app's dependencies:

```json
{
  "dependencies": {
    "@elder-first/planner-core": "workspace:*"
  }
}
```

### Step 2: Extend Core Types

Create project-specific types that extend the base types:

```typescript
// your-app/types.ts
import type { PlannerItem, PlannerSection, PlannerPlan } from '@elder-first/planner-core';

// Extend with your domain-specific fields
export interface MeetingItem extends PlannerItem {
  presenter?: string;
  actionItems?: string[];
}

export interface MeetingSection extends PlannerSection<MeetingItem> {}

export interface MeetingPlan extends PlannerPlan<MeetingSection> {
  attendees: string[];
  location: string;
}
```

### Step 3: Add UI Configuration

Create UI-specific configuration (icons, colors) at the app level:

```typescript
// your-app/itemTypeConfig.ts
import { PLANNER_ITEM_TYPES } from '@elder-first/planner-core';
import { Icon1, Icon2 } from 'your-icon-library';

export const UI_ITEM_TYPES = PLANNER_ITEM_TYPES.map(def => ({
  ...def,
  icon: getIconForType(def.type),
  colorClass: getColorForType(def.type),
}));
```

### Step 4: Use Time Utilities

Import and use time utilities directly:

```typescript
import {
  computeItemStartTimes,
  computeEndTime,
  formatDurationDisplay,
} from '@elder-first/planner-core';

// In your component
const startTimes = computeItemStartTimes(plan);
const endTime = computeEndTime(plan);
const duration = formatDurationDisplay(totalMinutes);
```

### Step 5: Generate Outlines

Use the outline generator with project-specific customization:

```typescript
import { generatePlanOutline } from '@elder-first/planner-core';

const outline = generatePlanOutline(plan, {
  headerPrefix: 'Meeting Agenda',
  footerText: 'Generated from Your App',
  getItemTypeLabel: (type) => yourLabelMap[type],
});
```

## Church Platform Implementation

The Church Platform's Sunday Planner uses this pattern:

### Type Extensions

- `ServiceItemData` extends `PlannerItem` with `ccliNumber` and `scriptureRef`
- `ServiceSectionData` and `ServicePlanData` use these extended types

### UI Configuration

- `itemTypeConfig.ts` adds Lucide icons and Tailwind color classes
- Icons and colors are kept separate from core logic

### Components

- `ServicePlanEditor` - Main editor using time utilities
- `OrderOfService` - Section/item list with DnD
- `ServicePlanActions` - Save, Print, Download buttons
- `ItemEditorDrawer` - Item editing panel

### Features Built on Pattern

1. **Plan Library** - List/filter/select plans
2. **Templates** - Save as template, create from template
3. **Print/Export** - Print view, JSON/Text download
4. **DnD Reordering** - Section and item drag-and-drop
5. **Time Calculations** - Auto-computed start times and durations

## Template-System Blueprint

The planner pattern is now formalized in the `.template-system` directory.

### Canonical Location

```
.template-system/planner/
├── README.md                      # Overview and quick start
├── blueprint.md                   # Step-by-step implementation spec
└── examples/
    ├── meeting-planner.md         # Corporate meeting use case
    └── event-rundown.md           # Production run sheet use case
```

### What the Blueprint Provides

| File | Purpose |
|------|---------|
| `blueprint.md` | Detailed implementation recipe for AI agents and developers |
| `meeting-planner.md` | Example vertical: team/corporate meetings with presenter tracking |
| `event-rundown.md` | Example vertical: live event production with cue sheets |

### Using the Blueprint

1. Read `.template-system/planner/blueprint.md` for the implementation recipe
2. Choose an example that matches your use case
3. Follow the 5-step vertical implementation pattern
4. Reference the Church Platform Sunday Planner as the canonical implementation

### Alignment with Core Extraction (Phase 9)

This blueprint documents the patterns extracted during Phase 9 (see `docs/ui/CHURCH-UI-DIRECTION.md`). The Sunday Planner is the reference implementation that all new verticals should follow.

---

## Fleet Integration TODOs

Remaining work to complete fleet-wide adoption:

### 1. Shared Documentation

Add planner pattern docs to:
- Central ai-guidance repo
- Verdaio developer onboarding

### 2. Additional Example Implementations

Create reference implementations for:
- Class schedule (education use)
- Bulletin template (publication use)

### 3. Reusable UI Components

Consider extracting to shared UI library:
- Sortable section list
- Item editor drawer pattern
- Time display components
- Export dropdown pattern

### 4. Backend Patterns

Document and potentially extract:
- Plan/Section/Item API patterns
- Template cloning logic
- Soft-delete with audit trail

## Constraints and Decisions

### Why Separate Package?

1. **No UI in Core** - Icons and styling stay at app level
2. **Type Safety** - Generic types allow extension
3. **Tree Shaking** - Apps only import what they need
4. **Independent Testing** - Core logic testable without UI

### Why 9 Item Types?

The canonical types cover common church service elements:
- **Musical**: song, transition
- **Liturgical**: scripture, prayer, communion
- **Administrative**: announcement, offering
- **Teaching**: sermon
- **Misc**: note (catch-all)

Projects can filter or extend these as needed.

### Time Format Decision

12-hour format with AM/PM (e.g., "10:00 AM") was chosen for:
- Familiarity for church volunteers
- Clear morning/afternoon distinction
- Matches typical bulletin formatting

24-hour format could be added via options if needed.

---

## Phase 11 – Generator Integration

The planner pattern now includes an **operational generator** that can scaffold a new planner module for any vertical with a single command.

### Generator Location

```
.template-system/planner/generator/
└── index.ts   # Main generator entrypoint
```

### What the Generator Creates

When invoked with `{ verticalName, pathBase }`, the generator creates:

```
<pathBase>/<verticalName>/planner/
├── types.ts           # Extended types for the vertical
├── itemTypeConfig.ts  # UI configuration (icons, colors)
├── timeUtils.ts       # Wrapper around core time utilities
├── outlineUtils.ts    # Wrapper around core outline generator
└── index.ts           # Barrel export
```

### Programmatic Usage

```typescript
import { generatePlannerModule } from './.template-system/planner/generator';

const result = generatePlannerModule({
  verticalName: 'meeting',
  pathBase: './src/features',
  itemFields: [
    { name: 'presenter', type: 'string', optional: true, description: 'Who presents this item' },
  ],
  planFields: [
    { name: 'organizer', type: 'string', optional: false, description: 'Meeting organizer' },
    { name: 'location', type: 'string', optional: true, description: 'Meeting location' },
  ],
});

console.log(result.createdFiles);
// [
//   './src/features/meeting/planner/types.ts',
//   './src/features/meeting/planner/itemTypeConfig.ts',
//   './src/features/meeting/planner/timeUtils.ts',
//   './src/features/meeting/planner/outlineUtils.ts',
//   './src/features/meeting/planner/index.ts',
// ]
```

### Preview Mode

Use `previewPlannerModule()` to see what would be generated without writing files:

```typescript
import { previewPlannerModule } from './.template-system/planner/generator';

const preview = previewPlannerModule({
  verticalName: 'event',
  pathBase: './src/features',
});

console.log(preview.outputPath);
// './src/features/event/planner'

console.log(preview.files.map(f => f.name));
// ['types.ts', 'itemTypeConfig.ts', 'timeUtils.ts', 'outlineUtils.ts', 'index.ts']
```

### Template-System Registry

The generator is registered in `.template-system/registry.json`:

```json
{
  "id": "planner-module",
  "label": "Planner Module",
  "entry": "./planner/generator/index.ts",
  "description": "Generates a planner module using @elder-first/planner-core."
}
```

### Generator API

```typescript
interface PlannerGeneratorParams {
  verticalName: string;     // Required: e.g., "meeting", "event"
  pathBase: string;         // Required: e.g., "./src/features"
  typeName?: string;        // Optional: Pascal case override
  itemTypes?: VerticalItemType[];  // Optional: custom item types
  planFields?: FieldDefinition[];  // Optional: extra plan fields
  itemFields?: FieldDefinition[];  // Optional: extra item fields
}

interface GeneratorResult {
  success: boolean;
  createdFiles: string[];
  errors: string[];
  outputPath: string;
}
```

### Security Boundaries

The generator:
- **CAN** create TypeScript files in the specified path
- **CAN** scaffold type definitions and utility wrappers
- **CANNOT** modify auth, RLS, or database schemas
- **CANNOT** create API routes or backend logic
- **CANNOT** touch files outside the specified `pathBase`

Backend integration (API routes, persistence, tenant isolation) must be implemented separately in your vertical.

---

## Related Documentation

- `docs/ui/CHURCH-UI-DIRECTION.md` - Church Platform UI phases
- `packages/planner-core/src/index.ts` - Package exports
- `apps/web/src/components/sunday-planner/` - Reference implementation
- `.template-system/registry.json` - Generator registry
