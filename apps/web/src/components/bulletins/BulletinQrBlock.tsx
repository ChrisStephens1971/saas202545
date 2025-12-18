'use client';

import { QRCodeSVG } from 'qrcode.react';

interface BulletinQrBlockProps {
  url: string;
  label?: string;
  size?: number;
  className?: string;
}

export function BulletinQrBlock({
  url,
  label = 'Scan for more info',
  size = 80,
  className = '',
}: BulletinQrBlockProps) {
  if (!url) return null;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="bg-white p-1 rounded">
        <QRCodeSVG
          value={url}
          size={size}
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>
      <div className="text-sm">
        <p className="font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 break-all max-w-[150px]">
          {url.replace(/^https?:\/\//, '').slice(0, 30)}
          {url.replace(/^https?:\/\//, '').length > 30 ? '...' : ''}
        </p>
      </div>
    </div>
  );
}
