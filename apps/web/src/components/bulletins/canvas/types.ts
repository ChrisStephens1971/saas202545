import type { BulletinCanvasBlock } from '@elder-first/types';

/**
 * Render mode for canvas blocks
 * - editor: Interactive mode with selection, resize handles, drag-and-drop
 * - print: Static mode for print/PDF output, no interactivity
 */
export type CanvasRenderMode = 'editor' | 'print';

/**
 * Common props for all canvas block renderers
 */
export interface CanvasBlockRendererProps {
  block: BulletinCanvasBlock;
  mode: CanvasRenderMode;
  isSelected?: boolean;
  onSelect?: (blockId: string) => void;
  onUpdate?: (blockId: string, updates: Partial<BulletinCanvasBlock>) => void;
  onDelete?: (blockId: string) => void;
}

/**
 * Block-specific data interfaces
 */
export interface TextBlockData {
  content: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'semibold';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
}

export interface ImageBlockData {
  imageUrl: string;
  alt?: string;
  objectFit?: 'contain' | 'cover' | 'fill';
}

export interface QrBlockData {
  url: string;
  label?: string;
}

export interface ServiceItemsBlockData {
  bulletinIssueId: string;
  maxItems?: number;
  showCcli?: boolean;
}

export interface AnnouncementsBlockData {
  maxItems?: number;
  category?: string | null;
  priorityFilter?: 'high' | 'normal' | 'low' | null;
}

export interface EventsBlockData {
  maxItems?: number;
  dateRange?: 'week' | 'month' | 'all';
}

export interface GivingBlockData {
  displayType?: 'qr' | 'text' | 'both';
  givingUrl?: string;
}

export interface ContactInfoBlockData {
  showAddress?: boolean;
  showPhone?: boolean;
  showEmail?: boolean;
  showWebsite?: boolean;
}
