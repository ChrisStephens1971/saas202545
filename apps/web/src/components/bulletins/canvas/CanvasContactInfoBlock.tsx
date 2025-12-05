'use client';

import { trpc } from '@/lib/trpc/client';
import type { CanvasBlockRendererProps, ContactInfoBlockData } from './types';

/**
 * CanvasContactInfoBlock
 *
 * Displays church contact information from the tenant/brand pack.
 * Configurable to show/hide specific fields.
 */
export function CanvasContactInfoBlock({ block }: CanvasBlockRendererProps) {
  const data = (block.data || {}) as ContactInfoBlockData;
  const {
    showAddress = true,
    showPhone = true,
    showEmail = true,
    showWebsite = true,
  } = data;

  // Fetch tenant/brand pack info
  const { data: brandPack, isLoading } = trpc.org.getBranding.useQuery();

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading contact info...</p>
      </div>
    );
  }

  if (!brandPack) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded">
        <p className="text-gray-400 text-sm">No brand pack configured</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col justify-center p-4 bg-gray-50 rounded">
      <div className="space-y-2 text-sm">
        {brandPack.churchName && (
          <div className="font-bold text-gray-900 text-base">
            {brandPack.churchName}
          </div>
        )}

        {showAddress && brandPack.addressLine1 && (
          <div className="text-gray-700 flex items-start gap-2">
            <span className="text-gray-400">📍</span>
            <span>
              {brandPack.addressLine1}
              {brandPack.addressLine2 && <>, {brandPack.addressLine2}</>}
              {brandPack.city && <>, {brandPack.city}</>}
              {brandPack.state && <>, {brandPack.state}</>}
              {brandPack.postalCode && <> {brandPack.postalCode}</>}
            </span>
          </div>
        )}

        {showPhone && brandPack.phone && (
          <div className="text-gray-700 flex items-center gap-2">
            <span className="text-gray-400">📞</span>
            <span>{brandPack.phone}</span>
          </div>
        )}

        {showEmail && brandPack.email && (
          <div className="text-gray-700 flex items-center gap-2">
            <span className="text-gray-400">✉️</span>
            <span>{brandPack.email}</span>
          </div>
        )}

        {showWebsite && brandPack.website && (
          <div className="text-gray-700 flex items-center gap-2">
            <span className="text-gray-400">🌐</span>
            <span className="text-blue-600">{brandPack.website}</span>
          </div>
        )}
      </div>
    </div>
  );
}
