'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
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
import { trpc } from '@/lib/trpc/client';

// Service sections for grouping items
const SECTIONS = [
  { id: 'pre-service', label: 'Pre-Service', icon: '🕐' },
  { id: 'worship', label: 'Worship', icon: '🎵' },
  { id: 'message', label: 'Message', icon: '📖' },
  { id: 'response', label: 'Response', icon: '🙏' },
  { id: 'closing', label: 'Closing', icon: '👋' },
  { id: 'announcements', label: 'Announcements', icon: '📢' },
  { id: 'other', label: 'Other', icon: '📋' },
] as const;

type SectionId = typeof SECTIONS[number]['id'] | null;

// Service item type with all fields
interface ServiceOrderItem {
  id: string | null; // null for new items
  tempId?: string; // temporary ID for new items before save
  type: string;
  title: string;
  content?: string | null;
  ccliNumber?: string | null;
  artist?: string | null;
  scriptureRef?: string | null;
  speaker?: string | null;
  sermonId?: string | null;
  sermonTitle?: string | null;
  songId?: string | null;
  songTitle?: string | null;
  songHymnNumber?: string | null;
  songHymnalCode?: string | null;
  songCcliNumber?: string | null;
  sequence: number;
  durationMinutes?: number | null;
  section?: SectionId;
  notes?: string | null;
  // Slide control
  slidesCount?: number | null;
}

interface ServiceOrderPanelProps {
  bulletinIssueId: string;
  isLocked?: boolean;
  onItemsChange?: (items: ServiceOrderItem[]) => void;
  showSections?: boolean;
  compactMode?: boolean;
  /** Hide copy/template buttons (used in compact Canvas sidebar) */
  hideCopyActions?: boolean;
}

