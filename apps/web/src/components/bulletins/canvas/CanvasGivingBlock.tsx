'use client';

import { QRCodeSVG } from 'qrcode.react';
import type { CanvasBlockRendererProps, GivingBlockData } from './types';

/**
 * CanvasGivingBlock
 *
 * Displays giving/donation information with optional QR code.
 * Can show QR only, text only, or both.
 */
export function CanvasGivingBlock({ block }: CanvasBlockRendererProps) {
  const data = (block.data || {}) as GivingBlockData;
  const {
    displayType = 'both',
    givingUrl,
  } = data;

  if (!givingUrl && displayType !== 'text') {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded">
        <p className="text-gray-400 text-sm">No giving URL</p>
      </div>
    );
  }

  const qrSize = Math.min(block.width * 0.6, block.height * 0.6);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-white rounded">
      <div className="text-center">
        <div className="text-lg font-bold text-gray-900">Give Online</div>
        <div className="text-xs text-gray-600 mt-1">
          Support our ministry
        </div>
      </div>

      {(displayType === 'qr' || displayType === 'both') && givingUrl && (
        <div className="bg-white p-3 rounded shadow">
          <QRCodeSVG
            value={givingUrl}
            size={Math.max(qrSize, 80)}
            level="M"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
      )}

      {(displayType === 'text' || displayType === 'both') && (
        <div className="text-center">
          {givingUrl ? (
            <>
              <div className="text-xs text-gray-500 mb-1">Scan QR or visit:</div>
              <div className="text-xs font-mono text-blue-600">
                {givingUrl.replace(/^https?:\/\//, '').slice(0, 40)}
                {givingUrl.replace(/^https?:\/\//, '').length > 40 ? '...' : ''}
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-600">
              Visit our website or use the offering plate
            </div>
          )}
        </div>
      )}
    </div>
  );
}
