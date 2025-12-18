'use client';

/**
 * ServiceSection - A section in the service plan
 *
 * Contains:
 * - Section header with drag handle, editable title, summary, and actions
 * - Quick-add bar for rapid item creation
 * - Sortable list of service items (DnD context managed by parent OrderOfService)
 * - Empty state when no items
 *
 * Phase 6: Removed internal DnD context - now uses unified context from OrderOfService
 * for cross-section item moves.
 */

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Copy, Trash2, Plus, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ServiceItem } from './ServiceItem';
import { useDensityPreference, getDensityClasses, type DensityMode } from '@/hooks/useDensityPreference';
import type { ServiceSectionData, ServiceItemData, ServiceItemType } from './types';
import { calculateSectionDuration, formatDuration } from './types';
import { QUICK_ADD_TYPES, SERVICE_ITEM_TYPE_MAP } from './itemTypeConfig';

interface ServiceSectionProps {
  section: ServiceSectionData;
  /** Map of item IDs to calculated start times */
  startTimes: Map<string, string>;
  /** Callback when section title is saved */
  onSaveSection?: (sectionId: string, newTitle: string) => void;
  /** Callback when section duplicate is clicked */
  onDuplicateSection?: (sectionId: string) => void;
  /** Callback when section delete is clicked */
  onDeleteSection?: (sectionId: string) => void;
  /** Callback when item is clicked for editing */
  onEditItem?: (item: ServiceItemData) => void;
  /** Callback when quick-add item is clicked (with type) */
  onQuickAddItem?: (sectionId: string, type: ServiceItemType) => void;
  /** Legacy callback for generic add item */
  onAddItem?: (sectionId: string) => void;
  /** Callback when items are reordered within this section (handled by parent) */
  onReorderItems?: (sectionId: string, itemIds: string[]) => void;
  /** Props to spread on the section drag handle (from parent sortable) */
  dragHandleProps?: Record<string, unknown>;
  /** Whether this section is currently being dragged */
  isDragging?: boolean;
  /** All section IDs for cross-section drops (Phase 6) */
  allSectionIds?: string[];
}

/**
 * Sortable wrapper for an item
 */
function SortableItemWrapper({
  item,
  startTime,
  onEdit,
  density,
}: {
  item: ServiceItemData;
  startTime?: string;
  onEdit?: () => void;
  density: DensityMode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style as React.CSSProperties}>
      <ServiceItem
        item={item}
        startTime={startTime}
        onEdit={onEdit}
        density={density}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  );
}

