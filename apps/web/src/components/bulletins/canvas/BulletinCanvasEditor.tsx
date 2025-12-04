'use client';

import { useState, useEffect, useRef } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, useDraggable, useDroppable, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { BulletinCanvasLayout, BulletinCanvasBlock, BulletinCanvasBlockType } from '@elder-first/types';
import { BulletinCanvasPageView } from './BulletinCanvasPageView';
import { GuidedBlockInspector } from './GuidedBlockInspector';
import { snapToGrid, constrainBlock } from './utils';
import { debugBlockPositions, checkPositionStability, resetPositionTracking } from './debugPositions';
import { ResizeTestMonitor } from './ResizeTestMonitor';
import { DriftTestHelper } from './DriftTestHelper';
import { ServiceOrderPanel } from '../ServiceOrderPanel';
import { IS_DEV } from '@/config/env';

interface BulletinCanvasEditorProps {
  bulletinId: string;
  initialLayout?: BulletinCanvasLayout | null;
  bulletinIssueId: string;
  onSave: (layout: BulletinCanvasLayout) => Promise<void>;
  onCancel: () => void;
  isLocked?: boolean;
  orgSettings?: {
    defaultGridSize: number;
    defaultShowGrid: boolean;
    aiEnabled: boolean;
  };
}

/**
 * BulletinCanvasEditor
 *
 * Full-featured canvas editor for bulletin layout with drag-and-drop.
 *
 * Layout:
 * - Left Panel: Block palette (draggable block types)
 * - Center: Canvas with page tabs and zoom controls
 * - Right Panel: Inspector for selected block properties
 * - Top Bar: Global controls (save, discard, zoom, grid toggle)
 */