// Sortable item component
function SortableServiceItem({
  item,
  onEdit,
  onDelete,
  isLocked,
  isDragging,
}: {
  item: ServiceOrderItem;
  onEdit: () => void;
  onDelete: () => void;
  isLocked?: boolean;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: item.id || item.tempId || 'unknown',
    disabled: isLocked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isHeading = item.type === 'Heading';

  // Get type badge styling
  const getTypeBadgeClass = () => {
    switch (item.type) {
      case 'Heading':
        return 'bg-gray-700 text-white';
      case 'Song':
        return 'bg-blue-100 text-blue-800';
      case 'Prayer':
        return 'bg-purple-100 text-purple-800';
      case 'Scripture':
        return 'bg-green-100 text-green-800';
      case 'Sermon':
        return 'bg-amber-100 text-amber-800';
      case 'Announcement':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 border rounded-lg bg-white ${
        isHeading ? 'bg-gray-50 border-gray-300' : 'border-gray-200'
      } ${isDragging ? 'shadow-lg border-primary-500' : ''} ${isLocked ? 'opacity-60' : ''}`}
    >
      {/* Drag Handle */}
      {!isLocked && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
      )}

      {/* Type Badge */}
      <span className={`px-1.5 py-0.5 text-xs rounded ${getTypeBadgeClass()}`}>
        {item.type}
      </span>

      {/* Title & Duration */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`truncate ${isHeading ? 'font-bold uppercase text-sm' : 'font-medium'}`}>
            {item.title || 'Untitled'}
          </span>
          {item.durationMinutes && (
            <span className="text-xs text-gray-500 flex-shrink-0">
              {item.durationMinutes}m
            </span>
          )}
          {item.slidesCount && item.slidesCount > 0 && (
            <span className="text-xs text-indigo-600 flex-shrink-0 flex items-center gap-0.5" title={`${item.slidesCount} slides`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {item.slidesCount}
            </span>
          )}
        </div>
        {/* Song/Sermon link indicator */}
        {(item.songTitle || item.sermonTitle) && (
          <div className="text-xs text-blue-600 truncate">
            {item.songTitle && `♪ ${item.songTitle}`}
            {item.sermonTitle && `📖 ${item.sermonTitle}`}
          </div>
        )}
      </div>

      {/* Actions */}
      {!isLocked && (
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-primary-600 rounded"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600 rounded"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// Section header component
function SectionHeader({
  section,
  itemCount,
  totalDuration,
  isCollapsed,
  onToggle,
}: {
  section: typeof SECTIONS[number];
  itemCount: number;
  totalDuration: number;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
    >
      <span className="text-lg">{section.icon}</span>
      <span className="font-semibold text-gray-700">{section.label}</span>
      <span className="text-xs text-gray-500">({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
      {totalDuration > 0 && (
        <span className="text-xs text-gray-500 ml-auto">{totalDuration}m</span>
      )}
      <svg
        className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

export function ServiceOrderPanel({
  bulletinIssueId,
  isLocked = false,
  onItemsChange,
  showSections = true,
  compactMode = false,
  hideCopyActions = false,
}: ServiceOrderPanelProps) {
  // Fetch service items
  const { data: serviceItemsData, isLoading, refetch } = trpc.serviceItems.list.useQuery(
    { bulletinIssueId },
    { enabled: !!bulletinIssueId }
  );

  // Batch save mutation
  const batchSave = trpc.serviceItems.batchSave.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Copy from bulletin mutation
  const copyFromBulletin = trpc.serviceItems.copyFromBulletin.useMutation({
    onSuccess: (data) => {
      refetch();
      setShowCopyDialog(false);
      alert(`Copied ${data.copiedCount} items successfully!`);
    },
    onError: (error) => {
      alert(`Failed to copy: ${error.message}`);
    },
  });

  // Get templates for "Apply Template" feature
  const { data: templates } = trpc.bulletins.getServiceTemplates.useQuery();

  // Local state for items (for optimistic updates)
  const [localItems, setLocalItems] = useState<ServiceOrderItem[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<ServiceOrderItem | null>(null);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  // Sync local items with server data
  useEffect(() => {
    if (serviceItemsData?.items) {
      setLocalItems(serviceItemsData.items.map(item => ({
        ...item,
        id: item.id,
        title: item.title || '', // Convert null to empty string
      })));
      setPendingDeletes([]);
      setHasUnsavedChanges(false);
    }
  }, [serviceItemsData]);

  // Notify parent of changes
  useEffect(() => {
    onItemsChange?.(localItems);
  }, [localItems, onItemsChange]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group items by section
  const itemsBySection = useMemo(() => {
    const groups: Record<string, ServiceOrderItem[]> = {};
    SECTIONS.forEach(s => {
      groups[s.id] = [];
    });
    groups['unsectioned'] = [];

    localItems.forEach(item => {
      const sectionId = item.section || 'unsectioned';
      if (!groups[sectionId]) {
        groups[sectionId] = [];
      }
      groups[sectionId].push(item);
    });

    return groups;
  }, [localItems]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    return localItems.reduce((acc, item) => acc + (item.durationMinutes || 0), 0);
  }, [localItems]);

  // Handle drag events
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    setLocalItems(items => {
      const oldIndex = items.findIndex(item => (item.id || item.tempId) === active.id);
      const newIndex = items.findIndex(item => (item.id || item.tempId) === over.id);

      if (oldIndex === -1 || newIndex === -1) return items;

      const newItems = arrayMove(items, oldIndex, newIndex);
      // Update sequence numbers
      return newItems.map((item, index) => ({
        ...item,
        sequence: index + 1,
      }));
    });
    setHasUnsavedChanges(true);
  }, []);

  // Add new item
  const handleAddItem = useCallback((type: string, section?: SectionId) => {
    const tempId = `temp-${Date.now()}`;
    const newItem: ServiceOrderItem = {
      id: null,
      tempId,
      type,
      title: type === 'Heading' ? 'New Section' : `New ${type}`,
      sequence: localItems.length + 1,
      section,
    };
    setLocalItems(items => [...items, newItem]);
    setHasUnsavedChanges(true);
    setEditingItem(newItem);
  }, [localItems.length]);

  // Delete item
  const handleDeleteItem = useCallback((itemId: string) => {
    const item = localItems.find(i => (i.id || i.tempId) === itemId);
    if (!item) return;

    if (confirm(`Delete "${item.title}"?`)) {
      if (item.id) {
        // Mark for deletion on save
        setPendingDeletes(prev => [...prev, item.id!]);
      }
      setLocalItems(items => items.filter(i => (i.id || i.tempId) !== itemId));
      setHasUnsavedChanges(true);
    }
  }, [localItems]);

  // Edit item
  const handleEditItem = useCallback((item: ServiceOrderItem) => {
    setEditingItem(item);
  }, []);

  // Update item from edit form
  const handleUpdateItem = useCallback((updatedItem: ServiceOrderItem) => {
    setLocalItems(items =>
      items.map(item =>
        (item.id || item.tempId) === (updatedItem.id || updatedItem.tempId)
          ? updatedItem
          : item
      )
    );
    setHasUnsavedChanges(true);
    setEditingItem(null);
  }, []);

  // Save all changes
  const handleSave = useCallback(async () => {
    try {
      // Map items for save (create/update)
      const itemsToSave = localItems.map(item => ({
        id: item.id ?? undefined, // Convert null to undefined for API compatibility
        type: item.type as any,
        title: item.title,
        content: item.content ?? undefined, // Convert null to undefined
        ccliNumber: item.ccliNumber ?? undefined,
        artist: item.artist ?? undefined,
        scriptureRef: item.scriptureRef ?? undefined,
        speaker: item.speaker ?? undefined,
        sequence: item.sequence,
      }));

      // Add items to delete (with delete: true flag)
      const itemsToDelete = pendingDeletes.map((id, index) => ({
        id,
        type: 'Other' as const, // Type is required but ignored for deletes
        title: '', // Title is required but ignored for deletes
        sequence: 999 + index, // Sequence is required but ignored for deletes
        delete: true,
      }));

      await batchSave.mutateAsync({
        bulletinIssueId,
        items: [...itemsToSave, ...itemsToDelete],
      });
      setHasUnsavedChanges(false);
      setPendingDeletes([]);
    } catch (error) {
      console.error('Failed to save service order:', error);
      alert('Failed to save changes. Please try again.');
    }
  }, [bulletinIssueId, localItems, pendingDeletes, batchSave]);

  // Toggle section collapse
  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Get active item for drag overlay
  const activeItem = useMemo(() => {
    if (!activeId) return null;
    return localItems.find(item => (item.id || item.tempId) === activeId);
  }, [activeId, localItems]);

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading service order...
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${compactMode ? 'text-sm' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div>
          <h3 className="font-semibold text-gray-800">Service Plan</h3>
          <div className="text-xs text-gray-500">
            {localItems.length} {localItems.length === 1 ? 'item' : 'items'} · {totalDuration} minutes
          </div>
        </div>
        <div className="flex gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-600 self-center">Unsaved changes</span>
          )}
          {!isLocked && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!hasUnsavedChanges || batchSave.isPending}
              data-service-order-save
            >
              {batchSave.isPending ? 'Saving...' : 'Save Service Plan'}
            </Button>
          )}
        </div>
      </div>

      {/* Quick Add Buttons */}
      {!isLocked && (
        <div className="flex flex-wrap gap-1 p-2 border-b bg-white">
          {['Song', 'Prayer', 'Scripture', 'Sermon', 'Announcement', 'Heading', 'Other'].map(type => (
            <button
              key={type}
              onClick={() => handleAddItem(type)}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              + {type}
            </button>
          ))}
        </div>
      )}

      {/* Copy/Template Actions */}
      {!isLocked && !hideCopyActions && (
        <div className="flex gap-2 p-2 border-b bg-gray-50">
          <button
            onClick={() => setShowCopyDialog(true)}
            className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-300 hover:bg-gray-50 rounded transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy from previous service
          </button>
          {templates && templates.length > 0 && (
            <button
              onClick={() => setShowTemplateDialog(true)}
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-300 hover:bg-gray-50 rounded transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              Apply service template
            </button>
          )}
        </div>
      )}

      {/* Helper text at top */}
      {!isLocked && (
        <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
          <p className="text-xs text-blue-700">
            <strong>Step 1:</strong> Arrange the service plan below. Drag items into sections, or use the + buttons to add new items.
          </p>
        </div>
      )}

      {/* Items List */}
      <div className="flex-1 overflow-auto p-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {showSections ? (
            // Sectioned view
            <div className="space-y-3">
              {SECTIONS.map(section => {
                const sectionItems = itemsBySection[section.id] || [];
                const sectionDuration = sectionItems.reduce(
                  (acc, item) => acc + (item.durationMinutes || 0),
                  0
                );
                const isCollapsed = collapsedSections.has(section.id);

                if (sectionItems.length === 0 && isLocked) return null;

                return (
                  <div key={section.id}>
                    <SectionHeader
                      section={section}
                      itemCount={sectionItems.length}
                      totalDuration={sectionDuration}
                      isCollapsed={isCollapsed}
                      onToggle={() => toggleSection(section.id)}
                    />
                    {!isCollapsed && (
                      <div className="mt-1 space-y-1 ml-2">
                        <SortableContext
                          items={sectionItems.map(item => item.id || item.tempId || 'unknown')}
                          strategy={verticalListSortingStrategy}
                        >
                          {sectionItems.map(item => (
                            <SortableServiceItem
                              key={item.id || item.tempId}
                              item={item}
                              onEdit={() => handleEditItem(item)}
                              onDelete={() => handleDeleteItem(item.id || item.tempId || '')}
                              isLocked={isLocked}
                              isDragging={activeId === (item.id || item.tempId)}
                            />
                          ))}
                        </SortableContext>
                        {!isLocked && sectionItems.length === 0 && (
                          <div className="text-xs text-gray-400 italic p-2">
                            Drop items here or click + to add
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unassigned items (formerly Unsectioned) */}
              {itemsBySection['unsectioned']?.length > 0 && (
                <div>
                  <div className="text-sm text-gray-700 font-medium mb-1">Unassigned items</div>
                  <p className="text-xs text-gray-500 mb-2">
                    These plan items aren&apos;t in a section yet. Drag them into Pre-Service, Worship, Message, etc.
                  </p>
                  <div className="space-y-1">
                    <SortableContext
                      items={itemsBySection['unsectioned'].map(item => item.id || item.tempId || 'unknown')}
                      strategy={verticalListSortingStrategy}
                    >
                      {itemsBySection['unsectioned'].map(item => (
                        <SortableServiceItem
                          key={item.id || item.tempId}
                          item={item}
                          onEdit={() => handleEditItem(item)}
                          onDelete={() => handleDeleteItem(item.id || item.tempId || '')}
                          isLocked={isLocked}
                          isDragging={activeId === (item.id || item.tempId)}
                        />
                      ))}
                    </SortableContext>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Flat list view
            <SortableContext
              items={localItems.map(item => item.id || item.tempId || 'unknown')}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {localItems.map(item => (
                  <SortableServiceItem
                    key={item.id || item.tempId}
                    item={item}
                    onEdit={() => handleEditItem(item)}
                    onDelete={() => handleDeleteItem(item.id || item.tempId || '')}
                    isLocked={isLocked}
                    isDragging={activeId === (item.id || item.tempId)}
                  />
                ))}
              </div>
            </SortableContext>
          )}

          {/* Drag Overlay */}
          <DragOverlay>
            {activeItem ? (
              <div className="p-2 bg-white border-2 border-primary-500 rounded-lg shadow-xl opacity-90">
                <span className="font-medium">{activeItem.title}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {localItems.length === 0 && !isLocked && (
          <div className="text-center py-8 text-gray-400">
            <p>No service items yet</p>
            <p className="text-sm">Click the buttons above to add items</p>
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <ServiceItemEditModal
          item={editingItem}
          onSave={handleUpdateItem}
          onCancel={() => setEditingItem(null)}
          sections={SECTIONS}
        />
      )}

      {/* Copy From Dialog */}
      {showCopyDialog && (
        <CopyFromBulletinDialog
          bulletinIssueId={bulletinIssueId}
          onClose={() => setShowCopyDialog(false)}
          onCopy={(sourceBulletinId) => {
            copyFromBulletin.mutate({
              sourceBulletinIssueId: sourceBulletinId,
              targetBulletinIssueId: bulletinIssueId,
              clearExisting: true,
            });
          }}
          isLoading={copyFromBulletin.isPending}
        />
      )}

      {/* Template Dialog */}
      {showTemplateDialog && templates && (
        <ApplyTemplateDialog
          templates={templates.map(t => ({
            key: t.key,
            name: t.name,
            description: t.description ?? undefined,
          }))}
          onClose={() => setShowTemplateDialog(false)}
          onApply={(templateKey) => {
            // Template application sets items based on template structure
            // For now, we create a standard service order structure
            const templateItems = getTemplateItems(templateKey);
            setLocalItems(templateItems);
            setHasUnsavedChanges(true);
            setShowTemplateDialog(false);
          }}
        />
      )}
    </div>
  );
}

// Inline edit modal for service items
function ServiceItemEditModal({
  item,
  onSave,
  onCancel,
  sections,
}: {
  item: ServiceOrderItem;
  onSave: (item: ServiceOrderItem) => void;
  onCancel: () => void;
  sections: readonly typeof SECTIONS[number][];
}) {
  const [formData, setFormData] = useState({ ...item });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b">
            <h3 className="font-semibold">Edit Service Item</h3>
          </div>

          <div className="p-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {['Welcome', 'Song', 'Prayer', 'Scripture', 'Sermon', 'Offering', 'Communion', 'Benediction', 'Announcement', 'Heading', 'Other'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block text-sm font-medium mb-1">Section</label>
              <select
                value={formData.section || ''}
                onChange={e => setFormData({ ...formData, section: (e.target.value || null) as SectionId })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">No section</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
              <input
                type="number"
                min="0"
                max="180"
                value={formData.durationMinutes || ''}
                onChange={e => setFormData({ ...formData, durationMinutes: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Optional"
              />
            </div>

            {/* Slides Count - for items that may have presentation slides */}
            {['Song', 'Scripture', 'Sermon', 'Other'].includes(formData.type) && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Number of Slides
                  <span className="text-xs text-gray-500 font-normal ml-1">(for Preach Mode)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.slidesCount || ''}
                  onChange={e => setFormData({ ...formData, slidesCount: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="0 or leave blank if no slides"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Track how many slides are associated with this item for live service control
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Notes (internal)</label>
              <textarea
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value || null })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 h-20"
                placeholder="Internal notes, not shown on bulletin"
              />
            </div>

            {/* CCLI Number for songs */}
            {formData.type === 'Song' && (
              <div>
                <label className="block text-sm font-medium mb-1">CCLI Number</label>
                <input
                  type="text"
                  value={formData.ccliNumber || ''}
                  onChange={e => setFormData({ ...formData, ccliNumber: e.target.value || null })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., 4639462"
                />
              </div>
            )}

            {/* Scripture Ref */}
            {formData.type === 'Scripture' && (
              <div>
                <label className="block text-sm font-medium mb-1">Scripture Reference</label>
                <input
                  type="text"
                  value={formData.scriptureRef || ''}
                  onChange={e => setFormData({ ...formData, scriptureRef: e.target.value || null })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., John 3:16-17"
                />
              </div>
            )}

            {/* Speaker for sermons */}
            {formData.type === 'Sermon' && (
              <div>
                <label className="block text-sm font-medium mb-1">Speaker</label>
                <input
                  type="text"
                  value={formData.speaker || ''}
                  onChange={e => setFormData({ ...formData, speaker: e.target.value || null })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Pastor John"
                />
              </div>
            )}
          </div>

          <div className="p-4 border-t flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Copy From Bulletin Dialog
function CopyFromBulletinDialog({
  bulletinIssueId,
  onClose,
  onCopy,
  isLoading,
}: {
  bulletinIssueId: string;
  onClose: () => void;
  onCopy: (sourceBulletinId: string) => void;
  isLoading: boolean;
}) {
  const { data: recentBulletins, isLoading: loadingBulletins } = trpc.serviceItems.listRecentBulletins.useQuery({
    excludeBulletinId: bulletinIssueId,
    limit: 10,
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Copy from previous service</h3>
          <p className="text-sm text-gray-500 mt-1">
            Select a previous service to copy its plan items
          </p>
        </div>

        <div className="p-4 max-h-80 overflow-auto">
          {loadingBulletins ? (
            <div className="text-center py-8 text-gray-500">Loading bulletins...</div>
          ) : !recentBulletins?.bulletins?.length ? (
            <div className="text-center py-8 text-gray-500">No other bulletins found</div>
          ) : (
            <div className="space-y-2">
              {recentBulletins.bulletins.map((bulletin) => (
                <button
                  key={bulletin.id}
                  onClick={() => onCopy(bulletin.id)}
                  disabled={isLoading || bulletin.itemCount === 0}
                  className={`w-full text-left p-3 border rounded-lg transition-colors ${
                    bulletin.itemCount === 0
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'hover:bg-gray-50 hover:border-primary-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {new Date(bulletin.issueDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {bulletin.itemCount} items · {bulletin.status}
                      </div>
                    </div>
                    {isLoading && <span className="text-xs text-gray-400">Copying...</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// Apply Template Dialog
function ApplyTemplateDialog({
  templates,
  onClose,
  onApply,
}: {
  templates: { key: string; name: string; description?: string }[];
  onClose: () => void;
  onApply: (templateKey: string) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Apply service template</h3>
          <p className="text-sm text-gray-500 mt-1">
            Choose a template to apply to this service plan
          </p>
        </div>

        <div className="p-4 max-h-80 overflow-auto">
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.key}
                onClick={() => onApply(template.key)}
                className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 hover:border-primary-300 transition-colors"
              >
                <div className="font-medium">{template.name}</div>
                {template.description && (
                  <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                )}
              </button>
            ))}

            {/* Standard Template option */}
            <button
              onClick={() => onApply('standard')}
              className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 hover:border-primary-300 transition-colors border-dashed"
            >
              <div className="font-medium">Standard Service Plan</div>
              <div className="text-xs text-gray-500 mt-1">
                Basic plan: Welcome, Songs, Scripture, Sermon, Closing
              </div>
            </button>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper to generate template items
function getTemplateItems(templateKey: string): ServiceOrderItem[] {
  // Generate temporary IDs for new items
  const tempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  if (templateKey === 'standard') {
    return [
      { id: null, tempId: tempId(), type: 'Welcome', title: 'Welcome & Greeting', sequence: 1, section: 'pre-service', durationMinutes: 5 },
      { id: null, tempId: tempId(), type: 'Song', title: 'Opening Song', sequence: 2, section: 'worship', durationMinutes: 4 },
      { id: null, tempId: tempId(), type: 'Prayer', title: 'Opening Prayer', sequence: 3, section: 'worship', durationMinutes: 3 },
      { id: null, tempId: tempId(), type: 'Song', title: 'Praise & Worship', sequence: 4, section: 'worship', durationMinutes: 12 },
      { id: null, tempId: tempId(), type: 'Scripture', title: 'Scripture Reading', sequence: 5, section: 'message', durationMinutes: 5 },
      { id: null, tempId: tempId(), type: 'Sermon', title: 'Message', sequence: 6, section: 'message', durationMinutes: 30 },
      { id: null, tempId: tempId(), type: 'Song', title: 'Response Song', sequence: 7, section: 'response', durationMinutes: 4 },
      { id: null, tempId: tempId(), type: 'Offering', title: 'Offering', sequence: 8, section: 'response', durationMinutes: 5 },
      { id: null, tempId: tempId(), type: 'Benediction', title: 'Benediction', sequence: 9, section: 'closing', durationMinutes: 2 },
    ];
  }

  // Default empty template
  return [
    { id: null, tempId: tempId(), type: 'Welcome', title: 'Welcome', sequence: 1, section: 'pre-service', durationMinutes: 5 },
  ];
}

export default ServiceOrderPanel;
