# Planner Blueprint — Implementation Spec

Step-by-step guide for creating a new vertical planner using `@elder-first/planner-core`.

---

## 1. Overview

### Core Package Provides

| Export | Purpose |
|--------|---------|
| `PlannerPlan`, `PlannerSection`, `PlannerItem` | Base types for the hierarchy |
| `PlannerItemType`, `PlannerItemTypeDefinition` | Item categorization |
| `PLANNER_ITEM_TYPES`, `getItemTypeDefinition()` | Item type registry and lookup |
| `computeItemStartTimes()`, `computeEndTime()` | Time calculation utilities |
| `generatePlanOutline()`, `generateMinimalOutline()` | Text outline generation |

### Your Vertical Provides

| Component | Responsibility |
|-----------|----------------|
| Extended types | Add domain-specific fields (e.g., `scriptureRef`, `operator`) |
| Item type config | Map types to icons, colors, UI labels |
| UI components | Editor, viewer, list, drag-and-drop |
| Backend/API | Persistence, auth, tenant isolation |

---

## 2. Core Package Usage Contract

### Rules

1. **Import, don't fork** — Always import from `@elder-first/planner-core`
2. **Extend, don't modify** — Use TypeScript `extends` for custom fields
3. **Wrap utilities** — Create thin wrappers that add vertical-specific behavior
4. **No UI in core** — Icons, colors, and components live in your vertical

### Import Pattern

```typescript
// ✅ Correct — import from core
import {
  PlannerPlan,
  PlannerSection,
  PlannerItem,
  computeItemStartTimes,
  generatePlanOutline,
} from '@elder-first/planner-core';

// ❌ Wrong — copying core code into your vertical
// import { PlannerPlan } from './copied-planner-types';
```

---

## 3. Vertical Implementation Recipe

### Step 3.1 — Create Extended Types

Define your vertical's domain-specific fields by extending core types.

```typescript
// src/types.ts
import {
  PlannerItem,
  PlannerSection,
  PlannerPlan,
} from '@elder-first/planner-core';

// Extend item with vertical-specific fields
export interface MeetingItemData extends PlannerItem {
  presenter?: string;
  attachmentUrl?: string;
}

// Extend section (usually unchanged)
export interface MeetingSectionData extends PlannerSection<MeetingItemData> {}

// Extend plan with vertical-specific metadata
export interface MeetingPlanData extends PlannerPlan<MeetingSectionData> {
  organizer: string;
  location?: string;
  meetingLink?: string;
}
```

### Step 3.2 — Create Item Type Config

Map item types to UI properties. **Icons and colors live here, not in core.**

```typescript
// src/itemTypeConfig.ts
import { PlannerItemTypeDefinition } from '@elder-first/planner-core';
import { Users, FileText, MessageSquare, Clock } from 'lucide-react';

export interface MeetingItemTypeConfig extends PlannerItemTypeDefinition {
  icon: React.ComponentType;
  bgColor: string;
  textColor: string;
}

export const MEETING_ITEM_TYPES: MeetingItemTypeConfig[] = [
  {
    type: 'discussion',
    label: 'Discussion',
    description: 'Open discussion topic',
    defaultDuration: 15,
    icon: MessageSquare,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  {
    type: 'presentation',
    label: 'Presentation',
    description: 'Prepared presentation or demo',
    defaultDuration: 20,
    icon: FileText,
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
  {
    type: 'breakout',
    label: 'Breakout',
    description: 'Small group activity',
    defaultDuration: 10,
    icon: Users,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  {
    type: 'break',
    label: 'Break',
    description: 'Scheduled break',
    defaultDuration: 5,
    icon: Clock,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
  },
];

export const MEETING_ITEM_TYPE_MAP = new Map(
  MEETING_ITEM_TYPES.map((t) => [t.type, t])
);

export function getMeetingItemConfig(type: string): MeetingItemTypeConfig {
  return MEETING_ITEM_TYPE_MAP.get(type) ?? MEETING_ITEM_TYPES[0];
}
```

### Step 3.3 — Create Time Utils Wrapper

Wrap core time utilities if you need vertical-specific formatting.