export function BulletinCanvasEditor({
  bulletinId,
  initialLayout,
  bulletinIssueId,
  onSave,
  onCancel,
  isLocked = false,
  orgSettings,
}: BulletinCanvasEditorProps) {
  // Editor state
  const [layout, setLayout] = useState<BulletinCanvasLayout>(() =>
    initialLayout || createEmptyLayout()
  );
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.75); // 75% default zoom for editor
  const [showGrid, setShowGrid] = useState(orgSettings?.defaultShowGrid ?? true);
  const [gridSize] = useState(orgSettings?.defaultGridSize ?? 16);
  const [isSaving, setIsSaving] = useState(false);
  const [activeBlockType, setActiveBlockType] = useState<BulletinCanvasBlockType | null>(null);
  const [showDriftTest, setShowDriftTest] = useState(false); // For drift testing

  // Dirty state tracking & autosave
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoSavingRef = useRef(false);

  // Reference to canvas container for scroll tracking
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Track the last saved layout as serialized JSON for deep equality comparison
  const lastSavedLayoutJsonRef = useRef<string>(
    JSON.stringify(initialLayout || createEmptyLayout())
  );

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag (prevents accidental drags)
      },
    })
  );

  const currentPage = layout.pages.find(p => p.pageNumber === currentPageNumber);
  const selectedBlock = currentPage?.blocks.find(b => b.id === selectedBlockId);

  // Enhanced save with dirty state tracking
  const handleSave = async (isAutosave = false) => {
    if (isLocked) return; // Don't save if locked
    if (isAutosave && isAutoSavingRef.current) {
      // Prevent multiple autosaves in flight
      return;
    }
    if (isAutosave && !isDirty) {
      // Don't autosave if nothing changed
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');
    setSaveError(null);

    if (isAutosave) {
      isAutoSavingRef.current = true;
    }

    try {
      await onSave(layout);

      // 🔑 Update baseline after successful save
      lastSavedLayoutJsonRef.current = JSON.stringify(layout);
      setIsDirty(false);
      setSaveStatus('saved');
      setSaveError(null);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save');
      setSaveStatus('unsaved');
      setIsDirty(true);
      // DO NOT navigate or call onCancel on error
    } finally {
      setIsSaving(false);
      if (isAutosave) {
        isAutoSavingRef.current = false;
      }
    }
  };

  // Dirty detection via deep equality comparison against last saved baseline
  useEffect(() => {
    if (isLocked) {
      // Locked bulletins are never dirty
      setIsDirty(false);
      if (saveStatus !== 'saving') {
        setSaveStatus('saved');
      }
      return;
    }

    const currentJson = JSON.stringify(layout);
    const baselineJson = lastSavedLayoutJsonRef.current;
    const dirty = currentJson !== baselineJson;

    setIsDirty(dirty);

    // Update status based on dirty state (unless currently saving)
    if (!dirty && saveStatus !== 'saving') {
      setSaveStatus('saved');
    } else if (dirty && saveStatus !== 'saving') {
      setSaveStatus('unsaved');
    }
  }, [layout, isLocked]); // DO NOT include saveStatus to avoid loops

  // Autosave timer: schedule whenever dirty state changes
  useEffect(() => {
    if (isLocked || !isDirty) {
      // Clear timer if locked or clean
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      return;
    }

    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    // Schedule new autosave in 12 seconds
    autosaveTimerRef.current = setTimeout(() => {
      if (isDirty && !isAutoSavingRef.current) {
        handleSave(true);
      }
    }, 12000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [isDirty, isLocked]);

  // Browser navigation protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Sync layout and baseline when initialLayout changes from parent (e.g., after refetch)
  useEffect(() => {
    if (initialLayout) {
      const newLayoutJson = JSON.stringify(initialLayout);
      const currentBaselineJson = lastSavedLayoutJsonRef.current;

      // Only update if the server sent us a different layout than our baseline
      if (newLayoutJson !== currentBaselineJson) {
        setLayout(initialLayout);
        lastSavedLayoutJsonRef.current = newLayoutJson;
        setIsDirty(false);
        setSaveStatus('saved');
        setSaveError(null);
      }
    }
  }, [initialLayout]);

  // Cleanup autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  const handleBlockSelect = (blockId: string) => {
    setSelectedBlockId(blockId);
  };

  const handleCanvasClick = () => {
    setSelectedBlockId(null);
  };

  const handleBlockUpdate = (blockId: string, updates: Partial<BulletinCanvasBlock>) => {
    if (isLocked) return; // Read-only when locked
    setLayout(prev => ({
      ...prev,
      pages: prev.pages.map(page => ({
        ...page,
        blocks: page.blocks.map(block =>
          block.id === blockId ? { ...block, ...updates } : block
        ),
      })),
    }));
  };

  const handleBlockDelete = (blockId: string) => {
    if (isLocked) return; // Read-only when locked
    setLayout(prev => ({
      ...prev,
      pages: prev.pages.map(page => ({
        ...page,
        blocks: page.blocks.filter(block => block.id !== blockId),
      })),
    }));
    setSelectedBlockId(null);
  };

  // Block duplication
  const handleBlockDuplicate = (blockId: string) => {
    if (isLocked) return; // Read-only when locked
    setLayout(prev => ({
      ...prev,
      pages: prev.pages.map(page => {
        const blockToDuplicate = page.blocks.find(b => b.id === blockId);
        if (!blockToDuplicate) return page;

        // Create duplicate with offset position
        const maxZIndex = Math.max(0, ...page.blocks.map(b => b.zIndex));
        const duplicate: BulletinCanvasBlock = {
          ...blockToDuplicate,
          id: crypto.randomUUID(),
          x: Math.min(816 - blockToDuplicate.width, blockToDuplicate.x + 16),
          y: Math.min(1056 - blockToDuplicate.height, blockToDuplicate.y + 16),
          zIndex: maxZIndex + 1,
        };

        // Select the new duplicate
        setSelectedBlockId(duplicate.id);

        return {
          ...page,
          blocks: [...page.blocks, duplicate],
        };
      }),
    }));
  };

  // Z-index controls
  const handleBringToFront = (blockId: string) => {
    if (isLocked) return; // Read-only when locked
    setLayout(prev => {
      const maxZIndex = Math.max(0, ...prev.pages.flatMap(p => p.blocks.map(b => b.zIndex)));
      return {
        ...prev,
        pages: prev.pages.map(page => ({
          ...page,
          blocks: page.blocks.map(block =>
            block.id === blockId ? { ...block, zIndex: maxZIndex + 1 } : block
          ),
        })),
      };
    });
  };

  // Create test announcements block with specific rotation for drift testing
  const createTestAnnouncementsBlock = (rotation: number = 0) => {
    console.log(`Creating test announcements block with ${rotation}° rotation...`);

    const testAnnouncement: BulletinCanvasBlock = {
      id: `ann-test-${Date.now()}-${rotation}`,
      type: 'announcements',
      x: 200 + Math.random() * 100, // Slight randomness to prevent overlap
      y: 200 + Math.random() * 100,
      width: 350,
      height: 300,
      zIndex: 1000 + rotation, // Use rotation as part of z-index for uniqueness
      rotation: rotation,
      data: { maxItems: 5, category: null, priorityFilter: null },
    };

    setLayout(prev => ({
      ...prev,
      pages: prev.pages.map(page => {
        if (page.pageNumber !== currentPageNumber) return page;
        return {
          ...page,
          blocks: [...page.blocks, testAnnouncement],
        };
      }),
    }));

    // Auto-select it for testing
    setSelectedBlockId(testAnnouncement.id);
    console.log(`Test announcements block (${rotation}°) added and selected. Try resizing from bottom-right.`);
  };

  const handleSendToBack = (blockId: string) => {
    if (isLocked) return; // Read-only when locked
    setLayout(prev => {
      const minZIndex = Math.min(0, ...prev.pages.flatMap(p => p.blocks.map(b => b.zIndex)));
      return {
        ...prev,
        pages: prev.pages.map(page => ({
          ...page,
          blocks: page.blocks.map(block =>
            block.id === blockId ? { ...block, zIndex: minZIndex - 1 } : block
          ),
        })),
      };
    });
  };

  // Global editor actions
  const handleRefreshContent = () => {
    // This would typically fetch fresh data from the server
    // For now, we'll just show a message
    alert('Content refreshed! Smart sections will update with the latest service plan, announcements, and events.');
    // In a real implementation, you'd refetch data for smart sections
  };

  const handleReflowLayout = () => {
    if (isLocked) return;

    setLayout(prev => ({
      ...prev,
      pages: prev.pages.map(page => {
        // Simple reflow algorithm - stack blocks vertically
        let currentY = 50;
        const reflowedBlocks = [...page.blocks]
          .sort((a, b) => a.y - b.y) // Sort by current Y position
          .map(block => {
            const newBlock = { ...block, x: 50, y: currentY };
            currentY += block.height + 20; // 20px spacing
            return newBlock;
          });

        return {
          ...page,
          blocks: reflowedBlocks,
        };
      }),
    }));
  };

  const handlePrintPreview = () => {
    // Save current state first if there are unsaved changes
    if (isDirty) {
      handleSave(false).then(() => {
        window.open(`/bulletins/${bulletinId}/print`, '_blank');
      });
    } else {
      window.open(`/bulletins/${bulletinId}/print`, '_blank');
    }
  };

  const handleSaveAndPrint = async () => {
    await handleSave(false);
    window.open(`/bulletins/${bulletinId}/print`, '_blank');
  };

  // Debug: Monitor page position on resize
  // Debug: Monitor block positions relative to page on resize
  useEffect(() => {
    const handleResize = () => {
      console.log('🔄 Window resized - checking positions...');

      const debugData = debugBlockPositions();
      checkPositionStability(debugData);

      // Also log the canvas container scroll position
      if (canvasContainerRef.current) {
        console.log('📜 Canvas scroll:', {
          scrollLeft: canvasContainerRef.current.scrollLeft,
          scrollTop: canvasContainerRef.current.scrollTop,
        });
      }
    };

    // Reset tracking when page changes
    resetPositionTracking();

    // Initial check after a short delay to ensure DOM is ready
    setTimeout(handleResize, 100);

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      resetPositionTracking();
    };
  }, [currentPage]);

  // Keyboard support for selected block (disabled when locked)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked) return; // Disable keyboard shortcuts when locked
      if (!selectedBlockId || !currentPage) return;

      const selectedBlock = currentPage.blocks.find(b => b.id === selectedBlockId);
      if (!selectedBlock) return;

      // Don't intercept keyboard if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Delete key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleBlockDelete(selectedBlockId);
        return;
      }

      // DEV-ONLY: Test shortcuts for debugging
      if (IS_DEV) {
        // TEST: Toggle drift test helper (Ctrl+Shift+D)
        if (e.ctrlKey && e.shiftKey && e.key === 'd') {
          e.preventDefault();
          setShowDriftTest(prev => !prev);
          console.log(`Drift test helper ${!showDriftTest ? 'enabled' : 'disabled'}`);
          return;
        }

        // TEST: Add test announcements block (Ctrl+Shift+A) - for debugging real announcements resize
        if (e.ctrlKey && e.shiftKey && e.key === 'a') {
          e.preventDefault();
          console.log('Adding test announcements block with rotation...');

          const testAnnouncement: BulletinCanvasBlock = {
            id: `ann-test-${Date.now()}`,
            type: 'announcements',
            x: 200,
            y: 200,
            width: 350,
            height: 300,
            zIndex: 1000,
            rotation: 10, // Add slight rotation to test transform-origin
            data: { maxItems: 5, category: null, priorityFilter: null },
          };

          setLayout(prev => ({
            ...prev,
            pages: prev.pages.map(page => {
              if (page.pageNumber !== currentPageNumber) return page;
              return {
                ...page,
                blocks: [...page.blocks, testAnnouncement],
              };
            }),
          }));

          // Auto-select it for testing
          setSelectedBlockId(testAnnouncement.id);
          console.log('Test announcements block added and selected. Try resizing from bottom-right.');
          return;
        }

        // TEST: Add test blocks (Ctrl+Shift+T) - for debugging positioning
        if (e.ctrlKey && e.shiftKey && e.key === 't') {
          e.preventDefault();
          console.log('Adding test blocks to verify resize behavior...');

          // Add test blocks - some with rotation, some without
          const testPositions = [
            { x: 100, y: 100, w: 150, h: 100, rotation: 0, content: 'No Rotation' },
            { x: 300, y: 100, w: 150, h: 100, rotation: 15, content: 'Rotated 15°' },
            { x: 500, y: 100, w: 150, h: 100, rotation: 45, content: 'Rotated 45°' },
            { x: 200, y: 300, w: 200, h: 150, rotation: 0, content: 'Large No Rot' },
            { x: 450, y: 300, w: 200, h: 150, rotation: -10, content: 'Large Rot -10°' },
          ];

          setLayout(prev => ({
            ...prev,
            pages: prev.pages.map(page => {
              if (page.pageNumber !== currentPageNumber) return page;

              const newBlocks = testPositions.map((pos, i) => ({
                id: `test-${Date.now()}-${i}`,
                type: 'text' as const,
                x: pos.x,
                y: pos.y,
                width: pos.w,
                height: pos.h,
                zIndex: 1000 + i,
                rotation: pos.rotation,
                data: { content: pos.content },
              }));

              return {
                ...page,
                blocks: [...page.blocks, ...newBlocks],
              };
            }),
          }));
          return;
        }
      }

      // Arrow keys for nudging
      const nudgeAmount = e.shiftKey ? 10 : 1; // Shift = larger steps
      let updates: Partial<BulletinCanvasBlock> | null = null;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          updates = { y: Math.max(0, selectedBlock.y - nudgeAmount) };
          break;
        case 'ArrowDown':
          e.preventDefault();
          updates = { y: Math.min(1056 - selectedBlock.height, selectedBlock.y + nudgeAmount) };
          break;
        case 'ArrowLeft':
          e.preventDefault();
          updates = { x: Math.max(0, selectedBlock.x - nudgeAmount) };
          break;
        case 'ArrowRight':
          e.preventDefault();
          updates = { x: Math.min(816 - selectedBlock.width, selectedBlock.x + nudgeAmount) };
          break;
      }

      if (updates) {
        handleBlockUpdate(selectedBlockId, updates);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockId, currentPage, isLocked, currentPageNumber]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;

    // If dragging from palette (active.data.current.blockType exists)
    if (active.data.current?.blockType) {
      setActiveBlockType(active.data.current.blockType);
    } else {
      // Dragging existing block - select it
      setSelectedBlockId(active.id as string);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    setActiveBlockType(null);

    if (isLocked) return; // Disable drag operations when locked
    if (!over) return;

    // Case 1: Dragging from palette to canvas
    if (active.data.current?.blockType && over.id === `canvas-page-${currentPageNumber}`) {
      const blockType = active.data.current.blockType as BulletinCanvasBlockType;
      const canvasElement = document.querySelector(`[data-canvas-page="${currentPageNumber}"]`) as HTMLElement;

      if (!canvasElement) return;

      // Get canvas bounds for positioning
      const canvasRect = canvasElement.getBoundingClientRect();

      // Calculate drop position relative to canvas (accounting for zoom)
      // The over.rect.left/top gives us the position of the drop event
      const dropX = (event.activatorEvent as PointerEvent).clientX;
      const dropY = (event.activatorEvent as PointerEvent).clientY;

      const relativeX = (dropX - canvasRect.left) / zoom;
      const relativeY = (dropY - canvasRect.top) / zoom;

      // Create new block at drop position
      createBlock(blockType, relativeX, relativeY, currentPageNumber);
      return;
    }

    // Case 2: Dragging existing block within canvas
    if (active.data.current?.isBlock && over.id === `canvas-page-${currentPageNumber}`) {
      const blockId = active.id as string;

      // Calculate new position from delta (accounting for zoom)
      const deltaX = delta.x / zoom;
      const deltaY = delta.y / zoom;

      setLayout(prev => ({
        ...prev,
        pages: prev.pages.map(page =>
          page.pageNumber === currentPageNumber ? {
            ...page,
            blocks: page.blocks.map(block => {
              if (block.id !== blockId) return block;

              // Apply delta and snap to grid
              const newX = snapToGrid(block.x + deltaX, gridSize);
              const newY = snapToGrid(block.y + deltaY, gridSize);

              // Constrain to canvas bounds
              const constrained = constrainBlock(
                { ...block, x: newX, y: newY },
                816,
                1056
              );

              return constrained;
            }),
          } : page
        ),
      }));
    }
  };

  const createBlock = (type: BulletinCanvasBlockType, x: number, y: number, pageNumber: number) => {
    if (isLocked) return; // Prevent block creation when locked

    const defaultSizes: Record<BulletinCanvasBlockType, { width: number; height: number }> = {
      text: { width: 300, height: 100 },
      image: { width: 200, height: 200 },
      qr: { width: 150, height: 150 },
      serviceItems: { width: 350, height: 400 },
      announcements: { width: 350, height: 300 },
      events: { width: 350, height: 250 },
      giving: { width: 250, height: 300 },
      contactInfo: { width: 300, height: 150 },
    };

    const defaultData: Record<BulletinCanvasBlockType, any> = {
      text: { content: 'New Text Block', fontSize: 16, fontWeight: 'normal', textAlign: 'left', color: '#000000' },
      image: { imageUrl: '', alt: 'Image', objectFit: 'contain' },
      qr: { url: 'https://example.com', label: 'Scan to connect' },
      serviceItems: { bulletinIssueId, maxItems: 20, showCcli: false },
      announcements: { maxItems: 5, category: null, priorityFilter: null },
      events: { maxItems: 5, dateRange: 'month' },
      giving: { displayType: 'both', givingUrl: 'https://example.com/give' },
      contactInfo: { showAddress: true, showPhone: true, showEmail: true, showWebsite: true },
    };

    const { width, height } = defaultSizes[type];
    const maxNextZIndex = Math.max(
      0,
      ...layout.pages.flatMap(p => p.blocks.map(b => b.zIndex))
    );

    const newBlock: BulletinCanvasBlock = {
      id: crypto.randomUUID(),
      type,
      x: Math.max(0, Math.min(816 - width, x - width / 2)), // Center on cursor, clamp to canvas
      y: Math.max(0, Math.min(1056 - height, y - height / 2)),
      width,
      height,
      zIndex: maxNextZIndex + 1,
      data: defaultData[type],
    };

    setLayout(prev => ({
      ...prev,
      pages: prev.pages.map(page =>
        page.pageNumber === pageNumber ? {
          ...page,
          blocks: [...page.blocks, newBlock],
        } : page
      ),
    }));

    // Select the newly created block
    setSelectedBlockId(newBlock.id);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Canvas Editor</h2>
            {bulletinId && (
              <div className="text-sm text-gray-500">
                Bulletin #{bulletinId.slice(0, 8)}
              </div>
            )}
            {/* Save status indicator */}
            <div className="flex items-center gap-2 text-xs">
              {isLocked ? (
                <span className="flex items-center gap-1 text-orange-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Read-only (locked)
                </span>
              ) : (
                <>
                  {saveStatus === 'saved' && (
                    <span className="flex items-center gap-1 text-green-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      All changes saved
                    </span>
                  )}
                  {saveStatus === 'saving' && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  )}
                  {saveStatus === 'unsaved' && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Unsaved changes
                    </span>
                  )}
                  {saveError && (
                    <span className="text-red-600" title={saveError}>Error saving</span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Actions */}
            {!isLocked && (
              <div className="flex items-center gap-2 border-r pr-3">
                <button
                  onClick={handleRefreshContent}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  title="Refresh content from service plan, announcements, and events"
                >
                  🔄 Refresh Content
                </button>
                <button
                  onClick={handleReflowLayout}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  title="Auto-arrange blocks to avoid overlaps"
                >
                  📐 Reflow Layout
                </button>
              </div>
            )}

            {/* Print Preview */}
            <button
              onClick={handlePrintPreview}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
              title="Preview bulletin for printing"
            >
              🖨️ Preview
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 border-l pl-3">
              <button
                onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
                disabled={zoom <= 0.25}
              >
                −
              </button>
              <span className="text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(Math.min(2, zoom + 0.25))}
                className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
                disabled={zoom >= 2}
              >
                +
              </button>
            </div>

            {/* Grid Toggle */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-3 py-1.5 text-sm rounded border ${
                showGrid ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300'
              }`}
            >
              Grid
            </button>

            {/* Actions */}
            <div className="flex items-center gap-2 border-l pl-3">
              <button
                onClick={onCancel}
                className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                {isLocked ? 'Back' : 'Cancel'}
              </button>
              {!isLocked && (
                <>
                  <button
                    onClick={() => handleSave(false)}
                    disabled={isSaving}
                    className="px-4 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleSaveAndPrint}
                    disabled={isSaving}
                    className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save & Print
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Tabbed Content (Service Order + Block Palette) */}
          <LeftPanelTabs bulletinIssueId={bulletinIssueId} isLocked={isLocked} />

          {/* Center: Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Page Tabs with friendly labels */}
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex gap-2">
              {layout.pages.map((page) => {
                const pageLabels = layout.pages.length === 4
                  ? ['Front Cover', 'Inside Left', 'Inside Right', 'Back Cover']
                  : layout.pages.length === 2
                  ? ['Front', 'Back']
                  : layout.pages.map((_, i) => `Page ${i + 1}`);
                const label = pageLabels[page.pageNumber - 1] || `Page ${page.pageNumber}`;

                return (
                  <button
                    key={page.id}
                    onClick={() => setCurrentPageNumber(page.pageNumber)}
                    className={`px-4 py-1.5 text-sm rounded ${
                      currentPageNumber === page.pageNumber
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title={`Page ${page.pageNumber}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Canvas Area with Droppable */}
            <div
              ref={canvasContainerRef}
              className="flex-1 overflow-auto bg-gray-50"
            >
              {/*
                CRITICAL: Stable Layout Structure

                The canvas uses a fixed coordinate system where:
                1. The page maintains its natural size (816×1056)
                2. Scaling happens via CSS transform at the page level only
                3. Blocks are positioned in page coordinates (unscaled)
                4. The page origin (0,0) is pinned to container's top-left + padding

                This ensures that when the browser resizes:
                - Blocks maintain their exact position relative to the page
                - Only scrollbars change, not block positions
                - The page scales from its top-left corner (transformOrigin: '0 0')

                DO NOT:
                - Apply double scaling (both container size AND transform)
                - Use centering layouts that shift with viewport
                - Apply transforms to individual blocks
              */}
              <div
                style={{
                  // Simple container with fixed padding
                  position: 'relative',
                  padding: '64px',
                  // Size to accommodate scaled page
                  width: `${816 * zoom + 128}px`,
                  height: `${1056 * zoom + 128}px`,
                }}
              >
                {currentPage && (
                  <DroppablePageContainer
                    pageNumber={currentPageNumber}
                    zoom={zoom}
                    showGrid={showGrid}
                  >
                    <BulletinCanvasPageView
                      page={currentPage}
                      mode="editor"
                      selectedBlockId={selectedBlockId}
                      onBlockSelect={handleBlockSelect}
                      onBlockUpdate={handleBlockUpdate}
                      onBlockDelete={handleBlockDelete}
                      onCanvasClick={handleCanvasClick}
                      scale={1} // Pass scale=1 since we're scaling at this level
                      showGrid={showGrid}
                      gridSize={gridSize}
                    />
                  </DroppablePageContainer>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Block Settings (formerly Inspector) */}
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Block Settings</h3>
              {selectedBlock ? (
                <GuidedBlockInspector
                  block={selectedBlock}
                  onUpdate={(updates) => handleBlockUpdate(selectedBlock.id, updates)}
                  onDelete={() => handleBlockDelete(selectedBlock.id)}
                  onDuplicate={() => handleBlockDuplicate(selectedBlock.id)}
                  onBringToFront={() => handleBringToFront(selectedBlock.id)}
                  onSendToBack={() => handleSendToBack(selectedBlock.id)}
                  isLocked={isLocked}
                  bulletinId={bulletinId}
                  aiEnabled={orgSettings?.aiEnabled ?? false}
                />
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">
                  Select a block to edit properties
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay for visual feedback */}
      <DragOverlay>
        {activeBlockType && (
          <div className="bg-blue-100 border-2 border-blue-400 rounded p-4 opacity-80">
            <span className="text-sm font-medium">
              {blockTypeLabels[activeBlockType]}
            </span>
          </div>
        )}
      </DragOverlay>

      {/* Resize Test Monitor (Development Only) */}
      {IS_DEV && (
        <ResizeTestMonitor
          blocks={currentPage?.blocks || []}
          activeBlockId={selectedBlockId}
          isEnabled={true}
        />
      )}

      {/* Drift Test Helper (Development Only) - Toggle with Ctrl+Shift+D */}
      {IS_DEV && showDriftTest && (
        <DriftTestHelper
          blocks={currentPage?.blocks || []}
          selectedBlockId={selectedBlockId}
          onCreateTestBlock={createTestAnnouncementsBlock}
        />
      )}
    </DndContext>
  );
}

/**
 * DroppablePageContainer - Makes the page accept drops and handles scaling
 */
function DroppablePageContainer({
  pageNumber,
  zoom,
  showGrid: _showGridProp,
  children,
}: {
  pageNumber: number;
  zoom: number;
  showGrid: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `canvas-page-${pageNumber}`,
  });

  return (
    <div
      ref={setNodeRef}
      data-canvas-page={pageNumber}
      className={`relative bg-white shadow-lg border border-gray-300 transition-all ${
        isOver ? 'ring-4 ring-blue-400 ring-opacity-50' : ''
      }`}
      style={{
        // Natural page size (unscaled)
        width: '816px',
        height: '1056px',
        // Apply zoom via transform with stable origin
        transform: `scale(${zoom})`,
        transformOrigin: '0 0',
        // Position at top-left of container's content area
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Helper: Create empty 4-page layout
 */
function createEmptyLayout(): BulletinCanvasLayout {
  return {
    pages: [1, 2, 3, 4].map(pageNumber => ({
      id: crypto.randomUUID(),
      pageNumber,
      blocks: [],
    })),
  };
}

const blockTypeLabels: Record<BulletinCanvasBlockType, string> = {
  text: 'Text Block',
  image: 'Image',
  qr: 'QR Code',
  serviceItems: 'Order of Worship',
  announcements: 'Announcements',
  events: 'Events',
  giving: 'Giving Info',
  contactInfo: 'Contact Info',
};

/**
 * LeftPanelTabs - Tabbed interface for Service Order and Add Content
 */
function LeftPanelTabs({ bulletinIssueId, isLocked }: { bulletinIssueId: string; isLocked: boolean }) {
  const [activeTab, setActiveTab] = useState<'serviceOrder' | 'addContent'>('serviceOrder');

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('serviceOrder')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'serviceOrder'
              ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Service Order
          </span>
        </button>
        <button
          onClick={() => setActiveTab('addContent')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'addContent'
              ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Content
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'serviceOrder' ? (
          <ServiceOrderPanel
            bulletinIssueId={bulletinIssueId}
            isLocked={isLocked}
            compactMode={true}
            showSections={true}
          />
        ) : (
          <div className="p-4 overflow-y-auto h-full">
            <BlockPalette bulletinIssueId={bulletinIssueId} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * BlockPalette Component with Organized Sections
 */
function BlockPalette({ bulletinIssueId: _bulletinIssueId }: { bulletinIssueId: string }) {
  const smartSections: { type: BulletinCanvasBlockType; label: string; icon: string }[] = [
    { type: 'serviceItems', label: 'Order of Worship', icon: '📋' },
    { type: 'announcements', label: 'Announcements', icon: '📢' },
    { type: 'events', label: 'Events', icon: '📅' },
    { type: 'giving', label: 'Giving Info', icon: '💝' },
    { type: 'contactInfo', label: 'Contact Info', icon: '📞' },
  ];

  const customContent: { type: BulletinCanvasBlockType; label: string; icon: string }[] = [
    { type: 'text', label: 'Text Block', icon: '📝' },
    { type: 'image', label: 'Image', icon: '🖼️' },
    { type: 'qr', label: 'QR Code', icon: '⬜' },
  ];

  return (
    <div className="space-y-6">
      {/* Smart Sections */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Smart Sections</h4>
        <div className="space-y-2">
          {smartSections.map((blockType) => (
            <DraggableBlockType key={blockType.type} blockType={blockType.type} icon={blockType.icon} label={blockType.label} />
          ))}
        </div>
      </div>

      {/* Custom Content */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Custom Content</h4>
        <div className="space-y-2">
          {customContent.map((blockType) => (
            <DraggableBlockType key={blockType.type} blockType={blockType.type} icon={blockType.icon} label={blockType.label} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * DraggableBlockType - Individual palette item
 */
function DraggableBlockType({
  blockType,
  icon,
  label,
}: {
  blockType: BulletinCanvasBlockType;
  icon: string;
  label: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${blockType}`,
    data: {
      blockType,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-move transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium text-gray-900">{label}</span>
      </div>
    </div>
  );
}

