# Service Order V2 Implementation

This document describes the Service Order V2 feature that integrates a drag-and-drop service planning workflow into the Canvas Bulletin Generator.

## Overview

Service Order V2 transforms the bulletin's service items into a full-featured service planning tool:

- **Drag-and-drop reordering** of service items
- **Section grouping** (worship, message, response, etc.)
- **Duration tracking** with running total
- **Internal notes** (not shown on bulletin)
- **Batch save** for efficient updates
- **Integration with Canvas Editor**

## Database Schema Changes

Migration: `packages/database/migrations/031_add_service_order_v2_columns.sql`

Added columns to `service_item` table:
- `duration_minutes` (INTEGER): Estimated duration for service timing
- `section` (VARCHAR(50)): Grouping identifier (worship, message, etc.)
- `notes` (TEXT): Internal notes not displayed on bulletin

Added index:
- `idx_service_item_section`: For efficient section-based queries

## API Endpoints

### Updated Endpoints

All existing endpoints now support the new columns:

**`serviceItems.list`**
- Returns: `durationMinutes`, `section`, `notes` for each item
- Returns: `totalDurationMinutes` for the entire service

**`serviceItems.create`**
- Input: Now accepts `durationMinutes`, `section`, `notes`

**`serviceItems.update`**
- Input: Now accepts `durationMinutes`, `section`, `notes`

### New Endpoints

**`serviceItems.batchSave`**
Efficient batch operation for the Service Order Panel.

```typescript
// Input
{
  bulletinIssueId: string;
  items: Array<{
    id: string | null;  // null for new items
    type: ServiceItemType;
    title: string;
    sequence: number;
    durationMinutes?: number;
    section?: string;
    notes?: string;
    // ... other fields
  }>;
  deleteIds?: string[];  // IDs to delete
}

// Output
{
  success: boolean;
  savedCount: number;
  deletedCount: number;
  savedIds: string[];
}
```

**`serviceItems.copyFromBulletin`**
Copy service items from another bulletin (for "Copy From Previous" feature).

```typescript
// Input
{
  sourceBulletinIssueId: string;
  targetBulletinIssueId: string;
  clearExisting?: boolean;  // default: true
}

// Output
{
  success: boolean;
  copiedCount: number;
  clearedExisting: boolean;
}
```

**`serviceItems.listRecentBulletins`**
List recent bulletins for the "Copy From" dialog.

```typescript
// Input
{
  excludeBulletinId?: string;  // Current bulletin to exclude
  limit?: number;  // default: 10, max: 20
}

// Output
{
  bulletins: Array<{
    id: string;
    issueDate: Date;
    status: string;
    itemCount: number;
  }>;
}
```

## UI Components

### ServiceOrderPanel

Location: `apps/web/src/components/bulletins/ServiceOrderPanel.tsx`

Features:
- Drag-and-drop reordering using `@dnd-kit`
- Section headers with collapse/expand
- Quick add buttons for common item types
- Inline edit modal for item properties
- Duration display with running total
- Batch save with dirty state tracking
- **Copy From Previous** - Copy service order from another bulletin
- **Apply Template** - Apply a standard service order template
- **Lock-aware** - Read-only when bulletin is locked

Props:
```typescript
interface ServiceOrderPanelProps {
  bulletinIssueId: string;
  isLocked?: boolean;
  onItemsChange?: (items: ServiceOrderItem[]) => void;
  showSections?: boolean;
  compactMode?: boolean;
  hideCopyActions?: boolean;  // Hide copy/template buttons in compact mode
}
```

### Canvas Editor Integration

The ServiceOrderPanel is integrated into the Canvas Editor's left panel:

- **Tab 1: Service Order** - Full service planning interface
- **Tab 2: Add Content** - Block palette for adding canvas blocks

## Section Types

Available sections for grouping service items:

| ID | Label | Icon |
|----|-------|------|
| `pre-service` | Pre-Service | clock |
| `worship` | Worship | music |
| `message` | Message | book |
| `response` | Response | pray |
| `closing` | Closing | wave |
| `announcements` | Announcements | megaphone |
| `other` | Other | clipboard |

