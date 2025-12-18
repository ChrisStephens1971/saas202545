'use client';

/**
 * ServicePlanEditor - Shared editor component for service plans
 *
 * Used by both:
 * - /sunday-planner (loads current plan via getCurrent)
 * - /sunday-planner/[planId] (loads specific plan via get)
 *
 * Phase 8: Extracted to support dynamic plan routing
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ServicePlanHeader } from './ServicePlanHeader';
import { ServicePlanActions } from './ServicePlanActions';
import { OrderOfService } from './OrderOfService';
import { ItemEditorDrawer } from './ItemEditorDrawer';
import { SaveAsTemplateModal } from './SaveAsTemplateModal';
import type { ServicePlanData, ServiceItemData, ServiceItemType, ServiceSectionData } from './types';
import { calculateTotalDuration, formatDuration } from './types';
import { SERVICE_ITEM_TYPE_MAP } from './itemTypeConfig';
import { computeEndTime } from './timeUtils';
import { downloadPlanAsJson, downloadPlanAsText } from './downloadUtils';
import { trpc } from '@/lib/trpc/client';
import { Loader2, AlertCircle, RefreshCw, List } from 'lucide-react';

/**
 * Fallback stub data for when no plan exists
 */
const EMPTY_PLAN: ServicePlanData = {
  id: '',
  date: new Date().toISOString().split('T')[0],
  startTime: '10:00 AM',
  status: 'draft',
  sections: [],
};

/**
 * Format date string for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Ensure all items and sections have valid IDs
 */
function normalizeIds(plan: ServicePlanData): ServicePlanData {
  return {
    ...plan,
    sections: plan.sections.map((section, sIdx) => ({
      ...section,
      id: section.id || `section-${sIdx}-${Date.now()}`,
      items: section.items.map((item, iIdx) => ({
        ...item,
        id: item.id || `item-${sIdx}-${iIdx}-${Date.now()}`,
      })),
    })),
  };
}

interface ServicePlanEditorProps {
  /** Plan ID to load (if not provided, loads current plan) */
  planId?: string;
}

