'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Loader2, ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getEffectiveBlockType, getBlockDefaults } from '@elder-first/types';
import type { SermonOutlinePoint, SermonBlockType } from '@elder-first/types';

/**
 * Print-friendly sermon outline page.
 * Renders a clean, print-optimized view of the sermon outline.
 * Only includes blocks where includeInPrint !== false.
 */
export default function SermonPrintPage() {
  const params = useParams();
  const router = useRouter();
  const sermonId = params.id as string;

  const { data: sermon, isLoading, error } = trpc.sermons.get.useQuery(
    { id: sermonId },
    { enabled: !!sermonId }
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !sermon) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <p className="text-red-500">Error loading sermon</p>
        <button onClick={() => router.back()} className="text-blue-500 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const outline = sermon.outline as any;
  const mainPoints: SermonOutlinePoint[] = outline?.mainPoints || [];

  // Filter blocks to only include those marked for print
  const printableBlocks = mainPoints.filter((point) => {
    const effectiveType = getEffectiveBlockType(point.type);
    const defaults = getBlockDefaults(effectiveType);
    const includeInPrint = point.includeInPrint ?? defaults.includeInPrint;
    return includeInPrint !== false;
  });

  // Get block styling for print
  const getBlockPrintStyle = (type: SermonBlockType) => {
    switch (type) {
      case 'POINT':
        return 'font-bold text-lg';
      case 'SCRIPTURE':
        return 'font-semibold italic text-base border-l-4 border-amber-500 pl-4';
      case 'ILLUSTRATION':
        return 'font-medium text-base text-gray-700';
      case 'NOTE':
        return 'font-normal text-sm text-gray-600';
      default:
        return 'font-normal';
    }
  };

  const getBlockLabel = (type: SermonBlockType) => {
    switch (type) {
      case 'POINT':
        return null; // Points don't need a label
      case 'SCRIPTURE':
        return 'Scripture';
      case 'ILLUSTRATION':
        return 'Illustration';
      case 'NOTE':
        return 'Note';
      default:
        return null;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print-hidden header with actions */}
      <div className="print:hidden fixed top-0 left-0 right-0 bg-white border-b shadow-sm z-10 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Button variant="outline" onClick={() => router.back()} className="gap-2">
            <ArrowLeft size={16} /> Back
          </Button>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handlePrint} className="gap-2">
              <Printer size={16} /> Print
            </Button>
          </div>
        </div>
      </div>

      {/* Main print content */}
      <div className="max-w-4xl mx-auto p-8 pt-24 print:pt-0 print:p-8">
        {/* Header Section */}
        <header className="mb-8 pb-6 border-b-2 border-gray-200">
          <h1 className="text-3xl font-bold mb-3">{sermon.title}</h1>

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            {sermon.preacher && (
              <div>
                <span className="font-medium">Preacher:</span> {sermon.preacher}
              </div>
            )}
            {sermon.sermon_date && (
              <div>
                <span className="font-medium">Date:</span>{' '}
                {new Date(sermon.sermon_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            )}
            {sermon.primary_scripture && (
              <div className="col-span-2">
                <span className="font-medium">Scripture:</span> {sermon.primary_scripture}
              </div>
            )}
          </div>

          {/* Big Idea */}
          {outline?.bigIdea && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg print:bg-gray-100">
              <p className="font-semibold text-sm text-blue-800 print:text-gray-800 mb-1">
                Big Idea:
              </p>
              <p className="text-blue-900 print:text-gray-900">{outline.bigIdea}</p>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="space-y-6">
          {printableBlocks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No printable content in outline.
            </p>
          ) : (
            <ol className="space-y-6">
              {printableBlocks.map((point, index) => {
                const effectiveType = getEffectiveBlockType(point.type);
                const styleClass = getBlockPrintStyle(effectiveType);
                const label = getBlockLabel(effectiveType);
                const isPoint = effectiveType === 'POINT';

                // Count only POINT types for numbering
                const pointNumber = isPoint
                  ? printableBlocks
                      .slice(0, index + 1)
                      .filter((p) => getEffectiveBlockType(p.type) === 'POINT').length
                  : null;

                return (
                  <li key={index} className={`${effectiveType === 'NOTE' ? 'ml-4' : ''}`}>
                    {/* Block Label (for non-POINT types) */}
                    {label && (
                      <span className="text-xs uppercase tracking-wider text-gray-500 block mb-1">
                        {label}
                      </span>
                    )}

                    {/* Main Label/Title */}
                    <div className={`${styleClass} flex items-start gap-3`}>
                      {isPoint && pointNumber && (
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm print:bg-gray-200 print:text-gray-700">
                          {pointNumber}
                        </span>
                      )}
                      <div className="flex-1">
                        <p className={isPoint ? 'text-lg' : ''}>{point.label}</p>

                        {/* Scripture Reference */}
                        {point.scriptureRef && (
                          <p className="text-sm text-gray-600 mt-1 font-mono">
                            📖 {point.scriptureRef}
                          </p>
                        )}

                        {/* Summary */}
                        {point.summary && (
                          <p className={`mt-2 ${effectiveType === 'SCRIPTURE' ? 'italic' : ''} text-gray-700`}>
                            {point.summary}
                          </p>
                        )}

                        {/* Notes */}
                        {point.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-600 print:border print:border-gray-200">
                            <p className="whitespace-pre-wrap">{point.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </main>

        {/* Footer Section */}
        {(outline?.application || outline?.callToAction) && (
          <footer className="mt-8 pt-6 border-t-2 border-gray-200 space-y-4">
            {outline.application && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Application</h3>
                <p className="text-gray-700">{outline.application}</p>
              </div>
            )}

            {outline.callToAction && (
              <div className="p-4 bg-green-50 rounded-lg print:bg-gray-100 print:border print:border-gray-200">
                <h3 className="font-semibold text-green-800 print:text-gray-800 mb-2">
                  Call to Action
                </h3>
                <p className="text-green-900 print:text-gray-900">{outline.callToAction}</p>
              </div>
            )}
          </footer>
        )}

        {/* Extra Notes */}
        {outline?.extraNotes && (
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg text-sm print:bg-gray-50 print:border">
            <h3 className="font-semibold text-yellow-800 print:text-gray-800 mb-2">
              Notes
            </h3>
            <p className="text-yellow-900 print:text-gray-900 whitespace-pre-wrap">
              {outline.extraNotes}
            </p>
          </div>
        )}

        {/* Print Footer */}
        <div className="mt-12 pt-4 border-t text-xs text-gray-400 text-center print:block hidden">
          Generated from Elder-First Church Platform
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.75in;
            size: letter;
          }

          body {
            font-size: 11pt;
            line-height: 1.4;
          }

          h1 {
            font-size: 18pt;
          }

          h2,
          h3 {
            font-size: 14pt;
          }

          /* Hide navigation and non-essential elements */
          .print\\:hidden {
            display: none !important;
          }

          /* Ensure page breaks work properly */
          li {
            page-break-inside: avoid;
          }

          /* Adjust colors for print */
          .bg-blue-50,
          .bg-green-50,
          .bg-yellow-50 {
            background-color: #f9fafb !important;
          }
        }
      `}</style>
    </>
  );
}
