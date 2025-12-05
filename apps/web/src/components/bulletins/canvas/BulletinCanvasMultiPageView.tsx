'use client';

import type { BulletinCanvasLayout, BulletinCanvasBlock } from '@elder-first/types';
import { BulletinCanvasPageView } from './BulletinCanvasPageView';
import type { CanvasRenderMode } from './types';

interface BulletinCanvasMultiPageViewProps {
  layout: BulletinCanvasLayout;
  mode: CanvasRenderMode;
  selectedBlockId?: string | null;
  onBlockSelect?: (blockId: string) => void;
  onBlockUpdate?: (blockId: string, updates: Partial<BulletinCanvasBlock>) => void;
  onBlockDelete?: (blockId: string) => void;
  onCanvasClick?: () => void;
  scale?: number;
  showGrid?: boolean;
  className?: string;
}

/**
 * BulletinCanvasMultiPageView
 *
 * Renders all pages in a bulletin canvas layout.
 * Used for print preview and full bulletin view.
 *
 * Layout modes:
 * - editor: Pages in a vertical scrollable list with spacing
 * - print: Pages stacked for PDF generation (no spacing)
 */
export function BulletinCanvasMultiPageView({
  layout,
  mode,
  selectedBlockId = null,
  onBlockSelect,
  onBlockUpdate,
  onBlockDelete,
  onCanvasClick,
  scale = 1,
  showGrid = false,
  className = '',
}: BulletinCanvasMultiPageViewProps) {
  const sortedPages = [...layout.pages].sort((a, b) => a.pageNumber - b.pageNumber);

  return (
    <div className={`flex flex-col ${mode === 'editor' ? 'gap-6' : ''} ${className}`}>
      {sortedPages.map((page) => (
        <BulletinCanvasPageView
          key={page.id}
          page={page}
          mode={mode}
          selectedBlockId={selectedBlockId}
          onBlockSelect={onBlockSelect}
          onBlockUpdate={onBlockUpdate}
          onBlockDelete={onBlockDelete}
          onCanvasClick={onCanvasClick}
          scale={scale}
          showGrid={showGrid}
        />
      ))}

      {/* Print page breaks (for print mode) */}
      {mode === 'print' && sortedPages.map((page, index) => (
        index < sortedPages.length - 1 && (
          <div key={`page-break-${page.id}`} className="page-break-after" />
        )
      ))}
    </div>
  );
}
