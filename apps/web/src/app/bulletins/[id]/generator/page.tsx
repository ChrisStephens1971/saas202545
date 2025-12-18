'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import Link from 'next/link';
import type {
  BulletinViewModel,
  BulletinServiceItem,
  BulletinServiceItemChild,
  MarkerLegendItem,
  BulletinPreflightResult,
} from '@elder-first/types';

// Preflight Status Badge
function PreflightBadge({ preflight }: { preflight: BulletinPreflightResult | null | undefined }) {
  if (!preflight) {
    return (
      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
        Not validated
      </span>
    );
  }

  if (!preflight.isValid) {
    return (
      <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700" title={preflight.errors.join('\n')}>
        {preflight.errors.length} Error{preflight.errors.length !== 1 ? 's' : ''}
      </span>
    );
  }

  if (preflight.warnings.length > 0) {
    return (
      <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700" title={preflight.warnings.join('\n')}>
        {preflight.warnings.length} Warning{preflight.warnings.length !== 1 ? 's' : ''}
      </span>
    );
  }

  return (
    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
      Ready
    </span>
  );
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  description,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="text-left">
            <h3 className="font-medium text-gray-900">{title}</h3>
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </div>
        </div>
        {badge}
      </button>
      {isOpen && <div className="p-4 border-t border-gray-200">{children}</div>}
    </div>
  );
}

