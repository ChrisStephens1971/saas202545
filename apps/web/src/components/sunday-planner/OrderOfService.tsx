'use client';

/**
 * OrderOfService - Main card containing all service sections
 *
 * Features:
 * - Card with "Order of Service" title
 * - Drag-and-drop reordering of sections
 * - Drag-and-drop reordering of items within sections
 * - Cross-section item moves (Phase 6)
 * - Vertical list of sections
 * - "Add section" button
 */

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ServiceSection } from './ServiceSection';
import { ServiceItem } from './ServiceItem';
import { useDensityPreference, getDensityClasses } from '@/hooks/useDensityPreference';
import type { ServicePlanData, ServiceItemData, ServiceItemType, ServiceSectionData } from './types';
import { calculateStartTimes } from './types';

interface OrderOfServiceProps {
  plan: ServicePlanData;
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
  /** Callback when add item is clicked */
  onAddItem?: (sectionId: string) => void;
  /** Callback when add section is clicked */
  onAddSection?: () => void;
  /** Callback when sections are reordered */
  onReorderSections?: (sectionIds: string[]) => void;
  /** Callback when items within a section are reordered */
  onReorderItems?: (sectionId: string, itemIds: string[]) => void;
  /** Callback when item moves between sections (Phase 6) */
  onMoveItemBetweenSections?: (
    itemId: string,
    fromSectionId: string,
    toSectionId: string,
    toIndex: number
  ) => void;
}

/**
 * Sortable wrapper for a section
 */
function SortableSectionWrapper({
  section,
  startTimes,
  onSaveSection,
  onDuplicateSection,
  onDeleteSection,
  onEditItem,
  onQuickAddItem,
  onAddItem,
  onReorderItems,
  allSectionIds,
}: {
  section: ServiceSectionData;
  startTimes: Map<string, string>;
  onSaveSection?: (sectionId: string, newTitle: string) => void;
  onDuplicateSection?: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onEditItem?: (item: ServiceItemData) => void;
  onQuickAddItem?: (sectionId: string, type: ServiceItemType) => void;
  onAddItem?: (sectionId: string) => void;
  onReorderItems?: (sectionId: string, itemIds: string[]) => void;
  allSectionIds: string[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style as React.CSSProperties}>
      <ServiceSection
        section={section}
        startTimes={startTimes}
        onSaveSection={onSaveSection}
        onDuplicateSection={onDuplicateSection}
        onDeleteSection={onDeleteSection}
        onEditItem={onEditItem}
        onQuickAddItem={onQuickAddItem}
        onAddItem={onAddItem}
        onReorderItems={onReorderItems}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        allSectionIds={allSectionIds}
      />
    </div>
  );
}

/**
 * Find which section an item belongs to
 */
function findItemSection(
  plan: ServicePlanData,
  itemId: string
): { section: ServiceSectionData; index: number } | null {
  for (const section of plan.sections) {
    const index = section.items.findIndex((i) => i.id === itemId);
    if (index !== -1) {
      return { section, index };
    }
  }
  return null;
}

/**
 * Custom collision detection that combines multiple strategies
 * for handling both sections and items
 */
const combinedCollisionDetection: CollisionDetection = (args) => {
  // First try pointer-within for precise drops
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  // Fall back to rect intersection
  const rectCollisions = rectIntersection(args);
  if (rectCollisions.length > 0) {
    return rectCollisions;
  }

  // Finally try closest center
  return closestCenter(args);
};

