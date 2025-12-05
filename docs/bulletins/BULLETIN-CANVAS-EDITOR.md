# Bulletin Canvas Editor - Complete User & Developer Guide

## Overview

### What is the Canvas Bulletin Editor?

The Canvas Bulletin Editor is the primary bulletin design system that provides full drag-and-drop functionality with free positioning of content blocks on bulletin pages. Canvas gives you complete creative control over where every element appears on each page.

**Status:** ✅ Production Ready - The Only Layout System
**Last Updated:** 2025-11-28
**Policy:** Canvas is now the ONLY layout system for new bulletins

### Canvas-Only Architecture

**As of November 2025:**
- All new bulletins are created with Canvas layout
- Canvas provides maximum flexibility for any bulletin design need
- Legacy template bulletins remain view-only (can print/view but not edit)
- One-way conversion available from template → Canvas

**Benefits of Canvas:**
- Complete control over block positioning
- Flexible layouts for any occasion (weekly services, special events, holidays)
- Visual drag-and-drop editing
- Multi-page support (up to 4 pages)
- Consistent editing experience for all bulletins

**Legacy Support:** Template bulletins created before the Canvas-only policy can still be viewed and printed. They can be converted to Canvas when editing is needed.

---

## Data Model

### Database Schema

**Table:** `bulletin_issue`
**Column:** `canvas_layout_json` (JSONB, nullable)
**Migration:** `020_add_canvas_layout_to_bulletin_issue.sql`

```sql
ALTER TABLE bulletin_issue
ADD COLUMN canvas_layout_json JSONB DEFAULT NULL;

CREATE INDEX idx_bulletin_canvas_enabled
ON bulletin_issue(tenant_id, id)
WHERE canvas_layout_json IS NOT NULL AND deleted_at IS NULL;
```

### Type Definitions

**Location:** `packages/types/src/index.ts`

```typescript
// Block types (8 available)
type BulletinCanvasBlockType =
  | 'text'           // Rich text with formatting
  | 'image'          // Images with object-fit controls
  | 'qr'             // QR codes with labels
  | 'serviceItems'   // Order of worship (data-bound)
  | 'announcements'  // Filtered announcements (data-bound)
  | 'events'         // Upcoming events (data-bound)
  | 'giving'         // Donation info with QR
  | 'contactInfo';   // Church contact details (data-bound)

// Individual block instance
interface BulletinCanvasBlock {
  id: string;              // UUID
  type: BulletinCanvasBlockType;
  x: number;               // Position in pixels from left edge
  y: number;               // Position in pixels from top edge
  width: number;           // Width in pixels
  height: number;          // Height in pixels
  rotation?: number;       // Rotation in degrees (optional, not yet in UI)
  zIndex: number;          // Stacking order (higher = front)
  data?: Record<string, any>; // Block-specific configuration
}

// Page (max 4 pages for booklet compatibility)
interface BulletinCanvasPage {
  id: string;
  pageNumber: number;      // 1-4
  blocks: BulletinCanvasBlock[];
}

// Complete bulletin canvas layout
interface BulletinCanvasLayout {
  pages: BulletinCanvasPage[]; // Always 1-4 pages
}
```

### Canvas Dimensions

