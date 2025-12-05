'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import Link from 'next/link';

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

export default function MobilePreachModePage() {
  const params = useParams();
  const bulletinId = params.id as string;

  // Core navigation state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(1);
  const [showItemList, setShowItemList] = useState(false);

  // Resilience state - stable local copy of items after initial load
  const [stableItems, setStableItems] = useState<ServiceItem[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('ok');
  const [hasChanges, setHasChanges] = useState(false);
  const [changesBannerDismissed, setChangesBannerDismissed] = useState(false);
  const lastUpdatedAtRef = useRef<string | null>(null);
  const initialLoadCompleteRef = useRef(false);

  // Fetch bulletin data
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
      refetchInterval: isLocked ? false : 60000, // 60s for unlocked
      refetchOnWindowFocus: false,
      retry: 1,
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
      if (bulletin?.updatedAt) {
        lastUpdatedAtRef.current = bulletin.updatedAt.toString();
      }
    }
  }, [apiItems, bulletin?.updatedAt]);

  // Change detection for unlocked bulletins
  useEffect(() => {
    if (!isLocked && initialLoadCompleteRef.current && !isRefetching) {
      const currentUpdatedAt = bulletin?.updatedAt?.toString() || null;
      if (lastUpdatedAtRef.current && currentUpdatedAt &&
          lastUpdatedAtRef.current !== currentUpdatedAt) {
        setHasChanges(true);
      }
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

  const nextItem = items[currentIndex + 1];

  // Navigation functions
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

  // Handle reload after changes detected
  const handleReloadChanges = useCallback(() => {
    const currentItemId = items[currentIndex]?.id;
    setStableItems(apiItems);
    setHasChanges(false);
    setChangesBannerDismissed(false);
    lastUpdatedAtRef.current = bulletin?.updatedAt?.toString() || null;

    if (currentItemId) {
      const newIndex = apiItems.findIndex(item => item.id === currentItemId);
      if (newIndex >= 0) {
        setCurrentIndex(newIndex);
      } else {
        setCurrentIndex(Math.min(currentIndex, apiItems.length - 1));
      }
    }
    setCurrentSlideIndex(1);
  }, [apiItems, bulletin?.updatedAt, currentIndex, items]);

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
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
            <p className="text-lg text-white">Loading service...</p>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  // Initial error state with retry
  if (hasInitialError) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor', 'submitter', 'viewer']}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="text-center text-white">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-xl font-semibold mb-2">Unable to Load Service</p>
            <p className="text-gray-400 text-sm mb-6">
              {bulletinError?.message || itemsError?.message || 'Could not connect to server'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  refetchBulletin();
                  refetchItems();
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg active:scale-95 transition-transform font-medium"
              >
                Retry
              </button>
              <Link
                href="/bulletins"
                className="px-4 py-2 bg-gray-700 text-white rounded-lg active:scale-95 transition-transform font-medium"
              >
                Back
              </Link>
            </div>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  // Bulletin not found
  if (!bulletin) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor', 'submitter', 'viewer']}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="text-center text-white">
            <p className="text-lg mb-4">Bulletin not found</p>
            <Link href="/bulletins" className="text-primary-400 hover:underline">
              Back to Bulletins
            </Link>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  if (items.length === 0) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor', 'submitter', 'viewer']}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="text-center text-white">
            <p className="text-lg mb-4">No service items found</p>
            <p className="text-gray-400 mb-6">Add items to the service order first</p>
            <Link
              href={`/bulletins/${bulletinId}`}
              className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const icon = TYPE_ICONS[currentItem?.type] || '📋';
  const sectionIcon = currentItem?.section ? SECTION_ICONS[currentItem.section] : null;

  return (
    <ProtectedPage requiredRoles={['admin', 'editor', 'submitter', 'viewer']}>
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        {/* Connection/Changes Banner Area */}
        {connectionStatus === 'error' && (
          <div className="bg-amber-900/80 border-b border-amber-700 px-3 py-1.5 flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-amber-200 text-xs font-medium">Offline - using cached data</span>
          </div>
        )}
        {hasChanges && !changesBannerDismissed && (
          <div className="bg-blue-900/80 border-b border-blue-700 px-3 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-blue-200 text-xs font-medium">Updated</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReloadChanges}
                className="px-2 py-0.5 bg-blue-700 text-white text-xs rounded active:scale-95"
              >
                Reload
              </button>
              <button
                onClick={() => setChangesBannerDismissed(true)}
                className="p-0.5 text-blue-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Compact Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link
              href={`/bulletins/${bulletinId}/preach`}
              className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
              title="Back to Desktop Preach Mode"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-semibold truncate">{churchName}</h1>
                {isLocked && (
                  <span className="px-1.5 py-0.5 bg-green-900/50 text-green-400 text-[10px] rounded-full border border-green-700">
                    Locked
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">{serviceDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Duration indicator - compact */}
            {totalPlannedMinutes > 0 && (
              <span className="text-[10px] text-gray-400 bg-gray-700/50 px-1.5 py-0.5 rounded">
                {plannedThroughCurrent}/{totalPlannedMinutes}m
              </span>
            )}
            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
              {currentIndex + 1}/{items.length}
            </span>
            <button
              onClick={() => setShowItemList(!showItemList)}
              className={`p-1.5 rounded-lg transition-colors ${
                showItemList ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
              title="Toggle item list"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden relative">
          {/* Current Item Display */}
          <div className={`h-full flex flex-col ${showItemList ? 'hidden' : ''}`}>
            {/* Current Item Card */}
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                {/* Section Badge */}
                {currentItem?.section && (
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-700 rounded-full text-xs text-gray-300">
                      {sectionIcon && <span>{sectionIcon}</span>}
                      {currentItem.section.charAt(0).toUpperCase() + currentItem.section.slice(1).replace('-', ' ')}
                    </span>
                  </div>
                )}

                {/* Type and Title */}
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-3xl">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary-400 font-medium">{currentItem?.type}</p>
                    <h2 className="text-xl font-bold text-white leading-tight">{currentItem?.title}</h2>
                  </div>
                </div>

                {/* Slide Control Panel */}
                {hasSlides && (
                  <div className="mb-4 p-3 bg-indigo-900/40 border border-indigo-700/50 rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={goToPrevSlide}
                        disabled={currentSlideIndex <= 1}
                        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                          currentSlideIndex <= 1
                            ? 'bg-gray-700 text-gray-500'
                            : 'bg-indigo-700 text-white active:scale-95'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <div className="flex-1 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-lg font-semibold text-indigo-300">
                            {currentSlideIndex} / {slidesCount}
                          </span>
                        </div>
                        <p className="text-xs text-indigo-400/70 mt-1">Slides</p>
                      </div>
                      <button
                        onClick={goToNextSlide}
                        disabled={currentSlideIndex >= slidesCount}
                        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                          currentSlideIndex >= slidesCount
                            ? 'bg-gray-700 text-gray-500'
                            : 'bg-indigo-700 text-white active:scale-95'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Details */}
                <div className="space-y-2 text-sm">
                  {currentItem?.scriptureRef && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Scripture:</span>
                      <span className="text-white font-medium">{currentItem.scriptureRef}</span>
                    </div>
                  )}
                  {currentItem?.speaker && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Speaker:</span>
                      <span className="text-white font-medium">{currentItem.speaker}</span>
                    </div>
                  )}
                  {currentItem?.artist && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Artist:</span>
                      <span className="text-white font-medium">{currentItem.artist}</span>
                    </div>
                  )}
                  {currentItem?.songHymnNumber && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Hymn #:</span>
                      <span className="text-white font-medium">{currentItem.songHymnNumber}</span>
                    </div>
                  )}
                  {currentItem?.durationMinutes && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Duration:</span>
                      <span className="text-white font-medium">{currentItem.durationMinutes} min</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                {currentItem?.content && (
                  <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{currentItem.content}</p>
                  </div>
                )}

                {/* Notes */}
                {currentItem?.notes && (
                  <div className="mt-4 p-3 bg-amber-900/30 border border-amber-700/50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-500">📝</span>
                      <div>
                        <p className="text-xs font-medium text-amber-400 mb-1">Notes:</p>
                        <p className="text-sm text-amber-200 whitespace-pre-wrap">{currentItem.notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Next Item Preview */}
              {nextItem && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">Up Next:</p>
                  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{TYPE_ICONS[nextItem.type] || '📋'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-300 truncate">{nextItem.title}</p>
                        <p className="text-xs text-gray-500">{nextItem.type}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Controls - Fixed at Bottom */}
            <div className="bg-gray-800 border-t border-gray-700 p-3">
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={goToPrev}
                  disabled={currentIndex === 0}
                  className={`flex items-center justify-center w-14 h-14 rounded-xl transition-all ${
                    currentIndex === 0
                      ? 'bg-gray-700 text-gray-500'
                      : 'bg-gray-600 text-white active:scale-95'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={goToNext}
                  disabled={currentIndex === items.length - 1}
                  className={`flex-1 max-w-[200px] flex items-center justify-center gap-2 h-14 rounded-xl text-lg font-semibold transition-all ${
                    currentIndex === items.length - 1
                      ? 'bg-gray-700 text-gray-500'
                      : 'bg-primary-600 text-white active:scale-95'
                  }`}
                >
                  Next
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Item List (fullscreen on mobile) with Section Groups */}
          {showItemList && (
            <div className="absolute inset-0 bg-gray-800 flex flex-col z-20">
              <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                <h2 className="font-semibold">Service Order</h2>
                <div className="flex items-center gap-2">
                  {totalPlannedMinutes > 0 && (
                    <span className="text-xs text-gray-400">{totalPlannedMinutes} min</span>
                  )}
                  <button
                    onClick={() => setShowItemList(false)}
                    className="p-1.5 rounded-lg bg-gray-700 text-gray-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {itemsBySection.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    {/* Section Header */}
                    {group.section && (
                      <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm px-3 py-1.5 border-b border-gray-700 flex items-center gap-2">
                        <span className="text-base">{SECTION_ICONS[group.section] || '📋'}</span>
                        <span className="text-xs font-medium text-gray-300">
                          {SECTION_NAMES[group.section] || group.section}
                        </span>
                      </div>
                    )}
                    {!group.section && groupIndex === 0 && (
                      <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm px-3 py-1.5 border-b border-gray-700">
                        <span className="text-xs font-medium text-gray-400">Service Items</span>
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
                            : 'active:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-5">{index + 1}</span>
                          <span className="text-lg">{TYPE_ICONS[item.type] || '📋'}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`truncate text-sm ${index === currentIndex ? 'text-white font-medium' : 'text-gray-300'}`}>
                              {item.title}
                            </p>
                            <p className="text-xs text-gray-500">{item.type}</p>
                          </div>
                          {item.slidesCount && item.slidesCount > 0 && (
                            <span className="text-xs text-indigo-400 flex items-center gap-0.5">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {item.slidesCount}
                            </span>
                          )}
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
      </div>
    </ProtectedPage>
  );
}
