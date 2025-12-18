'use client';

import type { BulletinCanvasLayout, BulletinCanvasBlock } from '@elder-first/types';
import { CanvasTextBlock } from './CanvasTextBlock';
import { CanvasImageBlock } from './CanvasImageBlock';
import { CanvasQrBlock } from './CanvasQrBlock';
import { CanvasServiceItemsBlock } from './CanvasServiceItemsBlock';
import { CanvasAnnouncementsBlock } from './CanvasAnnouncementsBlock';
import { CanvasEventsBlock } from './CanvasEventsBlock';
import { CanvasGivingBlock } from './CanvasGivingBlock';
import { CanvasContactInfoBlock } from './CanvasContactInfoBlock';

interface BulletinCanvasDigitalViewProps {
  layout: BulletinCanvasLayout;
  bulletinId: string;
}

/**
 * BulletinCanvasDigitalView
 *
 * Responsive, mobile-friendly renderer for canvas-based bulletins.
 * Unlike the editor/print renderers which use fixed positioning,
 * this stacks blocks vertically in reading order for optimal
 * digital viewing on phones, tablets, and desktops.
 */
export function BulletinCanvasDigitalView({
  layout,
  bulletinId,
}: BulletinCanvasDigitalViewProps) {
  // Flatten all blocks from all pages into a single array with pageNumber
  const allBlocks = layout?.pages?.flatMap((page) =>
    page.blocks.map((block) => ({
      ...block,
      pageNumber: page.pageNumber,
    }))
  ) ?? [];

  if (allBlocks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-600">No content available for this bulletin.</p>
      </div>
    );
  }

  // Sort blocks by page, then by y position, then by x position
  // This creates a natural reading order for stacked layout
  const sortedBlocks = [...allBlocks].sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) {
      return a.pageNumber - b.pageNumber;
    }
    if (a.y !== b.y) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {sortedBlocks.map((block) => (
        <DigitalBlockRenderer
          key={block.id}
          block={block}
          bulletinId={bulletinId}
        />
      ))}
    </div>
  );
}

/**
 * DigitalBlockRenderer
 *
 * Renders individual canvas blocks in digital mode.
 * Uses the same block components as editor/print but without
 * fixed positioning wrapper - instead uses responsive containers.
 */
function DigitalBlockRenderer({
  block,
  bulletinId: _bulletinId,
}: {
  block: BulletinCanvasBlock;
  bulletinId: string;
}) {
  // Determine padding/spacing based on block type
  const getPadding = () => {
    switch (block.type) {
      case 'text':
        return 'p-4 md:p-6';
      case 'image':
        return 'p-0'; // Images go edge-to-edge
      case 'qr':
        return 'p-6 md:p-8 flex justify-center';
      case 'serviceItems':
      case 'announcements':
      case 'events':
        return 'p-4 md:p-6';
      case 'giving':
      case 'contactInfo':
        return 'p-6 md:p-8';
      default:
        return 'p-4 md:p-6';
    }
  };

  // Render the block content
  const renderContent = () => {
    // Create a "digital" mode variant
    const mode = 'print' as const; // Use print mode (static, no interactivity)
    const commonProps = {
      block,
      mode,
      isSelected: false,
      onSelect: undefined,
      onUpdate: undefined,
      onDelete: undefined,
    };

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
        return null;
    }
  };

  // Add border between sections for visual separation
  const shouldShowBorder = () => {
    return ['text', 'serviceItems', 'announcements', 'events'].includes(block.type);
  };

  return (
    <div
      className={`
        ${getPadding()}
        ${shouldShowBorder() ? 'border-b border-gray-200 last:border-b-0' : ''}
      `}
    >
      <div className="max-w-full">
        {renderContent()}
      </div>
    </div>
  );
}