- **Width:** 816 pixels (8.5" at 96 DPI)
- **Height:** 1056 pixels (11" at 96 DPI)
- **Grid:** 16px default (configurable)
- **Max Pages:** 4 (enforced for booklet printing)

---

## Editor UI

### Top Bar

**Elements:**
- **Title:** "Canvas Editor" + Bulletin ID
- **Save Status Indicator:**
  - ✓ "All changes saved" (green) - No unsaved changes
  - ⟳ "Saving..." (blue) - Autosave in progress
  - ⚠ "Unsaved changes" (amber) - Changes not saved yet
- **Zoom Controls:** 25% - 200% (default 75%)
- **Grid Toggle:** Show/hide visual grid (snapping always active)
- **Cancel Button:** Returns to bulletin detail page (warns if unsaved)
- **Save Button:** Manual save (also triggered by autosave)

### Left Panel: Block Palette

Draggable block types:

1. **📝 Text Block** - Editable text with font controls
2. **🖼️ Image** - Image uploads with object-fit options
3. **⬜ QR Code** - QR code generator with custom URL
4. **📋 Order of Worship** - Auto-populated from service items
5. **📢 Announcements** - Auto-populated, filterable
6. **📅 Events** - Auto-populated with date ranges
7. **💝 Giving Info** - Donation details + QR
8. **📞 Contact Info** - Church address, phone, email, website

**Drag from palette** → **Drop on canvas** to create a new block.

### Center: Canvas Area

**Page Tabs:** Switch between pages 1-4
**Canvas:** 816×1056px page with blocks
**Visual Grid:** 16px grid overlay (optional)
**Empty State:** "Drag blocks from the palette to start designing"

**Selection:** Click a block to select (blue outline)
**Multi-page:** Each page has its own independent layout

### Right Panel: Inspector

Shows properties for selected block:

**Block Type:** Display-only (e.g., "text", "qr")

**Position & Size:**
- X, Y coordinates (editable)
- Width, Height (editable)

**Layer Order:**
- **↑ To Front** - Brings block above all others
- **↓ To Back** - Sends block behind all others
- Current z-index displayed

**Block-Specific Properties:**
- **Text Block:** Content, font size, alignment, color
- **QR Block:** URL, label
- **Other blocks:** Auto-populated from data sources

**Actions:**
- **Duplicate Block** (blue) - Clone with offset position
- **Delete Block** (red) - Remove from canvas

---

## Interactions

### Drag and Drop

**From Palette to Canvas:**
1. Click and hold a block type in the palette
2. Drag onto canvas (visual feedback shows drop zone)
3. Release to create block at cursor position
4. Block is centered on cursor and snapped to grid
5. New block is automatically selected

**Within Canvas (Repositioning):**
1. Click and hold an existing block
2. Drag to new position (block follows cursor)
3. Release to drop (position snaps to grid)
4. Clamped to canvas bounds (can't drag off-page)

### Resize

**Resize Handles:** 8 handles appear when block is selected
- **Corners:** nw, ne, sw, se (resize both width and height)
- **Edges:** n, s, e, w (resize single dimension)

**Constraints:**
- **Minimum Size:** Per block type (e.g., text: 50×30, QR: 80×80)
- **Canvas Bounds:** Can't resize beyond page edges
- **Grid Snapping:** Final size snaps to 16px grid

**How to Resize:**
1. Select a block
2. Click and drag any of the 8 handles
3. Release to commit new size
4. Block respects min size and stays within canvas

### Grid Snapping

**Always Active:** Snapping works even when grid is hidden

**What Snaps:**
- Block position (x, y) after drag
- Block size (width, height) after resize
- New block creation

**Grid Size:** 16px default (configurable in state)

**Disable Snapping:** Not currently supported (always on for clean layouts)

### Keyboard Controls

**Arrow Keys (Selected Block):**
- **↑ ↓ ← →** - Nudge block 1px in direction
- **Shift + Arrow** - Nudge block 10px (larger steps)

**Delete/Backspace:** Remove selected block (with confirmation)

**Conditions:**
- A block must be selected
- Cursor NOT in an input/textarea
- Editor has focus

**Bounds:** Keyboard nudging respects canvas bounds (can't move off-page)

### Z-Index Controls

**Purpose:** Control which blocks appear in front/behind when overlapping

**Bring to Front:** Sets z-index to max+1 (block on top)
**Send to Back:** Sets z-index to min-1 (block on bottom)

**Print Behavior:** Z-order is preserved in print mode (same rendering order)

### Block Duplication

**How to Duplicate:**
1. Select a block
2. Click "Duplicate Block" in inspector
3. New block created with:
   - Same type and data (deep copy)
   - Offset position (+16px x and y)
   - New unique ID
   - Z-index = max+1 (appears on top)
4. New block is automatically selected

**Use Case:** Quickly create multiple similar blocks (e.g., repeating text elements)

---

## Saving & Safety Nets

### How Saving Works

**Manual Save:**
- Click "Save Layout" button in top bar
- Sends `canvasLayoutJson` to server via tRPC mutation
- On success: Updates bulletin record, redirects to detail page

**Mutation:** `trpc.bulletins.update.useMutation`

```typescript
await updateBulletin.mutateAsync({
  id: bulletinId,
  canvasLayoutJson: layout, // Full BulletinCanvasLayout object
});
```

### Dirty State Tracking

**Tracks unsaved changes** to prevent data loss.

**When Marked Dirty:**
- Block added/removed
- Block moved or resized
- Block data changed (text, URL, etc.)
- Any layout modification

**When Cleared:**
- Save completes successfully
- On mount (if no changes made yet)

**Never Cleared On:**
- Failed save attempts
- Navigation attempts (prevents losing work)

### Autosave

**Debounced Autosave:** Automatically saves after 12 seconds of inactivity

**How It Works:**
1. User makes a change → layout marked dirty
2. 12-second timer starts
3. If no further changes in that window → autosave triggers
4. Save runs in background (non-blocking)
5. On success: dirty flag cleared, status → "All changes saved"
6. On failure: error shown, dirty flag remains

**In-Flight Guard:** Only one autosave at a time (prevents race conditions)

**Manual Save:** User can still manually save before autosave triggers

### Save Status Messages

Displayed in top bar:

1. **✓ All changes saved** (green)
   - No unsaved changes
   - Last save succeeded

2. **⟳ Saving...** (blue)
   - Save in progress (manual or auto)
   - Spinner animation

3. **⚠ Unsaved changes** (amber)
   - Modifications not saved
   - Autosave pending

4. **Error saving** (red)
   - Save failed (hover for details)
   - User should manually retry

### Navigation Protection

**Browser Close/Refresh:**
- `beforeunload` event listener
- Browser shows: "You have unsaved changes. Are you sure you want to leave?"
- User can cancel to stay on page

**In-App Navigation:**
- Clicking "Cancel" button shows warning if dirty
- Prevents accidental navigation away from editor

**Override:** User can choose to leave anyway (changes lost)

---

## Print Integration

### How Canvas Layout is Used

**Print Route:** `/bulletins/[id]/print`

**Detection Logic:**
```typescript
const canvasLayout = bulletin.canvasLayoutJson as BulletinCanvasLayout | null;
const usesCanvasLayout = canvasLayout && canvasLayout.pages && canvasLayout.pages.length > 0;

if (usesCanvasLayout) {
  // Render with BulletinCanvasMultiPageView (mode="print")
} else {
  // Fall back to template-based rendering
}
```

**Component:** `BulletinCanvasMultiPageView` in `mode="print"`

### Standard vs Booklet Modes

**Standard Mode** (`?mode=standard` or default):
- Pages printed in natural order: 1, 2, 3, 4
- Each page on separate sheet
- Portrait orientation
- Page breaks between pages

**Booklet Mode** (`?mode=booklet`):
- **Page Reordering:** Pages arranged as [4, 1, 2, 3]
- **Automatic Padding:** If <4 pages, blank pages added
- **Print Instructions:** 2-up printing with duplex
- **Expected Output:**
  - Sheet 1 Front: Page 4 (left) + Page 1 (right)
  - Sheet 1 Back: Page 2 (left) + Page 3 (right)
  - When folded: Pages appear in order 1→2→3→4

**Mode Toggle:** Available in print preview (both canvas and template bulletins)

### Limitations

**Max 4 Pages:** Enforced for booklet compatibility (editor prevents adding more)

**Blank Page Padding:** Booklet mode automatically pads to 4 pages if needed

**No Mixed Layouts:** Bulletin uses EITHER canvas OR template (never both)

### Print Consistency

**Editor ≈ Print:** What you see in the editor matches printed output (scaled)

**Same Rendering:** Both modes use identical components (`BulletinCanvasPageView`)

**Only Differences:**
- **Scale/Zoom:** Editor uses zoom state, print uses fixed 100%
- **Editor Overlays:** Grid, selection boxes, handles hidden in print
- **Page Breaks:** Automatic in print mode

---

## Extending the Editor

### How to Add a New Block Type

**Example:** Adding a "Video Embed" block

#### 1. Update Type Definitions

**File:** `packages/types/src/index.ts`

```typescript
export const BulletinCanvasBlockType = z.enum([
  'text',
  'image',
  'qr',
  'serviceItems',
  'announcements',
  'events',
  'giving',
  'contactInfo',
  'videoEmbed', // 🆕 Add new type
]);
```

#### 2. Create Renderer Component

**File:** `apps/web/src/components/bulletins/canvas/CanvasVideoEmbedBlock.tsx`

```typescript
'use client';

import type { CanvasBlockRendererProps, VideoEmbedBlockData } from './types';

export function CanvasVideoEmbedBlock({ block, mode }: CanvasBlockRendererProps) {
  const data = (block.data || {}) as VideoEmbedBlockData;

  if (mode === 'print') {
    // Print mode: Show placeholder or QR code
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 border-2 border-gray-300 rounded">
        <p className="text-sm text-gray-600">Video: {data.title || 'Embedded Video'}</p>
      </div>
    );
  }

  // Editor mode: Show iframe or thumbnail
  return (
    <div className="h-full w-full">
      {data.embedUrl ? (
        <iframe
          src={data.embedUrl}
          className="w-full h-full border-0"
          allowFullScreen
          title={data.title || 'Video'}
        />
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-50 border border-gray-200 rounded">
          <p className="text-sm text-gray-500">No video URL set</p>
        </div>
      )}
    </div>
  );
}
```

#### 3. Register in Renderer

**File:** `apps/web/src/components/bulletins/canvas/CanvasBlockRenderer.tsx`

```typescript
case 'videoEmbed':
  return <CanvasVideoEmbedBlock {...commonProps} />;
```

#### 4. Add to Palette

**File:** `apps/web/src/components/bulletins/canvas/BulletinCanvasEditor.tsx`

```typescript
// In BlockPalette function
const blockTypes = [
  // ... existing types
  { type: 'videoEmbed', label: 'Video Embed', icon: '🎥' },
];

// In createBlock function (default sizes)
const defaultSizes = {
  // ... existing sizes
  videoEmbed: { width: 400, height: 300 },
};

// In createBlock function (default data)
const defaultData = {
  // ... existing data
  videoEmbed: { embedUrl: '', title: 'Video' },
};
```

#### 5. Update Min Sizes

**File:** `apps/web/src/components/bulletins/canvas/utils.ts`

```typescript
export const MIN_BLOCK_SIZES = {
  // ... existing sizes
  videoEmbed: { width: 200, height: 150 },
};
```

#### 6. Add Inspector Properties (Optional)

**File:** `apps/web/src/components/bulletins/canvas/BulletinCanvasEditor.tsx`

```typescript
// In BlockInspector component
{block.type === 'videoEmbed' && <VideoEmbedBlockProperties block={block} onUpdate={onUpdate} />}

// New component
function VideoEmbedBlockProperties({ block, onUpdate }) {
  const data = (block.data || {}) as any;
  const updateData = (updates: any) => onUpdate({ data: { ...data, ...updates } });

  return (
    <div className="space-y-3 border-t pt-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Video URL</label>
        <input
          type="url"
          value={data.embedUrl || ''}
          onChange={(e) => updateData({ embedUrl: e.target.value })}
          className="w-full px-2 py-1 text-sm border rounded"
          placeholder="https://www.youtube.com/embed/..."
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={data.title || ''}
          onChange={(e) => updateData({ title: e.target.value })}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
    </div>
  );
}
```

### Gotchas & Best Practices

**1. Stay Within Bounds**
- Always use `constrainBlock()` after position changes
- Respect canvas dimensions: 816×1056px

**2. Print-Safe Rendering**
- Test block in both `mode="editor"` and `mode="print"`
- Consider what makes sense on paper (e.g., videos → QR code or placeholder)

**3. Grid Snapping**
- Default sizes should be multiples of gridSize (16px)
- Makes initial placement cleaner

**4. Data-Bound Blocks**
- Blocks like `serviceItems`, `announcements`, `events` fetch live data
- Use tRPC queries in the component
- Show loading states appropriately

**5. Performance**
- Limit to ~20 blocks per page for smooth editing
- Use memoization for heavy renderers

**6. Fonts & Styling**
- Use system fonts or web-safe fonts for print compatibility
- Avoid custom fonts that may not render in PDF

---

## Keyboard Shortcuts Reference

| Key Combination | Action |
|----------------|--------|
| **Arrow Keys** | Nudge selected block 1px |
| **Shift + Arrow** | Nudge selected block 10px |
| **Delete** | Remove selected block |
| **Backspace** | Remove selected block |
| **Cmd/Ctrl + S** | Manual save (future enhancement) |

---

## Troubleshooting

### Block Not Appearing

**Cause:** Block positioned outside canvas bounds or has zero size

**Fix:**
1. Check X/Y values in inspector (must be 0 ≤ x ≤ 816, 0 ≤ y ≤ 1056)
2. Check width/height > min size for block type
3. Check z-index (might be behind another block)

### Drag Not Working

**Cause:** `mode="print"` disables all interactions

**Fix:** Ensure `mode="editor"` in `BulletinCanvasPageView`

### Resize Not Working

**Cause:** Block not selected, or `onUpdate` callback missing

**Fix:**
1. Click block to select (blue outline should appear)
2. Verify resize handles appear
3. Check that `onUpdate` prop is passed through component tree

### Autosave Not Triggering

**Cause:** Timer cleared by rapid edits, or autosave already in flight

**Check:**
- Status should show "Unsaved changes" (amber)
- Wait 12 seconds without making further edits
- If still not saving, check browser console for errors

### Print Layout Different from Editor

**Expected:** Minor scale differences, but layout should be identical

**Check:**
- Verify zoom state in editor (default 75%)
- Print mode uses 100% scale
- Grid overlay hidden in print (but positions remain same)

### Unsaved Changes Warning Not Appearing

**Cause:** Browser may have blocked `beforeunload` event

**Fix:**
- Check browser console for blocked events
- Ensure `isDirty` state is being tracked (check save status indicator)

---

## Performance Optimization

### Best Practices

**Block Limits:**
- Recommended: ≤20 blocks per page
- Maximum: No hard limit, but performance degrades >30 blocks

**Data-Bound Blocks:**
- Use data-bound blocks (announcements, events) instead of many individual text blocks
- Fetches once, renders many items

**Images:**
- Resize images before upload (don't upload 10MB+ files)
- Use appropriate formats (JPG for photos, PNG for graphics)

**Autosave:**
- 12-second debounce prevents excessive saves
- Single in-flight guard prevents race conditions

---

## Security & Multi-Tenancy

### Tenant Isolation

**API Layer:**
- All canvas operations use existing `bulletins.get` / `bulletins.update` endpoints
- Multi-tenant `tenant_id` filtering enforced at tRPC router level

**Database:**
- `canvas_layout_json` stored in `bulletin_issue` table (tenant-scoped)
- RLS policies enforce tenant isolation
- No direct database access from canvas components

### Role-Based Access

**Required Roles:** Admin, Editor

**Blocked Roles:** Submitter, Viewer, Kiosk

**Implementation:**
```typescript
<ProtectedPage requiredRoles={['admin', 'editor']}>
  <BulletinCanvasEditor ... />
</ProtectedPage>
```

**Enforcement:** Both canvas editor route and print route check roles

---

## Migration Path: Template → Canvas

### Option 1: Manual Conversion (Recommended)

1. Create new bulletin or open existing
2. Navigate to `/bulletins/[id]/canvas`
3. Manually recreate layout using canvas blocks
4. Test print output (standard + booklet)
5. Save layout

**Pros:** Full control, clean slate
**Cons:** Time-consuming for complex layouts

### Option 2: Hybrid Approach

1. Keep template-based bulletins for weekly production
2. Use canvas for special events only (Christmas, Easter)
3. Print route auto-detects layout type
4. No breaking changes to existing bulletins

**Pros:** Low risk, gradual adoption
**Cons:** Managing two systems

### Option 3: Bulk Convert (Not Implemented)

Would require migration script to convert `designOptions` + service items → canvas blocks.

**Not recommended** due to layout complexity and potential data loss.

---

## File Structure Reference

```
apps/web/src/
├── app/bulletins/[id]/
│   ├── canvas/
│   │   └── page.tsx                # Canvas editor route
│   └── print/
│       └── page.tsx                # Print route (canvas-aware)
│
└── components/bulletins/canvas/
    ├── types.ts                    # Shared TypeScript interfaces
    ├── utils.ts                    # Grid snapping, resize utilities
    ├── BulletinCanvasEditor.tsx    # Main editor (top-level)
    ├── BulletinCanvasPageView.tsx  # Single page renderer
    ├── BulletinCanvasMultiPageView.tsx  # Multi-page container
    ├── CanvasBlockRenderer.tsx     # Routes by block type
    ├── CanvasBlockWrapper.tsx      # Positioning, drag, resize
    ├── ResizeHandles.tsx           # Resize UI
    ├── CanvasTextBlock.tsx         # Text renderer
    ├── CanvasImageBlock.tsx        # Image renderer
    ├── CanvasQrBlock.tsx           # QR code renderer
    ├── CanvasServiceItemsBlock.tsx # Service items (data-bound)
    ├── CanvasAnnouncementsBlock.tsx # Announcements (data-bound)
    ├── CanvasEventsBlock.tsx       # Events (data-bound)
    ├── CanvasGivingBlock.tsx       # Giving info
    ├── CanvasContactInfoBlock.tsx  # Contact info (data-bound)
    └── index.ts                    # Barrel exports
```

---

## Version History

**v1.0** (2025-11-28)
- ✅ Initial production release
- ✅ 8 block types
- ✅ Drag-and-drop with dnd-kit
- ✅ Resize with 8 handles
- ✅ Grid snapping (16px)
- ✅ Print integration (standard + booklet)
- ✅ Dirty state tracking
- ✅ Autosave (12-second debounce)
- ✅ Keyboard controls (arrow keys, delete)
- ✅ Block duplication
- ✅ Z-index controls
- ✅ Browser navigation protection

---

## Future Enhancements

Planned features (not yet implemented):

- [ ] Undo/Redo with command pattern
- [ ] Alignment guides (snap to other blocks)
- [ ] Keyboard shortcuts (Cmd+Z, Cmd+C, Cmd+V)
- [ ] Block grouping/locking
- [ ] Template library (save/load layouts)
- [ ] Export layout as JSON
- [ ] Import layout from JSON
- [ ] Rotation UI controls (data field exists)
- [ ] Rulers and guides
- [ ] Multi-select blocks

---

**Documentation Version:** 1.0
**Status:** ✅ Production Ready
**Last Updated:** 2025-11-28

For questions or issues, refer to this document or check the source code in the `apps/web/src/components/bulletins/canvas/` directory.
