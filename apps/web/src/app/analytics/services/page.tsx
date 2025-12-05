'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import Link from 'next/link';

// ============================================================================
// Helper Functions
// ============================================================================

// Format minutes to display string
function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0 min';
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins} min`;
}

// Format delta with +/- indicator
function formatDelta(minutes: number): string {
  if (minutes === 0) return 'On time';
  const prefix = minutes > 0 ? '+' : '';
  return `${prefix}${formatMinutes(minutes)}`;
}

// Get color class for difference
function getDeltaColor(minutes: number): string {
  if (minutes === 0) return 'text-gray-500';
  if (minutes > 5) return 'text-red-500';
  if (minutes > 0) return 'text-amber-500';
  return 'text-green-500';
}

// Get badge color class
function getDeltaBadgeClass(minutes: number): string {
  if (minutes === 0) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  if (minutes > 5) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (minutes > 0) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
}

// Format date for display
function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}


// ============================================================================
// Types
// ============================================================================

type FilterType = 'preacher' | 'series' | 'serviceSlot';
type DetailView = { type: FilterType; id: string; name: string } | null;

// ============================================================================
// Component
// ============================================================================

export default function ServiceAnalyticsPage() {
  // Date range state - default to last 90 days
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Filter states
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const [selectedPreacher, setSelectedPreacher] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');

  // Detail view state
  const [detailView, setDetailView] = useState<DetailView>(null);

  // Common input for all queries
  const filterInput = useMemo(() => ({
    from: dateFrom,
    to: dateTo,
    seriesId: selectedSeries || undefined,
    preacherId: selectedPreacher || undefined,
    serviceSlot: selectedSlot || undefined,
  }), [dateFrom, dateTo, selectedSeries, selectedPreacher, selectedSlot]);

  // Fetch dropdown options
  const { data: preachersData } = trpc.analytics.getPreachers.useQuery();
  const { data: seriesData } = trpc.analytics.getSeries.useQuery();
  const { data: slotsData } = trpc.analytics.getServiceSlots.useQuery();

  // Fetch overview stats
  const { data: overview, isLoading: overviewLoading } = trpc.analytics.getOverview.useQuery(filterInput);

  // Fetch stats by category (these respect filters but exclude their own category)
  const { data: preacherStats, isLoading: preacherLoading } = trpc.analytics.getPreacherStats.useQuery({
    from: filterInput.from,
    to: filterInput.to,
    seriesId: filterInput.seriesId,
    serviceSlot: filterInput.serviceSlot,
  });

  const { data: seriesStats, isLoading: seriesLoading } = trpc.analytics.getSeriesStats.useQuery({
    from: filterInput.from,
    to: filterInput.to,
    preacherId: filterInput.preacherId,
    serviceSlot: filterInput.serviceSlot,
  });

  const { data: slotStats, isLoading: slotLoading } = trpc.analytics.getServiceTimeStats.useQuery({
    from: filterInput.from,
    to: filterInput.to,
    seriesId: filterInput.seriesId,
    preacherId: filterInput.preacherId,
  });

  // Fetch detail for selected row
  const { data: detailData, isLoading: detailLoading } = trpc.analytics.getDetailForFilter.useQuery(
    {
      type: detailView?.type || 'preacher',
      idOrKey: detailView?.id || '',
      from: dateFrom,
      to: dateTo,
    },
    { enabled: !!detailView }
  );

  const isLoading = overviewLoading;

  // Clear filters
  const clearFilters = () => {
    setSelectedSeries('');
    setSelectedPreacher('');
    setSelectedSlot('');
  };

  const hasFilters = selectedSeries || selectedPreacher || selectedSlot;

  return (
    <ProtectedPage requiredRoles={['admin', 'editor']}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Service Analytics</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Analyze timing trends across services, preachers, and series
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Filters Bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Date Range */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">From:</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">To:</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block" />

              {/* Series Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Series:</label>
                <select
                  value={selectedSeries}
                  onChange={(e) => setSelectedSeries(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent min-w-[140px]"
                >
                  <option value="">All Series</option>
                  {seriesData?.series.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Preacher Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Preacher:</label>
                <select
                  value={selectedPreacher}
                  onChange={(e) => setSelectedPreacher(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent min-w-[140px]"
                >
                  <option value="">All Preachers</option>
                  {preachersData?.preachers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Service Slot Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Service:</label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent min-w-[120px]"
                >
                  <option value="">All Times</option>
                  {slotsData?.serviceSlots.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
            </div>
          ) : overview?.sessionsCount === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Analytics Data</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                No completed Preach Mode sessions found for the selected date range.
                Use Preach Mode during services to record timing data.
              </p>
              <Link
                href="/bulletins"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                View Bulletins
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Sessions</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview?.sessionsCount}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Avg Planned</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatMinutes(overview?.avgPlannedMinutes || 0)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Avg Actual</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatMinutes(overview?.avgActualMinutes || 0)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      (overview?.avgDeltaMinutes || 0) > 0
                        ? 'bg-amber-100 dark:bg-amber-900/30'
                        : 'bg-green-100 dark:bg-green-900/30'
                    }`}>
                      <svg className={`w-5 h-5 ${
                        (overview?.avgDeltaMinutes || 0) > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-green-600 dark:text-green-400'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Avg Delta</p>
                      <p className={`text-2xl font-bold ${getDeltaColor(overview?.avgDeltaMinutes || 0)}`}>
                        {formatDelta(overview?.avgDeltaMinutes || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Preacher Stats */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="font-semibold text-gray-900 dark:text-white">By Preacher</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Click a row for details</p>
                  </div>
                  {preacherLoading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent mx-auto"></div>
                    </div>
                  ) : preacherStats?.preachers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                      No preacher data available
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-auto">
                      {preacherStats?.preachers.map((p) => (
                        <button
                          key={p.preacherId}
                          onClick={() => setDetailView({ type: 'preacher', id: p.preacherId, name: p.preacherName })}
                          className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                            detailView?.type === 'preacher' && detailView?.id === p.preacherId
                              ? 'bg-primary-50 dark:bg-primary-900/20'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{p.preacherName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{p.sessionsCount} sessions</p>
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${getDeltaBadgeClass(p.avgDeltaMinutes)}`}>
                              {formatDelta(p.avgDeltaMinutes)}
                            </span>
                          </div>
                          <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>Plan: {formatMinutes(p.avgPlannedMinutes)}</span>
                            <span>Actual: {formatMinutes(p.avgActualMinutes)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Series Stats */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="font-semibold text-gray-900 dark:text-white">By Series</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Click a row for details</p>
                  </div>
                  {seriesLoading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent mx-auto"></div>
                    </div>
                  ) : seriesStats?.series.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                      No series data available
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-auto">
                      {seriesStats?.series.map((s) => (
                        <button
                          key={s.seriesId}
                          onClick={() => setDetailView({ type: 'series', id: s.seriesId, name: s.seriesName })}
                          className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                            detailView?.type === 'series' && detailView?.id === s.seriesId
                              ? 'bg-primary-50 dark:bg-primary-900/20'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{s.seriesName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{s.sessionsCount} sessions</p>
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${getDeltaBadgeClass(s.avgDeltaMinutes)}`}>
                              {formatDelta(s.avgDeltaMinutes)}
                            </span>
                          </div>
                          <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>Plan: {formatMinutes(s.avgPlannedMinutes)}</span>
                            <span>Actual: {formatMinutes(s.avgActualMinutes)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Service Slot Stats */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="font-semibold text-gray-900 dark:text-white">By Service Time</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Click a row for details</p>
                  </div>
                  {slotLoading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent mx-auto"></div>
                    </div>
                  ) : slotStats?.serviceSlots.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                      No service time data available
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-auto">
                      {slotStats?.serviceSlots.map((s) => (
                        <button
                          key={s.serviceSlot}
                          onClick={() => setDetailView({ type: 'serviceSlot', id: s.serviceSlot, name: s.serviceSlot })}
                          className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                            detailView?.type === 'serviceSlot' && detailView?.id === s.serviceSlot
                              ? 'bg-primary-50 dark:bg-primary-900/20'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{s.serviceSlot} Service</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{s.sessionsCount} sessions</p>
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${getDeltaBadgeClass(s.avgDeltaMinutes)}`}>
                              {formatDelta(s.avgDeltaMinutes)}
                            </span>
                          </div>
                          <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>Plan: {formatMinutes(s.avgPlannedMinutes)}</span>
                            <span>Actual: {formatMinutes(s.avgActualMinutes)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Detail View */}
              {detailView && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-gray-900 dark:text-white">
                        Sessions: {detailView.name}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {detailView.type === 'preacher' && 'Preacher'}
                        {detailView.type === 'series' && 'Series'}
                        {detailView.type === 'serviceSlot' && 'Service Time'}
                      </p>
                    </div>
                    <button
                      onClick={() => setDetailView(null)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {detailLoading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent mx-auto"></div>
                    </div>
                  ) : detailData?.sessions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                      No sessions found
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Series / Sermon</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Preacher</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Planned</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actual</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Delta</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {detailData?.sessions.map((session) => (
                            <tr key={session.sessionId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                {formatDate(session.issueDate)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                {session.serviceSlot}
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  {session.seriesName && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{session.seriesName}</p>
                                  )}
                                  <p className="text-sm text-gray-900 dark:text-white">
                                    {session.sermonTitle || '—'}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                {session.preacher || '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-300">
                                {formatMinutes(session.plannedMinutes)}
                              </td>
                              <td className="px-4 py-3 text-sm text-center font-medium text-gray-900 dark:text-white">
                                {formatMinutes(session.actualMinutes)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-sm font-medium ${getDeltaColor(session.deltaMinutes)}`}>
                                  {formatDelta(session.deltaMinutes)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Link
                                  href={`/bulletins/${session.bulletinIssueId}/analytics`}
                                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium"
                                >
                                  View Details
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedPage>
  );
}
