'use client';

/**
 * ServiceItem - Single item row in a service section
 *
 * Displays:
 * - Drag handle
 * - Type icon with color based on item type
 * - Title and subtitle
 * - Start time and duration
 * - Inline actions (edit, attachments, overflow)
 *
 * Supports density modes for elder-friendly sizing.
 */

import {
  GripVertical,
  MoreHorizontal,
  Pencil,
  Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDensityClasses, type DensityMode } from '@/hooks/useDensityPreference';
import type { ServiceItemData } from './types';
import { getItemTypeConfig } from './itemTypeConfig';

interface ServiceItemProps {
  item: ServiceItemData;
  /** Calculated start time for this item */
  startTime?: string;
  /** Callback when edit is clicked or item row is clicked */
  onEdit?: () => void;
  /** Callback when more menu is clicked */
  onMoreClick?: (itemId: string) => void;
  /** Density mode */
  density?: DensityMode;
  /** Props to spread on the drag handle (from parent sortable) */
  dragHandleProps?: Record<string, unknown>;
  /** Whether this item is currently being dragged */
  isDragging?: boolean;
}

export function ServiceItem({
  item,
  startTime,
  onEdit,
  onMoreClick,
  density = 'standard',
  dragHandleProps,
  isDragging,
}: ServiceItemProps) {
  const typeConfig = getItemTypeConfig(item.type);
  const Icon = typeConfig.icon;
  const iconBgClass = `${typeConfig.iconBgClass} ${typeConfig.iconTextClass}`;
  const densityClasses = getDensityClasses(density);

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on a button or drag handle
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[data-drag-handle]')) {
      return;
    }
    onEdit?.();
  };

  return (
    <div
      onClick={handleRowClick}
      className={cn(
        'group flex items-center rounded-lg border border-gray-100 bg-white transition-all hover:border-gray-200 hover:shadow-sm cursor-pointer',
        densityClasses.gap,
        densityClasses.paddingItem,
        isDragging && 'ring-2 ring-teal-400 shadow-lg'
      )}
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        data-drag-handle
        className={cn(
          'flex cursor-grab items-center justify-center text-gray-300 hover:text-gray-500 active:cursor-grabbing',
          density === 'elder' ? 'h-12 w-8' : 'h-10 w-6'
        )}
        aria-label="Drag to reorder"
      >
        <GripVertical className={densityClasses.iconSize} />
      </div>

      {/* Type icon */}
      <div
        className={cn(
          'flex flex-shrink-0 items-center justify-center rounded-lg',
          iconBgClass,
          density === 'elder' ? 'h-12 w-12' : 'h-10 w-10'
        )}
      >
        <Icon className={densityClasses.iconSize} />
      </div>

      {/* Title and subtitle */}
      <div className="min-w-0 flex-1">
        <h4 className={cn('font-medium text-gray-900 truncate', densityClasses.textBase)}>
          {item.title}
        </h4>
        {item.subtitle && (
          <p className={cn('text-gray-500 truncate', densityClasses.textSm)}>
            {item.subtitle}
          </p>
        )}
      </div>

      {/* Timing info */}
      <div className="hidden flex-shrink-0 text-right sm:block">
        {startTime && (
          <p className={cn('font-medium text-gray-700', densityClasses.textSm)}>
            {startTime}
          </p>
        )}
        <p className={cn('text-gray-500', densityClasses.textSm)}>
          {item.duration} min
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {/* Attachments indicator */}
        {item.attachments && item.attachments > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('TODO: View attachments');
            }}
            className={cn(
              'flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600',
              densityClasses.buttonSize
            )}
            aria-label={`${item.attachments} attachment${item.attachments > 1 ? 's' : ''}`}
          >
            <Paperclip className="h-4 w-4" />
          </button>
        )}

        {/* Edit button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          className={cn(
            'flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600',
            densityClasses.buttonSize
          )}
          aria-label="Edit item"
        >
          <Pencil className="h-4 w-4" />
        </button>

        {/* More menu */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onMoreClick) {
              onMoreClick(item.id);
            } else {
              console.log(`TODO: More options for item ${item.id}`);
            }
          }}
          className={cn(
            'flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600',
            densityClasses.buttonSize
          )}
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
