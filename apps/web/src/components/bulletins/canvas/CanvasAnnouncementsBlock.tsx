'use client';

import { trpc } from '@/lib/trpc/client';
import type { CanvasBlockRendererProps, AnnouncementsBlockData } from './types';

// Type for a single announcement from the API
interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: 'Urgent' | 'High' | 'Normal';
  category: string | null;
  isActive: boolean;
  startsAt: Date | string;
  expiresAt: Date | string | null;
}

/**
 * CanvasAnnouncementsBlock
 *
 * Displays announcements with optional filtering.
 * Fetches active announcements via tRPC.
 */
export function CanvasAnnouncementsBlock({ block }: CanvasBlockRendererProps) {
  const blockData = (block.data || {}) as AnnouncementsBlockData;
  const {
    maxItems = 5,
    category,
    priorityFilter,
  } = blockData;

  const { data: announcementsData, isLoading } = trpc.announcements.listActive.useQuery();

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading announcements...</p>
      </div>
    );
  }

  // The API returns { announcements: [...] }, so we need to extract the array
  let items: Announcement[] = announcementsData?.announcements || [];

  // Apply filters
  if (category) {
    items = items.filter((a) => a.category === category);
  }
  if (priorityFilter) {
    // Map the filter to match the API's priority values
    const priorityMap = {
      'high': 'High',
      'normal': 'Normal',
      'low': 'Low'
    } as const;
    const mappedPriority = priorityMap[priorityFilter as keyof typeof priorityMap] || priorityFilter;
    items = items.filter((a) => a.priority === mappedPriority);
  }

  // Apply maxItems limit
  if (maxItems && maxItems > 0) {
    items = items.slice(0, maxItems);
  }

  if (items.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded">
        <p className="text-gray-400 text-sm">No announcements to display</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto p-3">
      <div className="space-y-3">
        {items.map((announcement) => (
          <div key={announcement.id} className="border-l-4 border-blue-500 pl-3 pb-2">
            <div className="font-bold text-gray-900 text-sm">{announcement.title}</div>
            <div className="text-xs text-gray-700 mt-1 leading-relaxed">
              {announcement.body}
            </div>
            {(announcement.priority === 'High' || announcement.priority === 'Urgent') && (
              <div className="text-xs text-orange-600 font-semibold mt-1">
                {announcement.priority === 'Urgent' ? 'URGENT' : 'IMPORTANT'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
