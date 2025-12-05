# Bulletin Canvas Editor

A drag-and-drop canvas editor for creating church bulletin layouts with support for multiple block types, rotation, and precise positioning.

## 🎯 Overview

The Bulletin Canvas Editor allows users to:
- Add and position various content blocks (text, images, announcements, etc.)
- Resize blocks from any edge or corner
- Rotate blocks to any angle
- Snap to grid for alignment
- Export to PDF, slides, or web format

## 🏗️ Architecture

### Two-Layer Pattern

The editor uses a **two-layer architecture** to prevent position drift during resize operations:

1. **BlockFrame Layer** - Handles absolute positioning (x, y, width, height)
2. **TransformLayer** - Handles visual transforms (rotation, scale)

This separation ensures that transforms never affect the positioned element's anchor point, eliminating drift bugs.

See: [`CANVAS_ARCHITECTURE_DOCUMENTATION.md`](./CANVAS_ARCHITECTURE_DOCUMENTATION.md) for complete details.

## 📚 Documentation

### Essential Reading

1. **[Quick Reference](./QUICK_REFERENCE.md)** - One-page cheat sheet for developers
2. **[Architecture Documentation](./CANVAS_ARCHITECTURE_DOCUMENTATION.md)** - Complete architectural guide
3. **[Technical Implementation](./TECHNICAL_IMPLEMENTATION_GUIDE.md)** - Exact code changes and patterns

### Implementation History

- **[Two-Layer Architecture](./TWO_LAYER_ARCHITECTURE.md)** - Deep dive into the pattern
- **[Standardization Complete](./STANDARDIZATION_COMPLETE.md)** - Recent standardization work
- **[Drift Fix Summary](./DRIFT_FIX_SUMMARY.md)** - History of drift bug fixes
- **[Drift Detection Wired](./DRIFT_DETECTION_WIRED.md)** - Drift detection system

## 🧩 Components

### Core Components

| Component | Purpose |
|-----------|---------|
| `BulletinCanvasEditor` | Main editor container with DnD context |
| `CanvasBlockWrapper` | Two-layer wrapper for all blocks |
| `ResizeHandles` | Resize handle system with anchoring |
| `CanvasBlockRenderer` | Routes block types to components |

### Block Types (8)

1. **Text** - Rich text with formatting
2. **Image** - Uploaded images with cropping
3. **QR Code** - Dynamic QR code generation
4. **Giving** - Donation information
5. **Service Items** - Order of service
6. **Contact Info** - Church details
7. **Events** - Upcoming events list
8. **Announcements** - Church announcements

## 🚀 Quick Start

### Development Mode

```bash
# Start the development server
npm run dev

# Navigate to canvas editor
http://localhost:3045/bulletins/canvas
```

### Keyboard Shortcuts (Dev Only)

- `Ctrl+Shift+A` - Add test Announcements block
- `Ctrl+Shift+T` - Add rotated test blocks
- `Ctrl+Shift+D` - Toggle drift monitor

### Testing for Drift

```javascript
// Run in browser console
fetch('/src/components/bulletins/canvas/test-drift-fix.js')
  .then(r => r.text())
  .then(eval);
```

## 🔧 Common Tasks

### Adding a New Block Type

1. Create component in `Canvas[Type]Block.tsx`
2. Add to block type union in types
3. Register in `CanvasBlockRenderer`
4. Follow the pattern - content only, no positioning!

Example:
```typescript
export function CanvasNewBlock({ block }: { block: BulletinCanvasBlock }) {
  return (
    <div className="canvas-new-block">
      {/* Content only - positioning handled by wrapper */}
      <h3>{block.content.title}</h3>
    </div>
  );
}
```

### Customizing Resize Behavior

Modify in `ResizeHandles.tsx`:
```typescript
if (activeHandle === 'se') {
  updates = {
    x: startBlock.x,      // Always preserve for SE
    y: startBlock.y,      // Always preserve for SE
    width: Math.max(MIN_WIDTH, startBlock.width + deltaX),
    height: Math.max(MIN_HEIGHT, startBlock.height + deltaY),
  };

  // Add custom constraints here
  if (block.type === 'image' && block.maintainAspectRatio) {
    const ratio = startBlock.width / startBlock.height;
    updates.height = updates.width / ratio;
  }
}
```

## ⚠️ Critical Rules

### The Golden Rule

> **Position and transforms must NEVER be on the same element**

### Architecture Rules

1. **BlockFrame** gets position/size ONLY
2. **TransformLayer** gets transforms ONLY
3. **Transform origin** is always `'0 0'`
4. **SE resize** always anchors top-left

### Code Rules

```typescript
// ✅ CORRECT
const blockFrameStyles = {
  position: 'absolute',
  left: block.x,
  top: block.y,
  // NO transform here!
};

// ❌ WRONG
const styles = {
  position: 'absolute',
  left: block.x,
  transform: `rotate(${rotation}deg)`,  // NEVER DO THIS!
};
```

## 🧪 Testing

### Unit Tests

```bash
# Run tests (when Jest/Vitest is installed)
npm test ResizeHandles.test.ts
```

### Manual Testing

1. Create a block at known position (200, 200)
2. Resize from SE corner
3. Check position hasn't changed:
   - Model x/y should be 200, 200
   - CSS left/top should be "200px", "200px"
   - Visual position should be stable

### Automated Verification

```javascript
// Browser console command
(() => {
  const blocks = document.querySelectorAll('[data-block-id]');
  let pass = true;

  blocks.forEach(b => {
    if (getComputedStyle(b).transform !== 'none') {
      console.error(`❌ Block ${b.dataset.blockId} fails architecture check`);
      pass = false;
    }
  });

  if (pass) console.log('✅ All blocks pass architecture check');
})();
```

## 🐛 Troubleshooting

### Block Still Drifts

1. Check BlockFrame has no transforms
2. Verify TransformLayer has `transformOrigin: '0 0'`
3. Ensure SE resize preserves x/y
4. Check for conflicting CSS

### Rotation Not Working

1. Transform should be on TransformLayer only
2. Check for rotation: 0 overrides
3. Verify transform syntax

### Debug Tools Not Working

1. Ensure `NODE_ENV === 'development'`
2. Check keyboard shortcuts are registered
3. Verify ResizeTestMonitor is mounted

## 📈 Performance

Current metrics:
- Resize update: <5ms per frame
- Re-render: <10ms
- Maintains 60 FPS during resize

Optimization opportunities:
- Throttle resize updates
- Implement React.memo
- Use CSS containment

## 🔗 Related Systems

- **Bulletin Generator** - Converts canvas to PDF/slides
- **Template System** - Pre-designed layouts
- **Asset Manager** - Image/file uploads

## 📝 Maintenance Notes

### Version History

- **v2.0** (Nov 30, 2024) - Two-layer architecture, drift fix
- **v1.0** (Nov 29, 2024) - Initial implementation

### Known Limitations

- Max 50 blocks per page (performance)
- Rotation limited to -180° to 180°
- Grid snap minimum 8px

### Future Enhancements

- [ ] Multi-select and group operations
- [ ] Undo/redo system
- [ ] Copy/paste blocks
- [ ] Z-index management UI
- [ ] Animation support
- [ ] Responsive block sizing

## 👥 Contributors

Architecture and implementation for the two-layer pattern and drift prevention system.

## 📄 License

Part of the Elder-First Church Platform.

---

**For questions or issues, see the detailed documentation linked above or check the implementation files directly.**