```typescript
// src/timeUtils.ts
import {
  computeItemStartTimes,
  computeEndTime,
  formatMinutesToTime,
  formatDurationDisplay,
} from '@elder-first/planner-core';
import type { MeetingPlanData } from './types';

// Re-export core utilities for convenience
export { formatMinutesToTime, formatDurationDisplay };

// Typed wrapper for your vertical
export function computeMeetingStartTimes(plan: MeetingPlanData) {
  return computeItemStartTimes(plan);
}

export function computeMeetingEndTime(plan: MeetingPlanData) {
  return computeEndTime(plan);
}
```

### Step 3.4 — Create Outline Wrapper

Customize outline generation for your domain.

```typescript
// src/outlineUtils.ts
import { generatePlanOutline } from '@elder-first/planner-core';
import type { MeetingPlanData, MeetingItemData } from './types';
import { getMeetingItemConfig } from './itemTypeConfig';

export function generateMeetingAgenda(plan: MeetingPlanData): string {
  return generatePlanOutline(plan, {
    headerPrefix: `Meeting: ${plan.organizer}`,
    includeNotes: true,
    getItemTypeLabel: (type) => getMeetingItemConfig(type).label,
    footerText: plan.location ? `Location: ${plan.location}` : undefined,
    getExtraDetails: (item: MeetingItemData) =>
      item.presenter ? `Presenter: ${item.presenter}` : undefined,
  });
}
```

### Step 3.5 — Wire into UI

Build your components using the typed wrappers.

```typescript
// src/components/MeetingEditor.tsx
import { useMemo } from 'react';
import type { MeetingPlanData } from '../types';
import { computeMeetingStartTimes, computeMeetingEndTime } from '../timeUtils';

export function MeetingEditor({ plan }: { plan: MeetingPlanData }) {
  const startTimes = useMemo(() => computeMeetingStartTimes(plan), [plan]);
  const endTime = useMemo(() => computeMeetingEndTime(plan), [plan]);

  return (
    <div>
      <header>
        <h1>{plan.organizer}'s Meeting</h1>
        <p>Ends at: {endTime}</p>
      </header>
      {/* Section and item rendering */}
    </div>
  );
}
```

---

## 4. Implementation Notes / Gotchas

### Extension Pattern

Always extend core types; never modify them directly:

```typescript
// ✅ Extend
export interface MyItem extends PlannerItem {
  customField: string;
}

// ❌ Don't augment the module
declare module '@elder-first/planner-core' {
  interface PlannerItem {
    customField: string; // Don't do this
  }
}
```

### Icons and Colors

- **Never** add icons/colors to `planner-core`
- Core stays framework-agnostic (no React, no Lucide, no Tailwind)
- Each vertical defines its own visual config

### Type Safety

Use generics to maintain type safety through the hierarchy:

```typescript
// The generic flows through
PlannerPlan<MeetingSectionData>
  → sections: MeetingSectionData[]
    → items: MeetingItemData[]
```

### Re-exporting Core

For developer convenience, create a barrel export:

```typescript
// src/index.ts
export * from './types';
export * from './itemTypeConfig';
export * from './timeUtils';
export * from './outlineUtils';

// Re-export commonly used core types
export type {
  PlannerItemType,
  PlannerItemTypeDefinition,
} from '@elder-first/planner-core';
```

---

## 5. Security Notes

### What Belongs in Core

- Type definitions
- Pure utility functions (time math, outline generation)
- Item type metadata (labels, descriptions, defaults)

### What Does NOT Belong in Core

| Concern | Where It Belongs |
|---------|------------------|
| Authentication | Vertical backend |
| Authorization | Vertical backend |
| Database access | Vertical backend |
| Tenant isolation | Vertical backend |
| User data | Vertical backend |
| API routes | Vertical backend |

### Validation

- Core provides type structure only
- Input validation happens at API boundaries in your vertical
- Never trust client-side data; validate on the server

---

## 6. Checklist

Before shipping your vertical planner:

- [ ] Types extend `PlannerItem`, `PlannerSection`, `PlannerPlan`
- [ ] Item type config defines icons/colors (not in core)
- [ ] Time utilities are wrapped with your types
- [ ] Outline generation is customized for your domain
- [ ] No core package modifications
- [ ] Backend handles auth/persistence separately
- [ ] API validates all input