export function ServiceSection({
  section,
  startTimes,
  onSaveSection,
  onDuplicateSection,
  onDeleteSection,
  onEditItem,
  onQuickAddItem,
  onAddItem,
  dragHandleProps,
  isDragging: isSectionDragging,
}: ServiceSectionProps) {
  const { density } = useDensityPreference();
  const densityClasses = getDensityClasses(density);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(section.title);

  const itemCount = section.items.length;
  const totalDuration = calculateSectionDuration(section);
  const durationStr = formatDuration(totalDuration);

  // Note: DnD sensors and handlers are now managed by parent OrderOfService
  // This component just renders items with SortableItemWrapper

  const handleStartEdit = () => {
    setEditedTitle(section.title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      if (onSaveSection) {
        onSaveSection(section.id, editedTitle.trim());
      }
      setIsEditingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedTitle(section.title);
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className={cn(
      'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm',
      isSectionDragging && 'ring-2 ring-teal-400'
    )}>
      {/* Section Header */}
      <div className={cn(
        'flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-4',
        density === 'elder' ? 'py-4' : 'py-3'
      )}>
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className={cn(
            'flex cursor-grab items-center justify-center text-gray-300 hover:text-gray-500 active:cursor-grabbing',
            densityClasses.buttonSize
          )}
          aria-label="Drag to reorder section"
        >
          <GripVertical className={densityClasses.iconSize} />
        </div>

        {/* Section title (editable) */}
        {isEditingTitle ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                'flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20',
                density === 'elder' ? 'text-xl' : 'text-lg'
              )}
              autoFocus
            />
            <button
              onClick={handleSaveTitle}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white hover:bg-teal-700"
              aria-label="Save title"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancelEdit}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300"
              aria-label="Cancel edit"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartEdit}
            className={cn(
              'flex-1 text-left font-semibold text-gray-900 hover:text-teal-600 transition-colors',
              density === 'elder' ? 'text-xl' : 'text-lg'
            )}
            title="Click to edit title"
          >
            {section.title}
          </button>
        )}

        {/* Summary (hidden when editing) */}
        {!isEditingTitle && (
          <span className={cn('hidden text-gray-500 sm:block', densityClasses.textSm)}>
            {itemCount} item{itemCount !== 1 ? 's' : ''} · {durationStr}
          </span>
        )}

        {/* Section actions (hidden when editing) */}
        {!isEditingTitle && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleStartEdit}
              className={cn(
                'flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600',
                densityClasses.buttonSize
              )}
              aria-label="Edit section title"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (onDuplicateSection) {
                  onDuplicateSection(section.id);
                } else {
                  console.log(`TODO: Duplicate section ${section.id}`);
                }
              }}
              className={cn(
                'flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600',
                densityClasses.buttonSize
              )}
              aria-label="Duplicate section"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (onDeleteSection) {
                  onDeleteSection(section.id);
                } else {
                  console.log(`TODO: Delete section ${section.id}`);
                }
              }}
              className={cn(
                'flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600',
                densityClasses.buttonSize
              )}
              aria-label="Delete section"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Quick-Add Bar */}
      <div className={cn(
        'flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-4',
        density === 'elder' ? 'py-3' : 'py-2'
      )}>
        <span className={cn('text-gray-500', densityClasses.textSm)}>Quick add:</span>
        {QUICK_ADD_TYPES.map((itemType) => {
          const config = SERVICE_ITEM_TYPE_MAP[itemType];
          const Icon = config.icon;
          return (
            <button
              key={itemType}
              onClick={() => {
                if (onQuickAddItem) {
                  onQuickAddItem(section.id, itemType);
                } else if (onAddItem) {
                  onAddItem(section.id);
                }
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 font-medium text-gray-600 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700',
                densityClasses.textSm,
                density === 'elder' ? 'py-2' : 'py-1.5'
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              <Icon className="h-3.5 w-3.5" />
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* Items list - DnD context is managed by parent OrderOfService */}
      <div className={cn('divide-y divide-gray-50', densityClasses.paddingCard)}>
        {section.items.length === 0 ? (
          <div className={cn('py-10 text-center', densityClasses.textBase)}>
            <p className="text-gray-500">No items in this section yet.</p>
            <p className={cn('mt-1 text-gray-400', densityClasses.textSm)}>
              Use the quick-add buttons above to add a Song, Prayer, or Note.
            </p>
          </div>
        ) : (
          <div className={densityClasses.gapSmall + ' space-y-2'}>
            {section.items.map((item) => (
              <SortableItemWrapper
                key={item.id}
                item={item}
                startTime={startTimes.get(item.id)}
                onEdit={() => onEditItem?.(item)}
                density={density}
              />
            ))}
          </div>
        )}

        {/* More options link - for adding other item types */}
        <button
          onClick={() => {
            if (onAddItem) {
              onAddItem(section.id);
            } else {
              console.log(`TODO: Add item to section ${section.id}`);
            }
          }}
          className={cn(
            'mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-3 font-medium text-gray-500 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-600',
            densityClasses.textSm,
            density === 'elder' && 'py-4'
          )}
        >
          <Plus className="h-4 w-4" />
          <span>Add other item type</span>
        </button>
      </div>
    </div>
  );
}
