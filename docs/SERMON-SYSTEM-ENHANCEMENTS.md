# Sermon System Enhancements (Phases 2-6)

**Date:** 2025-12-02
**Status:** Complete
**Breaking Changes:** None (fully backward compatible)

---

## Overview

This document describes the enhancements made to the Sermon Builder, Preach Mode, and related components. All changes extend the existing system without breaking backward compatibility with existing sermon data.

---

## Table of Contents

1. [Phase 2: Block Types & Flags](#phase-2-block-types--flags)
2. [Phase 3: SermonBuilder Enhancements](#phase-3-sermonbuilder-enhancements)
3. [Phase 4: PreachMode Improvements](#phase-4-preachmode-improvements)
4. [Phase 5: Print/Outline View](#phase-5-printoutline-view)
5. [Phase 6: Integration Links](#phase-6-integration-links)
6. [Files Changed](#files-changed)
7. [Backward Compatibility](#backward-compatibility)
8. [Usage Guide](#usage-guide)

---

## Phase 2: Block Types & Flags

### Changes to `packages/types/src/index.ts`

#### New Type: `SermonBlockType`

```typescript
export const SermonBlockType = z.enum([
  'POINT',        // Main sermon point (default)
  'SCRIPTURE',    // Scripture reading/reference
  'ILLUSTRATION', // Story, example, or illustration
  'NOTE',         // Personal note, transition, or structural element
]);

export type SermonBlockType = z.infer<typeof SermonBlockType>;
```

#### Extended `SermonOutlinePointSchema`

```typescript
export const SermonOutlinePointSchema = z.object({
  label: z.string().min(1),
  scriptureRef: z.string().optional(),
  summary: z.string().optional(),
  notes: z.string().optional(),

  // NEW fields - all optional for backward compatibility
  type: SermonBlockType.optional(),        // Default: 'POINT' when undefined
  showOnSlides: z.boolean().optional(),    // Default varies by type
  includeInPrint: z.boolean().optional(),  // Default: true
});
```

#### New Helper Functions

```typescript
/**
 * Get default flag values for a given block type.
 *
 * Defaults:
 * - POINT: showOnSlides=true, includeInPrint=true
 * - SCRIPTURE: showOnSlides=true, includeInPrint=true
 * - ILLUSTRATION: showOnSlides=false, includeInPrint=true
 * - NOTE: showOnSlides=false, includeInPrint=true
 */
export function getBlockDefaults(type: SermonBlockType | undefined): {
  showOnSlides: boolean;
  includeInPrint: boolean;
}

/**
 * Get the effective block type, defaulting to 'POINT' if undefined.
 */
export function getEffectiveBlockType(type: SermonBlockType | undefined): SermonBlockType
```

---

## Phase 3: SermonBuilder Enhancements

### Changes to `apps/web/src/components/sermons/SermonBuilder.tsx`

#### New UI Elements

1. **Block Type Selector**
   - Dropdown for each block to select: POINT, SCRIPTURE, ILLUSTRATION, NOTE
   - Color-coded badges:
     - POINT: Blue (`bg-blue-100 text-blue-800`)
     - SCRIPTURE: Amber (`bg-amber-100 text-amber-800`)
     - ILLUSTRATION: Green (`bg-green-100 text-green-800`)
     - NOTE: Gray (`bg-gray-100 text-gray-700`)

2. **Per-Block Flag Toggles**
   - "Slides" toggle - controls `showOnSlides`
   - "Print" toggle - controls `includeInPrint`
   - Visual indicators show current state

3. **3-Point Template Button**
   - Inserts a standard sermon structure:
     ```
     1. Introduction (NOTE)
     2. Point 1 (POINT)
     3. Point 2 (POINT)
     4. Point 3 (POINT)
     5. Application (NOTE)
     6. Conclusion (NOTE)
     ```
   - Confirms before replacing existing content

4. **Dynamic Labels**
   - Field labels change based on block type:
     - POINT: "Point Label", "Summary"
     - SCRIPTURE: "Scripture Title/Reference", "Scripture Text"
     - ILLUSTRATION: "Illustration Title", "Story/Example"
     - NOTE: "Note Title", "Note Content"

5. **Header Buttons**
   - Added "Print" button alongside "Preach Mode"

#### New Functions

```typescript
// Create a new block with proper defaults
function createNewBlock(type: SermonBlockType = 'POINT'): SermonOutlinePoint

// Insert 3-point template
const insertTemplate = () => void

// Update block type and apply defaults
const updateBlockType = (index: number, newType: SermonBlockType) => void

// Toggle block flag
const toggleBlockFlag = (index: number, flag: 'showOnSlides' | 'includeInPrint') => void
```

---

## Phase 4: PreachMode Improvements

### Changes to `apps/web/src/components/sermons/PreachMode.tsx`

#### New Features

1. **Tap Zones for Navigation**
   - Left 1/3 of screen: Go to previous block
   - Right 1/3 of screen: Go to next block
   - Center area: Safe for content interaction
   - Disabled at boundaries (first/last block)
   - Visual feedback on tap (`active:bg-gray-500/10`)

2. **Target Time & Overtime Warning**
   - Settings panel to set target time in minutes
   - Timer display shows elapsed time
   - When overtime:
     - Timer background turns red (`bg-red-500/20`)
     - Shows "+X:XX over" text
   - Non-intrusive (no modals or alerts)

3. **Block-Type-Aware Styling**
   ```typescript
   const BLOCK_STYLES: Record<SermonBlockType, {...}> = {
     POINT: {
       labelClass: 'font-bold text-[1.2em]',
       contentClass: '',
       icon: <FileText />,
       dividerClass: 'border-t-2 border-current opacity-20',
     },
     SCRIPTURE: {
       labelClass: 'font-semibold italic text-[1.1em]',
       contentClass: 'italic',
       icon: <BookOpen />,
       dividerClass: 'border-t border-current opacity-10',
     },
     ILLUSTRATION: {
       labelClass: 'font-medium text-[1em]',
       contentClass: 'text-[0.95em]',
       icon: <Lightbulb />,
       dividerClass: 'border-t border-dashed',
     },
     NOTE: {
       labelClass: 'font-normal text-[0.9em] opacity-80',
       contentClass: 'text-[0.85em] opacity-80',
       icon: <StickyNote />,
       dividerClass: '',
     },
   };
   ```

4. **Fullscreen Toggle**
   - Button in header (Maximize/Minimize icons)
   - Keyboard shortcut: `F` key
   - Uses browser Fullscreen API
   - Properly handles fullscreen change events

5. **Fallback Mode**
   - When `mainPoints` is empty, displays:
     - Title and scripture
     - Big idea (if available)
     - Full manuscript (if available)
     - Application and call to action
   - Shows "(No structured outline - showing full content)" indicator

6. **Keyboard Navigation**
   - `ArrowRight`, `Space`, `PageDown`: Next block
   - `ArrowLeft`, `PageUp`: Previous block
   - `Escape`: Close settings → Exit fullscreen → Exit PreachMode
   - `F`: Toggle fullscreen

7. **No Network Dependence**
   - Sermon data loaded once at mount
   - No polling or re-fetching during preaching
   - Works offline after initial load

---

## Phase 5: Print/Outline View

### New File: `apps/web/src/app/sermons/[id]/print/page.tsx`

#### Features

1. **Print-Optimized Layout**
   - Clean, distraction-free design
   - Appropriate font sizes and spacing
   - No navigation elements in print

2. **Header Section**
   - Sermon title
   - Preacher name
   - Date (formatted: "Monday, December 2, 2025")
   - Primary scripture
   - Big idea (highlighted box)

3. **Block Rendering**
   - Only includes blocks where `includeInPrint !== false`
   - Block-type-aware styling:
     - POINT: Numbered with circular badge, bold
     - SCRIPTURE: Italic, left border accent
     - ILLUSTRATION: Medium weight, indented label
     - NOTE: Smaller, muted styling
   - Shows scripture references, summary, and notes

4. **Footer Section**
   - Application section
   - Call to action (highlighted box)
   - Extra notes (if any)

5. **Print Controls**
   - "Back" button (hidden in print)
   - "Print" button triggers `window.print()`

6. **Print Styles**
   ```css
   @media print {
     @page {
       margin: 0.75in;
       size: letter;
     }
     /* Page break handling */
     li { page-break-inside: avoid; }
     /* Color adjustments for print */
   }
   ```

---

## Phase 6: Integration Links

### Changes to `apps/web/src/app/sermons/[id]/page.tsx`

Added buttons to sermon detail header:
- "Print Outline" → `/sermons/[id]/print`
- "Preach Mode" → `/sermons/[id]/preach`

### Changes to `apps/web/src/components/bulletins/ServiceItemsList.tsx`

When a service item has a linked sermon (`sermonId`), displays:
- Sermon title link → `/sermons/[id]`
- "Preach" quick button → `/sermons/[id]/preach`
- "Print" quick button → `/sermons/[id]/print`

---

## Files Changed

| File | Type | Description |
|------|------|-------------|
| `packages/types/src/index.ts` | Modified | Added `SermonBlockType`, extended `SermonOutlinePointSchema`, added helper functions |
| `apps/web/src/components/sermons/SermonBuilder.tsx` | Modified | Block type selector, flag toggles, 3-point template, Print button |
| `apps/web/src/components/sermons/PreachMode.tsx` | Modified | Tap zones, target time, block styling, fullscreen, fallback mode |
| `apps/web/src/app/sermons/[id]/print/page.tsx` | **Created** | Print-friendly outline view |
| `apps/web/src/app/sermons/[id]/page.tsx` | Modified | Added Print Outline and Preach Mode buttons |
| `apps/web/src/components/bulletins/ServiceItemsList.tsx` | Modified | Added Preach and Print links for linked sermons |

---

## Backward Compatibility

All changes are **fully backward compatible**:

1. **New type fields are optional**
   - `type`, `showOnSlides`, `includeInPrint` are all optional in the schema
   - Existing sermons without these fields continue to work

2. **Default behavior for missing fields**
   - `type === undefined` → treated as `'POINT'`
   - `showOnSlides === undefined` → uses type-based default
   - `includeInPrint === undefined` → defaults to `true`

3. **No database migrations required**
   - All changes are to the shape of JSON stored in the existing `outline` JSONB column
   - No new columns or tables

4. **Existing AI endpoints unchanged**
   - Continues to use `ai.suggestBigIdea`, `ai.suggestOutline`, `ai.shortenText`
   - No new AI endpoints required

---

## Usage Guide

### Creating a New Sermon with Block Types

1. Navigate to sermon builder
2. Click "📋 3-Point Template" to start with a structure, OR
3. Click "+ Add Block" to add blocks manually
4. For each block:
   - Select type from dropdown (POINT, SCRIPTURE, etc.)
   - Fill in label, scripture ref, summary
   - Toggle "Slides" to control Preach Mode visibility
   - Toggle "Print" to control print inclusion

### Using Preach Mode

1. From sermon detail or builder, click "Preach Mode"
2. Set target time in Settings (gear icon) if desired
3. Navigate using:
   - Tap left/right sides of screen
   - Arrow keys or Space
   - Prev/Next buttons
4. Press "F" for fullscreen
5. Timer turns red when overtime

### Printing a Sermon Outline

1. From sermon detail or builder, click "Print Outline"
2. Review the print preview
3. Click "Print" button or use Ctrl+P
4. Only blocks with "Print" enabled will appear

### From Bulletin/Service Items

1. When viewing a bulletin with a linked sermon
2. Click sermon title to view details
3. Click "Preach" for quick access to Preach Mode
4. Click "Print" for quick access to print view

---

## Technical Notes

### TypeScript Imports

```typescript
// For type checking
import type { SermonBlockType, SermonOutlinePoint } from '@elder-first/types';

// For runtime helpers
import { getBlockDefaults, getEffectiveBlockType } from '@elder-first/types';
```

### Zod Validation

The schema remains valid for existing data:
```typescript
const result = SermonOutlineSchema.safeParse(existingOutline);
// result.success === true for old data without new fields
```

### Future Considerations

1. **PDF Generation** - Currently browser-based; could add server-side PDF pipeline
2. **Offline Support** - PreachMode works offline after load; could add full PWA caching
3. **More Block Types** - Schema easily extensible for QUOTE, VIDEO, etc.
4. **Slide Export** - Could generate ProPresenter-compatible slides from blocks with `showOnSlides: true`
