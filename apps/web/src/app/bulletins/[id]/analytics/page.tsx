'use client';

import { useState } from 'react';
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

// Format seconds to MM:SS
function formatDuration(seconds: number): string {
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.abs(seconds) % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format difference with +/- indicator
function formatDifference(seconds: number): string {
  if (seconds === 0) return '—';
  const prefix = seconds > 0 ? '+' : '-';
  return `${prefix}${formatDuration(Math.abs(seconds))}`;
}

// Get color class for difference
function getDifferenceColor(seconds: number): string {
  if (seconds === 0) return 'text-gray-400';
  if (seconds > 0) return 'text-amber-400';
  return 'text-green-400';
}

export default function AnalyticsPage() {
  const params = useParams();
  const bulletinId = params.id as string;

  // Selected session for detail view
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Fetch bulletin data
  const { data: bulletin, isLoading: bulletinLoading } = trpc.bulletins.get.useQuery({
    id: bulletinId,
  });

  // Fetch sessions list
  const { data: sessionsData, isLoading: sessionsLoading } = trpc.preach.listSessions.useQuery(
    { bulletinIssueId: bulletinId },
    { enabled: !!bulletinId }
  );

  // Fetch selected session summary
  const { data: sessionSummary, isLoading: summaryLoading } = trpc.preach.getSessionSummary.useQuery(
    { sessionId: selectedSessionId! },
    { enabled: !!selectedSessionId }
  );

  // Auto-select first session if none selected
  const sessions = sessionsData?.sessions || [];
  const effectiveSessionId = selectedSessionId || sessions[0]?.id;

  // Fetch session summary for auto-selected session
  const { data: autoSessionSummary, isLoading: autoSummaryLoading } = trpc.preach.getSessionSummary.useQuery(
    { sessionId: effectiveSessionId! },
    { enabled: !!effectiveSessionId && !selectedSessionId }
  );

  const activeSummary = selectedSessionId ? sessionSummary : autoSessionSummary;
  const isLoadingSummary = selectedSessionId ? summaryLoading : autoSummaryLoading;

  const isLoading = bulletinLoading || sessionsLoading;

  // Format session date/time
  const formatSessionTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor', 'submitter', 'viewer']}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  // No bulletin found
  if (!bulletin) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor', 'submitter', 'viewer']}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">Bulletin not found</p>
            <Link href="/bulletins" className="text-primary-600 hover:underline">
              Back to Bulletins
            </Link>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  const serviceDate = new Date(bulletin.serviceDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <ProtectedPage requiredRoles={['admin', 'editor', 'submitter', 'viewer']}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href={`/bulletins/${bulletinId}`}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Service Timing Analytics</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{serviceDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/analytics/services"
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  All Services
                </Link>
                <Link
                  href={`/bulletins/${bulletinId}/preach`}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Open Preach Mode
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {sessions.length === 0 ? (
            // No sessions state
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Timing Data Yet</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Start Preach Mode and run through your service to record timing data.
                Each session creates a separate record for analysis.
              </p>
              <Link
                href={`/bulletins/${bulletinId}/preach`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Preach Mode
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sessions List */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="font-semibold text-gray-900 dark:text-white">Sessions</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{sessions.length} recorded</p>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[calc(100vh-300px)] overflow-auto">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedSessionId(session.id)}
                        className={`w-full text-left p-4 transition-colors ${
                          (selectedSessionId || sessions[0]?.id) === session.id
                            ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {formatSessionTime(session.startedAt)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {session.totalItems} items
                          </span>
                          {session.totalActualSeconds && (
                            <>
                              <span className="text-gray-300 dark:text-gray-600">•</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDuration(session.totalActualSeconds)} actual
                              </span>
                            </>
                          )}
                        </div>
                        {!session.endedAt && (
                          <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                            In Progress
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Session Detail */}
              <div className="lg:col-span-3">
                {isLoadingSummary ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading session data...</p>
                  </div>
                ) : activeSummary ? (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Planned Duration</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {activeSummary.totals.plannedMinutes} min
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Actual Duration</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {formatDuration(activeSummary.totals.actualSeconds)}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Difference</p>
                        <p className={`text-2xl font-bold mt-1 ${getDifferenceColor(activeSummary.totals.differenceSeconds)}`}>
                          {formatDifference(activeSummary.totals.differenceSeconds)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {activeSummary.totals.differenceSeconds > 0 ? 'Over time' : activeSummary.totals.differenceSeconds < 0 ? 'Under time' : 'On time'}
                        </p>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Item Timing Breakdown</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {activeSummary.items.length} items with timing data
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                #
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Item
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Planned
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Actual
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Diff
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {activeSummary.items.map((item, index) => (
                              <tr key={item.serviceItemId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                  {item.sequence || index + 1}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{TYPE_ICONS[item.type] || '📋'}</span>
                                    <div>
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {item.title || item.type}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.type}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-sm text-gray-600 dark:text-gray-300">
                                    {item.plannedDurationMinutes ? `${item.plannedDurationMinutes}:00` : '—'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {item.actualDurationSeconds ? formatDuration(item.actualDurationSeconds) : '—'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`text-sm font-medium ${getDifferenceColor(item.difference)}`}>
                                    {item.actualDurationSeconds && item.plannedDurationMinutes
                                      ? formatDifference(item.difference)
                                      : '—'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50 dark:bg-gray-700/50 font-medium">
                            <tr>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white" colSpan={2}>
                                Total
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                                {activeSummary.totals.plannedMinutes}:00
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                                {formatDuration(activeSummary.totals.actualSeconds)}
                              </td>
                              <td className={`px-4 py-3 text-center text-sm ${getDifferenceColor(activeSummary.totals.differenceSeconds)}`}>
                                {formatDifference(activeSummary.totals.differenceSeconds)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Session Metadata */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Session Details</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Started</p>
                          <p className="text-gray-900 dark:text-white">
                            {formatSessionTime(activeSummary.session.startedAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Ended</p>
                          <p className="text-gray-900 dark:text-white">
                            {activeSummary.session.endedAt
                              ? formatSessionTime(activeSummary.session.endedAt)
                              : 'In progress'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Session Duration</p>
                          <p className="text-gray-900 dark:text-white">
                            {activeSummary.session.durationSeconds
                              ? formatDuration(activeSummary.session.durationSeconds)
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Items Timed</p>
                          <p className="text-gray-900 dark:text-white">
                            {activeSummary.items.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <p className="text-gray-500 dark:text-gray-400">Select a session to view details</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedPage>
  );
}
