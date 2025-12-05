'use client';

import Image from 'next/image';
import type { CanvasBlockRendererProps, ImageBlockData } from './types';

/**
 * CanvasImageBlock
 *
 * Renders an image with configurable fit mode.
 * Used for logos, photos, graphics, etc.
 */
export function CanvasImageBlock({ block, mode: _mode }: CanvasBlockRendererProps) {
  const data = (block.data || {}) as unknown as ImageBlockData;
  const {
    imageUrl,
    alt = 'Image',
    objectFit = 'contain',
  } = data;

  if (!imageUrl) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded">
        <div className="text-center text-gray-400 text-sm">
          <svg
            className="mx-auto h-12 w-12 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p>No image</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <Image
        src={imageUrl}
        alt={alt}
        fill
        style={{ objectFit }}
        sizes={`${block.width}px`}
        className="rounded"
      />
    </div>
  );
}
