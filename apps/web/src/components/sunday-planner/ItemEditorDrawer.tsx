'use client';

/**
 * ItemEditorDrawer - Right-hand drawer for editing service items
 *
 * Features:
 * - Slides in from the right
 * - Edit title, subtitle/notes, type, and duration
 * - Save and Cancel buttons
 * - Elder-friendly with proper touch targets
 * - Type selector using canonical SERVICE_ITEM_TYPES
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDensityPreference, getDensityClasses } from '@/hooks/useDensityPreference';
import type { ServiceItemData, ServiceItemType } from './types';
import { SERVICE_ITEM_TYPES } from './itemTypeConfig';

interface ItemEditorDrawerProps {
  /** The item being edited, or null if drawer is closed */
  item: ServiceItemData | null;
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback when save is clicked */
  onSave: (item: ServiceItemData) => void;
  /** Callback when cancel/close is clicked */
  onClose: () => void;
}

export function ItemEditorDrawer({
  item,
  isOpen,
  onSave,
  onClose,
}: ItemEditorDrawerProps) {
  const { density } = useDensityPreference();
  const densityClasses = getDensityClasses(density);

  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [type, setType] = useState<ServiceItemType>('note');
  const [duration, setDuration] = useState(5);
  const [notes, setNotes] = useState('');

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setSubtitle(item.subtitle || '');
      setType(item.type);
      setDuration(item.duration);
      setNotes(item.notes || '');
    }
  }, [item]);

  const handleSave = () => {
    if (!item) return;

    const updatedItem: ServiceItemData = {
      ...item,
      title,
      subtitle: subtitle || undefined,
      type,
      duration,
      notes: notes || undefined,
    };

    onSave(updatedItem);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-14 z-50 flex h-[calc(100vh-3.5rem)] w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl transition-transform duration-300',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className={cn('font-semibold text-gray-900', densityClasses.textBase)}>
            Edit Item
          </h2>
          <button
            onClick={onClose}
            className={cn(
              'flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600',
              densityClasses.buttonSize
            )}
            aria-label="Close drawer"
          >
            <X className={densityClasses.iconSize} />
          </button>
        </div>

        {/* Form */}
        <div className={cn('flex-1 overflow-y-auto', densityClasses.paddingSection)}>
          {item && (
            <div className="space-y-6">
              {/* Item Type */}
              <div>
                <label className={cn('block font-medium text-gray-700 mb-2', densityClasses.textSm)}>
                  Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SERVICE_ITEM_TYPES.map((typeConfig) => {
                    const Icon = typeConfig.icon;
                    const isSelected = type === typeConfig.type;
                    return (
                      <button
                        key={typeConfig.type}
                        type="button"
                        onClick={() => setType(typeConfig.type)}
                        className={cn(
                          'flex flex-col items-center justify-center rounded-lg border-2 p-3 transition-colors',
                          densityClasses.minHeight,
                          isSelected
                            ? 'border-teal-600 bg-teal-50 text-teal-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        )}
                        title={typeConfig.description}
                      >
                        <Icon className={cn('mb-1', densityClasses.iconSize)} />
                        <span className={densityClasses.textXs}>{typeConfig.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label
                  htmlFor="item-title"
                  className={cn('block font-medium text-gray-700 mb-2', densityClasses.textSm)}
                >
                  Title
                </label>
                <input
                  id="item-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={cn(
                    'w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20',
                    densityClasses.textBase,
                    densityClasses.minHeight
                  )}
                  placeholder="Enter title..."
                />
              </div>

              {/* Subtitle/Description */}
              <div>
                <label
                  htmlFor="item-subtitle"
                  className={cn('block font-medium text-gray-700 mb-2', densityClasses.textSm)}
                >
                  Subtitle / Description
                </label>
                <input
                  id="item-subtitle"
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className={cn(
                    'w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20',
                    densityClasses.textBase,
                    densityClasses.minHeight
                  )}
                  placeholder="Optional description..."
                />
              </div>

              {/* Duration */}
              <div>
                <label
                  htmlFor="item-duration"
                  className={cn('block font-medium text-gray-700 mb-2', densityClasses.textSm)}
                >
                  Duration (minutes)
                </label>
                <input
                  id="item-duration"
                  type="number"
                  min={1}
                  max={120}
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className={cn(
                    'w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20',
                    densityClasses.textBase,
                    densityClasses.minHeight
                  )}
                />
              </div>

              {/* Notes */}
              <div>
                <label
                  htmlFor="item-notes"
                  className={cn('block font-medium text-gray-700 mb-2', densityClasses.textSm)}
                >
                  Notes
                </label>
                <textarea
                  id="item-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className={cn(
                    'w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20',
                    densityClasses.textBase
                  )}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50',
              densityClasses.textBase,
              densityClasses.minHeight
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={cn(
              'rounded-lg bg-teal-600 px-6 py-3 font-medium text-white transition-colors hover:bg-teal-700',
              densityClasses.textBase,
              densityClasses.minHeight
            )}
          >
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
}
