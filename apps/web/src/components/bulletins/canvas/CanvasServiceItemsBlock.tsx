'use client';

import { trpc } from '@/lib/trpc/client';
import { formatServiceItemTitle, getServiceItemCcliNumber } from '@/lib/bulletinFormatting';
import type { CanvasBlockRendererProps, ServiceItemsBlockData } from './types';

/**
 * CanvasServiceItemsBlock
 *
 * Displays service items (order of worship) for a bulletin.
 * Fetches data from the bulletin_issue via tRPC.
 */
export function CanvasServiceItemsBlock({ block }: CanvasBlockRendererProps) {
  const data = (block.data || {}) as unknown as ServiceItemsBlockData;
  const {
    bulletinIssueId,
    maxItems = 20,
    showCcli = false,
  } = data;

  const { data: serviceItemsData, isLoading } = trpc.serviceItems.list.useQuery(
    { bulletinIssueId },
    { enabled: !!bulletinIssueId }
  );

  if (!bulletinIssueId) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded">
        <p className="text-gray-400 text-sm">No bulletin selected</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading service items...</p>
      </div>
    );
  }

  const items = serviceItemsData?.items?.slice(0, maxItems) || [];

  if (items.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded">
        <p className="text-gray-400 text-sm">No service items</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto p-3">
      <div className="space-y-2">
        {items.map((item) => {
          const ccliNumber = getServiceItemCcliNumber(item) || item.ccliNumber;
          return (
            <div key={item.id} className="border-b border-gray-100 pb-2 last:border-0">
              <div className="font-semibold text-gray-900 text-sm">
                {formatServiceItemTitle(item)}
              </div>
              {item.content && (
                <div className="text-xs text-gray-600 mt-1">{item.content}</div>
              )}
              {showCcli && ccliNumber && (
                <div className="text-xs text-gray-500 mt-1">CCLI# {ccliNumber}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
