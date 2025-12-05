/**
 * Debug helper to track block positions relative to page
 * This helps diagnose positioning drift issues during browser resize
 */

export interface PositionDebugData {
  blockId: string;
  modelCoords: { x: number; y: number; width: number; height: number };
  screenRect: DOMRect;
  pageRect: DOMRect;
  deltaX: number;
  deltaY: number;
}

export function debugBlockPositions(
  pageSelector = '[data-canvas-page]',
  blockSelector = '[data-block-id]'
): PositionDebugData[] {
  const pageEl = document.querySelector(pageSelector) as HTMLElement;
  if (!pageEl) {
    console.warn('❌ Page element not found');
    return [];
  }

  const pageRect = pageEl.getBoundingClientRect();
  console.log('📄 Page position:', {
    left: pageRect.left,
    top: pageRect.top,
    width: pageRect.width,
    height: pageRect.height,
  });

  const blockElements = document.querySelectorAll(blockSelector);
  const debugData: PositionDebugData[] = [];

  blockElements.forEach((blockEl) => {
    const blockId = (blockEl as HTMLElement).getAttribute('data-block-id') || 'unknown';
    const blockRect = blockEl.getBoundingClientRect();

    // Get model coordinates from data attributes or style
    const style = window.getComputedStyle(blockEl as HTMLElement);
    const modelX = parseInt(style.left) || 0;
    const modelY = parseInt(style.top) || 0;
    const modelWidth = parseInt(style.width) || 0;
    const modelHeight = parseInt(style.height) || 0;

    const deltaX = blockRect.left - pageRect.left;
    const deltaY = blockRect.top - pageRect.top;

    const data: PositionDebugData = {
      blockId: blockId.substring(0, 8),
      modelCoords: { x: modelX, y: modelY, width: modelWidth, height: modelHeight },
      screenRect: blockRect,
      pageRect,
      deltaX,
      deltaY,
    };

    debugData.push(data);

    console.log(`📦 Block ${data.blockId}:`, {
      model: `(${modelX}, ${modelY})`,
      screen: `(${Math.round(blockRect.left)}, ${Math.round(blockRect.top)})`,
      delta: `(${Math.round(deltaX)}, ${Math.round(deltaY)})`,
    });
  });

  return debugData;
}

// Track deltas across resizes
let lastDeltas: Map<string, { x: number; y: number }> = new Map();

export function checkPositionStability(debugData: PositionDebugData[]): boolean {
  let isStable = true;

  debugData.forEach(data => {
    const last = lastDeltas.get(data.blockId);
    if (last) {
      const driftX = Math.abs(data.deltaX - last.x);
      const driftY = Math.abs(data.deltaY - last.y);

      if (driftX > 1 || driftY > 1) { // Allow 1px tolerance for rounding
        console.error(`❌ DRIFT DETECTED for block ${data.blockId}:`, {
          previousDelta: `(${Math.round(last.x)}, ${Math.round(last.y)})`,
          currentDelta: `(${Math.round(data.deltaX)}, ${Math.round(data.deltaY)})`,
          drift: `(${Math.round(driftX)}, ${Math.round(driftY)})`,
        });
        isStable = false;
      }
    }

    lastDeltas.set(data.blockId, { x: data.deltaX, y: data.deltaY });
  });

  if (isStable && lastDeltas.size > 0) {
    console.log('✅ Block positions stable relative to page');
  }

  return isStable;
}

export function resetPositionTracking() {
  lastDeltas.clear();
}