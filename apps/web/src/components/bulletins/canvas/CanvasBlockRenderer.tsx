'use client';

import type { BulletinCanvasBlock } from '@elder-first/types';
import { CanvasBlockWrapper } from './CanvasBlockWrapper';
import { CanvasTextBlock } from './CanvasTextBlock';
import { CanvasImageBlock } from './CanvasImageBlock';
import { CanvasQrBlock } from './CanvasQrBlock';
import { CanvasServiceItemsBlock } from './CanvasServiceItemsBlock';
import { CanvasAnnouncementsBlock } from './CanvasAnnouncementsBlock';
import { CanvasEventsBlock } from './CanvasEventsBlock';
import { CanvasGivingBlock } from './CanvasGivingBlock';
import { CanvasContactInfoBlock } from './CanvasContactInfoBlock';
import type { CanvasRenderMode } from './types';

interface CanvasBlockRendererProps {
  block: BulletinCanvasBlock;
  mode: CanvasRenderMode;
  isSelected?: boolean;
  onSelect?: (blockId: string) => void;
  onUpdate?: (blockId: string, updates: Partial<BulletinCanvasBlock>) => void;
  onDelete?: (blockId: string) => void;
  gridSize?: number;
  scale?: number;
}

/**
 * CanvasBlockRenderer
 *
 * Main renderer that routes to the correct block component based on block.type.
 * Wraps the specific renderer in CanvasBlockWrapper for positioning/selection.
 */
export function CanvasBlockRenderer({
  block,
  mode,
  isSelected = false,
  onSelect,
  onUpdate,
  onDelete,
  gridSize = 16,
  scale = 1,
}: CanvasBlockRendererProps) {
  // Route to correct block renderer
  const renderBlockContent = () => {
    const commonProps = { block, mode, isSelected, onSelect, onUpdate, onDelete };

    switch (block.type) {
      case 'text':
        return <CanvasTextBlock {...commonProps} />;
      case 'image':
        return <CanvasImageBlock {...commonProps} />;
      case 'qr':
        return <CanvasQrBlock {...commonProps} />;
      case 'serviceItems':
        return <CanvasServiceItemsBlock {...commonProps} />;
      case 'announcements':
        return <CanvasAnnouncementsBlock {...commonProps} />;
      case 'events':
        return <CanvasEventsBlock {...commonProps} />;
      case 'giving':
        return <CanvasGivingBlock {...commonProps} />;
      case 'contactInfo':
        return <CanvasContactInfoBlock {...commonProps} />;
      default:
        return (
          <div className="h-full w-full flex items-center justify-center bg-red-50 border-2 border-red-300 rounded">
            <p className="text-red-600 text-sm">Unknown block type: {block.type}</p>
          </div>
        );
    }
  };

  return (
    <CanvasBlockWrapper
      block={block}
      mode={mode}
      isSelected={isSelected}
      onSelect={onSelect}
      onUpdate={onUpdate}
      gridSize={gridSize}
      scale={scale}
    >
      {renderBlockContent()}
    </CanvasBlockWrapper>
  );
}
