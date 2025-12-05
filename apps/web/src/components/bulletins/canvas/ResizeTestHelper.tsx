/**
 * ResizeTestHelper
 *
 * Visual component to verify resize behavior is working correctly.
 * Shows before/after positions during resize to detect any drift.
 */

import React, { useState, useEffect } from 'react';

interface ResizeTestHelperProps {
  isEnabled?: boolean;
}

interface BlockSnapshot {
  blockId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  domLeft?: number;
  domTop?: number;
}

export function ResizeTestHelper({ isEnabled = true }: ResizeTestHelperProps) {
  const [startSnapshot, setStartSnapshot] = useState<BlockSnapshot | null>(null);
  const [currentSnapshot, setCurrentSnapshot] = useState<BlockSnapshot | null>(null);
  const [isDrifting, setIsDrifting] = useState(false);

  useEffect(() => {
    if (!isEnabled || typeof window === 'undefined') return;

    const handleResizeStart = (e: CustomEvent) => {
      const { blockId, x, y, width, height } = e.detail;
      const blockEl = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
      const rect = blockEl?.getBoundingClientRect();

      const snapshot: BlockSnapshot = {
        blockId,
        x,
        y,
        width,
        height,
        domLeft: rect?.left,
        domTop: rect?.top,
      };

      setStartSnapshot(snapshot);
      setCurrentSnapshot(snapshot);
      setIsDrifting(false);

      console.log('[TEST] Resize started:', snapshot);
    };

    const handleResizeMove = (e: CustomEvent) => {
      const { blockId, x, y, width, height, handle } = e.detail;
      const blockEl = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
      const rect = blockEl?.getBoundingClientRect();

      const snapshot: BlockSnapshot = {
        blockId,
        x,
        y,
        width,
        height,
        domLeft: rect?.left,
        domTop: rect?.top,
      };

      setCurrentSnapshot(snapshot);

      // Check for drift on bottom-right resize
      if (handle === 'se' && startSnapshot) {
        const modelDrift = x !== startSnapshot.x || y !== startSnapshot.y;
        const domDrift = rect && startSnapshot.domLeft && startSnapshot.domTop &&
          (Math.abs(rect.left - startSnapshot.domLeft) > 1 ||
           Math.abs(rect.top - startSnapshot.domTop) > 1);

        setIsDrifting(modelDrift || !!domDrift);

        if (modelDrift) {
          console.error('[TEST] Model drift detected!', {
            startX: startSnapshot.x,
            startY: startSnapshot.y,
            currentX: x,
            currentY: y,
          });
        }

        if (domDrift) {
          console.error('[TEST] DOM drift detected!', {
            startDOM: { left: startSnapshot.domLeft, top: startSnapshot.domTop },
            currentDOM: { left: rect?.left, top: rect?.top },
          });
        }
      }
    };

    const handleResizeEnd = () => {
      console.log('[TEST] Resize ended');
      setStartSnapshot(null);
      setCurrentSnapshot(null);
      setIsDrifting(false);
    };

    window.addEventListener('resize-test-start' as any, handleResizeStart);
    window.addEventListener('resize-test-move' as any, handleResizeMove);
    window.addEventListener('resize-test-end' as any, handleResizeEnd);

    return () => {
      window.removeEventListener('resize-test-start' as any, handleResizeStart);
      window.removeEventListener('resize-test-move' as any, handleResizeMove);
      window.removeEventListener('resize-test-end' as any, handleResizeEnd);
    };
  }, [isEnabled, startSnapshot]);

  if (!isEnabled || !startSnapshot || !currentSnapshot) return null;

  const xDrift = currentSnapshot.x - startSnapshot.x;
  const yDrift = currentSnapshot.y - startSnapshot.y;
  const widthChange = currentSnapshot.width - startSnapshot.width;
  const heightChange = currentSnapshot.height - startSnapshot.height;

  return (
    <div
      className={`fixed top-4 right-4 bg-black bg-opacity-95 text-white p-4 rounded-lg font-mono text-xs z-50 ${
        isDrifting ? 'ring-4 ring-red-500 animate-pulse' : 'ring-2 ring-green-500'
      }`}
      style={{ minWidth: '280px' }}
    >
      <div className="font-bold mb-3 text-lg">
        Resize Test Monitor {isDrifting && '⚠️ DRIFT!'}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-gray-400 mb-1">Start Position</div>
          <div>X: {startSnapshot.x}</div>
          <div>Y: {startSnapshot.y}</div>
          <div>W: {startSnapshot.width}</div>
          <div>H: {startSnapshot.height}</div>
        </div>

        <div>
          <div className="text-gray-400 mb-1">Current Position</div>
          <div className={xDrift !== 0 ? 'text-red-400' : ''}>
            X: {currentSnapshot.x} {xDrift !== 0 && `(${xDrift > 0 ? '+' : ''}${xDrift})`}
          </div>
          <div className={yDrift !== 0 ? 'text-red-400' : ''}>
            Y: {currentSnapshot.y} {yDrift !== 0 && `(${yDrift > 0 ? '+' : ''}${yDrift})`}
          </div>
          <div className={widthChange !== 0 ? 'text-blue-400' : ''}>
            W: {currentSnapshot.width} {widthChange !== 0 && `(${widthChange > 0 ? '+' : ''}${widthChange})`}
          </div>
          <div className={heightChange !== 0 ? 'text-blue-400' : ''}>
            H: {currentSnapshot.height} {heightChange !== 0 && `(${heightChange > 0 ? '+' : ''}${heightChange})`}
          </div>
        </div>
      </div>

      {isDrifting && (
        <div className="mt-3 pt-3 border-t border-red-600">
          <div className="text-red-400 font-bold">
            ❌ Position drift detected during resize!
          </div>
          <div className="text-xs mt-1">
            The top-left corner should not move when resizing from bottom-right.
          </div>
        </div>
      )}
    </div>
  );
}