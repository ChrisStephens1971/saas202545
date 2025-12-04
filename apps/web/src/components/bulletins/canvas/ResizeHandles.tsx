'use client';

import { useState, useEffect } from 'react';
import type { BulletinCanvasBlock } from '@elder-first/types';
import { resizeBlock } from './utils';
import { IS_DEV } from '@/config/env';

interface ResizeHandlesProps {
  block: BulletinCanvasBlock;
  onResize: (updates: Partial<BulletinCanvasBlock>) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  gridSize: number;
  scale: number;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

/**
 * ResizeHandles
 *
 * Renders resize handles around a selected block and handles resize drag operations.
 */
export function ResizeHandles({
  block,
  onResize,
  onResizeStart,
  onResizeEnd,
  gridSize,
  scale,
}: ResizeHandlesProps) {
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [startBlock, setStartBlock] = useState<BulletinCanvasBlock | null>(null);

  useEffect(() => {
    if (!activeHandle || !startPos || !startBlock) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - startPos.x) / scale;
      const deltaY = (e.clientY - startPos.y) / scale;

      // SE resize uses direct implementation for all blocks
      // This anchors top-left (x/y stay constant) and only changes width/height
      let updates: Partial<BulletinCanvasBlock>;

      if (activeHandle === 'se') {
        // Direct implementation for SE resize - works for ALL block types
        updates = {
          // x and y MUST stay constant (equal to startBlock values)
          x: startBlock.x,  // EXPLICITLY set to prevent any drift
          y: startBlock.y,  // EXPLICITLY set to prevent any drift
          width: Math.max(100, startBlock.width + deltaX),  // Min width 100px
          height: Math.max(100, startBlock.height + deltaY), // Min height 100px
          // No rotation changes during resize
        };
      } else {
        // Use helper for other resize handles
        updates = resizeBlock(
          startBlock,
          deltaX,
          deltaY,
          activeHandle,
          gridSize
        );
      }

      // Enhanced debug logging to track the issue
      if (IS_DEV) {
        const isBottomRight = activeHandle === 'se';
        const isAnnouncementsBlock = block.type === 'announcements';

        if (isBottomRight || isAnnouncementsBlock) {
          // Also check the DOM element position
          const blockElement = document.querySelector(`[data-block-id="${block.id}"]`) as HTMLElement;
          const domRect = blockElement?.getBoundingClientRect();
          const computedStyle = blockElement ? window.getComputedStyle(blockElement) : null;

          console.log('[RESIZE MOVE]', {
            blockType: block.type,
            handle: activeHandle,
            startBlock: {
              x: startBlock.x,
              y: startBlock.y,
              width: startBlock.width,
              height: startBlock.height,
              rotation: startBlock.rotation,
            },
            deltas: { deltaX, deltaY },
            updates,
            positionDrift: {
              x: (updates.x || startBlock.x) - startBlock.x,
              y: (updates.y || startBlock.y) - startBlock.y,
            },
            domPosition: domRect ? {
              left: domRect.left,
              top: domRect.top,
              width: domRect.width,
              height: domRect.height,
            } : null,
            computedStyles: {
              transform: computedStyle?.transform,
              transformOrigin: computedStyle?.transformOrigin,
              position: computedStyle?.position,
              left: computedStyle?.left,
              top: computedStyle?.top,
              width: computedStyle?.width,
              height: computedStyle?.height,
            },
          });

          // Special logging for announcements block
          if (isAnnouncementsBlock) {
            console.log('[ANNOUNCEMENTS BLOCK SPECIFIC]', {
              elementFound: !!blockElement,
              allTransforms: computedStyle?.transform,
              transformOrigin: computedStyle?.transformOrigin,
              actualLeft: computedStyle?.left,
              actualTop: computedStyle?.top,
              parentElement: blockElement?.parentElement?.className,
              parentTransform: blockElement?.parentElement ? window.getComputedStyle(blockElement.parentElement).transform : null,
            });
          }

          if (updates.x !== startBlock.x || updates.y !== startBlock.y) {
            console.error('❌ POSITION DRIFT DETECTED IN MODEL!', {
              startX: startBlock.x,
              startY: startBlock.y,
              newX: updates.x,
              newY: updates.y,
            });
          }

          // Emit custom event for test monitoring with full measurements
          const resizeBlockElement = document.querySelector(`[data-block-id="${block.id}"]`) as HTMLElement;
          const resizeRect = resizeBlockElement?.getBoundingClientRect();
          const resizeComputedStyle = resizeBlockElement ? window.getComputedStyle(resizeBlockElement) : null;

          window.dispatchEvent(new CustomEvent('resize-monitor-move', {
            detail: {
              blockId: block.id,
              handle: activeHandle,
              x: updates.x || startBlock.x,
              y: updates.y || startBlock.y,
              width: updates.width || startBlock.width,
              height: updates.height || startBlock.height,
              domRect: resizeRect ? { left: resizeRect.left, top: resizeRect.top } : null,
              cssStyles: resizeComputedStyle ? { left: resizeComputedStyle.left, top: resizeComputedStyle.top } : null,
            }
          }));
        }
      }

      onResize(updates);
    };

    const handleMouseUp = () => {
      // Emit custom event for test monitoring
      if (IS_DEV) {
        window.dispatchEvent(new CustomEvent('resize-monitor-end'));
      }

      setActiveHandle(null);
      setStartPos(null);
      setStartBlock(null);
      onResizeEnd?.();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeHandle, startPos, startBlock, scale, gridSize, onResize, onResizeEnd]);

