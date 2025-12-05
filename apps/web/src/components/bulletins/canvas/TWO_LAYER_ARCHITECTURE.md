# Two-Layer Architecture Fix for Resize Drift

## Problem Statement
Announcements blocks were drifting when resized from the SE (bottom-right) handle. The drift occurred because transforms (rotation) and layout (position/size) were mixed on the same element, causing transform-origin effects to shift the visual position.

## Solution: Two-Layer Architecture

### Layer Separation

The fix separates layout and transforms into two distinct layers:

1. **BlockFrame (Outer Layer)** - Layout ONLY
   - Handles: `position: absolute`, `left`, `top`, `width`, `height`, `zIndex`
   - NO transforms, NO transformOrigin
   - This layer defines where and how big the block is

2. **BlockTransformLayer (Inner Layer)** - Transforms ONLY
   - Handles: `transform` (rotation, drag offset), `transformOrigin`
   - Always `width: 100%`, `height: 100%`
   - NO position properties (no left/top)
   - This layer applies visual transformations without affecting layout

### Implementation in CanvasBlockWrapper.tsx

```typescript
// LAYER 1: BlockFrame - Layout wrapper (position + size ONLY)
const blockFrameStyles: React.CSSProperties = {
  position: 'absolute',
  left: block.x,    // Direct from model, no transform
  top: block.y,     // Direct from model, no transform
  width: block.width,
  height: block.height,
  zIndex: block.zIndex,
  // NO transform, NO transformOrigin on this layer
  boxSizing: 'border-box',
  // Editor styling...
};

// LAYER 2: BlockTransformLayer - Transform wrapper (transforms ONLY)
const blockTransformLayerStyles: React.CSSProperties = {
  width: '100%',
  height: '100%',
  transform: transformLayerTransform,  // Rotation + drag
  transformOrigin: '0 0',  // Always from top-left
  // NO position properties (no left/top)
};
```

### JSX Structure

```jsx
<div
  className="block-frame"
  style={blockFrameStyles}
  data-block-id={block.id}
>
  <div
    className="block-transform-layer"
    style={blockTransformLayerStyles}
  >
    {/* Actual block content */}
    {children}
  </div>

  {/* Resize handles attach to BlockFrame */}
  {ResizeHandles}
</div>
```

## Why This Works

1. **Position is Independent of Transforms**
   - The outer BlockFrame sets the absolute position (x, y)
   - Transforms on the inner layer cannot affect this position
   - No matter what rotation is applied, the block stays anchored at (x, y)

2. **SE Resize Behavior**
   - When resizing from SE handle, we want the top-left to stay fixed
   - With separated layers, changing width/height on BlockFrame doesn't interact with transforms
   - The transform layer just fills its parent (100% width/height)

3. **Transform Origin Isolation**
   - Transform origin is now relative to the transform layer, not the positioned element
   - Changing size doesn't shift the transform origin point
   - Rotation happens around the correct pivot without drift

## Additional Safeguards

1. **Announcements Block Special Handling**
   - Temporarily disabled rotation: `effectiveRotation = 0`
   - Direct SE resize logic bypassing helpers
   - Explicit x/y preservation in resize updates

2. **Parent Scale Transform**
   - DroppablePageContainer applies zoom via `scale()` transform
   - This is accounted for in ResizeHandles: `deltaX = (e.clientX - startPos.x) / scale`
   - The two-layer architecture is unaffected by parent transforms

## Testing Instructions

1. **Test SE Resize on Announcements**
   ```
   - Create an Announcements block (Ctrl+Shift+A)
   - Resize from bottom-right corner
   - Verify: Position should NOT change (check console logs)
   - Verify: ResizeTestMonitor shows no drift
   ```

2. **Test with Rotation (Other Blocks)**
   ```
   - Create a Text block
   - Rotate it 45 degrees
   - Resize from SE handle
   - Verify: Top-left stays anchored
   ```

3. **Monitor Drift Detection**
   ```
   - ResizeTestMonitor will show:
     Model: ✅ OK (x/y shouldn't change)
     CSS: ✅ OK (left/top shouldn't change)
     Rect: ⚠️ Changed (expected with rotation)
   ```

## Debug Logging

When `NODE_ENV === 'development'` and resizing Announcements blocks:

```javascript
console.log('[ANNOUNCEMENTS TWO-LAYER ARCHITECTURE]', {
  blockId,
  model: { x, y, width, height },
  blockFrame: {
    styles: { left, top, width, height },
    computed: { /* actual CSS values */ }
  },
  transformLayer: {
    styles: { transform, transformOrigin },
    computed: { /* actual CSS values */ }
  }
});
```

## Next Steps

1. **Verify Fix**
   - Test Announcements block SE resize
   - Confirm no drift in ResizeTestMonitor
   - Check visual stability

2. **Re-enable Rotation**
   - Once drift is confirmed fixed
   - Remove line 73: `const effectiveRotation = block.type === 'announcements' ? 0 : block.rotation;`
   - Test with rotation enabled

3. **Apply to All Blocks**
   - Remove special case for Announcements in ResizeHandles.tsx
   - Use consistent resize logic for all block types
   - Rely on architecture to prevent drift

## Files Modified

1. **CanvasBlockWrapper.tsx** (Primary fix)
   - Separated into two-layer architecture
   - BlockFrame + BlockTransformLayer pattern
   - Enhanced debug logging

2. **ResizeHandles.tsx** (Already had safeguards)
   - Special SE resize for Announcements (lines 46-66)
   - Explicit x/y preservation
   - Bypass snap/normalization helpers

3. **ResizeTestMonitor.tsx** (Detection enhanced)
   - Loud drift detection with console.error
   - Clear drift classification (model/CSS/rect)
   - Debugger for Announcements blocks

## Success Criteria

✅ Announcements blocks don't drift when resized from SE handle
✅ ResizeTestMonitor shows "Model: ✅ OK" and "CSS: ✅ OK"
✅ Visual position remains stable during resize
✅ Works with parent scale transforms (zoom)
✅ Architecture makes drift structurally impossible