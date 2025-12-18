# Drift Detection - Loud Logging & Classification

## What Was Done

### 1. ✅ **Loud Drift Detection Implemented**

In `ResizeTestMonitor.tsx`, drift detection now:
- Fires `console.error('[🚨 DRIFT DETECTED 🚨]', driftPayload)` when drift occurs
- Triggers `debugger;` for Announcements blocks (makes it impossible to miss)
- Only logs for Announcements or SE handle to reduce noise

### 2. ✅ **Clear Drift Classification**

The monitor now distinguishes THREE types of drift:

```typescript
// Model drift: The actual x/y values in React state changed
const modelDrift = Math.abs(modelDriftX) > 0.1 || Math.abs(modelDriftY) > 0.1

// CSS drift: The computed left/top CSS properties changed
const cssDrift = cssLeftChanged || cssTopChanged

// Rect drift: Only the bounding box changed (expected with rotation)
const rectDrift = Math.abs(domDriftLeft) > 1 || Math.abs(domDriftTop) > 1
```

**IMPORTANT:** Only `modelDrift` or `cssDrift` count as real anchor drift.
`rectDrift` alone is NOT a bug (it's expected when rotation changes bounding box).

### 3. ✅ **Correct Element Being Measured**

The monitor measures the element with `data-block-id` attribute:
```typescript
const element = document.querySelector(`[data-block-id="${blockId}"]`)
```

This is the CanvasBlockWrapper's root div whose `left` and `top` are directly set from `block.x` and `block.y`.

### 4. ✅ **UI Shows Drift Classification**

The ResizeTestMonitor UI now displays:
- **Model: ❌ DRIFT** or **✅ OK**
- **CSS: ❌ DRIFT** or **✅ OK**
- **Rect: ⚠️ Changed** or **✅ OK**

Background turns red only for real anchor drift (model or CSS).

## How to Test

1. **Open the bulletin canvas editor**
2. **Create an Announcements block** (Ctrl+Shift+A or drag from palette)
3. **Resize from bottom-right (SE) handle**
4. **Watch for:**
   - Console: Look for `[🚨 DRIFT DETECTED 🚨]`
   - Debugger: Will pause if Announcements drifts
   - Monitor UI: Shows which type of drift (Model/CSS/Rect)

## What the Payload Contains

When drift is detected, the console.error includes:

```javascript
{
  // Classification flags
  modelDrift: true/false,
  cssDrift: true/false,
  rectDrift: true/false,
  driftCase: "CASE A: MODEL DRIFT" / "CASE B: CSS DRIFT" / "CASE C: DOM RECT ONLY",

  // Initial measurements
  initialModel: { x, y, width, height },
  initialCss: { left, top },
  initialRect: { left, top, width, height },

  // Current measurements
  currentModel: { x, y, width, height },
  currentCss: { left, top },
  currentRect: { left, top, width, height },

  // Context
  blockId: "...",
  blockType: "announcements",
  handle: "se",
  rotation: 0
}
```

## Determining the Announcements Drift Case

Based on the wiring, when you resize an Announcements block from SE:

1. **If `modelDrift: true`** → The resize math or state update is wrong
   - Look at `ResizeHandles.tsx` and the special case for announcements
   - Check `handleBlockUpdate` in `BulletinCanvasEditor.tsx`
   - The model x/y should NOT change for SE resize

2. **If `cssDrift: true` but `modelDrift: false`** → Style application issue
   - Check `CanvasBlockWrapper.tsx`
   - Some transform or style is changing CSS left/top even though model is stable
   - Could be inherited styles, transitions, or transform-origin issues

3. **If only `rectDrift: true`** → Not a real problem
   - Just the bounding box changing due to rotation
   - This is expected and not a bug

## Current State of Announcements

From the previous changes:
- Rotation temporarily disabled for announcements (`effectiveRotation = 0`)
- Special SE resize logic that explicitly sets `x: startBlock.x, y: startBlock.y`
- Grid snapping bypassed for announcements SE resize

**Next Step:**
1. Test an Announcements block resize
2. Check console for `[🚨 DRIFT DETECTED 🚨]`
3. Report which drift type is detected
4. Based on that, we'll know exactly where to apply the fix