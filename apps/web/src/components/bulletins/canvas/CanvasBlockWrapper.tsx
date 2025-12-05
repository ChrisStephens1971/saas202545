'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { BulletinCanvasBlock } from '@elder-first/types';
import type { CanvasRenderMode } from './types';
import { ResizeHandles } from './ResizeHandles';
import { ResizeDebugHelper } from './ResizeDebugHelper';
import { IS_DEV } from '@/config/env';

interface CanvasBlockWrapperProps {
  block: BulletinCanvasBlock;
  mode: CanvasRenderMode;
  isSelected?: boolean;
  onSelect?: (blockId: string) => void;
  onUpdate?: (blockId: string, updates: Partial<BulletinCanvasBlock>) => void;
  gridSize?: number;
  scale?: number;
  children: ReactNode;
}

/**
 * CanvasBlockWrapper
 *
 * Handles positioning, sizing, rotation, selection, and dragging for all canvas blocks.
 * Wraps the specific block renderer component.
 *
 * In editor mode:
 * - Shows selection outline when selected
 * - Enables click to select
 * - Enables drag to reposition
 * - Applies transform (rotation, position, size)
 *
 * In print mode:
 * - Just applies positioning/sizing
 * - No interactivity
 */
export function CanvasBlockWrapper({
  block,
  mode,
  isSelected = false,
  onSelect,
  onUpdate,
  gridSize = 16,
  scale = 1,
  children,
}: CanvasBlockWrapperProps) {
  const [isResizing, setIsResizing] = useState(false);

  // Setup draggable for editor mode
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
    data: {
      isBlock: true,
      blockId: block.id,
    },
    disabled: mode === 'print',
  });

  const handleClick = (e: React.MouseEvent) => {
    if (mode === 'editor' && onSelect) {
      e.stopPropagation();
      onSelect(block.id);
    }
  };

  // CRITICAL ARCHITECTURE: Separate layout from transforms to prevent drift
  // The outer BlockFrame handles position/size ONLY
  // The inner BlockTransformLayer handles transforms ONLY
  const effectiveRotation = block.rotation;

  // LAYER 1: BlockFrame - Layout wrapper (position + size ONLY, NO transforms)
  const blockFrameStyles: React.CSSProperties = {
    position: 'absolute',
    left: block.x,    // Direct from model, no transform
    top: block.y,     // Direct from model, no transform
    width: block.width,
    height: block.height,
    zIndex: block.zIndex,
    // NO transform, NO transformOrigin on this layer
    boxSizing: 'border-box',
    // Editor styling for selection
    ...(mode === 'editor' ? {
      cursor: isDragging ? 'grabbing' : (isResizing ? 'default' : 'grab'),
      outline: isSelected ? '2px solid #3b82f6' : '1px solid transparent',
      outlineOffset: '2px',
      opacity: isDragging ? 0.5 : 1,
    } : {}),
    // Disable transitions during resize
    ...(isResizing ? {
      transition: 'none !important',
      animation: 'none !important',
    } : {
      transition: mode === 'editor' ? 'outline 0.15s ease-in-out' : undefined,
    }),
  };

  // LAYER 2: BlockTransformLayer - Transform wrapper (transforms ONLY, NO position)
  let transformLayerTransform: string | undefined;

  // Apply dnd-kit drag transform
  if (transform) {
    const adjustedX = transform.x / scale;
    const adjustedY = transform.y / scale;
    const dndTransform = `translate3d(${adjustedX}px, ${adjustedY}px, 0)`;

    // Combine rotation and drag transforms
    transformLayerTransform = [
      effectiveRotation ? `rotate(${effectiveRotation}deg)` : null,
      dndTransform,
    ].filter(Boolean).join(' ') || undefined;
  } else if (effectiveRotation) {
    transformLayerTransform = `rotate(${effectiveRotation}deg)`;
  }

  const blockTransformLayerStyles: React.CSSProperties = {
    width: '100%',
    height: '100%',
    // Transforms ONLY on this layer
    transform: transformLayerTransform,
    transformOrigin: '0 0', // Always from top-left
    // NO position properties (no left/top)
    // Disable transitions during resize
    ...(isResizing ? {
      transition: 'none !important',
      animation: 'none !important',
    } : {}),
  };

  // DEV-ONLY: Debug logging during resize to verify two-layer architecture
  if (IS_DEV && isResizing) {
    const frameElement = typeof document !== 'undefined' ?
      document.querySelector(`[data-block-id="${block.id}"]`) as HTMLElement : null;
    const frameComputedStyle = frameElement ? window.getComputedStyle(frameElement) : null;
    const transformElement = frameElement?.querySelector('.block-transform-layer') as HTMLElement;
    const transformComputedStyle = transformElement ? window.getComputedStyle(transformElement) : null;

    console.log('[TWO-LAYER ARCHITECTURE]', {
      blockId: block.id,
      blockType: block.type,
      isResizing,
      model: { x: block.x, y: block.y, width: block.width, height: block.height },
      effectiveRotation,
      blockFrame: {
        styles: {
          left: blockFrameStyles.left,
          top: blockFrameStyles.top,
          width: blockFrameStyles.width,
          height: blockFrameStyles.height,
        },
        computed: frameComputedStyle ? {
          left: frameComputedStyle.left,
          top: frameComputedStyle.top,
          width: frameComputedStyle.width,
          height: frameComputedStyle.height,
          transform: frameComputedStyle.transform,
        } : null,
      },
      transformLayer: {
        styles: {
          transform: blockTransformLayerStyles.transform,
          transformOrigin: blockTransformLayerStyles.transformOrigin,
        },
        computed: transformComputedStyle ? {
          transform: transformComputedStyle.transform,
          transformOrigin: transformComputedStyle.transformOrigin,
        } : null,
      },
    });
  }

  return (
    // LAYER 1: BlockFrame - Handles layout ONLY (position + size)
    <div
      ref={setNodeRef}
      {...(mode === 'editor' ? listeners : {})}
      {...(mode === 'editor' ? attributes : {})}
      data-block-id={block.id}
      data-block-type={block.type}
      className={`block-frame ${mode === 'editor' ? 'hover:outline-gray-300' : ''}`}
      style={blockFrameStyles}
      onClick={handleClick}
    >
      {/* LAYER 2: BlockTransformLayer - Handles transforms ONLY */}
      <div
        className="block-transform-layer"
        style={blockTransformLayerStyles}
      >
        {/* Actual block content */}
        {children}
      </div>

      {/* Debug: Show block position when selected */}
      {mode === 'editor' && isSelected && (
        <div className="absolute -top-8 left-0 bg-purple-600 text-white text-xs px-2 py-1 rounded z-50 whitespace-nowrap">
          x:{block.x} y:{block.y} w:{block.width} h:{block.height}
          {effectiveRotation ? ` r:${effectiveRotation}°` : ''}
        </div>
      )}

      {/* Resize handles - attached to BlockFrame, not transform layer */}
      {mode === 'editor' && isSelected && onUpdate && (
        <ResizeHandles
          block={block}
          onResize={(updates) => onUpdate(block.id, updates)}
          onResizeStart={() => setIsResizing(true)}
          onResizeEnd={() => setIsResizing(false)}
          gridSize={gridSize}
          scale={scale}
        />
      )}

      {/* Debug helper for testing resize behavior */}
      {mode === 'editor' && isSelected && (
        <ResizeDebugHelper block={block} isResizing={isResizing} />
      )}
    </div>
  );
}
