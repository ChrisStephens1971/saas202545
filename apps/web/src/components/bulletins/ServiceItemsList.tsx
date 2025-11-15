'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/Button';

interface ServiceItem {
  id: string;
  type: string;
  sequence: number;
  title: string | null;
  ccliNumber?: string | null;
  scriptureRef?: string | null;
  speaker?: string | null;
  notes?: string | null;
  duration?: number | null;
}

interface ServiceItemsListProps {
  items: ServiceItem[];
  onReorder: (items: { id: string; sequence: number }[]) => Promise<void>;
  onEdit: (item: ServiceItem) => void;
  onDelete: (id: string) => Promise<void>;
  isLocked?: boolean;
}

function SortableItem({
  item,
  index,
  onEdit,
  onDelete,
  isLocked,
}: {
  item: ServiceItem;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  isLocked?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 border-2 rounded-lg bg-white ${
        isDragging ? 'border-primary-500 shadow-lg' : 'border-gray-200'
      } ${isLocked ? 'opacity-70' : ''}`}
    >
      {/* Drag Handle */}
      {!isLocked && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>
      )}

      {/* Sequence Number */}
      <div className="text-2xl font-bold text-gray-400 w-12 text-center">
        {index + 1}
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
            {item.type}
          </span>
          <h3 className="text-xl font-semibold">{item.title || 'Untitled'}</h3>
        </div>

        {/* Additional Info */}
        <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
          {item.ccliNumber && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              CCLI #{item.ccliNumber}
            </span>
          )}
          {item.scriptureRef && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {item.scriptureRef}
            </span>
          )}
          {item.speaker && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {item.speaker}
            </span>
          )}
          {item.duration && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {item.duration} min
            </span>
          )}
        </div>

        {item.notes && (
          <p className="text-sm text-gray-500 mt-2 italic">{item.notes}</p>
        )}
      </div>

      {/* Actions */}
      {!isLocked && (
        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}

export function ServiceItemsList({
  items,
  onReorder,
  onEdit,
  onDelete,
  isLocked,
}: ServiceItemsListProps) {
  const [localItems, setLocalItems] = useState(items);
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localItems.findIndex((item) => item.id === active.id);
    const newIndex = localItems.findIndex((item) => item.id === over.id);

    const newItems = arrayMove(localItems, oldIndex, newIndex);
    setLocalItems(newItems);

    // Update sequence numbers
    const reorderedItems = newItems.map((item, index) => ({
      id: item.id,
      sequence: index + 1,
    }));

    setIsReordering(true);
    try {
      await onReorder(reorderedItems);
    } catch (error) {
      // Revert on error
      setLocalItems(items);
      console.error('Reorder failed:', error);
    } finally {
      setIsReordering(false);
    }
  };

  // Update local items when props change
  if (items.length !== localItems.length || items.some((item, i) => item.id !== localItems[i]?.id)) {
    setLocalItems(items);
  }

  return (
    <div className="space-y-4 relative">
      {isReordering && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
          <div className="text-lg font-medium">Saving order...</div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localItems.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {localItems.map((item, index) => (
            <SortableItem
              key={item.id}
              item={item}
              index={index}
              onEdit={() => onEdit(item)}
              onDelete={async () => {
                if (confirm(`Delete "${item.title}"?`)) {
                  await onDelete(item.id);
                }
              }}
              isLocked={isLocked}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