export function OrderOfService({
  plan,
  onSaveSection,
  onDuplicateSection,
  onDeleteSection,
  onEditItem,
  onQuickAddItem,
  onAddItem,
  onAddSection,
  onReorderSections,
  onReorderItems,
  onMoveItemBetweenSections,
}: OrderOfServiceProps) {
  const { density } = useDensityPreference();
  const densityClasses = getDensityClasses(density);

  // Track active drag for overlay
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'section' | 'item' | null>(null);

  // Calculate start times for all items
  const startTimes = calculateStartTimes(plan);

  // DnD sensors with activation distance to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // All section IDs for cross-section drop targets
  const allSectionIds = plan.sections.map((s) => s.id);

  // All item IDs across all sections (for unified context)
  const allItemIds = plan.sections.flatMap((s) => s.items.map((i) => i.id));

  // Determine if an ID is a section or item
  const isSection = useCallback(
    (id: string) => plan.sections.some((s) => s.id === id),
    [plan.sections]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const id = String(active.id);

      setActiveId(id);
      setActiveType(isSection(id) ? 'section' : 'item');
    },
    [isSection]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);
      setActiveType(null);

      if (!over || active.id === over.id) {
        return;
      }

      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);

      // Case 1: Section being dragged
      if (isSection(activeIdStr)) {
        if (isSection(overIdStr)) {
          // Section dropped on another section - reorder sections
          const oldIndex = plan.sections.findIndex((s) => s.id === activeIdStr);
          const newIndex = plan.sections.findIndex((s) => s.id === overIdStr);

          if (oldIndex !== -1 && newIndex !== -1 && onReorderSections) {
            const newSections = [...plan.sections];
            const [removed] = newSections.splice(oldIndex, 1);
            newSections.splice(newIndex, 0, removed);
            onReorderSections(newSections.map((s) => s.id));
          }
        }
        return;
      }

      // Case 2: Item being dragged
      const activeItemLoc = findItemSection(plan, activeIdStr);
      if (!activeItemLoc) {
        console.warn(`Could not find item ${activeIdStr} in any section`);
        return;
      }

      // Check if dropping on a section (empty section drop zone)
      if (isSection(overIdStr)) {
        // Item dropped on section - move to end of that section
        if (activeItemLoc.section.id !== overIdStr) {
          // Cross-section move
          if (onMoveItemBetweenSections) {
            const targetSection = plan.sections.find((s) => s.id === overIdStr);
            const targetIndex = targetSection?.items.length ?? 0;
            onMoveItemBetweenSections(
              activeIdStr,
              activeItemLoc.section.id,
              overIdStr,
              targetIndex
            );
          }
        }
        return;
      }

      // Dropping on another item
      const overItemLoc = findItemSection(plan, overIdStr);
      if (!overItemLoc) {
        console.warn(`Could not find drop target item ${overIdStr}`);
        return;
      }

      if (activeItemLoc.section.id === overItemLoc.section.id) {
        // Same section - reorder within section
        if (onReorderItems) {
          const section = activeItemLoc.section;
          const oldIndex = section.items.findIndex((i) => i.id === activeIdStr);
          const newIndex = section.items.findIndex((i) => i.id === overIdStr);

          if (oldIndex !== -1 && newIndex !== -1) {
            const newItems = [...section.items];
            const [removed] = newItems.splice(oldIndex, 1);
            newItems.splice(newIndex, 0, removed);
            onReorderItems(section.id, newItems.map((i) => i.id));
          }
        }
      } else {
        // Cross-section move
        if (onMoveItemBetweenSections) {
          onMoveItemBetweenSections(
            activeIdStr,
            activeItemLoc.section.id,
            overItemLoc.section.id,
            overItemLoc.index
          );
        }
      }
    },
    [plan, isSection, onReorderSections, onReorderItems, onMoveItemBetweenSections]
  );

  // Get the active item for drag overlay
  const getActiveItem = (): ServiceItemData | null => {
    if (!activeId || activeType !== 'item') return null;
    const loc = findItemSection(plan, activeId);
    return loc ? loc.section.items[loc.index] : null;
  };

  const activeItem = getActiveItem();

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Card header */}
      <div className={cn(
        'flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6',
        density === 'elder' ? 'py-5' : 'py-4'
      )}>
        <h2 className={cn(
          'font-bold text-gray-900',
          density === 'elder' ? 'text-2xl' : 'text-xl'
        )}>
          Order of Service
        </h2>
        {plan.sections.length > 0 && (
          <button
            onClick={() => onAddSection?.()}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 font-medium text-white transition-colors hover:bg-teal-700',
              densityClasses.textSm,
              density === 'elder' ? 'py-2.5' : 'py-2'
            )}
          >
            <Plus className="h-4 w-4" />
            <span>Add Section</span>
          </button>
        )}
      </div>

      {/* Sections list */}
      <div className={densityClasses.paddingSection}>
        {plan.sections.length === 0 ? (
          <div className={cn('py-16 text-center', densityClasses.textBase)}>
            <h3 className={cn(
              'font-semibold text-gray-900 mb-2',
              density === 'elder' ? 'text-xl' : 'text-lg'
            )}>
              Start planning your service
            </h3>
            <p className={cn('text-gray-500 max-w-md mx-auto', densityClasses.textSm)}>
              Add a section, then add songs, readings, and prayers.
              Drag sections and items to reorder them.
            </p>
            <button
              onClick={() => onAddSection?.()}
              className={cn(
                'mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 font-medium text-white transition-colors hover:bg-teal-700',
                densityClasses.textBase,
                densityClasses.minHeight
              )}
            >
              <Plus className={densityClasses.iconSize} />
              <span>Add Section</span>
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={combinedCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Unified sortable context with all section and item IDs */}
            <SortableContext
              items={[...allSectionIds, ...allItemIds]}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {plan.sections.map((section) => (
                  <SortableSectionWrapper
                    key={section.id}
                    section={section}
                    startTimes={startTimes}
                    onSaveSection={onSaveSection}
                    onDuplicateSection={onDuplicateSection}
                    onDeleteSection={onDeleteSection}
                    onEditItem={onEditItem}
                    onQuickAddItem={onQuickAddItem}
                    onAddItem={onAddItem}
                    onReorderItems={onReorderItems}
                    allSectionIds={allSectionIds}
                  />
                ))}
              </div>
            </SortableContext>

            {/* Drag overlay for item preview */}
            <DragOverlay>
              {activeItem && (
                <div className="opacity-80">
                  <ServiceItem
                    item={activeItem}
                    startTime={startTimes.get(activeItem.id)}
                    density={density}
                    isDragging
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