// Service Item Display - Enhanced for Simple Text mode
function ServiceItemDisplay({
  item,
  layoutKey,
  onUpdate,
  isLocked,
}: {
  item: BulletinServiceItem;
  layoutKey: 'classic' | 'simpleText';
  onUpdate?: (updatedItem: BulletinServiceItem) => void;
  isLocked: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [_editingChild, setEditingChild] = useState<string | null>(null);

  const typeIcons: Record<string, string> = {
    song: '🎵',
    prayer: '🙏',
    scripture: '📖',
    sermon: '📝',
    announcement: '📢',
    offering: '💰',
    other: '📋',
  };

  const handlePrintedTextChange = (text: string) => {
    if (onUpdate) {
      onUpdate({ ...item, printedText: text || undefined });
    }
  };

  const handleMarkerChange = (marker: string) => {
    if (onUpdate) {
      onUpdate({ ...item, marker: marker || undefined });
    }
  };

  const handleAddChild = () => {
    if (onUpdate) {
      const newChild: BulletinServiceItemChild = {
        id: crypto.randomUUID(),
        type: 'part',
        orderIndex: (item.children?.length || 0) + 1,
        label: '',
        leader: undefined,
        marker: undefined,
      };
      onUpdate({
        ...item,
        children: [...(item.children || []), newChild],
      });
      setEditingChild(newChild.id);
    }
  };

  const handleUpdateChild = (childId: string, updates: Partial<BulletinServiceItemChild>) => {
    if (onUpdate && item.children) {
      onUpdate({
        ...item,
        children: item.children.map((c) =>
          c.id === childId ? { ...c, ...updates } : c
        ),
      });
    }
  };

  const handleRemoveChild = (childId: string) => {
    if (onUpdate && item.children) {
      onUpdate({
        ...item,
        children: item.children.filter((c) => c.id !== childId),
      });
    }
  };

  const showSimpleTextFields = layoutKey === 'simpleText';
  const hasPrintedContent = item.printedText || item.marker || (item.children && item.children.length > 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Main item header */}
      <div className="flex items-start gap-3 p-3">
        <span className="text-xl">{typeIcons[item.type] || '📋'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{item.title}</span>
            {showSimpleTextFields && hasPrintedContent && (
              <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                liturgy
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400 capitalize">{item.type}</span>
            {item.ccliNumber && (
              <span className="text-xs text-gray-400">CCLI: {item.ccliNumber}</span>
            )}
            {item.scriptureRef && (
              <span className="text-xs text-gray-400">{item.scriptureRef}</span>
            )}
            {item.speaker && (
              <span className="text-xs text-gray-400">{item.speaker}</span>
            )}
          </div>
        </div>
        {showSimpleTextFields && !isLocked && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title={isExpanded ? 'Collapse' : 'Expand to edit liturgy'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded Simple Text editing panel */}
      {showSimpleTextFields && isExpanded && !isLocked && (
        <div className="border-t border-gray-200 p-3 bg-gray-50 space-y-4">
          {/* Marker field */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Marker (single letter/symbol for legend)
            </label>
            <input
              type="text"
              value={item.marker || ''}
              onChange={(e) => handleMarkerChange(e.target.value.slice(0, 3))}
              placeholder="e.g., * or †"
              maxLength={3}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Printed liturgy text */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Printed Liturgy Text
            </label>
            <textarea
              value={item.printedText || ''}
              onChange={(e) => handlePrintedTextChange(e.target.value)}
              placeholder="Enter the responsive reading, prayer text, or liturgy to print..."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Use blank lines to separate leader/congregation parts. This text appears in the printed bulletin.
            </p>
          </div>

          {/* Children (compound parts) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-600">
                Sub-parts (for compound items)
              </label>
              <button
                onClick={handleAddChild}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                + Add Part
              </button>
            </div>
            {item.children && item.children.length > 0 ? (
              <div className="space-y-2">
                {item.children.map((child, idx) => (
                  <div
                    key={child.id}
                    className="flex items-start gap-2 p-2 bg-white border border-gray-200 rounded"
                  >
                    <span className="text-xs text-gray-400 mt-1">{idx + 1}.</span>
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={child.label}
                        onChange={(e) => handleUpdateChild(child.id, { label: e.target.value })}
                        placeholder="Part label (e.g., 'Call to Worship')"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={child.leader || ''}
                          onChange={(e) => handleUpdateChild(child.id, { leader: e.target.value || undefined })}
                          placeholder="Leader (optional)"
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                        />
                        <input
                          type="text"
                          value={child.marker || ''}
                          onChange={(e) => handleUpdateChild(child.id, { marker: e.target.value.slice(0, 3) || undefined })}
                          placeholder="Marker"
                          maxLength={3}
                          className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveChild(child.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Remove part"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                No sub-parts. Use for compound liturgy items with multiple leaders.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Read-only display of liturgy content when collapsed but has content */}
      {showSimpleTextFields && !isExpanded && hasPrintedContent && (
        <div className="border-t border-gray-100 px-3 py-2 bg-purple-50">
          <div className="flex items-center gap-2 text-xs text-purple-700">
            {item.marker && <span className="font-mono font-bold">{item.marker}</span>}
            {item.printedText && (
              <span className="truncate">{item.printedText.slice(0, 80)}...</span>
            )}
            {item.children && item.children.length > 0 && (
              <span className="text-purple-600">({item.children.length} parts)</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Announcement Display - accepts the inline type from BulletinViewModel
function AnnouncementDisplay({ announcement }: { announcement: { id: string; title: string; body: string; priority: string; category?: string } }) {
  const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    normal: 'bg-gray-100 text-gray-700',
    low: 'bg-gray-50 text-gray-500',
  };

  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-gray-900">{announcement.title}</div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[announcement.priority] || priorityColors.normal}`}>
          {announcement.priority}
        </span>
      </div>
      <p className="text-sm text-gray-600 mt-1">{announcement.body}</p>
    </div>
  );
}

// Event Display - accepts the inline type from BulletinViewModel
function EventDisplay({ event }: { event: { id: string; title: string; date: string; time?: string; location?: string; startAt?: Date | string; description?: string; locationName?: string; allDay?: boolean } }) {
  const formatDate = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Use startAt if available, otherwise fall back to date
  const eventDate = event.startAt || event.date;

  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg">
      <div className="font-medium text-gray-900">{event.title}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-sm text-gray-600">
          {formatDate(eventDate)}
          {!event.allDay && event.startAt && ` at ${formatTime(event.startAt)}`}
        </span>
        {event.locationName && (
          <>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-600">{event.locationName}</span>
          </>
        )}
      </div>
      {event.description && (
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{event.description}</p>
      )}
    </div>
  );
}

// Marker Legend Editor Component
function MarkerLegendEditor({
  legend,
  onUpdate,
  isLocked,
}: {
  legend: MarkerLegendItem[] | null | undefined;
  onUpdate: (legend: MarkerLegendItem[] | null) => void;
  isLocked: boolean;
}) {
  const handleAddItem = () => {
    const newItem: MarkerLegendItem = {
      marker: '',
      meaning: '',
      description: '',
    };
    onUpdate([...(legend || []), newItem]);
  };

  const handleUpdateItem = (idx: number, updates: Partial<MarkerLegendItem>) => {
    if (!legend) return;
    const updated = legend.map((item, i) =>
      i === idx ? { ...item, ...updates } : item
    );
    onUpdate(updated);
  };

  const handleRemoveItem = (idx: number) => {
    if (!legend) return;
    const updated = legend.filter((_, i) => i !== idx);
    onUpdate(updated.length > 0 ? updated : null);
  };

  return (
    <div className="space-y-3">
      {legend && legend.length > 0 ? (
        <div className="space-y-2">
          {legend.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={item.marker}
                onChange={(e) => handleUpdateItem(idx, { marker: e.target.value.slice(0, 3) })}
                placeholder="*"
                maxLength={3}
                disabled={isLocked}
                className="w-12 px-2 py-1 text-sm text-center font-mono border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
              />
              <span className="text-gray-400">=</span>
              <input
                type="text"
                value={item.description}
                onChange={(e) => handleUpdateItem(idx, { description: e.target.value })}
                placeholder="Description (e.g., 'Please stand')"
                disabled={isLocked}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
              />
              {!isLocked && (
                <button
                  onClick={() => handleRemoveItem(idx)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">
          No marker legend defined. Add markers to explain symbols used in the service order.
        </p>
      )}
      {!isLocked && (
        <button
          onClick={handleAddItem}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          + Add Legend Item
        </button>
      )}
    </div>
  );
}

// 4-Page Preview Component
function BulletinPreview({ viewModel }: { viewModel: BulletinViewModel | null }) {
  if (!viewModel) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((page) => (
          <div
            key={page}
            className="aspect-[8.5/11] bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center"
          >
            <span className="text-gray-400">Page {page}</span>
          </div>
        ))}
      </div>
    );
  }

  const churchName = viewModel.churchInfo?.churchName ?? '';
  const serviceLabel = viewModel.churchInfo?.serviceLabel ?? '';
  const serviceDate = viewModel.churchInfo?.serviceDate ?? '';
  const serviceTime = viewModel.churchInfo?.serviceTime;
  const logoUrl = viewModel.churchInfo?.logoUrl;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Page 1: Cover */}
      <div className="aspect-[8.5/11] bg-white border border-gray-300 rounded-lg p-4 overflow-hidden shadow-sm">
        <div className="h-full flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            {logoUrl && (
              <div className="w-16 h-16 bg-gray-200 rounded-full mb-3 flex items-center justify-center">
                <span className="text-2xl">⛪</span>
              </div>
            )}
            <h2 className="text-lg font-bold text-gray-900">{churchName}</h2>
            <p className="text-sm text-gray-600 mt-1">{serviceLabel}</p>
            <p className="text-sm text-gray-500 mt-2">
              {serviceDate ? new Date(serviceDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }) : ''}
            </p>
            {serviceTime && (
              <p className="text-sm text-gray-500">{serviceTime}</p>
            )}
          </div>
          <div className="text-center text-xs text-gray-400">Page 1 - Cover</div>
        </div>
      </div>

      {/* Page 2: Order of Service */}
      <div className="aspect-[8.5/11] bg-white border border-gray-300 rounded-lg p-4 overflow-hidden shadow-sm">
        <div className="h-full flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 border-b pb-2 mb-2">Order of Service</h3>
          <div className="flex-1 overflow-hidden">
            <div className="space-y-1">
              {viewModel.serviceItems.slice(0, 10).map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400 w-4">{idx + 1}.</span>
                  <span className="text-gray-700 truncate">{item.title}</span>
                </div>
              ))}
              {viewModel.serviceItems.length > 10 && (
                <div className="text-xs text-gray-400 italic">
                  +{viewModel.serviceItems.length - 10} more items...
                </div>
              )}
            </div>
          </div>
          <div className="text-center text-xs text-gray-400">Page 2 - Order of Service</div>
        </div>
      </div>

      {/* Page 3: Sermon & Announcements */}
      <div className="aspect-[8.5/11] bg-white border border-gray-300 rounded-lg p-4 overflow-hidden shadow-sm">
        <div className="h-full flex flex-col">
          {viewModel.sermon && (
            <div className="mb-3">
              <h3 className="text-sm font-bold text-gray-900 border-b pb-1 mb-2">Sermon</h3>
              <div className="text-xs text-gray-700 font-medium">{viewModel.sermon.title}</div>
              {viewModel.sermon.preacher && (
                <div className="text-xs text-gray-500">{viewModel.sermon.preacher}</div>
              )}
              {viewModel.sermon.primaryScripture && (
                <div className="text-xs text-gray-500">{viewModel.sermon.primaryScripture}</div>
              )}
            </div>
          )}
          <h3 className="text-sm font-bold text-gray-900 border-b pb-1 mb-2">Announcements</h3>
          <div className="flex-1 overflow-hidden">
            <div className="space-y-1">
              {viewModel.announcements.slice(0, 4).map((ann) => (
                <div key={ann.id} className="text-xs">
                  <span className="font-medium text-gray-700">{ann.title}</span>
                </div>
              ))}
              {viewModel.announcements.length > 4 && (
                <div className="text-xs text-gray-400 italic">
                  +{viewModel.announcements.length - 4} more...
                </div>
              )}
            </div>
          </div>
          <div className="text-center text-xs text-gray-400">Page 3 - Sermon & Announcements</div>
        </div>
      </div>

      {/* Page 4: Events & Contact */}
      <div className="aspect-[8.5/11] bg-white border border-gray-300 rounded-lg p-4 overflow-hidden shadow-sm">
        <div className="h-full flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 border-b pb-1 mb-2">Upcoming Events</h3>
          <div className="flex-1 overflow-hidden">
            <div className="space-y-1 mb-3">
              {viewModel.upcomingEvents.slice(0, 4).map((evt) => (
                <div key={evt.id} className="text-xs text-gray-700">
                  <span className="font-medium">{evt.title}</span>
                  <span className="text-gray-500 ml-1">
                    {evt.startAt ? new Date(evt.startAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t pt-2">
            <div className="text-xs text-gray-500 space-y-0.5">
              {viewModel.contactInfo?.address && <div>{viewModel.contactInfo.address}</div>}
              {viewModel.contactInfo?.website && <div>{viewModel.contactInfo.website}</div>}
              {viewModel.contactInfo?.officePhone && <div>{viewModel.contactInfo.officePhone}</div>}
            </div>
          </div>
          <div className="text-center text-xs text-gray-400 mt-2">Page 4 - Events & Contact</div>
        </div>
      </div>
    </div>
  );
}

export default function BulletinGeneratorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const bulletinId = params.id as string;
  const isPrintMode = searchParams.get('print') === '1';
  const utils = trpc.useContext();

  const [viewModel, setViewModel] = useState<BulletinViewModel | null>(null);
  const [preflight, setPreflight] = useState<BulletinPreflightResult | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch bulletin details
  const { data: bulletin, isLoading: bulletinLoading } = trpc.bulletins.get.useQuery({
    id: bulletinId,
  });

  // Fetch generator payload
  const { data: generatorData, isLoading: payloadLoading } = trpc.bulletins.getGeneratorPayload.useQuery({
    bulletinId,
  });

  // Generate from service mutation
  const generateFromService = trpc.bulletins.generateFromService.useMutation({
    onSuccess: (data) => {
      setViewModel(data.viewModel as unknown as BulletinViewModel);
      setPreflight(data.preflight);
      setHasUnsavedChanges(false);
    },
    onError: (error) => {
      alert(`Error generating bulletin: ${error.message}`);
    },
  });

  // Save generator payload mutation
  const savePayload = trpc.bulletins.saveGeneratorPayload.useMutation({
    onSuccess: (data) => {
      setPreflight(data.preflight);
      setHasUnsavedChanges(false);
      utils.bulletins.getGeneratorPayload.invalidate({ bulletinId });
    },
    onError: (error) => {
      alert(`Error saving bulletin: ${error.message}`);
    },
  });

  // Generate PDF mutation
  const generatePdf = trpc.bulletins.generateGeneratorPdf.useMutation({
    onSuccess: (data) => {
      const { pdfBase64, filename } = data;
      if (!pdfBase64) {
        alert('No PDF data returned.');
        return;
      }

      // Convert base64 to blob and download
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'bulletin.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onError: (error) => {
      alert(`Error generating PDF: ${error.message}`);
    },
  });

  // Initialize view model from fetched data or generate
  useEffect(() => {
    if (generatorData?.viewModel) {
      setViewModel(generatorData.viewModel as unknown as BulletinViewModel);
    } else if (generatorData && !generatorData.viewModel && !generateFromService.isPending) {
      // No payload exists, generate from service
      generateFromService.mutate({ bulletinId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- generateFromService is a mutation object; adding it causes infinite loops
  }, [generatorData, bulletinId]);

  // Fetch preflight validation when view model changes
  const { data: preflightData } = trpc.bulletins.getPreflightValidation.useQuery(
    { bulletinId },
    { enabled: !!viewModel && !hasUnsavedChanges }
  );

  useEffect(() => {
    if (preflightData && !hasUnsavedChanges) {
      setPreflight(preflightData);
    }
  }, [preflightData, hasUnsavedChanges]);

  const handleSave = async () => {
    if (!viewModel) return;
    await savePayload.mutateAsync({
      bulletinId,
      payload: {},
      viewModel: viewModel as unknown as Record<string, unknown>,
    });
  };

  const handleRegenerate = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Regenerating will overwrite them. Continue?')) {
        return;
      }
    }
    generateFromService.mutate({ bulletinId });
  };

  const handleDownloadFlatPdf = () => {
    generatePdf.mutate({ bulletinId, format: 'standard' });
  };

  const handleDownloadBookletPdf = () => {
    generatePdf.mutate({ bulletinId, format: 'booklet' });
  };

  // Handler to update layout key
  const handleLayoutChange = (layoutKey: 'classic' | 'simpleText') => {
    if (!viewModel) return;
    setViewModel({ ...viewModel, layoutKey });
    setHasUnsavedChanges(true);
  };

  // Handler to update a service item
  const handleServiceItemUpdate = (updatedItem: BulletinServiceItem) => {
    if (!viewModel) return;
    setViewModel({
      ...viewModel,
      serviceItems: viewModel.serviceItems.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      ),
    });
    setHasUnsavedChanges(true);
  };

  // Handler to update marker legend
  const handleMarkerLegendUpdate = (legend: MarkerLegendItem[] | null) => {
    if (!viewModel) return;
    setViewModel({ ...viewModel, markerLegend: legend ?? undefined });
    setHasUnsavedChanges(true);
  };

  // Print mode renders a simple printable version
  if (isPrintMode && viewModel) {
    const printChurchName = viewModel.churchInfo?.churchName ?? '';
    const printServiceLabel = viewModel.churchInfo?.serviceLabel ?? '';
    const printServiceDate = viewModel.churchInfo?.serviceDate ?? '';

    return (
      <div className="print-container">
        {/* This would be the actual print layout - simplified for now */}
        <div className="p-8">
          <h1 className="text-2xl font-bold text-center mb-4">{printChurchName}</h1>
          <h2 className="text-xl text-center mb-2">{printServiceLabel}</h2>
          <p className="text-center mb-8">
            {printServiceDate ? new Date(printServiceDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }) : ''}
          </p>

          <h3 className="text-lg font-bold mb-2">Order of Service</h3>
          <ul className="mb-6">
            {viewModel.serviceItems.map((item, idx) => (
              <li key={item.id} className="mb-1">
                {idx + 1}. {item.title}
              </li>
            ))}
          </ul>

          {viewModel.sermon && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-2">Sermon</h3>
              <p className="font-medium">{viewModel.sermon.title}</p>
              {viewModel.sermon.preacher && <p>{viewModel.sermon.preacher}</p>}
              {viewModel.sermon.primaryScripture && <p>{viewModel.sermon.primaryScripture}</p>}
            </div>
          )}

          <h3 className="text-lg font-bold mb-2">Announcements</h3>
          <ul className="mb-6">
            {viewModel.announcements.map((ann) => (
              <li key={ann.id} className="mb-2">
                <strong>{ann.title}</strong>
                <p className="text-sm">{ann.body}</p>
              </li>
            ))}
          </ul>

          <h3 className="text-lg font-bold mb-2">Upcoming Events</h3>
          <ul className="mb-6">
            {viewModel.upcomingEvents.map((evt) => (
              <li key={evt.id} className="mb-1">
                {evt.title} - {evt.startAt ? new Date(evt.startAt).toLocaleDateString() : ''}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const isLoading = bulletinLoading || payloadLoading || generateFromService.isPending;
  const isLocked = bulletin?.status === 'locked';

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">
              {generateFromService.isPending ? 'Generating bulletin from service...' : 'Loading bulletin...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!bulletin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Bulletin not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedPage requiredRoles={['admin', 'editor']}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Link href={`/bulletins/${bulletinId}`} className="hover:text-primary-600">
                  ← Back to Bulletin
                </Link>
              </div>
              <h1 className="text-3xl font-bold mb-2">Bulletin Generator</h1>
              <div className="flex items-center gap-3">
                <span className="text-gray-600">
                  {new Date(bulletin.serviceDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <PreflightBadge preflight={preflight} />
                {hasUnsavedChanges && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
                    Unsaved changes
                  </span>
                )}
                {isLocked && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                    Locked
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleRegenerate}
                disabled={isLocked || generateFromService.isPending}
                title="Regenerate content from service plan"
              >
                {generateFromService.isPending ? 'Generating...' : '🔄 Regenerate'}
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isLocked || savePayload.isPending || !hasUnsavedChanges}
              >
                {savePayload.isPending ? 'Saving...' : 'Save Draft'}
              </Button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            {/* Layout Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Layout:</label>
              <select
                value={viewModel?.layoutKey || 'classic'}
                onChange={(e) => handleLayoutChange(e.target.value as 'classic' | 'simpleText')}
                disabled={isLocked}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
              >
                <option value="classic">Classic (4-Page)</option>
                <option value="simpleText">Simple Text (Traditional Liturgy)</option>
              </select>
            </div>
            <div className="border-l border-gray-300 h-8 mx-2" />
            <Button
              variant="primary"
              size="lg"
              onClick={handleDownloadBookletPdf}
              disabled={!preflight?.isValid || generatePdf.isPending}
              title={!preflight?.isValid ? 'Fix errors before generating PDF' : 'Download 4-page booklet PDF'}
            >
              {generatePdf.isPending ? 'Generating...' : '📖 Download Booklet PDF'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleDownloadFlatPdf}
              disabled={!preflight?.isValid || generatePdf.isPending}
              title={!preflight?.isValid ? 'Fix errors before generating PDF' : 'Download flat PDF'}
            >
              📄 Flat PDF
            </Button>
            <div className="border-l border-gray-300 h-8 mx-2" />
            <Link href={`/bulletins/${bulletinId}/print`}>
              <Button variant="secondary" size="lg">
                🖨️ Print View
              </Button>
            </Link>
            <Link href={`/bulletins/${bulletinId}/digital`}>
              <Button variant="secondary" size="lg">
                📱 Digital View
              </Button>
            </Link>
          </div>
        </div>

        {/* Preflight Errors/Warnings */}
        {preflight && (!preflight.isValid || preflight.warnings.length > 0) && (
          <div className="mb-6 space-y-3">
            {preflight.errors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-medium text-red-900 mb-2">Errors (must fix before PDF)</h3>
                <ul className="list-disc list-inside space-y-1">
                  {preflight.errors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-700">{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {preflight.warnings.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-medium text-yellow-900 mb-2">Warnings</h3>
                <ul className="list-disc list-inside space-y-1">
                  {preflight.warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm text-yellow-700">{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Content Sections */}
          <div className="space-y-4">
            {/* Church Info */}
            <CollapsibleSection
              title="Church & Service Info"
              description="Cover page information"
              badge={<span className="text-xs text-gray-400">Page 1</span>}
            >
              {viewModel?.churchInfo ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Church Name</label>
                    <div className="px-3 py-2 bg-gray-50 rounded border text-sm">{viewModel.churchInfo.churchName}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Label</label>
                    <div className="px-3 py-2 bg-gray-50 rounded border text-sm">{viewModel.churchInfo.serviceLabel}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <div className="px-3 py-2 bg-gray-50 rounded border text-sm">{viewModel.churchInfo.serviceDate}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                      <div className="px-3 py-2 bg-gray-50 rounded border text-sm">{viewModel.churchInfo.serviceTime || 'Not set'}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No church info available</p>
              )}
            </CollapsibleSection>

            {/* Order of Service */}
            <CollapsibleSection
              title="Order of Service"
              description={`${viewModel?.serviceItems.length || 0} items${viewModel?.layoutKey === 'simpleText' ? ' (Simple Text mode)' : ''}`}
              badge={
                <span className="text-xs text-gray-400">
                  {viewModel?.layoutKey === 'simpleText' ? 'Liturgy' : 'Page 2'}
                </span>
              }
            >
              {viewModel?.layoutKey === 'simpleText' && (
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <strong>Simple Text Mode:</strong> Click the expand arrow on each item to add printed liturgy text, markers, and sub-parts.
                  </p>
                </div>
              )}
              {viewModel?.serviceItems && viewModel.serviceItems.length > 0 ? (
                <div className="space-y-2">
                  {viewModel.serviceItems.map((item) => (
                    <ServiceItemDisplay
                      key={item.id}
                      item={item}
                      layoutKey={(viewModel.layoutKey as 'classic' | 'simpleText') || 'classic'}
                      onUpdate={handleServiceItemUpdate}
                      isLocked={isLocked}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No service items yet.</p>
                  <Link href={`/bulletins/${bulletinId}`}>
                    <Button variant="secondary" size="sm" className="mt-2">
                      Add Service Items
                    </Button>
                  </Link>
                </div>
              )}
            </CollapsibleSection>

            {/* Marker Legend - Only shown in Simple Text mode */}
            {viewModel?.layoutKey === 'simpleText' && (
              <CollapsibleSection
                title="Marker Legend"
                description="Explain marker symbols used in the service order"
                badge={
                  <span className={`text-xs ${viewModel.markerLegend?.length ? 'text-purple-600' : 'text-gray-400'}`}>
                    {viewModel.markerLegend?.length || 0} entries
                  </span>
                }
                defaultOpen={true}
              >
                <MarkerLegendEditor
                  legend={viewModel.markerLegend}
                  onUpdate={handleMarkerLegendUpdate}
                  isLocked={isLocked}
                />
              </CollapsibleSection>
            )}

            {/* Sermon */}
            <CollapsibleSection
              title="Sermon"
              description={viewModel?.sermon?.title || 'No sermon'}
              badge={<span className="text-xs text-gray-400">Page 3</span>}
            >
              {viewModel?.sermon ? (
                <div className="p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900 text-lg">{viewModel.sermon.title}</div>
                  {viewModel.sermon.preacher && (
                    <div className="text-sm text-gray-600 mt-1">Speaker: {viewModel.sermon.preacher}</div>
                  )}
                  {viewModel.sermon.primaryScripture && (
                    <div className="text-sm text-gray-600">Scripture: {viewModel.sermon.primaryScripture}</div>
                  )}
                  {viewModel.sermon.seriesTitle && (
                    <div className="text-sm text-gray-500 mt-2">Series: {viewModel.sermon.seriesTitle}</div>
                  )}
                  {viewModel.sermon.bigIdea && (
                    <div className="text-sm text-gray-600 mt-2 italic">&quot;{viewModel.sermon.bigIdea}&quot;</div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No sermon information available</p>
              )}
            </CollapsibleSection>

            {/* Announcements */}
            <CollapsibleSection
              title="Announcements"
              description={`${viewModel?.announcements.length || 0} announcements`}
              badge={<span className="text-xs text-gray-400">Page 3</span>}
            >
              {viewModel?.announcements && viewModel.announcements.length > 0 ? (
                <div className="space-y-2">
                  {viewModel.announcements.map((ann) => (
                    <AnnouncementDisplay key={ann.id} announcement={ann} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No announcements</p>
              )}
            </CollapsibleSection>

            {/* Events */}
            <CollapsibleSection
              title="Upcoming Events"
              description={`${viewModel?.upcomingEvents.length || 0} events`}
              badge={<span className="text-xs text-gray-400">Page 4</span>}
            >
              {viewModel?.upcomingEvents && viewModel.upcomingEvents.length > 0 ? (
                <div className="space-y-2">
                  {viewModel.upcomingEvents.map((evt) => (
                    <EventDisplay key={evt.id} event={evt} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No upcoming events</p>
              )}
            </CollapsibleSection>

            {/* Contact & Giving */}
            <CollapsibleSection
              title="Contact & Giving Info"
              description="Back cover details"
              badge={<span className="text-xs text-gray-400">Page 4</span>}
              defaultOpen={false}
            >
              <div className="space-y-4">
                {viewModel?.contactInfo && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Contact Information</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      {viewModel.contactInfo.address && <div>{viewModel.contactInfo.address}</div>}
                      {viewModel.contactInfo.officePhone && <div>Phone: {viewModel.contactInfo.officePhone}</div>}
                      {viewModel.contactInfo.officeEmail && <div>Email: {viewModel.contactInfo.officeEmail}</div>}
                      {viewModel.contactInfo.website && <div>Website: {viewModel.contactInfo.website}</div>}
                    </div>
                  </div>
                )}
                {viewModel?.givingInfo && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Giving Information</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      {viewModel.givingInfo.headerText && <div className="font-medium">{viewModel.givingInfo.headerText}</div>}
                      {viewModel.givingInfo.bodyText && <div>{viewModel.givingInfo.bodyText}</div>}
                      {viewModel.givingInfo.onlineUrl && <div>Give online: {viewModel.givingInfo.onlineUrl}</div>}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </div>

          {/* Right Column: Preview */}
          <div className="lg:sticky lg:top-4">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{viewModel?.layoutKey === 'simpleText' ? '2-Page Preview' : '4-Page Preview'}</span>
                  <span className={`text-xs font-normal ${viewModel?.layoutKey === 'simpleText' ? 'text-purple-600' : 'text-gray-400'}`}>
                    {viewModel?.layoutKey === 'simpleText' ? 'Simple Text Layout' : 'Classic Layout'}
                  </span>
                </CardTitle>
                <CardDescription>
                  {viewModel?.layoutKey === 'simpleText'
                    ? 'Traditional liturgy format with printed text'
                    : 'Preview of the final bulletin layout'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {viewModel?.layoutKey === 'simpleText' ? (
                  <div className="space-y-4">
                    {/* Simple Text Preview - 2 pages side by side */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Page 1: Order of Service with Liturgy */}
                      <div className="aspect-[8.5/11] bg-white border border-gray-300 rounded-lg p-3 overflow-hidden shadow-sm">
                        <div className="h-full flex flex-col">
                          <h3 className="text-xs font-bold text-gray-900 border-b pb-1 mb-2 text-center">
                            {viewModel.churchInfo?.churchName || 'Church Name'}
                          </h3>
                          <p className="text-xs text-gray-600 text-center mb-2">
                            {viewModel.churchInfo?.serviceLabel || 'Service'}
                          </p>
                          <div className="flex-1 overflow-hidden">
                            <div className="space-y-1">
                              {viewModel.serviceItems.slice(0, 8).map((item) => (
                                <div key={item.id} className="text-xs">
                                  <div className="flex items-center gap-1">
                                    {item.marker && <span className="font-bold text-purple-600">{item.marker}</span>}
                                    <span className="font-medium text-gray-800">{item.title}</span>
                                  </div>
                                  {item.printedText && (
                                    <p className="text-gray-600 text-xs pl-3 line-clamp-1 italic">
                                      {item.printedText.slice(0, 40)}...
                                    </p>
                                  )}
                                </div>
                              ))}
                              {viewModel.serviceItems.length > 8 && (
                                <p className="text-xs text-gray-400 italic">+{viewModel.serviceItems.length - 8} more...</p>
                              )}
                            </div>
                          </div>
                          <div className="text-center text-xs text-gray-400 mt-1">Page 1</div>
                        </div>
                      </div>

                      {/* Page 2: Announcements & Legend */}
                      <div className="aspect-[8.5/11] bg-white border border-gray-300 rounded-lg p-3 overflow-hidden shadow-sm">
                        <div className="h-full flex flex-col">
                          {viewModel.markerLegend && viewModel.markerLegend.length > 0 && (
                            <div className="mb-2 p-2 bg-purple-50 rounded text-xs">
                              <span className="font-medium text-purple-800">Legend:</span>
                              {viewModel.markerLegend.slice(0, 3).map((item, idx) => (
                                <span key={idx} className="ml-2 text-purple-700">
                                  <span className="font-bold">{item.marker}</span>={item.description}
                                </span>
                              ))}
                            </div>
                          )}
                          <h3 className="text-xs font-bold text-gray-900 border-b pb-1 mb-2">Announcements</h3>
                          <div className="flex-1 overflow-hidden">
                            <div className="space-y-1">
                              {viewModel.announcements.slice(0, 4).map((ann) => (
                                <div key={ann.id} className="text-xs">
                                  <span className="font-medium text-gray-800">{ann.title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="border-t pt-1 mt-2">
                            <div className="text-xs text-gray-500">
                              {viewModel.contactInfo?.address && <div>{viewModel.contactInfo.address}</div>}
                            </div>
                          </div>
                          <div className="text-center text-xs text-gray-400 mt-1">Page 2</div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-center text-gray-500">
                      Simple Text layout prints liturgy text for responsive readings
                    </p>
                  </div>
                ) : (
                  <BulletinPreview viewModel={viewModel} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