export function ServicePlanEditor({ planId }: ServicePlanEditorProps) {
  const router = useRouter();

  // ============================================================================
  // State
  // ============================================================================

  // Local plan state (editable copy)
  const [plan, setPlan] = useState<ServicePlanData | null>(null);

  // Track the last saved state for comparison
  const lastSavedRef = useRef<string>('');

  // Item editor drawer state
  const [editingItem, setEditingItem] = useState<ServiceItemData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Save as template modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Save status
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ============================================================================
  // API Queries & Mutations
  // ============================================================================

  // Load specific plan by ID
  const {
    data: loadedPlanById,
    isLoading: isLoadingById,
    error: loadByIdError,
    refetch: refetchById,
  } = trpc.servicePlans.get.useQuery(
    { id: planId! },
    {
      enabled: !!planId,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  // Load current service plan (when no planId)
  const {
    data: loadedCurrentPlan,
    isLoading: isLoadingCurrent,
    error: loadCurrentError,
    refetch: refetchCurrent,
  } = trpc.servicePlans.getCurrent.useQuery(undefined, {
    enabled: !planId,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Determine which data/state to use
  const loadedPlan = planId ? loadedPlanById : loadedCurrentPlan;
  const isLoading = planId ? isLoadingById : isLoadingCurrent;
  const loadError = planId ? loadByIdError : loadCurrentError;
  const refetch = planId ? refetchById : refetchCurrent;

  // Save mutation
  const saveMutation = trpc.servicePlans.save.useMutation({
    onSuccess: () => {
      if (plan) {
        lastSavedRef.current = JSON.stringify(plan);
      }
      setSaveError(null);
      setIsSaving(false);
    },
    onError: (error) => {
      console.error('Save failed:', error);
      setSaveError(error.message || 'Save failed. Please try again.');
      setIsSaving(false);
    },
  });

  // Save as template mutation
  const saveAsTemplateMutation = trpc.servicePlans.saveAsTemplate.useMutation({
    onSuccess: () => {
      setIsTemplateModalOpen(false);
    },
  });

  // ============================================================================
  // Effects
  // ============================================================================

  // Initialize local state when plan loads
  useEffect(() => {
    if (loadedPlan) {
      const normalized = normalizeIds(loadedPlan as ServicePlanData);
      setPlan(normalized);
      lastSavedRef.current = JSON.stringify(normalized);
    } else if (loadedPlan === null && !isLoading) {
      // No plan exists - use empty plan
      setPlan(EMPTY_PLAN);
      lastSavedRef.current = JSON.stringify(EMPTY_PLAN);
    }
  }, [loadedPlan, isLoading]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  // Check for unsaved changes
  const hasUnsavedChanges = plan
    ? JSON.stringify(plan) !== lastSavedRef.current
    : false;

  // Calculate timing
  const totalMinutes = plan ? calculateTotalDuration(plan) : 0;
  const totalDurationStr = formatDuration(totalMinutes);
  const endTimeStr = plan ? computeEndTime(plan) : '';

  // ============================================================================
  // Handlers - Save
  // ============================================================================

  const handleSave = useCallback(async () => {
    if (!plan || !plan.id) {
      setSaveError('Cannot save: No service plan loaded');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await saveMutation.mutateAsync(plan);
    } catch {
      // Error handled in mutation callbacks
    }
  }, [plan, saveMutation]);

  // ============================================================================
  // Handlers - Actions
  // ============================================================================

  const handleDownloadJson = useCallback(() => {
    if (plan) {
      downloadPlanAsJson(plan);
    }
  }, [plan]);

  const handleDownloadText = useCallback(() => {
    if (plan) {
      downloadPlanAsText(plan);
    }
  }, [plan]);

  const handlePrint = useCallback(() => {
    // Open print view in new tab
    window.open('/sunday-planner/print', '_blank');
  }, []);

  const handleSaveAsTemplate = useCallback(() => {
    setIsTemplateModalOpen(true);
  }, []);

  const handleConfirmSaveAsTemplate = useCallback(
    async (name: string, description?: string) => {
      if (!plan) return;

      try {
        await saveAsTemplateMutation.mutateAsync({
          name,
          description,
          startTime: plan.startTime,
          sections: plan.sections,
        });
      } catch (error) {
        console.error('Failed to save template:', error);
        throw error;
      }
    },
    [plan, saveAsTemplateMutation]
  );

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all items from this service plan?')) {
      setPlan((prev) =>
        prev ? { ...prev, sections: [] } : prev
      );
    }
  };

  const handleViewLibrary = () => {
    router.push('/sunday-planner/plans');
  };

  // ============================================================================
  // Handlers - Sections
  // ============================================================================

  const handleSaveSection = (sectionId: string, newTitle: string) => {
    setPlan((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((section) =>
              section.id === sectionId ? { ...section, title: newTitle } : section
            ),
          }
        : prev
    );
  };

  const handleDuplicateSection = (sectionId: string) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const sectionToDupe = prev.sections.find((s) => s.id === sectionId);
      if (!sectionToDupe) return prev;

      const newSection: ServiceSectionData = {
        id: `section-${Date.now()}`,
        title: `${sectionToDupe.title} (Copy)`,
        items: sectionToDupe.items.map((item) => ({
          ...item,
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        })),
      };

      const idx = prev.sections.findIndex((s) => s.id === sectionId);
      const newSections = [...prev.sections];
      newSections.splice(idx + 1, 0, newSection);

      return { ...prev, sections: newSections };
    });
  };

  const handleDeleteSection = (sectionId: string) => {
    if (confirm('Are you sure you want to delete this section?')) {
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              sections: prev.sections.filter((section) => section.id !== sectionId),
            }
          : prev
      );
    }
  };

  const handleAddSection = () => {
    const newSection: ServiceSectionData = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      items: [],
    };
    setPlan((prev) =>
      prev
        ? { ...prev, sections: [...prev.sections, newSection] }
        : prev
    );
  };

  // ============================================================================
  // Handlers - Items
  // ============================================================================

  const handleEditItem = (item: ServiceItemData) => {
    setEditingItem(item);
    setIsDrawerOpen(true);
  };

  const handleSaveItem = (updatedItem: ServiceItemData) => {
    setPlan((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((section) => ({
              ...section,
              items: section.items.map((item) =>
                item.id === updatedItem.id ? updatedItem : item
              ),
            })),
          }
        : prev
    );
    setIsDrawerOpen(false);
    setEditingItem(null);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingItem(null);
  };

  const handleQuickAddItem = (sectionId: string, type: ServiceItemType) => {
    const typeConfig = SERVICE_ITEM_TYPE_MAP[type];
    const newItem: ServiceItemData = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      title: `New ${typeConfig.label}`,
      duration: typeConfig.defaultDurationMinutes,
    };

    setPlan((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((section) =>
              section.id === sectionId
                ? { ...section, items: [...section.items, newItem] }
                : section
            ),
          }
        : prev
    );

    setEditingItem(newItem);
    setIsDrawerOpen(true);
  };

  const handleAddItem = (sectionId: string) => {
    handleQuickAddItem(sectionId, 'note');
  };

  // ============================================================================
  // Handlers - Drag and Drop (including cross-section moves)
  // ============================================================================

  const handleReorderSections = (sectionIds: string[]) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const sectionMap = new Map(prev.sections.map((s) => [s.id, s]));
      const reorderedSections = sectionIds
        .map((id) => sectionMap.get(id))
        .filter((s): s is ServiceSectionData => s !== undefined);
      return { ...prev, sections: reorderedSections };
    });
  };

  const handleReorderItems = (sectionId: string, itemIds: string[]) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.id !== sectionId) return section;
          const itemMap = new Map(section.items.map((item) => [item.id, item]));
          const reorderedItems = itemIds
            .map((id) => itemMap.get(id))
            .filter((item): item is ServiceItemData => item !== undefined);
          return { ...section, items: reorderedItems };
        }),
      };
    });
  };

  /**
   * Handle moving an item from one section to another
   * Called from OrderOfService when a cross-section drag ends
   */
  const handleMoveItemBetweenSections = useCallback(
    (itemId: string, fromSectionId: string, toSectionId: string, toIndex: number) => {
      setPlan((prev) => {
        if (!prev) return prev;

        // Find the item to move
        const fromSection = prev.sections.find((s) => s.id === fromSectionId);
        if (!fromSection) {
          console.warn(`Source section ${fromSectionId} not found`);
          return prev;
        }

        const itemToMove = fromSection.items.find((i) => i.id === itemId);
        if (!itemToMove) {
          console.warn(`Item ${itemId} not found in section ${fromSectionId}`);
          return prev;
        }

        // Build new sections
        const newSections = prev.sections.map((section) => {
          if (section.id === fromSectionId) {
            // Remove from source
            return {
              ...section,
              items: section.items.filter((i) => i.id !== itemId),
            };
          }
          if (section.id === toSectionId) {
            // Insert into target at specified index
            const newItems = [...section.items];
            newItems.splice(toIndex, 0, itemToMove);
            return { ...section, items: newItems };
          }
          return section;
        });

        return { ...prev, sections: newSections };
      });
    },
    []
  );

  // ============================================================================
  // Render - Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        <p className="mt-4 text-lg text-gray-600">Loading service plan...</p>
      </div>
    );
  }

  // ============================================================================
  // Render - Error State
  // ============================================================================

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="mt-4 text-xl font-semibold text-gray-900">
          Could not load service plan
        </h2>
        <p className="mt-2 text-gray-600">
          {loadError.message || 'An error occurred. Please try again.'}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700"
        >
          <RefreshCw className="h-5 w-5" />
          Try Again
        </button>
      </div>
    );
  }

  // ============================================================================
  // Render - No Plan (null from API)
  // ============================================================================

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="h-12 w-12 text-amber-500" />
        <h2 className="mt-4 text-xl font-semibold text-gray-900">
          No service plan available
        </h2>
        <p className="mt-2 text-gray-600">
          Create a bulletin for an upcoming Sunday to start planning.
        </p>
        <button
          onClick={handleViewLibrary}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700"
        >
          <List className="h-5 w-5" />
          View Plan Library
        </button>
      </div>
    );
  }

  // ============================================================================
  // Render - Main UI
  // ============================================================================

  return (
    <>
      {/* Page Header */}
      <ServicePlanHeader
        date={formatDate(plan.date)}
        startTime={plan.startTime}
        endTime={endTimeStr}
        totalDuration={totalDurationStr}
        status={plan.status}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      {/* Save Error Banner */}
      {saveError && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{saveError}</span>
          <button
            onClick={() => setSaveError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action Bar */}
      <ServicePlanActions
        onSave={handleSave}
        onDownloadJson={handleDownloadJson}
        onDownloadText={handleDownloadText}
        onPrint={handlePrint}
        onSaveAsTemplate={handleSaveAsTemplate}
        onClear={handleClear}
        onViewLibrary={handleViewLibrary}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      {/* Order of Service Card */}
      <OrderOfService
        plan={plan}
        onSaveSection={handleSaveSection}
        onDuplicateSection={handleDuplicateSection}
        onDeleteSection={handleDeleteSection}
        onEditItem={handleEditItem}
        onQuickAddItem={handleQuickAddItem}
        onAddItem={handleAddItem}
        onAddSection={handleAddSection}
        onReorderSections={handleReorderSections}
        onReorderItems={handleReorderItems}
        onMoveItemBetweenSections={handleMoveItemBetweenSections}
      />

      {/* Item Editor Drawer */}
      <ItemEditorDrawer
        item={editingItem}
        isOpen={isDrawerOpen}
        onSave={handleSaveItem}
        onClose={handleCloseDrawer}
      />

      {/* Save as Template Modal */}
      <SaveAsTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSave={handleConfirmSaveAsTemplate}
        defaultName={`Template from ${formatDate(plan.date)}`}
        isLoading={saveAsTemplateMutation.isPending}
        error={saveAsTemplateMutation.error?.message}
      />
    </>
  );
}
