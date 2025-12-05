# Canvas Architecture Quick Reference

## 🏗️ Two-Layer Pattern (ALWAYS USE THIS)

```
┌─────────────────────────────────────┐
│  BlockFrame (Outer)                 │  ← position: absolute
│  • left: block.x                    │  ← NO transforms here!
│  • top: block.y                     │
│  • width: block.width               │
│  • height: block.height             │
│  ┌─────────────────────────────────┐│
│  │ TransformLayer (Inner)          ││  ← width: 100%
│  │ • transform: rotate(45deg)      ││  ← transforms ONLY here!
│  │ • transformOrigin: '0 0'        ││  ← always top-left origin
│  │ [Block Content Here]            ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

## 📍 Resize Handle Anchoring

```
Which corner stays fixed when resizing?

┌──┬──┬──┐
│NW│N │NE│  NW → bottom-right stays fixed
├──┼──┼──┤  NE → bottom-left stays fixed
│W │  │E │  SW → top-right stays fixed
├──┼──┼──┤  SE → top-left stays fixed ← MOST COMMON
│SW│S │SE│
└──┴──┴──┘

SE Handle (bottom-right) Implementation:
{
  x: startBlock.x,        // DON'T CHANGE
  y: startBlock.y,        // DON'T CHANGE
  width: newWidth,        // CHANGE THIS
  height: newHeight       // CHANGE THIS
}
```

---

## 🔧 Key Files & Their Roles

| File | Purpose | Key Lines |
|------|---------|-----------|
| `CanvasBlockWrapper.tsx` | Two-layer implementation | 76-131 (styles), 174-221 (JSX) |
| `ResizeHandles.tsx` | Resize logic & anchoring | 46-77 (SE handle) |
| `BulletinCanvasEditor.tsx` | Main editor & dev tools | 278-324 (dev shortcuts) |
| `ResizeTestMonitor.tsx` | Drift detection | 45-75 (classification) |
| `Canvas*Block.tsx` (8 files) | Individual block types | Content only, no positioning |

---

## ⌨️ Development Shortcuts (Dev Mode Only)

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+A` | Create test Announcements block |
| `Ctrl+Shift+T` | Create rotated test blocks |
| `Ctrl+Shift+D` | Toggle drift monitor |

---

## ✅ DO's

```typescript
// ✅ CORRECT: Separated concerns
const blockFrameStyles = {
  position: 'absolute',
  left: block.x,
  top: block.y,
  width: block.width,
  height: block.height,
  // NO transform here!
};

const transformLayerStyles = {
  width: '100%',
  height: '100%',
  transform: `rotate(${block.rotation}deg)`,
  transformOrigin: '0 0',
};

// ✅ CORRECT: SE resize anchoring
if (activeHandle === 'se') {
  updates = {
    x: startBlock.x,      // Keep original
    y: startBlock.y,      // Keep original
    width: Math.max(100, startBlock.width + deltaX),
    height: Math.max(100, startBlock.height + deltaY),
  };
}

// ✅ CORRECT: Dev-only code
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info...');
}
```

---

## ❌ DON'Ts

```typescript
// ❌ WRONG: Mixed position and transform
const styles = {
  position: 'absolute',
  left: block.x,
  transform: `rotate(${rotation}deg)`,  // NO!
};

// ❌ WRONG: Center transform origin on positioned element
const styles = {
  transformOrigin: 'center center',  // NO!
};

// ❌ WRONG: Position in block component
// In CanvasTextBlock.tsx:
<div style={{ position: 'absolute' }}>  // NO!

// ❌ WRONG: Changing anchor position during SE resize
if (activeHandle === 'se') {
  updates = {
    x: startBlock.x + deltaX,  // NO! This causes drift
    y: startBlock.y + deltaY,  // NO! This causes drift
  };
}
```

---

## 🔍 Quick Debug Commands

### Check Architecture
```javascript
// Paste in browser console
document.querySelectorAll('[data-block-id]').forEach(b => {
  const transform = getComputedStyle(b).transform;
  if (transform !== 'none') {
    console.error(`❌ Block ${b.dataset.blockId} has transform on frame!`);
  } else {
    console.log(`✅ Block ${b.dataset.blockId} OK`);
  }
});
```

### Monitor Drift
```javascript
// Paste before resizing
let start = null;
const block = document.querySelector('[data-block-type="announcements"]');
if (block) {
  start = { left: block.style.left, top: block.style.top };
  console.log('Start:', start);
  setTimeout(() => {
    const end = { left: block.style.left, top: block.style.top };
    console.log(start.left === end.left && start.top === end.top ?
      '✅ No drift!' : '❌ DRIFT DETECTED');
  }, 5000);
}
```

---

## 📊 Drift Classification

| Type | Meaning | Is it a bug? |
|------|---------|--------------|
| **Model Drift** | x/y in React state changed | ✅ YES - This is a bug |
| **CSS Drift** | CSS left/top changed | ✅ YES - This is a bug |
| **Rect Drift** | Bounding box changed | ❌ NO - Expected with rotation |

**Real Drift = Model Drift OR CSS Drift**

---

## 🚀 Common Tasks

### Add New Block Type
1. Create `Canvas[Type]Block.tsx`
2. Add to `CanvasBlockRenderer`
3. NO positioning styles in component
4. Content only

### Add New Transform
1. Modify `blockTransformLayerStyles` only
2. Never touch `blockFrameStyles`
3. Keep `transformOrigin: '0 0'`

### Add Resize Constraint
1. Modify in `ResizeHandles.tsx`
2. Keep anchor logic intact
3. Only adjust width/height calculations

---

## 🧪 Test Pattern

```typescript
// Always test that SE resize anchors top-left
test('SE resize anchors top-left', () => {
  const start = { x: 200, y: 200, width: 300, height: 200 };
  const result = resizeSE(start, 50, 30);

  expect(result.x).toBe(200);      // Must not change
  expect(result.y).toBe(200);      // Must not change
  expect(result.width).toBe(350);  // Should increase
  expect(result.height).toBe(230); // Should increase
});
```

---

## 📝 Architecture Rule

**ONE RULE TO REMEMBER:**

> **Position and transforms must NEVER be on the same element**

This single rule prevents all drift issues.

---

*Keep this reference handy when working on the canvas editor!*