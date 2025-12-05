# Drift Fix Summary - Minimal Approach

## 1. Debug Route Created
**Path:** `/debug/resize`
**File:** `apps/web/src/app/debug/resize/page.tsx`

This is a minimal reproduction that proves correct SE resize behavior:
- Fixed 800x600 canvas
- Single block at (200, 200)
- SE resize handle that ONLY changes width/height
- x and y stay constant during resize
- No rotation, no grid snapping, no helpers

**Test:** Navigate to `/debug/resize` and resize the block. The red anchor dot should NEVER move.

## 2. Main Canvas Changes

### ResizeHandles.tsx (Line 46-66)
**Old resize logic location:** Line 42-48 called `resizeBlock()` helper
**New SE resize logic for Announcements:**
```typescript
if (block.type === 'announcements' && activeHandle === 'se') {
  // Direct implementation matching DebugResize - NO HELPERS
  updates = {
    x: startBlock.x,  // EXPLICITLY set to prevent any drift
    y: startBlock.y,  // EXPLICITLY set to prevent any drift
    width: Math.max(200, startBlock.width + deltaX),
    height: Math.max(100, startBlock.height + deltaY),
  };
}
```
This bypasses all snapping/normalization and uses the exact pattern from DebugResize.

### CanvasBlockWrapper.tsx (Line 72, 84)
**Temporarily disabled rotation for Announcements:**
```typescript
const effectiveRotation = block.type === 'announcements' ? 0 : block.rotation;
```
This ensures transforms don't interfere with testing the resize logic.

## 3. Testing Instructions

### Test the Debug Route First
1. Navigate to `/debug/resize`
2. Resize the debug block from SE handle
3. Verify the red dot (anchor) never moves
4. Verify x/y stay at 200, 200

### Test Announcements in Main Canvas
1. Navigate to a bulletin canvas editor
2. Press `Ctrl+Shift+A` to create a test announcements block
3. Resize it from the bottom-right (SE) handle
4. Check console for `[ANNOUNCEMENTS SE RESIZE - DEBUG PATTERN]` logs
5. Verify:
   - x and y values don't change in the logs
   - Visual position doesn't drift
   - Only width/height change

## 4. Results

With these changes:
- **Rotation disabled:** Announcements blocks have no rotation
- **Snapping disabled:** SE resize bypasses grid snapping for announcements
- **Direct position setting:** x/y are explicitly set to startBlock values

If drift STILL occurs with these changes, then the issue is in:
- The DOM structure/CSS of parent containers
- React's rendering/reconciliation
- Scale transforms on parent elements

## 5. DOM Structure to Check

If drift persists, inspect these elements:
```
BulletinCanvasEditor
  └─ DndContext
      └─ DroppablePageContainer (scaled)
          └─ BulletinCanvasPageView
              └─ CanvasBlockWrapper (position: absolute)
                  └─ CanvasAnnouncementsBlock
```

Look for:
- Unexpected transforms on parents
- CSS transitions still active
- Margins/padding affecting position
- Box-sizing differences

## 6. Next Steps

If the simplified approach works:
1. Re-enable rotation gradually
2. Re-enable snapping gradually
3. Identify which helper causes drift
4. Fix that specific helper

If it still drifts:
1. Check parent container transforms
2. Add position logging at each render
3. Check React DevTools for unexpected re-renders
4. Verify no CSS-in-JS is adding styles