/**
 * ResizeTestMonitor
 *
 * A comprehensive test monitor that tracks and validates resize behavior.
 * Measures BOTH model values AND actual visual DOM positions to detect drift.
 */

import React, { useState, useEffect } from 'react';
import type { BulletinCanvasBlock } from '@elder-first/types';

interface ResizeTestMonitorProps {
  blocks: BulletinCanvasBlock[];
  activeBlockId: string | null;
  isEnabled?: boolean;
}

interface PositionMeasurement {
  // Model values
  modelX: number;
  modelY: number;
  modelWidth: number;
  modelHeight: number;
  // CSS computed styles
  cssLeft: string;
  cssTop: string;
  cssWidth: string;
  cssHeight: string;
  // Visual bounding rect
  domLeft: number;
  domTop: number;
  domWidth: number;
  domHeight: number;
  // Transform values
  transform: string;
  transformOrigin: string;
}

interface ResizeSnapshot {
  blockId: string;
  handle: string;
  blockType: string;
  rotation?: number;
  start: PositionMeasurement;
  current: PositionMeasurement;
  drift: {
    model: { x: number; y: number };
    css: { left: boolean; top: boolean };
    dom: { left: number; top: number };
  };
  hasAnyDrift: boolean;
  // Individual drift flags for clear classification
  modelDrift?: boolean;
  cssDrift?: boolean;
  rectDrift?: boolean;
}

