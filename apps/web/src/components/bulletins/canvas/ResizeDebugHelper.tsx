/**
 * ResizeDebugHelper
 *
 * A debug component to help test and verify resize handle behavior.
 * Shows block position and size in real-time during resize operations.
 */

import React from 'react';
import type { BulletinCanvasBlock } from '@elder-first/types';
import { IS_DEV } from '@/config/env';

interface ResizeDebugHelperProps {
  block: BulletinCanvasBlock | null;
  isResizing?: boolean;
}

export function ResizeDebugHelper({ block, isResizing }: ResizeDebugHelperProps) {
  if (!block || !IS_DEV) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-3 rounded-lg font-mono text-xs z-50 ${
        isResizing ? 'ring-2 ring-yellow-400' : ''
      }`}
      style={{ minWidth: '200px' }}
    >
      <div className="font-bold mb-2 text-yellow-400">
        Block Debug {isResizing && '(RESIZING)'}
      </div>
      <div className="space-y-1">
        <div>ID: {block.id.substring(0, 8)}...</div>
        <div>Type: {block.type}</div>
        <div className={`${isResizing ? 'text-green-400' : ''}`}>
          Position: ({block.x}, {block.y})
        </div>
        <div className={`${isResizing ? 'text-blue-400' : ''}`}>
          Size: {block.width} × {block.height}
        </div>
        <div>Z-Index: {block.zIndex}</div>
        {block.rotation && <div>Rotation: {block.rotation}°</div>}
      </div>
      {isResizing && (
        <div className="mt-2 pt-2 border-t border-gray-600 text-xs">
          <div className="text-yellow-300">
            ℹ️ Top-left should stay fixed when resizing from bottom-right
          </div>
        </div>
      )}
    </div>
  );
}