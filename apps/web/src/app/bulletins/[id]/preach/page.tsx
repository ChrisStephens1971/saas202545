'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

// ============================================================================
// Timing Hook - Best-effort, non-blocking timing recording
// ============================================================================
function usePreachTiming(bulletinId: string, enabled: boolean) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionStartedRef = useRef(false);
  const currentItemIdRef = useRef<string | null>(null);

  // TRPC mutations - fire-and-forget pattern
  const startSessionMutation = trpc.preach.startSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      console.log('[Timing] Session started:', data.sessionId);
    },
    onError: (error) => {
      console.warn('[Timing] Failed to start session:', error.message);
      // Don't break the UI - timing is best-effort
    },
  });

  const endSessionMutation = trpc.preach.endSession.useMutation({
    onSuccess: () => {
      console.log('[Timing] Session ended');
    },
    onError: (error) => {
      console.warn('[Timing] Failed to end session:', error.message);
    },
  });

  const recordTimingMutation = trpc.preach.recordItemTiming.useMutation({
    onError: (error) => {
      console.warn('[Timing] Failed to record timing:', error.message);
    },
  });

  // Start session on mount (once)
  useEffect(() => {
    if (enabled && bulletinId && !sessionStartedRef.current) {
      sessionStartedRef.current = true;
      startSessionMutation.mutate({ bulletinIssueId: bulletinId });
    }
  }, [enabled, bulletinId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Record item start event
  const recordItemStart = useCallback((itemId: string) => {
    if (!sessionId || !itemId) return;

    // End previous item if any
    if (currentItemIdRef.current && currentItemIdRef.current !== itemId) {
      recordTimingMutation.mutate({
        sessionId,
        serviceItemId: currentItemIdRef.current,
        event: 'end',
      });
    }

    // Start new item
    currentItemIdRef.current = itemId;
    recordTimingMutation.mutate({
      sessionId,
      serviceItemId: itemId,
      event: 'start',
    });
  }, [sessionId, recordTimingMutation]);

  // End current item
  const endCurrentItem = useCallback(() => {
    if (!sessionId || !currentItemIdRef.current) return;

    recordTimingMutation.mutate({
      sessionId,
      serviceItemId: currentItemIdRef.current,
      event: 'end',
    });
    currentItemIdRef.current = null;
  }, [sessionId, recordTimingMutation]);

  // End session
  const endSession = useCallback(() => {
    // End current item first
    endCurrentItem();

    // End session
    if (sessionId) {
      endSessionMutation.mutate({ sessionId });
    }
  }, [sessionId, endCurrentItem, endSessionMutation]);

  return {
    sessionId,
    recordItemStart,
    endCurrentItem,
    endSession,
    isSessionActive: !!sessionId,
  };
}

// Service item type icons mapping
const TYPE_ICONS: Record<string, string> = {
  Welcome: '👋',
  CallToWorship: '🙌',
  Song: '🎵',
  Prayer: '🙏',
  Scripture: '📖',
  Sermon: '🎤',
  Offering: '💝',
  Communion: '🍞',
  Benediction: '✨',
  Announcement: '📢',
  Event: '📅',
  Heading: '📌',
  Other: '📋',
};

// Section icons mapping
const SECTION_ICONS: Record<string, string> = {
  'pre-service': '🕐',
  'worship': '🎵',
  'message': '📖',
  'response': '🙏',
  'closing': '👋',
  'announcements': '📢',
  'other': '📋',
};

// Section display names
const SECTION_NAMES: Record<string, string> = {
  'pre-service': 'Pre-Service',
  'worship': 'Worship',
  'message': 'Message',
  'response': 'Response',
  'closing': 'Closing',
  'announcements': 'Announcements',
  'other': 'Other',
};

interface ServiceItem {
  id: string;
  type: string;
  title: string;
  content?: string | null;
  ccliNumber?: string | null;
  artist?: string | null;
  scriptureRef?: string | null;
  speaker?: string | null;
  sermonTitle?: string | null;
  songTitle?: string | null;
  songHymnNumber?: string | null;
  songCcliNumber?: string | null;
  sequence: number;
  durationMinutes?: number | null;
  section?: string | null;
  notes?: string | null;
  slidesCount?: number | null;
  updatedAt?: string | null;
}

// Connection status type
type ConnectionStatus = 'ok' | 'error' | 'checking';

export default function PreachModePage() {
  const params = useParams();
  const router = useRouter();
  const bulletinId = params.id as string;

  // Core navigation state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showItemList, setShowItemList] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(1);
  const [showQrCode, setShowQrCode] = useState(false);

  // Exit confirmation state
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Resilience state - stable local copy of items after initial load
  const [stableItems, setStableItems] = useState<ServiceItem[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('ok');
  const [hasChanges, setHasChanges] = useState(false);
  const [changesBannerDismissed, setChangesBannerDismissed] = useState(false);
  const lastUpdatedAtRef = useRef<string | null>(null);
  const initialLoadCompleteRef = useRef(false);

  // Live timing integration - best-effort, non-blocking
  const {
    sessionId: _sessionId,
    recordItemStart,
    endSession,
    isSessionActive,
  } = usePreachTiming(bulletinId, initialLoadCompleteRef.current);

  // Fetch bulletin data - only refetch if not locked
  const {
    data: bulletin,
    isLoading: bulletinLoading,
    error: bulletinError,
    refetch: refetchBulletin
  } = trpc.bulletins.get.useQuery({
    id: bulletinId,
  });

  // Fetch org data for church name
  const { data: orgBranding } = trpc.org.getBranding.useQuery();

  // Determine if bulletin is locked (should not refetch during service)
  const isLocked = bulletin?.status === 'locked' || bulletin?.lockedAt != null;

  // Fetch service items - with controlled refetch
  const {
    data: serviceItemsData,
    isLoading: itemsLoading,
    error: itemsError,
    refetch: refetchItems,
    isRefetching
  } = trpc.serviceItems.list.useQuery(
    { bulletinIssueId: bulletinId },
    {
      enabled: !!bulletinId,
      // For locked bulletins, don't auto-refetch
      refetchInterval: isLocked ? false : 60000, // 60s for unlocked
      refetchOnWindowFocus: false, // Never refetch on focus during preach
      retry: 1, // Only retry once on failure
    }
  );

  // Process items from API response
  const apiItems: ServiceItem[] = useMemo(() => {
    return (serviceItemsData?.items || []).map(item => ({
      id: item.id || '',
      type: item.type,
      title: item.title || '',
      content: item.content,
      ccliNumber: item.ccliNumber,
      artist: item.artist,
      scriptureRef: item.scriptureRef,
      speaker: item.speaker,
      sequence: item.sequence,
      // Convert Date to string for updatedAt if present
      updatedAt: item.updatedAt ? (item.updatedAt instanceof Date ? item.updatedAt.toISOString() : String(item.updatedAt)) : undefined,
    }));
  }, [serviceItemsData?.items]);

  // Initialize stable items on first successful load
  useEffect(() => {
    if (apiItems.length > 0 && !initialLoadCompleteRef.current) {
      setStableItems(apiItems);
      initialLoadCompleteRef.current = true;
      // Store initial timestamp for change detection
      if (bulletin?.updatedAt) {
        lastUpdatedAtRef.current = bulletin.updatedAt.toString();
      }
    }
  }, [apiItems, bulletin?.updatedAt]);

  // Change detection for unlocked bulletins
  useEffect(() => {
    if (!isLocked && initialLoadCompleteRef.current && !isRefetching) {
      // Check if bulletin updatedAt changed
      const currentUpdatedAt = bulletin?.updatedAt?.toString() || null;
      if (lastUpdatedAtRef.current && currentUpdatedAt &&
          lastUpdatedAtRef.current !== currentUpdatedAt) {
        setHasChanges(true);
      }
      // Also check if item count or IDs changed
      if (apiItems.length !== stableItems.length) {
        setHasChanges(true);
      } else {
        const apiIds = apiItems.map(i => i.id).join(',');
        const stableIds = stableItems.map(i => i.id).join(',');
        if (apiIds !== stableIds) {
          setHasChanges(true);
        }
      }
    }
  }, [apiItems, stableItems, bulletin?.updatedAt, isLocked, isRefetching]);

  // Handle connection status from refetch errors
  useEffect(() => {
    if (itemsError && initialLoadCompleteRef.current) {
      setConnectionStatus('error');
    } else if (!itemsError && !isRefetching) {
      setConnectionStatus('ok');
    }
  }, [itemsError, isRefetching]);

  // Use stable items for the UI (not live API data)
  const items = stableItems;
  const currentItem = items[currentIndex];

  // Reset slide index when service item changes
  useEffect(() => {
    setCurrentSlideIndex(1);
  }, [currentIndex]);

  // Record timing when current item changes
  useEffect(() => {
    if (currentItem?.id && isSessionActive) {
      recordItemStart(currentItem.id);
    }
  }, [currentItem?.id, isSessionActive, recordItemStart]);

  const nextItem = items[currentIndex + 1];

  // Slide navigation state computed in callback
  const currentItemSlidesCount = items[currentIndex]?.slidesCount || 0;
  const currentItemHasSlides = currentItemSlidesCount > 0;

  // Handle reload after changes detected
  const handleReloadChanges = useCallback(() => {
    // Find current item in new list by ID
    const currentItemId = items[currentIndex]?.id;
    setStableItems(apiItems);
    setHasChanges(false);
    setChangesBannerDismissed(false);
    lastUpdatedAtRef.current = bulletin?.updatedAt?.toString() || null;

    // Try to maintain position by ID
    if (currentItemId) {
      const newIndex = apiItems.findIndex(item => item.id === currentItemId);
      if (newIndex >= 0) {
        setCurrentIndex(newIndex);
      } else {
        // Item was removed, go to nearest valid index
        setCurrentIndex(Math.min(currentIndex, apiItems.length - 1));
      }
    }
    setCurrentSlideIndex(1);
  }, [apiItems, bulletin?.updatedAt, currentIndex, items]);

  // Handle exit with confirmation
  const handleExitRequest = useCallback(() => {
    setShowExitConfirm(true);
  }, []);

  const handleExitConfirm = useCallback(() => {
    // End the timing session before navigating away
    endSession();
    router.push(`/bulletins/${bulletinId}`);
  }, [router, bulletinId, endSession]);

  const handleExitCancel = useCallback(() => {
    setShowExitConfirm(false);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // If exit confirm dialog is showing, handle it first
    if (showExitConfirm) {
      if (e.key === 'Escape' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setShowExitConfirm(false);
        return;
      }
      if (e.key === 'Enter' || e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        handleExitConfirm();
        return;
      }
      return; // Block other keys while dialog is open
    }

    // If QR code modal is showing, Escape closes it
    if (showQrCode && e.key === 'Escape') {
      e.preventDefault();
      setShowQrCode(false);
      return;
    }

    // Slide navigation shortcuts (PageUp/PageDown or S+Arrow)
    if (e.key === 'PageDown' || (e.key === 's' && !e.shiftKey)) {
      if (currentItemHasSlides) {
        e.preventDefault();
        setCurrentSlideIndex(prev => Math.min(prev + 1, currentItemSlidesCount));
        return;
      }
    } else if (e.key === 'PageUp' || (e.key === 'S' && e.shiftKey)) {
      if (currentItemHasSlides) {
        e.preventDefault();
        setCurrentSlideIndex(prev => Math.max(prev - 1, 1));
        return;
      }
    }

    // Service item navigation
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault();
      setCurrentIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setCurrentIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setCurrentIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setCurrentIndex(items.length - 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleExitRequest();
    } else if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      setShowItemList(prev => !prev);
    } else if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      setShowQrCode(prev => !prev);
    }
  }, [items.length, currentItemHasSlides, currentItemSlidesCount, showExitConfirm, showQrCode, handleExitConfirm, handleExitRequest]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const goToNext = () => setCurrentIndex(prev => Math.min(prev + 1, items.length - 1));
  const goToPrev = () => setCurrentIndex(prev => Math.max(prev - 1, 0));
  const goToItem = (index: number) => {
    setCurrentIndex(index);
    setShowItemList(false);
  };

  // Slide navigation functions
  const slidesCount = currentItem?.slidesCount || 0;
  const hasSlides = slidesCount > 0;
  const goToNextSlide = useCallback(() => {
    setCurrentSlideIndex(prev => Math.min(prev + 1, slidesCount));
  }, [slidesCount]);
  const goToPrevSlide = useCallback(() => {
    setCurrentSlideIndex(prev => Math.max(prev - 1, 1));
  }, []);

  // Compute planned duration totals
  const { totalPlannedMinutes, plannedThroughCurrent } = useMemo(() => {
    let total = 0;
    let throughCurrent = 0;
    items.forEach((item, index) => {
      const duration = item.durationMinutes || 0;
      total += duration;
      if (index <= currentIndex) {
        throughCurrent += duration;
      }
    });
    return { totalPlannedMinutes: total, plannedThroughCurrent: throughCurrent };
  }, [items, currentIndex]);

  // Group items by section for sidebar
  const itemsBySection = useMemo(() => {
    const groups: { section: string | null; items: { item: ServiceItem; index: number }[] }[] = [];
    let currentSection: string | null = null;

    items.forEach((item, index) => {
      const itemSection = item.section ?? null;
      if (itemSection !== currentSection) {
        currentSection = itemSection;
        groups.push({ section: currentSection, items: [] });
      }
      groups[groups.length - 1].items.push({ item, index });
    });

    return groups;
  }, [items]);

  const isLoading = bulletinLoading || itemsLoading;
  const hasInitialError = (bulletinError || itemsError) && !initialLoadCompleteRef.current;

  // Loading state
  if (isLoading && !initialLoadCompleteRef.current) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor', 'submitter', 'viewer']}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
            <p className="text-xl text-white">Loading service...</p>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  // Initial error state with retry
  if (hasInitialError) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor', 'submitter', 'viewer']}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center text-white max-w-md mx-4">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="text-2xl font-semibold mb-2">Unable to Load Service</p>
            <p className="text-gray-400 mb-6">
              {bulletinError?.message || itemsError?.message || 'Could not connect to server'}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  refetchBulletin();
                  refetchItems();
                }}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Retry
              </button>
              <Link
                href="/bulletins"
                className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Back to Bulletins
              </Link>
            </div>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  // Bulletin not found (after successful query)
  if (!bulletin) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor', 'submitter', 'viewer']}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center text-white">
            <p className="text-xl mb-4">Bulletin not found</p>
            <Link href="/bulletins" className="text-primary-400 hover:underline">
              Back to Bulletins
            </Link>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  // No items state
  if (items.length === 0) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor', 'submitter', 'viewer']}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center text-white">
            <p className="text-xl mb-4">No service items found</p>
            <p className="text-gray-400 mb-6">Add items to the service order first</p>
            <Link
              href={`/bulletins/${bulletinId}`}
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Edit Bulletin
            </Link>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  const churchName = orgBranding?.churchName || orgBranding?.legalName || 'Church Service';
  const serviceDate = new Date(bulletin.serviceDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <ProtectedPage requiredRoles={['admin', 'editor', 'submitter', 'viewer']}>
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        {/* Connection/Changes Banner Area */}
        {connectionStatus === 'error' && (
          <div className="bg-amber-900/80 border-b border-amber-700 px-4 py-2 flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-amber-200 text-sm font-medium">Connection problem - using cached data</span>
          </div>
        )}
        {hasChanges && !changesBannerDismissed && (
          <div className="bg-blue-900/80 border-b border-blue-700 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-blue-200 text-sm font-medium">Service order has been updated</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReloadChanges}
                className="px-3 py-1 bg-blue-700 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                Reload now
              </button>
              <button
                onClick={() => setChangesBannerDismissed(true)}
                className="px-3 py-1 bg-blue-800 text-blue-200 text-sm rounded hover:bg-blue-700 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Header Bar */}
        <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleExitRequest}
              className="text-gray-400 hover:text-white transition-colors"
              title="Exit Preach Mode (Esc)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">{churchName}</h1>
                {isLocked && (
                  <span className="px-2 py-0.5 bg-green-900/50 text-green-400 text-xs rounded-full border border-green-700">
                    Locked
                  </span>
                )}
                {changesBannerDismissed && (
                  <span className="px-2 py-0.5 bg-amber-900/50 text-amber-400 text-xs rounded-full border border-amber-700" title="Using older version of service order">
                    Stale
                  </span>
                )}
                {isSessionActive && (
                  <span className="px-2 py-0.5 bg-red-900/50 text-red-400 text-xs rounded-full border border-red-700 flex items-center gap-1" title="Recording timing data">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                    REC
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">{serviceDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Duration Indicator */}
            {totalPlannedMinutes > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/50 rounded-lg border border-gray-600">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-gray-300">
                  <span className="font-medium text-white">{plannedThroughCurrent}</span>
                  <span className="text-gray-500"> / {totalPlannedMinutes} min</span>
                </span>
              </div>
            )}
            <span className="text-sm text-gray-400 bg-gray-700/50 px-3 py-1.5 rounded-lg">
              {currentIndex + 1} of {items.length}
            </span>
            <button
              onClick={() => setShowQrCode(!showQrCode)}
              className={`p-2 rounded-lg transition-colors ${
                showQrCode ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Open on mobile (Q)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => setShowItemList(!showItemList)}
              className={`p-2 rounded-lg transition-colors ${
                showItemList ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Toggle item list (L)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Current Item Display */}
          <div className={`flex-1 flex flex-col p-6 ${showItemList ? 'lg:pr-80' : ''}`}>
            {/* Current Item Card */}
            <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
              <CurrentItemCard
                item={currentItem}
                currentSlideIndex={currentSlideIndex}
                onPrevSlide={goToPrevSlide}
                onNextSlide={goToNextSlide}
              />
            </div>

            {/* Navigation Controls */}
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg text-lg font-medium transition-all ${
                  currentIndex === 0
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-700 text-white hover:bg-gray-600 active:scale-95'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <button
                onClick={goToNext}
                disabled={currentIndex === items.length - 1}
                className={`flex items-center gap-2 px-8 py-4 rounded-lg text-xl font-semibold transition-all ${
                  currentIndex === items.length - 1
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95'
                }`}
              >
                Next
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Next Item Preview */}
            {nextItem && (
              <div className="mt-6 max-w-2xl mx-auto w-full">
                <p className="text-sm text-gray-500 mb-2">Up Next:</p>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{TYPE_ICONS[nextItem.type] || '📋'}</span>
                    <div>
                      <p className="text-lg font-medium text-gray-200">{nextItem.title}</p>
                      <p className="text-sm text-gray-500">{nextItem.type}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Item List Sidebar with Section Groups */}
          {showItemList && (
            <div className="fixed right-0 top-0 bottom-0 w-80 bg-gray-800 border-l border-gray-700 overflow-hidden flex flex-col z-20 mt-14">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h2 className="font-semibold">Service Order</h2>
                {totalPlannedMinutes > 0 && (
                  <span className="text-xs text-gray-400">{totalPlannedMinutes} min total</span>
                )}
              </div>
              <div className="flex-1 overflow-auto">
                {itemsBySection.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    {/* Section Header */}
                    {group.section && (
                      <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm px-3 py-2 border-b border-gray-700 flex items-center gap-2">
                        <span className="text-lg">{SECTION_ICONS[group.section] || '📋'}</span>
                        <span className="text-sm font-medium text-gray-300">
                          {SECTION_NAMES[group.section] || group.section}
                        </span>
                      </div>
                    )}
                    {!group.section && groupIndex === 0 && (
                      <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm px-3 py-2 border-b border-gray-700">
                        <span className="text-sm font-medium text-gray-400">Service Items</span>
                      </div>
                    )}
                    {/* Items in this section */}
                    {group.items.map(({ item, index }) => (
                      <button
                        key={item.id || index}
                        onClick={() => goToItem(index)}
                        className={`w-full text-left p-3 border-b border-gray-700 transition-colors ${
                          index === currentIndex
                            ? 'bg-primary-600/30 border-l-4 border-l-primary-500'
                            : 'hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 w-6">{index + 1}</span>
                          <span className="text-lg">{TYPE_ICONS[item.type] || '📋'}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`truncate ${index === currentIndex ? 'text-white font-medium' : 'text-gray-300'}`}>
                              {item.title}
                            </p>
                            <p className="text-xs text-gray-500">{item.type}</p>
                          </div>
                          {item.durationMinutes && (
                            <span className="text-xs text-gray-500">{item.durationMinutes}m</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Exit Confirmation Modal */}
        {showExitConfirm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-2xl p-6 max-w-sm mx-4 border border-gray-700 shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-amber-900/50 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Exit Preach Mode?</h3>
                <p className="text-gray-400 mb-6">
                  Are you sure you want to exit? You can return anytime.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleExitCancel}
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                  >
                    Stay (N)
                  </button>
                  <button
                    onClick={handleExitConfirm}
                    className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors font-medium"
                  >
                    Exit (Y)
                  </button>
                </div>
                <p className="mt-4 text-xs text-gray-500">
                  Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Esc</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">N</kbd> to stay, <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Y</kbd> to exit
                </p>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {showQrCode && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowQrCode(false)}>
            <div className="bg-gray-800 rounded-2xl p-6 max-w-sm mx-4 border border-gray-700 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Open on Mobile</h3>
                <button
                  onClick={() => setShowQrCode(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-white p-4 rounded-xl flex items-center justify-center">
                <QRCodeSVG
                  value={typeof window !== 'undefined' ? `${window.location.origin}/bulletins/${bulletinId}/preach/mobile` : ''}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="mt-4 text-center text-sm text-gray-400">
                Scan this QR code with your phone to open a mobile-friendly view
              </p>
              <p className="mt-2 text-center text-xs text-gray-500">
                Sign in required on mobile device
              </p>
              <div className="mt-4 text-center">
                <Link
                  href={`/bulletins/${bulletinId}/preach/mobile`}
                  className="text-sm text-primary-400 hover:underline"
                  target="_blank"
                >
                  Open in new tab
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Hints */}
        <footer className="bg-gray-800 border-t border-gray-700 px-4 py-2">
          <div className="flex items-center justify-center gap-6 text-xs text-gray-500 flex-wrap">
            <span><kbd className="px-1.5 py-0.5 bg-gray-700 rounded">←</kbd> / <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">→</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Space</kbd> Next</span>
            {hasSlides && (
              <span className="text-indigo-400"><kbd className="px-1.5 py-0.5 bg-indigo-800 rounded">PgUp</kbd> / <kbd className="px-1.5 py-0.5 bg-indigo-800 rounded">PgDn</kbd> Slides</span>
            )}
            <span><kbd className="px-1.5 py-0.5 bg-gray-700 rounded">L</kbd> Item List</span>
            <span><kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Q</kbd> Mobile</span>
            <span><kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Esc</kbd> Exit</span>
          </div>
        </footer>
      </div>
    </ProtectedPage>
  );
}

// Current Item Card Component
interface CurrentItemCardProps {
  item: ServiceItem;
  currentSlideIndex: number;
  onPrevSlide: () => void;
  onNextSlide: () => void;
}

function CurrentItemCard({ item, currentSlideIndex, onPrevSlide, onNextSlide }: CurrentItemCardProps) {
  const icon = TYPE_ICONS[item.type] || '📋';
  const sectionIcon = item.section ? SECTION_ICONS[item.section] : null;
  const slidesCount = item.slidesCount || 0;
  const hasSlides = slidesCount > 0;

  return (
    <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-xl">
      {/* Section Badge */}
      {item.section && (
        <div className="mb-4">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">
            {sectionIcon && <span>{sectionIcon}</span>}
            {item.section.charAt(0).toUpperCase() + item.section.slice(1).replace('-', ' ')}
          </span>
        </div>
      )}

      {/* Type and Title */}
      <div className="flex items-start gap-4 mb-6">
        <span className="text-5xl">{icon}</span>
        <div className="flex-1">
          <p className="text-lg text-primary-400 font-medium mb-1">{item.type}</p>
          <h2 className="text-4xl font-bold text-white leading-tight">{item.title}</h2>
        </div>
      </div>

      {/* Slide Control Panel */}
      {hasSlides && (
        <div className="mb-6 p-4 bg-indigo-900/40 border border-indigo-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-xl font-semibold text-indigo-300">
                Slide {currentSlideIndex} of {slidesCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onPrevSlide}
                disabled={currentSlideIndex <= 1}
                className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentSlideIndex <= 1
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-700 text-white hover:bg-indigo-600 active:scale-95'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Prev Slide
              </button>
              <button
                onClick={onNextSlide}
                disabled={currentSlideIndex >= slidesCount}
                className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentSlideIndex >= slidesCount
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-700 text-white hover:bg-indigo-600 active:scale-95'
                }`}
              >
                Next Slide
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-indigo-400/70">
            Press <kbd className="px-1 py-0.5 bg-indigo-800 rounded text-indigo-300">PageUp</kbd> / <kbd className="px-1 py-0.5 bg-indigo-800 rounded text-indigo-300">PageDown</kbd> or <kbd className="px-1 py-0.5 bg-indigo-800 rounded text-indigo-300">s</kbd> / <kbd className="px-1 py-0.5 bg-indigo-800 rounded text-indigo-300">S</kbd> for slide navigation
          </p>
        </div>
      )}

      {/* Details */}
      <div className="space-y-3 mb-6">
        {/* Scripture Reference */}
        {item.scriptureRef && (
          <div className="flex items-center gap-3 text-lg">
            <span className="text-gray-500">Scripture:</span>
            <span className="text-white font-medium">{item.scriptureRef}</span>
          </div>
        )}

        {/* Speaker */}
        {item.speaker && (
          <div className="flex items-center gap-3 text-lg">
            <span className="text-gray-500">Speaker:</span>
            <span className="text-white font-medium">{item.speaker}</span>
          </div>
        )}

        {/* Artist */}
        {item.artist && (
          <div className="flex items-center gap-3 text-lg">
            <span className="text-gray-500">Artist:</span>
            <span className="text-white font-medium">{item.artist}</span>
          </div>
        )}

        {/* Song Details */}
        {item.songTitle && item.songTitle !== item.title && (
          <div className="flex items-center gap-3 text-lg">
            <span className="text-gray-500">Song:</span>
            <span className="text-white font-medium">{item.songTitle}</span>
          </div>
        )}
        {item.songHymnNumber && (
          <div className="flex items-center gap-3 text-lg">
            <span className="text-gray-500">Hymn #:</span>
            <span className="text-white font-medium">{item.songHymnNumber}</span>
          </div>
        )}

        {/* CCLI */}
        {(item.ccliNumber || item.songCcliNumber) && (
          <div className="flex items-center gap-3 text-lg">
            <span className="text-gray-500">CCLI:</span>
            <span className="text-gray-300 font-mono">{item.ccliNumber || item.songCcliNumber}</span>
          </div>
        )}

        {/* Duration */}
        {item.durationMinutes && (
          <div className="flex items-center gap-3 text-lg">
            <span className="text-gray-500">Duration:</span>
            <span className="text-white font-medium">{item.durationMinutes} min</span>
          </div>
        )}
      </div>

      {/* Content */}
      {item.content && (
        <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
          <p className="text-gray-300 whitespace-pre-wrap">{item.content}</p>
        </div>
      )}

      {/* Internal Notes - prominently displayed in Preach Mode */}
      {item.notes && (
        <div className="p-4 bg-amber-900/30 border border-amber-700/50 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 text-lg">📝</span>
            <div>
              <p className="text-sm font-medium text-amber-400 mb-1">Notes:</p>
              <p className="text-amber-200 whitespace-pre-wrap">{item.notes}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
