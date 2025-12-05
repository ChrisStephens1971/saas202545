'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { BulletinQrBlock } from '@/components/bulletins/BulletinQrBlock';
import { BulletinCanvasMultiPageView } from '@/components/bulletins/canvas';
import { formatServiceItemTitle, getServiceItemCcliNumber } from '@/lib/bulletinFormatting';
import type {
  BulletinCanvasLayout,
  BulletinViewModel,
  BulletinServiceItem,
  BulletinServiceItemChild,
  MarkerLegendItem,
} from '@elder-first/types';
import Link from 'next/link';

type PrintMode = 'standard' | 'booklet';

// Font family CSS helpers
const FONT_STACKS = {
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
} as const;

export default function BulletinPrintPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bulletinId = params.id as string;

  // Get print mode from URL param, default to 'standard'
  const mode: PrintMode = (searchParams.get('mode') as PrintMode) || 'standard';

  // Check if this is for PDF generation (pdf=1 param)
  const pdfMode = searchParams.get('pdf') === '1';

  // Fetch bulletin data
  const { data: bulletin, isLoading: bulletinLoading, error: bulletinError } = trpc.bulletins.get.useQuery({
    id: bulletinId,
  });

  // Fetch service items
  const { data: serviceItemsData, isLoading: itemsLoading } = trpc.serviceItems.list.useQuery(
    { bulletinIssueId: bulletinId },
    { enabled: !!bulletinId }
  );

  // Fetch templates to display template name
  const { data: templates } = trpc.bulletins.getServiceTemplates.useQuery();

  // Fetch org branding
  const { data: orgBranding } = trpc.org.getBranding.useQuery();

  // Fetch generator payload (for simpleText layout mode)
  const { data: generatorData, isLoading: _generatorLoading } = trpc.bulletins.getGeneratorPayload.useQuery(
    { bulletinId },
    { enabled: !!bulletinId }
  );

  // Extract view model from generator payload
  const viewModel: BulletinViewModel | null = generatorData?.viewModel
    ? (generatorData.viewModel as unknown as BulletinViewModel)
    : null;

  // Check if all required data is loaded
  // Note: orgBranding and templates are optional, but we need bulletin and serviceItemsData
  const isLoading = bulletinLoading || itemsLoading || !bulletin || !serviceItemsData;

  // Log loading state for debugging
  if (pdfMode) {
    console.log('[Print Page] PDF mode detected, loading state:', {
      bulletinLoading,
      itemsLoading,
      hasBulletin: !!bulletin,
      hasServiceItems: !!serviceItemsData,
      hasOrgBranding: !!orgBranding,
      isLoading,
      mode,
    });
  }

  // Format date helper - parse as local to avoid timezone issues
  const formatServiceDate = (dateStr: string | Date) => {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format address from branding fields
  const formatAddress = () => {
    if (!orgBranding) return null;
    const { addressLine1, addressLine2, city, state, postalCode, country } = orgBranding;

    const lines: string[] = [];
    if (addressLine1) lines.push(addressLine1);
    if (addressLine2) lines.push(addressLine2);

    // Format city, state ZIP
    const cityStateZip: string[] = [];
    if (city) cityStateZip.push(city);
    if (state) {
      if (city) {
        cityStateZip[cityStateZip.length - 1] = `${city}, ${state}`;
      } else {
        cityStateZip.push(state);
      }
    }
    if (postalCode) cityStateZip.push(postalCode);

    if (cityStateZip.length > 0) {
      lines.push(cityStateZip.join(' '));
    }

    // Add country if not US
    if (country && country !== 'US' && country !== 'USA') {
      lines.push(country);
    }

    return lines.length > 0 ? lines : null;
  };

  const handlePrint = () => {
    window.print();
  };

  // Switch print mode
  const switchMode = (newMode: PrintMode) => {
    const url = new URL(window.location.href);
    if (newMode === 'standard') {
      url.searchParams.delete('mode');
    } else {
      url.searchParams.set('mode', newMode);
    }
    router.push(url.pathname + url.search);
  };

  if (isLoading) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor']}>
        <div className="container mx-auto px-4 py-8">
          <p className="text-lg text-gray-600">Loading bulletin...</p>
        </div>
      </ProtectedPage>
    );
  }

  if (bulletinError || !bulletin) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor']}>
        <div className="container mx-auto px-4 py-8">
          <Card variant="outlined">
            <CardContent className="text-center py-12">
              <p className="text-lg text-red-600 mb-4">
                Error loading bulletin: {bulletinError?.message || 'Bulletin not found'}
              </p>
              <Button variant="secondary" onClick={() => router.back()}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedPage>
    );
  }

  // Check if bulletin uses canvas layout
  // IMPORTANT: Only use canvas layout if BOTH conditions are met:
  // 1. useCanvasLayout flag is explicitly set to true
  // 2. canvasLayoutJson exists and has pages
  // This allows users to toggle between template and canvas modes
  const canvasLayout = bulletin.canvasLayoutJson as BulletinCanvasLayout | null;
  const usesCanvasLayout = bulletin.useCanvasLayout === true && canvasLayout && canvasLayout.pages && canvasLayout.pages.length > 0;

  // Helper: Prepare canvas layout for booklet mode
  // Booklet requires 4 pages in specific order for landscape printing + folding
  const prepareCanvasLayoutForBooklet = (layout: BulletinCanvasLayout): BulletinCanvasLayout => {
    const pages = [...layout.pages].sort((a, b) => a.pageNumber - b.pageNumber);

    // Pad to 4 pages if needed (blank pages)
    while (pages.length < 4) {
      pages.push({
        id: `blank-${pages.length + 1}`,
        pageNumber: pages.length + 1,
        blocks: [],
      });
    }

    // Booklet page order for landscape printing:
    // Sheet 1 Front: Page 4 (left) + Page 1 (right)
    // Sheet 1 Back:  Page 2 (left) + Page 3 (right)
    // This creates correct order when folded: 1, 2, 3, 4
    const bookletOrder = [pages[3], pages[0], pages[1], pages[2]]; // [4, 1, 2, 3]

    return {
      pages: bookletOrder,
    };
  };

  // If using canvas layout, render that instead of template-based layout
  if (usesCanvasLayout) {
    // Prepare layout based on mode
    const layoutToRender = mode === 'booklet'
      ? prepareCanvasLayoutForBooklet(canvasLayout)
      : canvasLayout;

    return (
      <ProtectedPage requiredRoles={['admin', 'editor']}>
        <div className="container mx-auto px-4 py-8">
          {/* Print Mode Toggle (hidden when printing or PDF mode) */}
          {!pdfMode && (
            <div className="mb-4 print:hidden">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Print Mode:</span>
                <div className="flex rounded-lg border-2 border-gray-200 overflow-hidden">
                  <button
                    onClick={() => switchMode('standard')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      mode === 'standard'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => switchMode('booklet')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      mode === 'booklet'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Booklet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Booklet Instructions (canvas mode) */}
          {mode === 'booklet' && !pdfMode && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg print:hidden">
              <h4 className="font-semibold text-blue-900 mb-2">
                Canvas Booklet Printing (4 pages)
              </h4>
              <div className="text-sm text-blue-800 space-y-2">
                <p>
                  This mode arranges your canvas pages for booklet printing.
                  When printed and folded, pages will appear in correct order (1, 2, 3, 4).
                </p>
                <p className="font-medium mt-2">In the print dialog:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Orientation: <strong>Portrait</strong></li>
                  <li>Print: <strong>All pages</strong></li>
                  <li>Pages per sheet: <strong>2</strong> (or use Booklet mode if available)</li>
                  <li>Print on both sides: <strong>Enabled</strong> (flip on short edge)</li>
                  <li>Margins: <strong>None or Minimum</strong></li>
                </ol>
                <p className="mt-2 text-xs text-blue-600">
                  💡 Your printer will arrange pages automatically. Just fold the printed sheet in half.
                </p>
              </div>
            </div>
          )}

          {/* Navigation (hidden when printing or in PDF mode) */}
          {!pdfMode && (
            <div className="mb-6 flex justify-between items-center print:hidden">
              <Link href={`/bulletins/${bulletinId}`}>
                <Button variant="secondary">Back to Bulletin</Button>
              </Link>
              <Button variant="primary" size="lg" onClick={() => window.print()}>
                Print / Save as PDF
              </Button>
            </div>
          )}

          {/* Canvas Layout Print View */}
          <div
            className={`bulletin-print bulletin-canvas-print ${mode === 'booklet' ? 'bulletin-canvas-booklet' : ''}`}
            data-print-ready="true"
          >
            <BulletinCanvasMultiPageView
              layout={layoutToRender}
              mode="print"
            />
          </div>

          {/* Print button at bottom (hidden when printing or in PDF mode) */}
          {!pdfMode && (
            <div className="mt-6 text-center print:hidden">
              <Button variant="primary" size="lg" onClick={() => window.print()}>
                Print / Save as PDF
              </Button>
            </div>
          )}
        </div>

        {/* Print-specific styles for canvas */}
        <style jsx global>{`
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .print\\:hidden {
              display: none !important;
            }
            .container {
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }

            /* Standard mode: 8.5in width, page breaks */
            .bulletin-canvas-print:not(.bulletin-canvas-booklet) {
              width: 8.5in;
              margin: 0 auto;
            }

            /* Booklet mode: Pages arranged for 2-up printing */
            .bulletin-canvas-booklet {
              width: 8.5in;
              margin: 0 auto;
            }

            /* Page break after each canvas page */
            .page-break-after {
              page-break-after: always;
            }
          }
        `}</style>
      </ProtectedPage>
    );
  }

  // Otherwise, continue with template-based rendering
  const items = serviceItemsData?.items || [];
  const churchName = orgBranding?.legalName || 'Church';
  const addressLines = formatAddress();
  const hasContactInfo = orgBranding?.phone || orgBranding?.email;

  // Get template name if bulletin has a template
  const templateName = bulletin.templateKey
    ? templates?.find((t) => t.key === bulletin.templateKey)?.name
    : null;

  // Derive service label from template or date
  const getServiceLabel = () => {
    if (templateName) {
      return templateName.replace(' Worship', '');
    }
    const date = new Date(bulletin.serviceDate);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) return 'Sunday Worship';
    if (dayOfWeek === 3) return 'Wednesday Evening Service';
    return 'Worship Service';
  };
  const serviceLabel = getServiceLabel();

  // Check if bulletin is locked
  const isLocked = !!bulletin.lockedAt;

  // Extract design options with defaults
  const designOptions = bulletin.designOptions as any || {};
  const layoutStyle = designOptions.layoutStyle || 'simple';
  const primaryColor = designOptions.primaryColor || '#3B82F6';
  const accentColor = designOptions.accentColor || '#1E40AF';
  const fontFamilyHeading = FONT_STACKS[designOptions.fontFamilyHeading as keyof typeof FONT_STACKS] || FONT_STACKS.system;
  const fontFamilyBody = FONT_STACKS[designOptions.fontFamilyBody as keyof typeof FONT_STACKS] || FONT_STACKS.system;
  const sections = designOptions.sections || {};

  // CSS custom properties for design options
  const customStyles = {
    '--bulletin-primary-color': primaryColor,
    '--bulletin-accent-color': accentColor,
    '--bulletin-heading-font': fontFamilyHeading,
    '--bulletin-body-font': fontFamilyBody,
  } as React.CSSProperties;

  // Separate service items into liturgy vs. announcements/events
  const liturgyItems = items.filter((item: any) =>
    !['Announcement', 'Event', 'AnnouncementsPlaceholder', 'EventsPlaceholder'].includes(item.type)
  );
  const announcementItems = items.filter((item: any) =>
    item.type === 'Announcement' || item.type === 'AnnouncementsPlaceholder'
  );
  const eventItems = items.filter((item: any) =>
    item.type === 'Event' || item.type === 'EventsPlaceholder'
  );

  // For booklet mode, cap announcements/events to keep within 4 pages
  const BOOKLET_MAX_ANNOUNCEMENTS = 6;
  const displayAnnouncementItems = mode === 'booklet'
    ? announcementItems.slice(0, BOOKLET_MAX_ANNOUNCEMENTS)
    : announcementItems;
  const displayEventItems = mode === 'booklet'
    ? eventItems.slice(0, BOOKLET_MAX_ANNOUNCEMENTS)
    : eventItems;

  // Helper: Render standard header with logo/name/address
  const renderStandardHeader = () => (
    <div className={`text-center border-b pb-4 ${mode === 'booklet' ? 'mb-4' : 'mb-8 pb-6'}`}>
      {/* Logo (if available) */}
      {orgBranding?.logoUrl && (
        <div className={mode === 'booklet' ? 'mb-2' : 'mb-4'}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic user-uploaded logo; Next.js Image requires fixed dimensions incompatible with print layout */}
          <img
            src={orgBranding.logoUrl}
            alt={churchName}
            className={`mx-auto object-contain ${mode === 'booklet' ? 'h-10' : 'h-16'}`}
          />
        </div>
      )}

      {/* Church Name */}
      <h1 className={`font-bold ${mode === 'booklet' ? 'text-lg mb-1' : 'text-2xl mb-2'}`}>
        {churchName}
      </h1>

      {/* Address */}
      {addressLines && addressLines.length > 0 && (
        <div className={`text-gray-600 ${mode === 'booklet' ? 'text-xs mb-1' : 'text-sm mb-2'}`}>
          {addressLines.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      )}

      {/* Contact Info */}
      {hasContactInfo && (
        <div className={`text-gray-600 ${mode === 'booklet' ? 'text-xs mb-1' : 'text-sm mb-2'}`}>
          {orgBranding?.phone && orgBranding?.email ? (
            <p>{orgBranding.phone} | {orgBranding.email}</p>
          ) : (
            <p>{orgBranding?.phone || orgBranding?.email}</p>
          )}
        </div>
      )}

      {/* EIN - hide in booklet mode to save space */}
      {!mode.startsWith('booklet') && orgBranding?.ein && (
        <p className="text-xs text-gray-500 mb-4">
          EIN: {orgBranding.ein}
        </p>
      )}
    </div>
  );

  // Helper: Render service date/time section
  const renderServiceInfo = () => (
    <div className={`text-center ${mode === 'booklet' ? 'mb-4' : 'mb-8'}`}>
      <h2 className={`font-bold text-gray-800 ${mode === 'booklet' ? 'text-lg mb-1' : 'text-2xl mb-2'}`}>
        {serviceLabel}
      </h2>
      <p className={`text-gray-600 ${mode === 'booklet' ? 'text-sm mb-1' : 'text-lg mb-2'}`}>
        {formatServiceDate(bulletin.serviceDate)}
      </p>
      {templateName && !mode.startsWith('booklet') && (
        <span className="inline-block px-3 py-1 rounded-full text-xs bg-primary-100 text-primary-800">
          Template: {templateName}
        </span>
      )}
    </div>
  );

  // Helper: Render welcome message
  const renderWelcomeMessage = () => sections.showWelcomeMessage && sections.welcomeText && (
    <div
      className={`text-center italic ${mode === 'booklet' ? 'mb-4 text-xs' : 'mb-6 text-sm'}`}
      style={{ color: 'var(--bulletin-primary-color)' }}
    >
      <p>{sections.welcomeText}</p>
    </div>
  );

  // Helper: Render QR block
  const renderQRBlock = () => sections.showQRBlock && sections.qrUrl && (
    <div className={`flex justify-center ${mode === 'booklet' ? 'mb-4' : 'mb-6'}`}>
      <BulletinQrBlock
        url={sections.qrUrl}
        label="Scan to give or connect"
        size={mode === 'booklet' ? 60 : 80}
      />
    </div>
  );

  // Helper: Render scripture reading
  const renderScriptureReading = () => sections.showScriptureReading && sections.scriptureText && (
    <section className={`bulletin-section bulletin-section-keep ${mode === 'booklet' ? 'mb-4' : 'mb-6'}`}>
      <h3
        className={`font-semibold text-center border-b pb-2 ${mode === 'booklet' ? 'text-base mb-2' : 'text-lg mb-3'}`}
        style={{ color: 'var(--bulletin-primary-color)', borderColor: 'var(--bulletin-primary-color)' }}
      >
        Scripture Reading
      </h3>
      {sections.scriptureReference && (
        <p className={`text-center font-medium text-gray-700 ${mode === 'booklet' ? 'text-sm mb-1' : 'text-base mb-2'}`}>
          {sections.scriptureReference}
          {sections.scriptureVersion && sections.scriptureVersion !== 'eng-kjv' && (
            <span className={`text-gray-500 ml-2 ${mode === 'booklet' ? 'text-xs' : 'text-sm'}`}>
              ({sections.scriptureVersion})
            </span>
          )}
        </p>
      )}
      <div
        className={`text-gray-700 whitespace-pre-line ${mode === 'booklet' ? 'text-xs leading-relaxed' : 'text-sm leading-relaxed'}`}
        style={{ fontFamily: 'var(--bulletin-body-font)' }}
      >
        {sections.scriptureText}
      </div>
    </section>
  );

  // Helper: Render service item
  const renderServiceItem = (item: any) => {
    // Skip placeholder items
    if (item.type === 'AnnouncementsPlaceholder' || item.type === 'EventsPlaceholder') {
      return null;
    }

    // Heading items
    if (item.type === 'Heading') {
      return (
        <div key={item.id} className={`pt-2 border-t border-gray-300 ${mode === 'booklet' ? 'mt-3' : 'mt-6 pt-4'}`}>
          <h4 className={`font-bold text-gray-800 uppercase tracking-wide ${mode === 'booklet' ? 'text-xs' : 'text-base'}`}>
            {item.title}
          </h4>
        </div>
      );
    }

    // Announcement items
    if (item.type === 'Announcement') {
      return (
        <div key={item.id} className={`ml-2 ${mode === 'booklet' ? 'py-0.5' : 'py-1'}`}>
          <p className={`font-medium text-gray-800 ${mode === 'booklet' ? 'text-xs' : ''}`}>{item.title}</p>
          {item.content && (
            <p className={`text-gray-600 mt-0.5 ${mode === 'booklet' ? 'text-xs' : 'text-sm'}`}>{item.content}</p>
          )}
        </div>
      );
    }

    // Event items
    if (item.type === 'Event') {
      return (
        <div key={item.id} className={`ml-2 flex justify-between items-baseline ${mode === 'booklet' ? 'py-0.5' : 'py-1'}`}>
          <span className={`font-medium text-gray-800 ${mode === 'booklet' ? 'text-xs' : ''}`}>{item.title}</span>
          {item.content && (
            <span className={`text-gray-600 ${mode === 'booklet' ? 'text-xs' : 'text-sm'}`}>{item.content}</span>
          )}
        </div>
      );
    }

    // Standard service items
    // Use song metadata for formatted title if available
    const ccliNumber = getServiceItemCcliNumber(item) || item.ccliNumber;

    return (
      <div key={item.id} className={`border-b border-gray-100 last:border-b-0 ${mode === 'booklet' ? 'pb-1' : 'pb-3'}`}>
        <div className="flex items-baseline gap-2">
          <span className={`font-semibold text-gray-800 ${mode === 'booklet' ? 'text-xs' : ''}`}>
            {formatServiceItemTitle(item)}
          </span>
          {item.type === 'Song' && ccliNumber && (
            <span className={`text-gray-400 ${mode === 'booklet' ? 'text-[10px]' : 'text-xs'}`}>
              CCLI #{ccliNumber}
            </span>
          )}
        </div>

        {/* Sermon-specific details */}
        {item.type === 'Sermon' && (
          <div className={`mt-0.5 ml-4 text-gray-600 ${mode === 'booklet' ? 'text-xs space-y-0' : 'text-sm space-y-0.5'}`}>
            {item.sermonTitle && (
              <p><span className="text-gray-500">Title:</span> {item.sermonTitle}</p>
            )}
            {(item.sermonPreacher || item.speaker) && (
              <p><span className="text-gray-500">Preacher:</span> {item.sermonPreacher || item.speaker}</p>
            )}
            {item.scriptureRef && (
              <p><span className="text-gray-500">Scripture:</span> {item.scriptureRef}</p>
            )}
          </div>
        )}

        {/* Scripture reading details */}
        {item.type === 'Scripture' && item.scriptureRef && (
          <p className={`mt-0.5 ml-4 text-gray-600 ${mode === 'booklet' ? 'text-xs' : 'text-sm'}`}>
            {item.scriptureRef}
          </p>
        )}

        {/* Song details */}
        {item.type === 'Song' && item.artist && (
          <p className={`mt-0.5 ml-4 text-gray-500 italic ${mode === 'booklet' ? 'text-xs' : 'text-sm'}`}>
            {item.artist}
          </p>
        )}

        {/* Speaker for other items */}
        {item.type !== 'Sermon' && item.speaker && (
          <p className={`mt-0.5 ml-4 text-gray-600 ${mode === 'booklet' ? 'text-xs' : 'text-sm'}`}>
            {item.speaker}
          </p>
        )}

        {/* Content/Notes */}
        {item.content && item.content.length < 200 && item.type !== 'Announcement' && item.type !== 'Event' && (
          <p className={`mt-0.5 ml-4 text-gray-500 italic ${mode === 'booklet' ? 'text-xs' : 'text-sm'}`}>
            {item.content}
          </p>
        )}
      </div>
    );
  };

  // Helper: Render order of service section
  const renderOrderOfService = (itemsToRender: any[]) => (
    <section className={`bulletin-section bulletin-section-keep ${mode === 'booklet' ? 'mb-4' : 'mb-8'}`}>
      <h3 className={`font-semibold text-gray-800 text-center border-b pb-2 ${mode === 'booklet' ? 'text-base mb-3' : 'text-lg mb-4'}`}>
        Order of Worship
      </h3>

      {itemsToRender.length === 0 ? (
        <p className="text-center text-gray-500 py-4">
          No service items have been added to this bulletin.
        </p>
      ) : (
        <div className={mode === 'booklet' ? 'space-y-1' : 'space-y-3'}>
          {itemsToRender.map(renderServiceItem)}
        </div>
      )}
    </section>
  );

  // Helper: Render testimony box
  const renderTestimonyBox = () => sections.showTestimonyBox && sections.testimonyText && (
    <section
      className={`bulletin-section bulletin-section-keep border-l-4 pl-4 italic ${mode === 'booklet' ? 'mb-4 text-xs' : 'mb-6 text-sm'}`}
      style={{ borderColor: 'var(--bulletin-accent-color)' }}
    >
      <p className="text-gray-700">&ldquo;{sections.testimonyText}&rdquo;</p>
      <p className="text-gray-500 text-right mt-1">- Member Testimony</p>
    </section>
  );

  // Helper: Render footer
  const renderFooter = () => (
    <div className={`border-t text-center text-gray-500 ${mode === 'booklet' ? 'pt-3 text-xs' : 'pt-6 text-sm'}`}>
      {orgBranding?.website && (
        <p className="mb-1">{orgBranding.website}</p>
      )}
      {hasContactInfo && (
        <p className="mb-1">
          {[orgBranding?.phone, orgBranding?.email].filter(Boolean).join(' | ')}
        </p>
      )}

      {/* Social Bar (optional section) */}
      {sections.showSocialBar && ((orgBranding as any)?.facebookUrl || (orgBranding as any)?.instagramUrl || (orgBranding as any)?.youtubeUrl) && (
        <div className={`flex justify-center gap-4 ${mode === 'booklet' ? 'my-2' : 'my-3'}`}>
          {(orgBranding as any)?.facebookUrl && (
            <span className="text-gray-600">Facebook</span>
          )}
          {(orgBranding as any)?.instagramUrl && (
            <span className="text-gray-600">Instagram</span>
          )}
          {(orgBranding as any)?.youtubeUrl && (
            <span className="text-gray-600">YouTube</span>
          )}
        </div>
      )}

      <p className={`text-gray-400 ${mode === 'booklet' ? 'mt-2 text-[10px]' : 'mt-4 text-xs'}`}>
        Generated on {new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>
    </div>
  );

  // LAYOUT 1: Simple Layout (single column, stacked)
  const renderSimpleLayout = () => (
    <>
      {renderStandardHeader()}
      {renderServiceInfo()}
      {renderWelcomeMessage()}
      {renderQRBlock()}
      {renderScriptureReading()}
      {renderOrderOfService(items)}
      {renderTestimonyBox()}
      {renderFooter()}
    </>
  );

  // LAYOUT 2: Photo Header Layout (colored header band, then stacked)
  const renderPhotoHeaderLayout = () => (
    <>
      {/* Hero Header Band */}
      <div
        className="bulletin-photo-header"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="bulletin-photo-header-inner">
          <div className="bulletin-photo-header-title">
            {churchName}
          </div>
          <div className="bulletin-photo-header-subtitle">
            {formatServiceDate(bulletin.serviceDate)} · {serviceLabel}
          </div>
          {sections.showWelcomeMessage && sections.welcomeText && (
            <div className="bulletin-photo-header-welcome">
              {sections.welcomeText}
            </div>
          )}
        </div>
      </div>

      {/* Body content below header */}
      <div className="bulletin-photo-header-body">
        {orgBranding?.logoUrl && (
          <div className={`text-center ${mode === 'booklet' ? 'mb-2 mt-2' : 'mb-4 mt-4'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic user-uploaded logo; Next.js Image requires fixed dimensions incompatible with print layout */}
            <img
              src={orgBranding.logoUrl}
              alt={churchName}
              className={`mx-auto object-contain ${mode === 'booklet' ? 'h-8' : 'h-12'}`}
            />
          </div>
        )}

        {renderQRBlock()}
        {renderScriptureReading()}
        {renderOrderOfService(items)}
        {renderTestimonyBox()}
        {renderFooter()}
      </div>
    </>
  );

  // LAYOUT 3: Sidebar Layout (two columns)
  const renderSidebarLayout = () => (
    <>
      {/* Title section above columns */}
      <div className="bulletin-sidebar-header">
        {orgBranding?.logoUrl && (
          <div className={`text-center ${mode === 'booklet' ? 'mb-2' : 'mb-3'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic user-uploaded logo; Next.js Image requires fixed dimensions incompatible with print layout */}
            <img
              src={orgBranding.logoUrl}
              alt={churchName}
              className={`mx-auto object-contain ${mode === 'booklet' ? 'h-8' : 'h-12'}`}
            />
          </div>
        )}
        <div className={`text-center ${mode === 'booklet' ? 'mb-3' : 'mb-6'}`}>
          <h1 className={`font-bold ${mode === 'booklet' ? 'text-lg mb-1' : 'text-2xl mb-2'}`}>
            {churchName}
          </h1>
          <h2 className={`font-bold text-gray-800 ${mode === 'booklet' ? 'text-base' : 'text-xl'}`}>
            {serviceLabel}
          </h2>
          <p className={`text-gray-600 ${mode === 'booklet' ? 'text-xs' : 'text-sm'}`}>
            {formatServiceDate(bulletin.serviceDate)}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="bulletin-sidebar-layout">
        {/* Left column: Order of Service (liturgy only) */}
        <div className="bulletin-sidebar-left">
          {renderOrderOfService(liturgyItems)}
        </div>

        {/* Right column: Everything else */}
        <div className="bulletin-sidebar-right">
          {renderWelcomeMessage()}
          {renderQRBlock()}
          {renderScriptureReading()}

          {/* Announcements/Events */}
          {(displayAnnouncementItems.length > 0 || displayEventItems.length > 0) && (
            <section className={`bulletin-section bulletin-section-keep ${mode === 'booklet' ? 'mb-4' : 'mb-6'}`}>
              <h3 className={`font-semibold text-gray-800 text-center border-b pb-2 ${mode === 'booklet' ? 'text-base mb-2' : 'text-lg mb-3'}`}>
                Announcements & Events
              </h3>
              <div className={mode === 'booklet' ? 'space-y-1' : 'space-y-2'}>
                {[...displayAnnouncementItems, ...displayEventItems].map(renderServiceItem)}
              </div>
            </section>
          )}

          {renderTestimonyBox()}
        </div>
      </div>

      {/* Footer below columns */}
      {renderFooter()}
    </>
  );

  // ============================================================================
  // LAYOUT 4: Simple Text / Traditional Liturgy Layout
  // Used for traditional churches that want full liturgy text printed inline.
  // This layout renders service items with their printedText, markers, and children.
  // ============================================================================

  // Helper: Render a single service item with traditional liturgy formatting
  const renderSimpleTextServiceItem = (item: BulletinServiceItem) => {
    // Skip placeholder items
    if ((item.type as string) === 'announcementsplaceholder' || (item.type as string) === 'eventsplaceholder') {
      return null;
    }

    // Heading items get special styling
    if ((item.type as string) === 'heading') {
      return (
        <div key={item.id} className={`pt-2 border-t border-gray-300 ${mode === 'booklet' ? 'mt-3' : 'mt-6 pt-4'}`}>
          <h4 className={`font-bold text-gray-800 uppercase tracking-wide ${mode === 'booklet' ? 'text-xs' : 'text-base'}`}>
            {item.title}
          </h4>
        </div>
      );
    }

    const ccliNumber = item.ccliNumber;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className={`bulletin-liturgy-item border-b border-gray-100 last:border-b-0 ${mode === 'booklet' ? 'pb-2 mb-2' : 'pb-4 mb-4'}`}>
        {/* Item header with title, speaker, and marker */}
        <div className="flex items-baseline gap-2 flex-wrap">
          {/* Marker (e.g., *, **) */}
          {item.marker && (
            <span className={`font-bold text-gray-600 ${mode === 'booklet' ? 'text-xs' : 'text-sm'}`}>
              {item.marker}
            </span>
          )}

          {/* Title */}
          <span className={`font-semibold text-gray-800 ${mode === 'booklet' ? 'text-xs' : ''}`}>
            {item.title}
          </span>

          {/* Speaker/Leader */}
          {item.speaker && (
            <span className={`text-gray-600 ${mode === 'booklet' ? 'text-xs' : 'text-sm'}`}>
              — {item.speaker}
            </span>
          )}

          {/* CCLI for songs */}
          {item.type === 'song' && ccliNumber && (
            <span className={`text-gray-400 ml-auto ${mode === 'booklet' ? 'text-[10px]' : 'text-xs'}`}>
              CCLI #{ccliNumber}
            </span>
          )}
        </div>

        {/* Scripture reference */}
        {item.scriptureRef && (
          <p className={`mt-1 ml-4 text-gray-600 italic ${mode === 'booklet' ? 'text-xs' : 'text-sm'}`}>
            {item.scriptureRef}
          </p>
        )}

        {/* Scripture text (full text) */}
        {item.scriptureText && (
          <div className={`mt-2 ml-4 text-gray-700 whitespace-pre-line ${mode === 'booklet' ? 'text-xs leading-relaxed' : 'text-sm leading-relaxed'}`}>
            {item.scriptureText}
          </div>
        )}

        {/* Printed liturgy text (full text for traditional bulletins) */}
        {item.printedText && (
          <div className={`mt-2 ml-4 text-gray-700 whitespace-pre-line ${mode === 'booklet' ? 'text-xs leading-relaxed' : 'text-sm leading-relaxed'}`}
               style={{ fontFamily: 'var(--bulletin-body-font)' }}>
            {item.printedText}
          </div>
        )}

        {/* Child items (for compound segments like Advent candle lighting) */}
        {hasChildren && (
          <div className={`mt-2 ml-6 space-y-1 ${mode === 'booklet' ? 'text-xs' : 'text-sm'}`}>
            {item.children!.map((child: BulletinServiceItemChild, index: number) => (
              <div key={child.id || index} className="flex items-baseline gap-2">
                {child.marker && (
                  <span className="font-bold text-gray-500">{child.marker}</span>
                )}
                <span className="text-gray-700">{child.label}</span>
                {child.leader && (
                  <span className="text-gray-500">— {child.leader}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Description/Content (if short) */}
        {item.description && item.description.length < 200 && !item.printedText && (
          <p className={`mt-1 ml-4 text-gray-500 italic ${mode === 'booklet' ? 'text-xs' : 'text-sm'}`}>
            {item.description}
          </p>
        )}
      </div>
    );
  };

  // Helper: Render marker legend
  const renderMarkerLegend = (legend: MarkerLegendItem[] | null | undefined) => {
    if (!legend || legend.length === 0) return null;

    return (
      <div className={`mt-4 pt-3 border-t border-gray-200 ${mode === 'booklet' ? 'text-[10px]' : 'text-xs'}`}>
        <p className="font-medium text-gray-600 mb-1">Legend:</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500">
          {legend.map((item, index) => (
            <span key={index}>
              <span className="font-bold">{item.marker}</span> {item.description}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Simple Text Layout - Traditional liturgy with full printed texts
  const renderSimpleTextLayout = () => {
    // Use view model data if available, otherwise fall back to service items
    const vmServiceItems = viewModel?.serviceItems || [];
    const vmAnnouncements = viewModel?.announcements || [];
    const vmMarkerLegend = viewModel?.markerLegend;

    return (
      <>
        {/* Page 1: Header + Full Order of Worship */}
        {renderStandardHeader()}
        {renderServiceInfo()}
        {renderWelcomeMessage()}

        {/* Order of Worship with printed texts */}
        <section className={`bulletin-section bulletin-section-keep ${mode === 'booklet' ? 'mb-4' : 'mb-8'}`}>
          <h3 className={`font-semibold text-gray-800 text-center border-b pb-2 ${mode === 'booklet' ? 'text-base mb-3' : 'text-lg mb-4'}`}>
            Order of Worship
          </h3>

          {vmServiceItems.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              No service items have been added to this bulletin.
            </p>
          ) : (
            <div className={mode === 'booklet' ? 'space-y-1' : 'space-y-2'}>
              {vmServiceItems.map(renderSimpleTextServiceItem)}
            </div>
          )}

          {/* Marker Legend (e.g., "* Congregation stands") */}
          {renderMarkerLegend(vmMarkerLegend)}
        </section>

        {/* Page 2: Announcements + Persistent Blocks */}
        {vmAnnouncements.length > 0 && (
          <section className={`bulletin-section bulletin-section-keep page-break-before ${mode === 'booklet' ? 'mb-4' : 'mb-8'}`}>
            <h3 className={`font-semibold text-gray-800 text-center border-b pb-2 ${mode === 'booklet' ? 'text-base mb-3' : 'text-lg mb-4'}`}>
              Announcements
            </h3>
            <div className={mode === 'booklet' ? 'space-y-2' : 'space-y-3'}>
              {vmAnnouncements.map((ann) => (
                <div key={ann.id} className="border-b border-gray-100 last:border-b-0 pb-2">
                  <p className={`font-medium text-gray-800 ${mode === 'booklet' ? 'text-xs' : ''}`}>
                    {ann.title}
                  </p>
                  {ann.body && (
                    <p className={`text-gray-600 mt-0.5 ${mode === 'booklet' ? 'text-xs' : 'text-sm'}`}>
                      {ann.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Persistent blocks: How to Join, Just for the Record, etc. */}
        {sections.showWelcomeMessage && sections.welcomeText && (
          <section className={`bulletin-section bulletin-section-keep ${mode === 'booklet' ? 'mb-4' : 'mb-6'}`}>
            <h3 className={`font-semibold text-gray-800 border-b pb-2 ${mode === 'booklet' ? 'text-sm mb-2' : 'text-base mb-3'}`}
                style={{ color: 'var(--bulletin-primary-color)', borderColor: 'var(--bulletin-primary-color)' }}>
              Welcome
            </h3>
            <p className={`text-gray-700 ${mode === 'booklet' ? 'text-xs' : 'text-sm'}`}>
              {sections.welcomeText}
            </p>
          </section>
        )}

        {renderQRBlock()}
        {renderTestimonyBox()}
        {renderFooter()}
      </>
    );
  };

  // Main render function that picks the right layout
  // Check viewModel.layoutKey first, then fall back to designOptions.layoutStyle
  const renderBulletinContent = () => {
    // If using simpleText layout from generator view model
    if (viewModel?.layoutKey === 'simpleText') {
      return renderSimpleTextLayout();
    }

    // Otherwise use template-based layouts
    switch (layoutStyle) {
      case 'photoHeader':
        return renderPhotoHeaderLayout();
      case 'sidebar':
        return renderSidebarLayout();
      case 'simple':
      default:
        return renderSimpleLayout();
    }
  };

  // Render optional extra sections (Notes Page, Prayer Card, Connect Card)
  // In booklet mode, skip these to keep within 4 pages
  const renderOptionalSections = () => (
    <>
      {/* Notes Page (optional section) - DISABLED in booklet mode */}
      {sections.showNotesPage && mode !== 'booklet' && (
        <section className="bulletin-section bulletin-section-keep notes-page page-break-before">
          <h3
            className="font-bold text-center border-b-2 pb-2 text-xl mb-6"
            style={{ borderColor: 'var(--bulletin-primary-color)', color: 'var(--bulletin-primary-color)' }}
          >
            Sermon Notes
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-600 text-sm mb-1">Scripture:</label>
              <div className="border-b border-gray-300 h-6"></div>
            </div>
            <div>
              <label className="block text-gray-600 text-sm mb-1">Key Points:</label>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border-b border-gray-300 h-6 mt-2"></div>
              ))}
            </div>
            <div>
              <label className="block text-gray-600 text-sm mb-1">Application:</label>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border-b border-gray-300 h-6 mt-2"></div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Prayer Request Card (optional section) - DISABLED in booklet mode */}
      {sections.showPrayerRequestCard && mode !== 'booklet' && (
        <section className="bulletin-section bulletin-section-keep prayer-card border-2 border-dashed rounded-lg p-4 mt-6">
          <h4
            className="font-bold text-center mb-3 text-base"
            style={{ color: 'var(--bulletin-primary-color)' }}
          >
            Prayer Request
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <label className="block text-gray-600 mb-1">Name (optional):</label>
              <div className="border-b border-gray-300 h-5"></div>
            </div>
            <div>
              <label className="block text-gray-600 mb-1">Request:</label>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border-b border-gray-300 h-5 mt-1"></div>
              ))}
            </div>
            <p className="text-gray-500 text-xs italic mt-2">
              Tear off and place in the offering plate or give to an usher.
            </p>
          </div>
        </section>
      )}

      {/* Connect Card (optional section) - DISABLED in booklet mode */}
      {sections.showConnectCard && mode !== 'booklet' && (
        <section className="bulletin-section bulletin-section-keep connect-card border-2 rounded-lg p-4 mt-6" style={{ borderColor: 'var(--bulletin-accent-color)' }}>
          <h4
            className="font-bold text-center mb-3 text-base"
            style={{ color: 'var(--bulletin-primary-color)' }}
          >
            Connect Card
          </h4>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-600 mb-1">Name:</label>
                <div className="border-b border-gray-300 h-5"></div>
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Phone:</label>
                <div className="border-b border-gray-300 h-5"></div>
              </div>
            </div>
            <div>
              <label className="block text-gray-600 mb-1">Email:</label>
              <div className="border-b border-gray-300 h-5"></div>
            </div>
            <div>
              <label className="block text-gray-600 mb-1">I would like information about:</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {['Membership', 'Small Groups', 'Volunteering', 'Baptism', 'Other'].map((item) => (
                  <label key={item} className="flex items-center gap-1">
                    <input type="checkbox" className="w-3 h-3" disabled />
                    <span className="text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );

  return (
    <ProtectedPage requiredRoles={['admin', 'editor']}>
      <div className={`container mx-auto px-4 py-8 ${mode === 'standard' ? 'max-w-3xl' : ''}`}>
        {/* Warning for unlocked bulletins (hidden when printing) */}
        {!isLocked && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg print:hidden">
            <div className="flex items-center gap-2 text-yellow-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium">This bulletin is not locked.</span>
            </div>
            <p className="mt-1 text-sm text-yellow-700 ml-7">
              Consider locking it before printing so it doesn&apos;t change.
              <Link href={`/bulletins/${bulletinId}`} className="underline ml-1">
                Go back to lock
              </Link>
            </p>
          </div>
        )}

        {/* Print Mode Toggle (hidden when printing) */}
        <div className="mb-4 print:hidden">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Print Mode:</span>
            <div className="flex rounded-lg border-2 border-gray-200 overflow-hidden">
              <button
                onClick={() => switchMode('standard')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  mode === 'standard'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => switchMode('booklet')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  mode === 'booklet'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Booklet
              </button>
            </div>
          </div>
        </div>

        {/* Booklet Printing Instructions (hidden when printing or in PDF mode) */}
        {mode === 'booklet' && !pdfMode && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg print:hidden booklet-print-instructions">
            <h4 className="font-semibold text-blue-900 mb-2">
              Booklet Printing (8.5&quot; x 11&quot; folded to 5.5&quot; x 8.5&quot;)
            </h4>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                This mode prints a <strong>landscape sheet</strong> with the bulletin cover on the right half.
                When you fold the paper in half, the right side becomes the front cover.
              </p>
              <p className="font-medium mt-2">In the print dialog:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Layout/Orientation: <strong>Landscape</strong></li>
                <li>Paper size: <strong>Letter (8.5&quot; x 11&quot;)</strong></li>
                <li>Margins: <strong>None or Minimum</strong></li>
                <li>Scale: <strong>100%</strong> (do not fit to page)</li>
              </ol>
              <p className="mt-2 font-medium">Turn off:</p>
              <ul className="list-disc list-inside ml-2">
                <li>Headers and footers</li>
                <li>&quot;Fit to page&quot; or &quot;Shrink to fit&quot;</li>
              </ul>
              <p className="mt-2 text-xs text-blue-600">
                The left half is intentionally blank (inside of folded booklet).
              </p>
            </div>
          </div>
        )}

        {/* Navigation (hidden when printing or in PDF mode) */}
        {!pdfMode && (
          <div className="mb-6 flex justify-between items-center print:hidden">
            <Link href={`/bulletins/${bulletinId}`}>
              <Button variant="secondary">Back to Bulletin</Button>
            </Link>
            <Button variant="primary" size="lg" onClick={handlePrint}>
              Print / Save as PDF
            </Button>
          </div>
        )}

        {/* Printable Bulletin */}
        {mode === 'standard' ? (
          // Standard Layout
          <div
            className={`bulletin-print bulletin-layout-${layoutStyle}`}
            style={customStyles}
            data-print-ready="true"
          >
            <Card variant="elevated" className="print:shadow-none print:border-none">
              <CardContent className="p-8 print:p-0" style={{ fontFamily: fontFamilyBody }}>
                {renderBulletinContent()}
                {renderOptionalSections()}
              </CardContent>
            </Card>
          </div>
        ) : (
          // Booklet Layout - Same as standard but with printer instructions
          <div
            className={`bulletin-print bulletin-layout-${layoutStyle}`}
            style={customStyles}
            data-print-ready="true"
          >
            {/* On-screen instructions for booklet printing (hidden when printing or in PDF mode) */}
            {!pdfMode && (
              <div className="booklet-print-instructions print-screen-only mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <h2 className="text-xl font-bold text-blue-900 mb-3">📖 Booklet Printing Instructions</h2>
              <p className="text-blue-800 mb-3">
                To print this bulletin as a folded booklet, use these printer settings:
              </p>
              <ul className="list-disc list-inside text-blue-800 space-y-2 mb-3">
                <li><strong>Orientation:</strong> Portrait</li>
                <li><strong>Pages per sheet:</strong> 2 (or select &quot;Booklet&quot; mode if available)</li>
                <li><strong>Print on both sides:</strong> Enabled</li>
                <li><strong>Flip on:</strong> Short edge</li>
                <li><strong>Margins:</strong> None or minimal</li>
              </ul>
              <p className="text-sm text-blue-700">
                💡 Your printer will automatically arrange pages so the bulletin folds correctly.
              </p>
              </div>
            )}

            {/* Same content structure as standard mode */}
            <Card variant="elevated" className="print:shadow-none print:border-none">
              <CardContent className="p-8 print:p-0" style={{ fontFamily: fontFamilyBody }}>
                {renderBulletinContent()}
                {renderOptionalSections()}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Print button at bottom (hidden when printing or in PDF mode) */}
        {!pdfMode && (
          <div className="mt-6 text-center print:hidden">
            <Button variant="primary" size="lg" onClick={handlePrint}>
              Print / Save as PDF
            </Button>
          </div>
        )}
      </div>

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .container {
            max-width: 100% !important;
            padding: 0 !important;
          }
          .space-y-4 > div,
          .space-y-3 > div,
          .space-y-1 > div {
            break-inside: avoid;
          }

          /* Hide on-screen instructions in print */
          .print-screen-only {
            display: none !important;
          }
        }

        /* Design options - Layout styles */
        .bulletin-layout-simple h1,
        .bulletin-layout-simple h2,
        .bulletin-layout-simple h3,
        .bulletin-layout-simple h4 {
          font-family: var(--bulletin-heading-font);
        }

        /* Photo Header Layout */
        .bulletin-photo-header {
          padding: 0.75in 0.5in 0.4in;
          color: white;
          margin: -0.5in -0.5in 0;
        }

        @media print {
          .bulletin-photo-header {
            padding: 0.6in 0.4in 0.3in;
            margin: 0 0 0.5in;
          }
        }

        .bulletin-photo-header-inner {
          max-width: 7.5in;
          margin: 0 auto;
        }

        .bulletin-photo-header-title {
          font-size: 1.5rem;
          font-weight: 700;
          font-family: var(--bulletin-heading-font);
        }

        .bulletin-photo-header-subtitle {
          margin-top: 0.25rem;
          font-size: 0.95rem;
        }

        .bulletin-photo-header-welcome {
          margin-top: 0.5rem;
          font-size: 0.9rem;
          font-style: italic;
        }

        .bulletin-photo-header-body {
          max-width: 7.5in;
          margin: 0 auto;
        }

        /* Sidebar Layout */
        .bulletin-sidebar-header {
          max-width: 7.5in;
          margin: 0 auto;
        }

        .bulletin-sidebar-layout {
          display: flex;
          gap: 0.5in;
          max-width: 7.5in;
          margin: 0 auto;
        }

        .bulletin-sidebar-left {
          flex: 0 0 35%;
        }

        .bulletin-sidebar-right {
          flex: 1;
        }

        @media print {
          .bulletin-sidebar-layout {
            break-inside: avoid;
          }

          .bulletin-sidebar-left,
          .bulletin-sidebar-right {
            break-inside: avoid;
          }
        }

        /* Page break styles for optional sections */
        .page-break-before {
          page-break-before: always;
        }

        @media print {
          /* Keep logical sections together on the same page (best effort) */
          .bulletin-section-keep {
            break-inside: avoid;
            page-break-inside: avoid;
            -webkit-column-break-inside: avoid;
            -moz-column-break-inside: avoid;
          }

          .notes-page,
          .prayer-card,
          .connect-card {
            break-inside: avoid;
          }

          .notes-page {
            padding-top: 1rem;
          }

          /* Override flex/grid layouts to display: block for print
             (Edge/Chromium ignores break-inside on flex/grid children) */
          .bulletin-sidebar-layout {
            display: block !important;
          }

          .bulletin-sidebar-left,
          .bulletin-sidebar-right {
            width: 100% !important;
            flex: none !important;
          }
        }
      `}</style>
    </ProtectedPage>
  );
}