export function ResizeTestMonitor({ blocks, activeBlockId, isEnabled = true }: ResizeTestMonitorProps) {
  const [resizeHistory, setResizeHistory] = useState<ResizeSnapshot[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [currentSnapshot, setCurrentSnapshot] = useState<ResizeSnapshot | null>(null);

  // Helper to measure actual DOM positions
  const measureBlockPosition = (blockId: string, modelX: number, modelY: number, modelWidth: number, modelHeight: number): PositionMeasurement => {
    const element = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;

    if (!element) {
      console.warn(`[RESIZE MONITOR] Could not find element for block ${blockId}`);
      return {
        modelX, modelY, modelWidth, modelHeight,
        cssLeft: '0px', cssTop: '0px', cssWidth: '0px', cssHeight: '0px',
        domLeft: 0, domTop: 0, domWidth: 0, domHeight: 0,
        transform: 'none', transformOrigin: 'center',
      };
    }

    const computedStyle = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return {
      // Model values
      modelX,
      modelY,
      modelWidth,
      modelHeight,
      // CSS computed styles
      cssLeft: computedStyle.left,
      cssTop: computedStyle.top,
      cssWidth: computedStyle.width,
      cssHeight: computedStyle.height,
      // Visual bounding rect
      domLeft: rect.left,
      domTop: rect.top,
      domWidth: rect.width,
      domHeight: rect.height,
      // Transform values
      transform: computedStyle.transform || 'none',
      transformOrigin: computedStyle.transformOrigin || 'center',
    };
  };

  useEffect(() => {
    if (!isEnabled || typeof window === 'undefined') return;

    const handleResizeStart = (e: CustomEvent) => {
      const { blockId, handle, x, y, width, height, rotation } = e.detail;

      // Find the block to get its type
      const block = blocks.find(b => b.id === blockId);
      const blockType = block?.type || 'unknown';

      const startMeasurement = measureBlockPosition(blockId, x, y, width, height);

      const snapshot: ResizeSnapshot = {
        blockId,
        handle,
        blockType,
        rotation,
        start: startMeasurement,
        current: startMeasurement,
        drift: {
          model: { x: 0, y: 0 },
          css: { left: false, top: false },
          dom: { left: 0, top: 0 },
        },
        hasAnyDrift: false,
      };

      setCurrentSnapshot(snapshot);
      setIsResizing(true);

      console.log(`[RESIZE MONITOR] Started resize on ${blockType} block ${blockId}`, {
        handle,
        rotation,
        start: {
          model: { x, y, width, height },
          css: { left: startMeasurement.cssLeft, top: startMeasurement.cssTop },
          dom: { left: startMeasurement.domLeft, top: startMeasurement.domTop },
          transform: startMeasurement.transform,
          transformOrigin: startMeasurement.transformOrigin,
        }
      });
    };

    const handleResizeMove = (e: CustomEvent) => {
      const { blockId, handle, x, y, width, height } = e.detail;

      setCurrentSnapshot(prev => {
        if (!prev || prev.blockId !== blockId) return prev;

        // IMPORTANT: anchorWrapper is the element whose left/top are driven by block.x/block.y
        // This is the data-block-id element (CanvasBlockWrapper's root div)
        const currentMeasurement = measureBlockPosition(blockId, x, y, width, height);

        // Calculate drift for all measurements
        const modelDriftX = currentMeasurement.modelX - prev.start.modelX;
        const modelDriftY = currentMeasurement.modelY - prev.start.modelY;

        const cssLeftChanged = currentMeasurement.cssLeft !== prev.start.cssLeft;
        const cssTopChanged = currentMeasurement.cssTop !== prev.start.cssTop;

        const domDriftLeft = currentMeasurement.domLeft - prev.start.domLeft;
        const domDriftTop = currentMeasurement.domTop - prev.start.domTop;

        // For bottom-right resize, we only care about SE handle
        const shouldAnchorTopLeft = handle === 'se';

        // Normalize drift classification
        const modelDrift = shouldAnchorTopLeft && (
          Math.abs(modelDriftX) > 0.1 || Math.abs(modelDriftY) > 0.1
        );

        const cssDrift = shouldAnchorTopLeft && (
          cssLeftChanged || cssTopChanged
        );

        const rectDrift = shouldAnchorTopLeft && (
          Math.abs(domDriftLeft) > 1 || Math.abs(domDriftTop) > 1
        );

        // IMPORTANT: Only model or CSS drift counts as real anchor drift
        // rectDrift alone (from rotation bounding box) is NOT an anchor bug
        const hasDrift = modelDrift || cssDrift;

        // Determine drift case for logging
        let driftCase = 'NONE';
        if (modelDrift) {
          driftCase = 'CASE A: MODEL DRIFT';
        } else if (cssDrift) {
          driftCase = 'CASE B: CSS DRIFT';
        } else if (rectDrift) {
          driftCase = 'CASE C: DOM RECT ONLY (may be rotation bounding box)';
        }

        // LOUD DRIFT DETECTION - Only fires for real anchor drift (model or CSS)
        if (hasDrift) {
          // Filter for Announcements or SE handle to reduce noise
          const isAnnouncementsOrSE = prev.blockType === 'announcements' || handle === 'se';

          if (isAnnouncementsOrSE) {
            const driftPayload = {
              // Drift classification
              modelDrift,
              cssDrift,
              rectDrift,
              driftCase,

              // Initial values
              initialModel: {
                x: prev.start.modelX,
                y: prev.start.modelY,
                width: prev.start.modelWidth,
                height: prev.start.modelHeight,
              },
              initialCss: {
                left: prev.start.cssLeft,
                top: prev.start.cssTop,
              },
              initialRect: {
                left: prev.start.domLeft,
                top: prev.start.domTop,
                width: prev.start.domWidth,
                height: prev.start.domHeight,
              },

              // Current values
              currentModel: {
                x: currentMeasurement.modelX,
                y: currentMeasurement.modelY,
                width: currentMeasurement.modelWidth,
                height: currentMeasurement.modelHeight,
              },
              currentCss: {
                left: currentMeasurement.cssLeft,
                top: currentMeasurement.cssTop,
              },
              currentRect: {
                left: currentMeasurement.domLeft,
                top: currentMeasurement.domTop,
                width: currentMeasurement.domWidth,
                height: currentMeasurement.domHeight,
              },

              // Context
              blockId: prev.blockId,
              blockType: prev.blockType,
              handle: handle,
              rotation: prev.rotation,
            };

            console.error('[🚨 DRIFT DETECTED 🚨]', driftPayload);

            // TEMP: Make this impossible to ignore during dev
            // Comment this out later if needed.
            if (prev.blockType === 'announcements') {
              debugger;
            }
          }
        }

        return {
          ...prev,
          current: currentMeasurement,
          drift: {
            model: { x: modelDriftX, y: modelDriftY },
            css: { left: cssLeftChanged, top: cssTopChanged },
            dom: { left: domDriftLeft, top: domDriftTop },
          },
          hasAnyDrift: hasDrift,  // Using hasDrift (model or CSS only), not including rectDrift
          // Store individual drift flags for UI display
          modelDrift,
          cssDrift,
          rectDrift,
        };
      });
    };

    const handleResizeEnd = () => {
      if (currentSnapshot) {
        setResizeHistory(prev => [...prev.slice(-9), currentSnapshot]);
        console.log(`[RESIZE MONITOR] Ended resize`, {
          blockType: currentSnapshot.blockType,
          hadDrift: currentSnapshot.hasAnyDrift,
          finalDrift: currentSnapshot.drift,
        });

        // Emit test completion event for DriftTestHelper
        window.dispatchEvent(new CustomEvent('resize-test-complete', {
          detail: {
            blockId: currentSnapshot.blockId,
            blockType: currentSnapshot.blockType,
            handle: currentSnapshot.handle,
            rotation: currentSnapshot.rotation,
            driftDetected: currentSnapshot.hasAnyDrift,
            driftType: currentSnapshot.hasAnyDrift ? (
              Math.abs(currentSnapshot.drift.model.x) > 0.1 || Math.abs(currentSnapshot.drift.model.y) > 0.1 ? 'Model' :
              currentSnapshot.drift.css.left || currentSnapshot.drift.css.top ? 'CSS' :
              'DOM'
            ) : undefined,
            driftAmount: currentSnapshot.hasAnyDrift ? {
              x: currentSnapshot.drift.model.x || currentSnapshot.drift.dom.left,
              y: currentSnapshot.drift.model.y || currentSnapshot.drift.dom.top,
            } : undefined,
          }
        }));
      }
      setCurrentSnapshot(null);
      setIsResizing(false);
    };

    // Listen for custom resize events
    window.addEventListener('resize-monitor-start' as any, handleResizeStart);
    window.addEventListener('resize-monitor-move' as any, handleResizeMove);
    window.addEventListener('resize-monitor-end' as any, handleResizeEnd);

    return () => {
      window.removeEventListener('resize-monitor-start' as any, handleResizeStart);
      window.removeEventListener('resize-monitor-move' as any, handleResizeMove);
      window.removeEventListener('resize-monitor-end' as any, handleResizeEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentSnapshot accessed via closure in handleResizeEnd; re-registering listeners on snapshot change would break event handling
  }, [isEnabled, blocks]);

  if (!isEnabled) return null;

  const activeBlock = blocks.find(b => b.id === activeBlockId);

  return (
    <div
      className="fixed top-4 right-4 bg-black bg-opacity-95 text-white p-4 rounded-lg font-mono text-[10px] z-[10000] shadow-2xl"
      style={{ minWidth: '400px', maxWidth: '500px' }}
    >
      <div className="font-bold mb-3 text-lg flex items-center justify-between">
        <span>Resize Monitor (FIXED)</span>
        {isResizing && <span className="text-yellow-400 animate-pulse">RESIZING</span>}
      </div>

      {/* Active Block Info */}
      {activeBlock && (
        <div className="mb-4 p-2 bg-gray-800 rounded">
          <div className="text-gray-400 mb-1">Active Block</div>
          <div>Type: <span className="text-yellow-400">{activeBlock.type}</span></div>
          <div>ID: {activeBlock.id.substring(0, 8)}...</div>
          <div>Model Position: ({activeBlock.x}, {activeBlock.y})</div>
          <div>Model Size: {activeBlock.width} × {activeBlock.height}</div>
          {activeBlock.rotation && <div>Rotation: {activeBlock.rotation}°</div>}
        </div>
      )}

      {/* Current Resize Operation */}
      {currentSnapshot && (
        <div className={`mb-4 p-2 rounded ${currentSnapshot.hasAnyDrift ? 'bg-red-900' : 'bg-green-900'}`}>
          <div className="font-bold mb-2 text-sm">
            Resizing {currentSnapshot.blockType} from {currentSnapshot.handle.toUpperCase()}
            {currentSnapshot.hasAnyDrift && ' ⚠️ DRIFT DETECTED!'}
          </div>

          {/* Drift Classification */}
          <div className="mb-2 p-1 bg-black rounded">
            <div className="text-gray-400 text-xs mb-1">Drift Classification:</div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className={currentSnapshot.modelDrift ? 'text-red-500 font-bold' : 'text-green-400'}>
                Model: {currentSnapshot.modelDrift ? '❌ DRIFT' : '✅ OK'}
              </div>
              <div className={currentSnapshot.cssDrift ? 'text-red-500 font-bold' : 'text-green-400'}>
                CSS: {currentSnapshot.cssDrift ? '❌ DRIFT' : '✅ OK'}
              </div>
              <div className={currentSnapshot.rectDrift ? 'text-yellow-500' : 'text-green-400'}>
                Rect: {currentSnapshot.rectDrift ? '⚠️ Changed' : '✅ OK'}
              </div>
            </div>
          </div>

          {/* Model Values */}
          <div className="mb-2">
            <div className="text-gray-400 text-xs mb-1">Model Values:</div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-gray-500">Start:</span> ({currentSnapshot.start.modelX}, {currentSnapshot.start.modelY})
              </div>
              <div className={currentSnapshot.drift.model.x !== 0 || currentSnapshot.drift.model.y !== 0 ? 'text-red-400' : ''}>
                <span className="text-gray-500">Now:</span> ({currentSnapshot.current.modelX}, {currentSnapshot.current.modelY})
                {(currentSnapshot.drift.model.x !== 0 || currentSnapshot.drift.model.y !== 0) &&
                  ` Δ(${currentSnapshot.drift.model.x.toFixed(1)}, ${currentSnapshot.drift.model.y.toFixed(1)})`}
              </div>
            </div>
          </div>

          {/* CSS Styles */}
          <div className="mb-2">
            <div className="text-gray-400 text-xs mb-1">CSS Computed Styles:</div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-gray-500">Start:</span> left:{currentSnapshot.start.cssLeft}, top:{currentSnapshot.start.cssTop}
              </div>
              <div className={currentSnapshot.drift.css.left || currentSnapshot.drift.css.top ? 'text-red-400' : ''}>
                <span className="text-gray-500">Now:</span> left:{currentSnapshot.current.cssLeft}, top:{currentSnapshot.current.cssTop}
                {(currentSnapshot.drift.css.left || currentSnapshot.drift.css.top) && ' CHANGED!'}
              </div>
            </div>
          </div>

          {/* DOM Bounding Rect */}
          <div className="mb-2">
            <div className="text-gray-400 text-xs mb-1">Visual DOM Position (getBoundingClientRect):</div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-gray-500">Start:</span> ({currentSnapshot.start.domLeft.toFixed(1)}, {currentSnapshot.start.domTop.toFixed(1)})
              </div>
              <div className={Math.abs(currentSnapshot.drift.dom.left) > 1 || Math.abs(currentSnapshot.drift.dom.top) > 1 ? 'text-red-400' : ''}>
                <span className="text-gray-500">Now:</span> ({currentSnapshot.current.domLeft.toFixed(1)}, {currentSnapshot.current.domTop.toFixed(1)})
                {(Math.abs(currentSnapshot.drift.dom.left) > 1 || Math.abs(currentSnapshot.drift.dom.top) > 1) &&
                  ` Δ(${currentSnapshot.drift.dom.left.toFixed(1)}, ${currentSnapshot.drift.dom.top.toFixed(1)})`}
              </div>
            </div>
          </div>

          {/* Transform Info */}
          <div className="text-[10px]">
            <div className="text-gray-400 text-xs mb-1">Transform:</div>
            <div className="text-blue-300">Origin: {currentSnapshot.current.transformOrigin}</div>
            <div className="text-blue-300 truncate">Transform: {currentSnapshot.current.transform}</div>
          </div>

          {currentSnapshot.hasAnyDrift && currentSnapshot.handle === 'se' && (
            <div className="mt-2 text-red-400 text-xs border-t border-red-600 pt-2">
              ❌ Top-left anchor should NOT move during bottom-right resize!
              {currentSnapshot.drift.model.x !== 0 || currentSnapshot.drift.model.y !== 0 &&
                <div>• Model position changed</div>}
              {(currentSnapshot.drift.css.left || currentSnapshot.drift.css.top) &&
                <div>• CSS left/top changed</div>}
              {(Math.abs(currentSnapshot.drift.dom.left) > 1 || Math.abs(currentSnapshot.drift.dom.top) > 1) &&
                <div>• Visual DOM position changed by ({currentSnapshot.drift.dom.left.toFixed(1)}, {currentSnapshot.drift.dom.top.toFixed(1)})px</div>}
            </div>
          )}
        </div>
      )}

      {/* Resize History */}
      {resizeHistory.length > 0 && (
        <div>
          <div className="text-gray-400 mb-2 text-xs">Recent Operations</div>
          {resizeHistory.slice(-3).reverse().map((snapshot, i) => (
            <div
              key={i}
              className={`text-[10px] mb-1 p-1 rounded ${
                snapshot.hasAnyDrift ? 'bg-red-900 bg-opacity-50' : 'bg-gray-800'
              }`}
            >
              {snapshot.blockType} {snapshot.handle.toUpperCase()}:
              {snapshot.hasAnyDrift ? ' ❌ Had drift' : ' ✅ No drift'}
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 pt-3 border-t border-gray-600 text-[10px] text-gray-400">
        <div>Press Ctrl+Shift+A to test Announcements block</div>
        <div>This monitor now checks MODEL + CSS + DOM positions</div>
      </div>
    </div>
  );
}