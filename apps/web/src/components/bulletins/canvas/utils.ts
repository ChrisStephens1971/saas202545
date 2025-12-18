/**
 * Canvas Editor Utilities
 *
 * Helper functions for grid snapping, resizing, and layout operations.
 */

import type { BulletinCanvasBlock } from '@elder-first/types';

/**
 * Snap a value to the nearest grid increment
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap a block's position and size to grid
 */
export function snapBlockToGrid(
  block: Partial<BulletinCanvasBlock>,
  gridSize: number
): Partial<BulletinCanvasBlock> {
  return {
    ...block,
    x: block.x !== undefined ? snapToGrid(block.x, gridSize) : block.x,
    y: block.y !== undefined ? snapToGrid(block.y, gridSize) : block.y,
    width: block.width !== undefined ? snapToGrid(block.width, gridSize) : block.width,
    height: block.height !== undefined ? snapToGrid(block.height, gridSize) : block.height,
  };
}

/**
 * Constrain block within canvas bounds
 */
export function constrainBlock(
  block: BulletinCanvasBlock,
  canvasWidth: number = 816,
  canvasHeight: number = 1056
): BulletinCanvasBlock {
  return {
    ...block,
    x: Math.max(0, Math.min(canvasWidth - block.width, block.x)),
    y: Math.max(0, Math.min(canvasHeight - block.height, block.y)),
  };
}

/**
 * Min sizes for different block types
 */
export const MIN_BLOCK_SIZES: Record<string, { width: number; height: number }> = {
  text: { width: 50, height: 30 },
  image: { width: 50, height: 50 },
  qr: { width: 80, height: 80 },
  serviceItems: { width: 200, height: 150 },
  announcements: { width: 200, height: 100 },
  events: { width: 200, height: 100 },
  giving: { width: 150, height: 150 },
  contactInfo: { width: 150, height: 80 },
};

/**
 * Get min size for a block type
 */
export function getMinSize(blockType: string): { width: number; height: number } {
  return MIN_BLOCK_SIZES[blockType] || { width: 50, height: 50 };
}

/**
 * Resize block while respecting constraints
 *
 * Each handle has a specific anchor point that should NOT move during resize:
 * - se (bottom-right): anchors top-left
 * - nw (top-left): anchors bottom-right
 * - ne (top-right): anchors bottom-left
 * - sw (bottom-left): anchors top-right
 * - n/s/e/w: anchor the opposite edge
 */
export function resizeBlock(
  block: BulletinCanvasBlock,
  deltaX: number,
  deltaY: number,
  handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w',
  gridSize: number,
  canvasWidth: number = 816,
  canvasHeight: number = 1056
): Partial<BulletinCanvasBlock> {
  const minSize = getMinSize(block.type);
  let newX = block.x;
  let newY = block.y;
  let newWidth = block.width;
  let newHeight = block.height;

  // Calculate new dimensions based on handle
  switch (handle) {
    case 'se': // Bottom-right handle - anchor top-left (left and top stay fixed)
      newWidth = Math.max(minSize.width, snapToGrid(block.width + deltaX, gridSize));
      newHeight = Math.max(minSize.height, snapToGrid(block.height + deltaY, gridSize));
      // Constrain to canvas bounds without moving top-left
      newWidth = Math.min(newWidth, canvasWidth - newX);
      newHeight = Math.min(newHeight, canvasHeight - newY);
      break;

    case 'nw': // Top-left handle - anchor bottom-right (right and bottom stay fixed)
      const nwWidth = Math.max(minSize.width, snapToGrid(block.width - deltaX, gridSize));
      const nwHeight = Math.max(minSize.height, snapToGrid(block.height - deltaY, gridSize));
      newX = snapToGrid(block.x + block.width - nwWidth, gridSize);
      newY = snapToGrid(block.y + block.height - nwHeight, gridSize);
      newWidth = nwWidth;
      newHeight = nwHeight;
      // Constrain to canvas bounds
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      break;

    case 'ne': // Top-right handle - anchor bottom-left (left and bottom stay fixed)
      newWidth = Math.max(minSize.width, snapToGrid(block.width + deltaX, gridSize));
      const neHeight = Math.max(minSize.height, snapToGrid(block.height - deltaY, gridSize));
      newY = snapToGrid(block.y + block.height - neHeight, gridSize);
      newHeight = neHeight;
      // Constrain to canvas bounds
      newWidth = Math.min(newWidth, canvasWidth - newX);
      newY = Math.max(0, newY);
      break;

    case 'sw': // Bottom-left handle - anchor top-right (right and top stay fixed)
      const swWidth = Math.max(minSize.width, snapToGrid(block.width - deltaX, gridSize));
      newX = snapToGrid(block.x + block.width - swWidth, gridSize);
      newWidth = swWidth;
      newHeight = Math.max(minSize.height, snapToGrid(block.height + deltaY, gridSize));
      // Constrain to canvas bounds
      newX = Math.max(0, newX);
      newHeight = Math.min(newHeight, canvasHeight - newY);
      break;

    case 'n': // Top handle - anchor bottom (bottom stays fixed, width unchanged)
      const nHeight = Math.max(minSize.height, snapToGrid(block.height - deltaY, gridSize));
      newY = snapToGrid(block.y + block.height - nHeight, gridSize);
      newHeight = nHeight;
      // Constrain to canvas bounds
      newY = Math.max(0, newY);
      break;

    case 's': // Bottom handle - anchor top (top stays fixed, width unchanged)
      newHeight = Math.max(minSize.height, snapToGrid(block.height + deltaY, gridSize));
      // Constrain to canvas bounds
      newHeight = Math.min(newHeight, canvasHeight - newY);
      break;

    case 'e': // Right handle - anchor left (left stays fixed, height unchanged)
      newWidth = Math.max(minSize.width, snapToGrid(block.width + deltaX, gridSize));
      // Constrain to canvas bounds
      newWidth = Math.min(newWidth, canvasWidth - newX);
      break;

    case 'w': // Left handle - anchor right (right stays fixed, height unchanged)
      const wWidth = Math.max(minSize.width, snapToGrid(block.width - deltaX, gridSize));
      newX = snapToGrid(block.x + block.width - wWidth, gridSize);
      newWidth = wWidth;
      // Constrain to canvas bounds
      newX = Math.max(0, newX);
      break;
  }

  return {
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight,
  };
}
