'use client';

import { QRCodeSVG } from 'qrcode.react';
import type { CanvasBlockRendererProps, QrBlockData } from './types';

/**
 * CanvasQrBlock
 *
 * Renders a QR code with optional label.
 * Used for event links, giving links, website links, etc.
 */
export function CanvasQrBlock({ block }: CanvasBlockRendererProps) {
  const data = (block.data || {}) as unknown as QrBlockData;
  const { url, label } = data;

  if (!url) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded">
        <div className="text-center text-gray-400 text-sm">
          <p>No QR URL</p>
        </div>
      </div>
    );
  }

  // Calculate QR code size (leave room for label if present)
  const qrSize = label ? Math.min(block.width, block.height * 0.7) : Math.min(block.width, block.height);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-2 p-2">
      <div className="bg-white p-2 rounded shadow-sm">
        <QRCodeSVG
          value={url}
          size={Math.max(qrSize - 16, 50)} // Min 50px
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>
      {label && (
        <div className="text-center text-sm font-medium text-gray-800 px-2">
          {label}
        </div>
      )}
    </div>
  );
}
