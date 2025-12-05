// Browser Console Test Script for Drift Fix Verification
// Run this in the browser console while on the bulletin canvas editor

console.log('🔍 Starting Drift Fix Verification...\n');

// Test 1: Check Two-Layer Architecture
console.group('📐 Test 1: Two-Layer Architecture');
const announcementsBlock = document.querySelector('[data-block-type="announcements"]');
if (announcementsBlock) {
  const transformLayer = announcementsBlock.querySelector('.block-transform-layer');
  if (transformLayer) {
    console.log('✅ Two-layer architecture detected');

    // Check BlockFrame styles
    const frameStyles = window.getComputedStyle(announcementsBlock);
    console.log('BlockFrame (outer):', {
      position: frameStyles.position,
      left: frameStyles.left,
      top: frameStyles.top,
      width: frameStyles.width,
      height: frameStyles.height,
      transform: frameStyles.transform || 'none',
      transformOrigin: frameStyles.transformOrigin
    });

    // Check TransformLayer styles
    const layerStyles = window.getComputedStyle(transformLayer);
    console.log('TransformLayer (inner):', {
      width: layerStyles.width,
      height: layerStyles.height,
      transform: layerStyles.transform || 'none',
      transformOrigin: layerStyles.transformOrigin
    });

    // Verify separation of concerns
    if (frameStyles.transform === 'none' && layerStyles.width === frameStyles.width) {
      console.log('✅ Proper layer separation confirmed');
    } else if (frameStyles.transform !== 'none') {
      console.error('❌ BlockFrame should not have transforms!');
    }
  } else {
    console.error('❌ Transform layer not found - architecture not implemented');
  }
} else {
  console.warn('⚠️ No announcements block found - create one first (Ctrl+Shift+A)');
}
console.groupEnd();

// Test 2: Monitor Resize Behavior
console.group('🔄 Test 2: Resize Monitoring Setup');
let resizeStartPosition = null;
let resizeStartCss = null;

window.addEventListener('resize-monitor-start', (e) => {
  const block = document.querySelector(`[data-block-id="${e.detail.blockId}"]`);
  if (block) {
    const styles = window.getComputedStyle(block);
    resizeStartPosition = { x: e.detail.x, y: e.detail.y };
    resizeStartCss = { left: styles.left, top: styles.top };
    console.log('📍 Resize started at:', resizeStartPosition);
  }
});

window.addEventListener('resize-monitor-move', (e) => {
  if (resizeStartPosition && e.detail.handle === 'se') {
    const xDrift = e.detail.x - resizeStartPosition.x;
    const yDrift = e.detail.y - resizeStartPosition.y;

    if (Math.abs(xDrift) > 0.1 || Math.abs(yDrift) > 0.1) {
      console.error(`❌ MODEL DRIFT during resize: x=${xDrift}, y=${yDrift}`);
    }

    const block = document.querySelector(`[data-block-id="${e.detail.blockId}"]`);
    if (block && resizeStartCss) {
      const currentStyles = window.getComputedStyle(block);
      const leftDrift = parseFloat(currentStyles.left) - parseFloat(resizeStartCss.left);
      const topDrift = parseFloat(currentStyles.top) - parseFloat(resizeStartCss.top);

      if (Math.abs(leftDrift) > 0.1 || Math.abs(topDrift) > 0.1) {
        console.error(`❌ CSS DRIFT during resize: left=${leftDrift}px, top=${topDrift}px`);
      }
    }
  }
});

window.addEventListener('resize-monitor-end', () => {
  if (resizeStartPosition) {
    console.log('🏁 Resize ended');
    resizeStartPosition = null;
    resizeStartCss = null;
  }
});

console.log('✅ Resize monitoring active - Try resizing an Announcements block from SE corner');
console.groupEnd();

// Test 3: Check for Drift Detection Logs
console.group('🚨 Test 3: Drift Detection Status');
const originalError = console.error;
let driftDetected = false;
console.error = function(...args) {
  if (args[0] && args[0].includes('DRIFT DETECTED')) {
    driftDetected = true;
    console.warn('🚨 DRIFT DETECTED - Check payload:', args[1]);
  }
  originalError.apply(console, args);
};

console.log('✅ Drift detection monitoring active');
console.log('If drift occurs, you will see a 🚨 DRIFT DETECTED message');
console.groupEnd();

// Test 4: Quick Visual Test
console.group('👁️ Test 4: Visual Anchor Test');
console.log(`
To perform visual test:
1. Create an Announcements block (Ctrl+Shift+A)
2. Note the top-left position (look for red dot during resize)
3. Resize from bottom-right corner
4. The top-left should NOT move

Expected behavior:
- Red dot appears at top-left during resize (anchor point)
- Red dot should remain stationary
- Only width/height should change
`);
console.groupEnd();

console.log('\n✅ All tests configured. Now resize an Announcements block from the SE corner to verify the fix.');