'use client';

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';
import type { CanvasBlockRendererProps, EventsBlockData } from './types';

/**
 * CanvasEventsBlock
 *
 * Displays upcoming events with optional date range filtering.
 * Fetches events via tRPC.
 */
export function CanvasEventsBlock({ block }: CanvasBlockRendererProps) {
  const data = (block.data || {}) as EventsBlockData;
  const {
    maxItems = 5,
    dateRange = 'month',
  } = data;

  // Memoize date range to prevent unstable query keys
  const queryDates = useMemo(() => {
    const now = new Date();
    const endDate = new Date();
    if (dateRange === 'week') {
      endDate.setDate(endDate.getDate() + 7);
    } else if (dateRange === 'month') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1); // 'all' = next year
    }
    return {
      startDate: now.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }, [dateRange]);

  const { data: events, isLoading } = trpc.events.list.useQuery(
    {
      limit: maxItems,
      startDate: queryDates.startDate,
      endDate: queryDates.endDate,
    },
    { staleTime: 30000 }
  );

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading events...</p>
      </div>
    );
  }

  const items = events?.events || [];

  if (items.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded">
        <p className="text-gray-400 text-sm">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto p-3">
      <div className="space-y-3">
        {items.map((event) => (
          <div key={event.id} className="border-b border-gray-100 pb-2 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-sm">{event.title}</div>
                {event.description && (
                  <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {event.description}
                  </div>
                )}
                {event.locationName && (
                  <div className="text-xs text-gray-500 mt-1">📍 {event.locationName}</div>
                )}
              </div>
              <div className="text-xs text-gray-700 font-medium text-right whitespace-nowrap">
                {format(new Date(event.startAt), 'MMM d')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
