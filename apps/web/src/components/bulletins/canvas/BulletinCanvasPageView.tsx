'use client';

import type { BulletinCanvasPage, BulletinCanvasBlock } from '@elder-first/types';
import { CanvasBlockRenderer } from './CanvasBlockRenderer';
import type { CanvasRenderMode } from './types';

interface BulletinCanvasPageViewProps {
  page: BulletinCanvasPage;
  mode: CanvasRenderMode;
  selectedBlockId?: string | null;
  onBlockSelect?: (blockId: string) => void;
  onBlockUpdate?: (blockId: string, updates: Partial<BulletinCanvasBlock>) => void;
  onBlockDelete?: (blockId: string) => void;
  onCanvasClick?: () => void;
  scale?: number; // Zoom level for editor (1 = 100%)
  showGrid?: boolean;
  gridSize?: number;
  className?: string;
}

/**
 * BulletinCanvasPageView
 *
 * Renders a single bulletin canvas page with all its blocks.
 * Shared between editor and print modes.
 *
 * Page dimensions:
 * - US Letter portrait: 8.5" × 11" = 612 × 792 points (at 72 DPI)
 * - We use 816 × 1056 pixels (96 DPI equivalent for better screen display)
 */
export function BulletinCanvasPageView({
  page,
  mode,
  selectedBlockId = null,
  onBlockSelect,
  onBlockUpdate,
  onBlockDelete,
  onCanvasClick,
  scale = 1,
  showGrid = false,
  gridSize = 16,
  className = '',
}: BulletinCanvasPageViewProps) {
  // Page dimensions (96 DPI for screen display)
  const PAGE_WIDTH = 816; // 8.5" × 96 DPI
  const PAGE_HEIGHT = 1056; // 11" × 96 DPI

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only deselect if clicking the canvas background (not a block)
    if (e.target === e.currentTarget && onCanvasClick) {
      onCanvasClick();
    }
  };

  const gridStyle = showGrid && mode === 'editor' ? {
    backgroundImage: `
      linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
    `,
    backgroundSize: `${gridSize}px ${gridSize}px`,
  } : {};

  return (
    <div
      className={`${mode === 'editor' ? '' : 'bg-white shadow-lg border border-gray-300'} ${className}`}
      style={{
        width: `${PAGE_WIDTH}px`,
        height: `${PAGE_HEIGHT}px`,
        // No transform here - scaling is handled by parent container
        // when scale !== 1, we apply it via transform
        ...(scale !== 1 ? {
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        } : {}),
        // Page fills its container
        position: 'relative',
        ...gridStyle,
      }}
      onClick={handleCanvasClick}
    >
      {/* Page number indicator (editor mode only) */}
      {mode === 'editor' && (
        <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded z-50">
          Page {page.pageNumber}
        </div>
      )}

      {/* Debug: Show page dimensions and scale */}
      {mode === 'editor' && (
        <div className="absolute top-2 left-2 bg-blue-800 text-white text-xs px-2 py-1 rounded z-50">
          {PAGE_WIDTH}×{PAGE_HEIGHT} @ {Math.round(scale * 100)}%
        </div>
      )}

      {/* Debug: Origin marker at (0,0) to verify stability */}
      {mode === 'editor' && (
        <div
          className="absolute w-4 h-4 bg-red-500 rounded-full opacity-50 z-50"
          style={{ top: 0, left: 0 }}
          title="Page origin (0,0)"
        />
      )}

      {/* Visual Anchor Marker: Shows where the selected block's top-left anchor is in the model */}
      {mode === 'editor' && selectedBlockId && (() => {
        const selectedBlock = page.blocks.find(b => b.id === selectedBlockId);
        if (!selectedBlock) return null;

        return (
          <div
            className="absolute pointer-events-none"
            style={{
              left: selectedBlock.x - 3,
              top: selectedBlock.y - 3,
              width: 6,
              height: 6,
              borderRadius: '50%',
              border: '2px solid red',
              backgroundColor: 'rgba(255, 0, 0, 0.3)',
              zIndex: 9999,
              boxShadow: '0 0 0 1px white',
            }}
            title={`Model anchor: (${selectedBlock.x}, ${selectedBlock.y})`}
          >
            {/* Add crosshairs for better visibility */}
            <div
              style={{
                position: 'absolute',
                left: 2,
                top: -10,
                width: 2,
                height: 20,
                backgroundColor: 'red',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: -10,
                top: 2,
                width: 20,
                height: 2,
                backgroundColor: 'red',
              }}
            />
          </div>
        );
      })()}

      {/* Render all blocks */}
      {page.blocks
        .sort((a, b) => a.zIndex - b.zIndex) // Render in z-index order
        .map((block) => (
          <CanvasBlockRenderer
            key={block.id}
            block={block}
            mode={mode}
            isSelected={selectedBlockId === block.id}
            onSelect={onBlockSelect}
            onUpdate={onBlockUpdate}
            onDelete={onBlockDelete}
            gridSize={gridSize}
            scale={scale}
          />
        ))}

      {/* Empty state for editor */}
      {mode === 'editor' && page.blocks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400">
            <p className="text-sm">Empty page</p>
            <p className="text-xs mt-1">Drag blocks from the palette to add content</p>
          </div>
        </div>
      )}
    </div>
  );
}
