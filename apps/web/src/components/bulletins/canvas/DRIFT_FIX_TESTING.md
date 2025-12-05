# Bulletin Canvas Resize Drift Fix Testing Guide

## Problem Summary
When resizing blocks (especially the Announcements block) from the bottom-right handle, the visual top-left position would drift away from where it should be anchored. This was particularly noticeable with rotated blocks.

## Solution Applied
We've implemented a comprehensive fix that addresses drift at multiple levels:

### 1. **Transform Origin Fix**
- Set `transformOrigin: '0 0'` (top-left) on all blocks
- This ensures rotation doesn't cause position shift during size changes
- Applied in `CanvasBlockWrapper.tsx`

### 2. **Transition Disabling During Resize**
- Disabled ALL CSS transitions and animations during active resize
- Prevents visual lag or interpolation that could cause perceived drift
- Applied multiple safeguards: `transition`, `transitionProperty`, `transitionDuration`, `transitionDelay`, `animation`, etc.

### 3. **Consistent Box Model**
- Applied `box-sizing: border-box` to ensure consistent sizing calculations
- Used numeric values for positions (React automatically adds 'px')

### 4. **Enhanced Monitoring**
- `ResizeTestMonitor` now tracks three layers:
  - **Model Values**: The actual x/y coordinates in state
  - **CSS Styles**: The computed left/top properties
  - **DOM Position**: The visual bounding rect from getBoundingClientRect()
- Categorizes drift as Model, CSS, or DOM-only

## Testing Instructions

### Manual Testing

#### 1. **Enable Testing Tools**
```
Press Ctrl+Shift+D to toggle the Drift Test Helper
```

#### 2. **Create Test Blocks**
The Drift Test Helper provides buttons to create announcements blocks with different rotations:
- **0° rotation** - Baseline test (should never drift)
- **15° rotation** - Small rotation test
- **45° rotation** - Medium rotation test
- **90° rotation** - Maximum rotation test

You can also use keyboard shortcuts:
- `Ctrl+Shift+A` - Create a test announcements block with 10° rotation

#### 3. **Perform Resize Test**
For each test block:
1. Select the block (click on it)
2. Grab the **bottom-right resize handle** (blue square)
3. Drag to resize the block larger and smaller
4. Watch the ResizeTestMonitor (top-right) for drift detection
5. Check the visual anchor (red dot) stays at the model position

#### 4. **Verify Results**
✅ **PASS Criteria**:
- ResizeTestMonitor shows "✅ No drift" or only "CASE C: DOM RECT ONLY" for rotated blocks
- Visual anchor (red dot) stays at the same position
- Block doesn't visually jump or shift during resize
- Drift Test Helper shows "✅ PASS" for all tests

❌ **FAIL Criteria**:
- ResizeTestMonitor shows "CASE A: MODEL DRIFT" or "CASE B: CSS DRIFT"
- Visual anchor moves away from its original position
- Block jumps or shifts during resize
- Drift Test Helper shows "❌ FAIL" with drift amounts

### Automated Test Suite

1. **Enable Drift Test Helper**: Press `Ctrl+Shift+D`
2. **Click "Run Automated Test Suite"**
3. The suite will:
   - Create blocks with 0°, 15°, 45°, and 90° rotations
   - Monitor resize operations for each
   - Report pass/fail for each test
   - Show overall pass rate

### Understanding the Monitors

#### ResizeTestMonitor (Top-Right)
Shows real-time measurements during resize:
- **Model Values**: The x/y coordinates in the data model
- **CSS Computed Styles**: The actual left/top CSS properties
- **Visual DOM Position**: Where the browser renders the element
- **Drift Detection**: Categorizes any detected drift

#### Drift Test Helper (Bottom-Right, when enabled)
- **Test Controls**: Create blocks with specific rotations
- **Monitoring Status**: Shows if monitoring is active
- **Test Results**: History of resize tests with pass/fail status
- **Pass Rate**: Overall success rate of tests

#### Visual Anchor Marker (Red Dot with Crosshairs)
- Shows exactly where the model thinks the top-left corner should be
- Should NOT move during bottom-right resize
- If it moves, there's drift in the model coordinates

## Expected Behavior

### For Non-Rotated Blocks (0°)
- **Model**: x/y should remain exactly the same
- **CSS**: left/top should remain exactly the same
- **DOM**: Bounding rect left/top should remain exactly the same
- **Result**: No drift detected

### For Rotated Blocks (15°, 45°, 90°)
- **Model**: x/y should remain exactly the same
- **CSS**: left/top should remain exactly the same
- **DOM**: Bounding rect MAY change slightly (rotation bounding box)
- **Result**: At most "CASE C: DOM RECT ONLY" (acceptable)

## Troubleshooting

### If drift is still detected:

1. **Check browser console** for error messages
2. **Verify transform-origin** is set to '0 0' (check computed styles)
3. **Look for CSS transitions** that might not be disabled
4. **Check for global styles** that might interfere
5. **Test in different browsers** (Chrome, Firefox, Safari)

### Common Issues:

- **Drift only on first resize**: Could be initialization issue
- **Drift increases over time**: Accumulation error in calculations
- **Drift only with specific rotations**: Transform-origin issue
- **Visual drift but monitor says OK**: Monitor needs calibration

## Technical Details

### Files Modified:
1. `CanvasBlockWrapper.tsx` - Transform origin, transition disabling
2. `ResizeTestMonitor.tsx` - Enhanced drift detection
3. `ResizeHandles.tsx` - Event emission for monitoring
4. `BulletinCanvasPageView.tsx` - Visual anchor marker
5. `DriftTestHelper.tsx` - New test helper component
6. `BulletinCanvasEditor.tsx` - Integration of test tools

### Key Fixes:
```typescript
// 1. Transform origin set to top-left
transformOrigin: '0 0'

// 2. Disable all transitions during resize
...(isResizing ? {
  transition: 'none !important',
  transitionProperty: 'none !important',
  transitionDuration: '0s !important',
  transitionDelay: '0s !important',
  animation: 'none !important',
  animationDuration: '0s !important',
  animationDelay: '0s !important',
  willChange: 'auto',
} : {})

// 3. Consistent box model
boxSizing: 'border-box'
```

## Success Metrics

The fix is considered successful when:
1. ✅ All rotation angles (0°, 15°, 45°, 90°) pass resize tests
2. ✅ No visual jumping during resize operations
3. ✅ ResizeTestMonitor shows no Model or CSS drift
4. ✅ Drift Test Helper shows 100% pass rate
5. ✅ Works consistently across multiple browsers
6. ✅ Performance remains smooth during resize

## Next Steps

If all tests pass:
1. Remove or disable test components for production
2. Consider keeping ResizeTestMonitor for development builds
3. Document any browser-specific quirks found
4. Add unit tests for the resize calculations

If tests fail:
1. Use ResizeTestMonitor to identify drift type
2. Check browser DevTools for computed styles
3. Add more detailed logging if needed
4. Consider alternative approaches (e.g., SVG transforms)