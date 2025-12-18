'use client';

/**
 * ServicePlanHeader - Header block for Service Plan page
 *
 * Displays:
 * - Title ("Service Plan")
 * - Date
 * - Start time → End time
 * - Total duration
 * - Status pill (Draft/Published)
 */

import { cn } from '@/lib/utils';
import type { ServicePlanStatus } from './types';

interface ServicePlanHeaderProps {
  /** Service date (formatted string) */
  date: string;
  /** Service start time (e.g., "10:00 AM") */
  startTime: string;
  /** Service end time (e.g., "11:15 AM") */
  endTime?: string;
  /** Total duration (formatted string, e.g., "1h 15m") */
  totalDuration: string;
  /** Status of the plan */
  status: ServicePlanStatus;
  /** Whether there are unsaved changes */
  hasUnsavedChanges?: boolean;
}

export function ServicePlanHeader({
  date,
  startTime,
  endTime,
  totalDuration,
  status,
  hasUnsavedChanges = false,
}: ServicePlanHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Title and info */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Service Plan
            </h1>
            {hasUnsavedChanges && (
              <span className="text-sm font-medium text-amber-600">
                (Unsaved)
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-gray-600">
            <span className="font-medium">{date}</span>
            <span className="text-gray-400">•</span>
            <span>
              {startTime}
              {endTime && <span className="text-gray-400"> → </span>}
              {endTime}
            </span>
            <span className="text-gray-400">•</span>
            <span>{totalDuration} total</span>
          </div>
        </div>

        {/* Status pill */}
        <div
          className={cn(
            'inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold',
            status === 'published'
              ? 'bg-green-100 text-green-800'
              : 'bg-amber-100 text-amber-800'
          )}
        >
          {status === 'published' ? 'Published' : 'Draft'}
        </div>
      </div>
    </div>
  );
}