  const handleMouseDown = (handle: ResizeHandle) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveHandle(handle);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartBlock({ ...block });

    // Debug log the resize start
    if (IS_DEV) {
      console.log('[RESIZE START]', {
        handle,
        blockId: block.id,
        startPosition: { x: block.x, y: block.y },
        startSize: { width: block.width, height: block.height },
        rotation: block.rotation,
      });

      // Emit custom event for test monitoring with DOM measurements
      const blockElement = document.querySelector(`[data-block-id="${block.id}"]`) as HTMLElement;
      const rect = blockElement?.getBoundingClientRect();
      const computedStyle = blockElement ? window.getComputedStyle(blockElement) : null;

      window.dispatchEvent(new CustomEvent('resize-monitor-start', {
        detail: {
          blockId: block.id,
          handle,
          x: block.x,
          y: block.y,
          width: block.width,
          height: block.height,
          rotation: block.rotation,
          domRect: rect ? { left: rect.left, top: rect.top } : null,
          cssStyles: computedStyle ? { left: computedStyle.left, top: computedStyle.top } : null,
        }
      }));
    }

    onResizeStart?.();
  };

  const handleStyle = 'absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-sm hover:bg-blue-600 cursor-pointer';

  // Show anchor point indicator during resize (debug)
  const showAnchorIndicator = activeHandle && IS_DEV;
  const getAnchorPosition = () => {
    if (!activeHandle || !startBlock) return null;

    switch (activeHandle) {
      case 'se': // Bottom-right anchors top-left
        return { left: 0, top: 0 };
      case 'nw': // Top-left anchors bottom-right
        return { right: 0, bottom: 0 };
      case 'ne': // Top-right anchors bottom-left
        return { left: 0, bottom: 0 };
      case 'sw': // Bottom-left anchors top-right
        return { right: 0, top: 0 };
      case 'n': // Top anchors bottom
        return { left: '50%', bottom: 0, transform: 'translateX(-50%)' };
      case 's': // Bottom anchors top
        return { left: '50%', top: 0, transform: 'translateX(-50%)' };
      case 'w': // Left anchors right
        return { right: 0, top: '50%', transform: 'translateY(-50%)' };
      case 'e': // Right anchors left
        return { left: 0, top: '50%', transform: 'translateY(-50%)' };
      default:
        return null;
    }
  };

  const anchorPosition = getAnchorPosition();

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10000 }}>
      {/* Anchor point indicator (shows which corner/edge is anchored during resize) */}
      {showAnchorIndicator && anchorPosition && (
        <div
          className="absolute w-4 h-4 bg-red-500 rounded-full animate-pulse"
          style={{
            ...anchorPosition,
            zIndex: 10001,
          }}
          title="Anchor point (should not move)"
        />
      )}

      {/* Corner handles */}
      <div
        className={handleStyle}
        style={{ top: -6, left: -6, cursor: 'nw-resize', pointerEvents: 'all' }}
        onMouseDown={handleMouseDown('nw')}
      />
      <div
        className={handleStyle}
        style={{ top: -6, right: -6, cursor: 'ne-resize', pointerEvents: 'all' }}
        onMouseDown={handleMouseDown('ne')}
      />
      <div
        className={handleStyle}
        style={{ bottom: -6, left: -6, cursor: 'sw-resize', pointerEvents: 'all' }}
        onMouseDown={handleMouseDown('sw')}
      />
      <div
        className={handleStyle}
        style={{ bottom: -6, right: -6, cursor: 'se-resize', pointerEvents: 'all' }}
        onMouseDown={handleMouseDown('se')}
      />

      {/* Edge handles */}
      <div
        className={handleStyle}
        style={{ top: -6, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize', pointerEvents: 'all' }}
        onMouseDown={handleMouseDown('n')}
      />
      <div
        className={handleStyle}
        style={{ bottom: -6, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize', pointerEvents: 'all' }}
        onMouseDown={handleMouseDown('s')}
      />
      <div
        className={handleStyle}
        style={{ top: '50%', left: -6, transform: 'translateY(-50%)', cursor: 'w-resize', pointerEvents: 'all' }}
        onMouseDown={handleMouseDown('w')}
      />
      <div
        className={handleStyle}
        style={{ top: '50%', right: -6, transform: 'translateY(-50%)', cursor: 'e-resize', pointerEvents: 'all' }}
        onMouseDown={handleMouseDown('e')}
      />
    </div>
  );
}