## Usage Example

1. Open the Canvas Editor for a bulletin
2. Click the "Service Order" tab in the left panel
3. Add items using the quick-add buttons
4. Drag items to reorder
5. Click on an item to edit details (duration, section, notes)
6. Click "Save" to persist changes
7. The "Order of Worship" block on the canvas will reflect your changes

## Files Modified/Created

### New Files
- `packages/database/migrations/031_add_service_order_v2_columns.sql`
- `apps/web/src/components/bulletins/ServiceOrderPanel.tsx`
- `apps/api/src/__tests__/serviceItems.test.ts` - Unit tests
- `docs/bulletins/SERVICE-ORDER-V2.md` (this file)

### Modified Files
- `apps/api/src/routers/serviceItems.ts`
  - Added new columns to interface
  - Updated list, create, update endpoints
  - Added batchSave, copyFromBulletin, listRecentBulletins endpoints
- `apps/web/src/components/bulletins/canvas/BulletinCanvasEditor.tsx`
  - Added LeftPanelTabs component
  - Integrated ServiceOrderPanel
- `apps/web/src/app/bulletins/[id]/page.tsx`
  - Added tab navigation (Overview / Service Order)
  - Integrated ServiceOrderPanel on detail page
  - Added page header actions row
- `apps/web/src/components/bulletins/ServiceItemsList.tsx`
  - Already supported duration and notes (no changes needed)

## Testing

### Unit Tests

Location: `apps/api/src/__tests__/serviceItems.test.ts`

Run tests:
```bash
cd apps/api
npm test -- --testPathPattern=serviceItems.test.ts
```

Test coverage:
- Service item type validation (15 types including placeholders)
- Section type validation (7 section types)
- Duration validation (0-180 minutes, optional)
- Lock enforcement logic
- Copy from bulletin logic (notes clearing, sequence handling)
- Batch save categorization (creates vs updates)
- Total duration calculation
- Recent bulletins query filtering
- Item grouping by section

### Manual Testing Checklist

1. **Service Order Panel on Detail Page**
   - [ ] Navigate to `/bulletins/{id}`
   - [ ] Click "Service Order" tab
   - [ ] Verify drag-and-drop reordering works
   - [ ] Verify section grouping displays correctly
   - [ ] Verify "Save" button appears with unsaved changes

2. **Copy From Previous**
   - [ ] Click "Copy From..." button
   - [ ] Verify recent bulletins dialog appears
   - [ ] Select a bulletin with items
   - [ ] Verify items are copied (notes cleared)
   - [ ] Verify original bulletin unchanged

3. **Apply Template**
   - [ ] Click "Apply Template" button
   - [ ] Select "Standard Service Order"
   - [ ] Verify template items appear
   - [ ] Click "Save" to persist

4. **Lock Behavior**
   - [ ] Lock a bulletin
   - [ ] Verify Service Order Panel is read-only
   - [ ] Verify quick-add buttons are hidden
   - [ ] Verify copy/template buttons are hidden
   - [ ] Verify edit/delete buttons on items are hidden

5. **Canvas Integration**
   - [ ] Open Canvas Editor
   - [ ] Verify Service Order tab shows items
   - [ ] Add/edit items via Service Order tab
   - [ ] Verify Order of Worship block reflects changes

## Future Enhancements

Planned improvements for future iterations:

1. ~~**Template System**~~ **IMPLEMENTED**
   - ~~Save service orders as templates~~
   - ~~Quick-apply previous week's order~~
   - Copy from previous bulletin: `serviceItems.copyFromBulletin`
   - Apply standard template via UI

2. **Planning Center Integration**
   - Import service plans from Planning Center
   - Sync song selections

3. **Team Assignments**
   - Assign people to service items
   - Track who's responsible for each element

4. **Time Calculation**
   - Service end time projection
   - Warning if running over target duration

5. ~~**Multi-Service Support**~~ **PARTIAL**
   - Different orders for morning/evening services
   - ~~Copy between services~~ - Now supported via "Copy From..." button
