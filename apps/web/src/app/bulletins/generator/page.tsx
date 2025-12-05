'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import Link from 'next/link';

export default function BulletinGeneratorPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  // ============================================================================
  // STATE
  // ============================================================================

  // Form state
  const [serviceDate, setServiceDate] = useState(() => {
    // Default to next Sunday
    const today = new Date();
    const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    return nextSunday.toISOString().split('T')[0];
  });
  const [serviceLabel, setServiceLabel] = useState('Sunday Morning');

  // EXPLICIT: Track whether user has requested suggestions
  const [hasRequestedSuggestions, setHasRequestedSuggestions] = useState(false);

  // Template state
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);

  // Selection state
  const [selectedSermonId, setSelectedSermonId] = useState<string | null>(null);
  const [selectedAnnouncementIds, setSelectedAnnouncementIds] = useState<Set<string>>(new Set());
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());

  // Error state for mutation
  const [mutationError, setMutationError] = useState<string | null>(null);

  // ============================================================================
  // DERIVED VALUES
  // ============================================================================

  // Build the ISO date for the API
  // IMPORTANT: Parse as local date to avoid timezone issues
  const serviceDateISO = useMemo(() => {
    if (!serviceDate) return null;
    try {
      // Parse YYYY-MM-DD as local date, then convert to ISO
      const [year, month, day] = serviceDate.split('-').map(Number);
      const localDate = new Date(year, month - 1, day, 10, 0, 0); // 10am local
      return localDate.toISOString();
    } catch {
      return null;
    }
  }, [serviceDate]);

  // ============================================================================
  // QUERIES
  // ============================================================================

  // Suggestions query - disabled for now as it requires an existing bulletinId
  // TODO: This page needs redesign - either create bulletin first then get suggestions,
  // or use a different API endpoint for pre-creation suggestions
  const {
    data: suggestions,
    isLoading,
    isFetching,
    isError,
    error: queryError,
  } = trpc.bulletins.getGeneratorSuggestions.useQuery(
    // Using a placeholder - this query will be disabled anyway
    { bulletinId: '00000000-0000-0000-0000-000000000000' },
    {
      // DISABLED: This API requires an existing bulletinId but this page creates new bulletins
      enabled: false,
      retry: false,
    }
  );

  // Derived loading state - true when actively fetching
  const isLoadingSuggestions = hasRequestedSuggestions && (isLoading || isFetching);

  // Log errors to console
  if (isError && queryError) {
    console.error('[BULLETIN GENERATOR] Query error:', queryError);
  }

  // Fetch org branding for preview
  const { data: orgBranding } = trpc.org.getBranding.useQuery();

  // Fetch service templates
  const { data: templates } = trpc.bulletins.getServiceTemplates.useQuery();

  // ============================================================================
  // MUTATIONS
  // ============================================================================
  // Two ways to create a bulletin:
  // 1. generateFromContent - Builds a fresh bulletin from template + selected content
  // 2. createFromPrevious - Clones the most recent previous bulletin (same template)
  // ============================================================================

  // Create bulletin mutation - uses the simple create API
  // TODO: Template selection and content pre-population require additional API support
  const generateMutation = trpc.bulletins.create.useMutation({
    onSuccess: (data) => {
      utils.bulletins.list.invalidate(); // Refresh the bulletins list
      router.push(`/bulletins/${data.id}`);
    },
    onError: (err) => {
      setMutationError(err.message);
    },
  });

  // Duplicate from previous bulletin mutation
  // Uses createFromPrevious but requires a previousBulletinId
  const duplicateMutation = trpc.bulletins.createFromPrevious.useMutation({
    onSuccess: (data) => {
      utils.bulletins.list.invalidate(); // Refresh the bulletins list
      router.push(`/bulletins/${data.id}`);
    },
    onError: (err) => {
      setMutationError(err.message);
    },
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleLoadSuggestions = () => {
    console.log('[BULLETIN GENERATOR] Load Suggestions clicked', {
      serviceDate,
      serviceDateISO,
    });

    if (!serviceDateISO) {
      console.warn('[BULLETIN GENERATOR] No serviceDateISO set, cannot load suggestions');
      return;
    }

    // Just flip the flag - React Query will run automatically
    setHasRequestedSuggestions(true);
  };

  const handleDateChange = (newDate: string) => {
    setServiceDate(newDate);
    // Reset suggestions state when date changes
    setHasRequestedSuggestions(false);
    setSelectedSermonId(null);
    setSelectedAnnouncementIds(new Set());
    setSelectedEventIds(new Set());
  };

  const handleToggleAnnouncement = (id: string) => {
    setSelectedAnnouncementIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleEvent = (id: string) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleGenerate = () => {
    if (!serviceDateISO) return;
    setMutationError(null);
    // Using simple create API - template and content selection not yet supported
    generateMutation.mutate({
      serviceDate: serviceDateISO,
    });
  };

  const handleDuplicateFromPrevious = () => {
    if (!serviceDateISO) return;
    setMutationError(null);
    // TODO: Need to fetch most recent bulletinId first and use it here
    // For now, this feature is disabled - show error message
    setMutationError('Duplicate from previous feature requires selecting a previous bulletin first.');
  };

  // ============================================================================
  // FORMAT HELPERS
  // ============================================================================

  // IMPORTANT: Do NOT use `new Date('YYYY-MM-DD')` directly!
  // JS parses that as midnight UTC, which shows as the previous day in US timezones.
  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatEventDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatEventTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // ============================================================================
  // BUILD SUGGESTIONS UI - EXPLICIT 4-WAY BRANCH
  // ============================================================================

  let suggestionsContent: React.ReactNode = null;

  if (!hasRequestedSuggestions) {
    // STATE 1: User hasn't clicked "Load Suggestions" yet
    suggestionsContent = (
      <Card variant="outlined" className="bg-gray-50">
        <CardContent className="py-12 text-center">
          <p className="text-gray-500 text-lg">
            Click &quot;Load Suggestions&quot; above to fetch sermons, announcements, and events.
          </p>
        </CardContent>
      </Card>
    );
  } else if (isLoadingSuggestions) {
    // STATE 2: Query is actively loading
    suggestionsContent = (
      <Card variant="outlined" className="bg-gray-50">
        <CardContent className="py-12 text-center">
          <p className="text-gray-500 text-lg">Loading suggestions...</p>
        </CardContent>
      </Card>
    );
  } else if (isError) {
    // STATE 3: Query failed
    suggestionsContent = (
      <Card variant="outlined" className="bg-red-50 border-red-200">
        <CardContent className="py-12 text-center">
          <p className="text-red-600 text-lg">
            Failed to load suggestions. Please check the API logs for details.
          </p>
          <p className="text-red-500 text-sm mt-2">
            {queryError?.message || 'Unknown error'}
          </p>
        </CardContent>
      </Card>
    );
  } else {
    // STATE 4: Query succeeded - render the lists
    const sermons = suggestions?.sermons ?? [];
    const announcements = suggestions?.announcements ?? [];
    const events = suggestions?.events ?? [];

    suggestionsContent = (
      <div className="space-y-6">
        {/* Sermons Section */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>This Week&apos;s Sermon</CardTitle>
            <CardDescription>
              Select the sermon for this service (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sermons.length === 0 ? (
              <p className="text-gray-500">No sermons found near this date. You can add one later.</p>
            ) : (
              <div className="space-y-2">
                {sermons.map((sermon) => (
                  <label
                    key={sermon.id}
                    className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedSermonId === sermon.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="sermon"
                        value={sermon.id}
                        checked={selectedSermonId === sermon.id}
                        onChange={() => setSelectedSermonId(sermon.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{sermon.title}</p>
                        {sermon.preacher && (
                          <p className="text-sm text-gray-600">{sermon.preacher}</p>
                        )}
                        {sermon.primaryScripture && (
                          <p className="text-sm text-gray-500">{sermon.primaryScripture}</p>
                        )}
                        {sermon.seriesTitle && (
                          <p className="text-xs text-primary-600 mt-1">
                            Series: {sermon.seriesTitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
                {selectedSermonId && (
                  <button
                    type="button"
                    onClick={() => setSelectedSermonId(null)}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Announcements Section */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
            <CardDescription>
              Select announcements to include ({selectedAnnouncementIds.size} selected)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <p className="text-gray-500">No active announcements found.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {announcements.map((announcement) => (
                  <label
                    key={announcement.id}
                    className={`block p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedAnnouncementIds.has(announcement.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedAnnouncementIds.has(announcement.id)}
                        onChange={() => handleToggleAnnouncement(announcement.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{announcement.title}</p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              announcement.priority === 'high'
                                ? 'bg-red-100 text-red-800'
                                : announcement.priority === 'normal'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {announcement.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{announcement.body}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Events Section */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>
              Select events to feature ({selectedEventIds.size} selected)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-gray-500">No upcoming events in this date range.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {events.map((event) => (
                  <label
                    key={event.id}
                    className={`block p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedEventIds.has(event.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedEventIds.has(event.id)}
                        onChange={() => handleToggleEvent(event.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-gray-600">
                          {formatEventDate(event.startAt)}
                          {!event.allDay && ` at ${formatEventTime(event.startAt)}`}
                        </p>
                        {event.locationName && (
                          <p className="text-xs text-gray-500">{event.locationName}</p>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // GET SELECTED ITEMS FOR PREVIEW
  // ============================================================================

  const selectedSermon = suggestions?.sermons?.find((s) => s.id === selectedSermonId);
  const selectedAnnouncements = suggestions?.announcements?.filter((a) =>
    selectedAnnouncementIds.has(a.id)
  ) ?? [];
  const selectedEvents = suggestions?.events?.filter((e) =>
    selectedEventIds.has(e.id)
  ) ?? [];

  // Get selected template for preview
  const selectedTemplate = selectedTemplateKey
    ? templates?.find((t) => t.key === selectedTemplateKey)
    : null;

  const canGenerate = !!serviceDate && !!serviceLabel;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ProtectedPage requiredRoles={['admin', 'editor']}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Bulletin Generator</h1>
              <p className="text-lg text-gray-600">
                Create a new bulletin from existing content
              </p>
            </div>
            <Link href="/bulletins">
              <Button variant="secondary" size="lg">
                Back to Bulletins
              </Button>
            </Link>
          </div>
        </div>

        {/* Error message from mutation */}
        {mutationError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{mutationError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Controls and Selections */}
          <div className="space-y-6">
            {/* Service Details */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Service Details</CardTitle>
                <CardDescription>
                  Set the date and label for this bulletin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="date"
                    label="Service Date"
                    value={serviceDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                  />
                  <Input
                    label="Service Label"
                    value={serviceLabel}
                    onChange={(e) => setServiceLabel(e.target.value)}
                    placeholder="e.g., Sunday Morning"
                  />
                </div>

                {/* Service Template Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Template (optional)
                  </label>
                  <select
                    value={selectedTemplateKey || ''}
                    onChange={(e) => setSelectedTemplateKey(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">No template - blank service order</option>
                    {templates?.map((template) => (
                      <option key={template.key} value={template.key}>
                        {template.name} ({template.sectionCount} sections)
                      </option>
                    ))}
                  </select>
                  {selectedTemplateKey && templates && (
                    <p className="text-xs text-gray-500 mt-1">
                      {templates.find((t) => t.key === selectedTemplateKey)?.description}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={handleLoadSuggestions}
                    disabled={isLoadingSuggestions || !serviceDateISO}
                    className="flex-1"
                  >
                    {isLoadingSuggestions ? 'Loading...' : 'Load Suggestions'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDuplicateFromPrevious}
                    disabled={duplicateMutation.isLoading || !serviceDateISO}
                    className="flex-1"
                    title="Copy service items from the most recent previous bulletin"
                  >
                    {duplicateMutation.isLoading ? 'Copying...' : 'Start from Last Week'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  <strong>Load Suggestions:</strong> Pick content to build a fresh bulletin.{' '}
                  <strong>Start from Last Week:</strong> Copy all items from the previous bulletin.
                </p>
              </CardContent>
            </Card>

            {/* Suggestions Content - uses the 4-way branch */}
            {suggestionsContent}
          </div>

          {/* Right Column: Preview */}
          <div className="space-y-6">
            <Card variant="elevated" className="sticky top-4">
              <CardHeader>
                <CardTitle>Bulletin Preview</CardTitle>
                <CardDescription>
                  Preview of content that will be generated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-6 min-h-[400px]">
                  {/* Header */}
                  <div className="text-center mb-6 pb-4 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {serviceLabel}
                    </h2>
                    <p className="text-lg text-gray-600">
                      {formatDate(serviceDate)}
                    </p>
                    {orgBranding?.legalName && (
                      <p className="text-sm text-gray-500 mt-1">
                        {orgBranding.legalName}
                      </p>
                    )}
                    {selectedTemplate && (
                      <p className="text-xs text-primary-600 mt-2">
                        Template: {selectedTemplate.name}
                      </p>
                    )}
                  </div>

                  {/* Service Order - Template Sections */}
                  {selectedTemplate && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Order of Service
                      </h3>
                      <ol className="space-y-1">
                        {selectedTemplate.sections.map((section, idx) => (
                          <li
                            key={section.id}
                            className={`flex items-center gap-2 py-1 px-2 rounded text-sm ${
                              section.type === 'sermon' && selectedSermon
                                ? 'bg-primary-50 text-primary-700 font-medium'
                                : 'text-gray-600'
                            }`}
                          >
                            <span className="text-xs text-gray-400 w-4">{idx + 1}.</span>
                            <span className="flex-1">{section.label}</span>
                            {section.type === 'sermon' && selectedSermon && (
                              <span className="text-xs text-primary-500">
                                &ldquo;{selectedSermon.title}&rdquo;
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Sermon Section (shown when no template selected) */}
                  {selectedSermon && !selectedTemplate && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Message
                      </h3>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <p className="font-bold text-lg">{selectedSermon.title}</p>
                        {selectedSermon.preacher && (
                          <p className="text-gray-600">{selectedSermon.preacher}</p>
                        )}
                        {selectedSermon.primaryScripture && (
                          <p className="text-primary-600 text-sm mt-1">
                            {selectedSermon.primaryScripture}
                          </p>
                        )}
                        {selectedSermon.seriesTitle && (
                          <p className="text-xs text-gray-500 mt-2">
                            Part of the &ldquo;{selectedSermon.seriesTitle}&rdquo; series
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Announcements Section */}
                  {selectedAnnouncements.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Announcements
                      </h3>
                      <ul className="space-y-2">
                        {selectedAnnouncements.map((ann) => (
                          <li key={ann.id} className="bg-white rounded-lg p-3 shadow-sm">
                            <p className="font-medium text-sm">{ann.title}</p>
                            <p className="text-xs text-gray-600 line-clamp-2">{ann.body}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Events Section */}
                  {selectedEvents.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        This Week at {orgBranding?.legalName || 'Church'}
                      </h3>
                      <ul className="space-y-2">
                        {selectedEvents.map((event) => (
                          <li key={event.id} className="bg-white rounded-lg p-3 shadow-sm flex justify-between items-center">
                            <span className="font-medium text-sm">{event.title}</span>
                            <span className="text-xs text-gray-500">
                              {formatEventDate(event.startAt)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Empty state for preview */}
                  {!selectedTemplate && !selectedSermon && selectedAnnouncements.length === 0 && selectedEvents.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      {!hasRequestedSuggestions ? (
                        <p>Select a template or click &quot;Load Suggestions&quot; to see available content.</p>
                      ) : isLoadingSuggestions ? (
                        <p>Loading suggestions...</p>
                      ) : isError ? (
                        <p>Failed to load suggestions.</p>
                      ) : (
                        <p>Select a template, sermon, announcements, or events to see them in the preview.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Generate Button */}
                <div className="mt-6">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={handleGenerate}
                    disabled={!canGenerate || generateMutation.isLoading}
                  >
                    {generateMutation.isLoading ? 'Creating Bulletin...' : 'Create Bulletin'}
                  </Button>
                  <p className="text-sm text-gray-500 text-center mt-2">
                    You&apos;ll be redirected to edit the bulletin after creation
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
