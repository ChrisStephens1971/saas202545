'use client';

/**
 * Sunday Planner Print View
 *
 * Print-friendly view of the current service plan.
 * Features:
 * - Clean, print-optimized layout
 * - No app chrome (sidebar, topbar)
 * - Automatic print dialog trigger (optional)
 * - Back button for navigation
 *
 * Phase 7: Print & Export UX
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Loader2, ArrowLeft, Printer, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ServicePlanData } from '@/components/sunday-planner/types';
import { calculateTotalDuration, formatDuration, calculateStartTimes } from '@/components/sunday-planner/types';
import { computeEndTime } from '@/components/sunday-planner/timeUtils';
import { SERVICE_ITEM_TYPE_MAP } from '@/components/sunday-planner/itemTypeConfig';

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
 * Print-friendly content for the service plan
 */
function ServicePlanPrintContent({ plan }: { plan: ServicePlanData }) {
  const startTimes = calculateStartTimes(plan);
  const totalMinutes = calculateTotalDuration(plan);
  const totalDurationStr = formatDuration(totalMinutes);
  const endTimeStr = computeEndTime(plan);

  return (
    <div className="max-w-4xl mx-auto p-8 print:p-0">
      {/* Header Section */}
      <header className="mb-8 pb-6 border-b-2 border-gray-200">
        <h1 className="text-3xl font-bold mb-3">Service Plan</h1>

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Date:</span> {formatDate(plan.date)}
          </div>
          <div>
            <span className="font-medium">Status:</span>{' '}
            <span className={plan.status === 'published' ? 'text-green-700' : 'text-amber-700'}>
              {plan.status === 'published' ? 'Published' : 'Draft'}
            </span>
          </div>
          <div>
            <span className="font-medium">Start:</span> {plan.startTime}
          </div>
          <div>
            <span className="font-medium">End:</span> {endTimeStr}
          </div>
          <div className="col-span-2">
            <span className="font-medium">Total Duration:</span> {totalDurationStr}
          </div>
        </div>
      </header>

      {/* Order of Service */}
      <main>
        <h2 className="text-xl font-bold mb-6 text-gray-900">Order of Service</h2>

        {plan.sections.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No sections in this service plan.
          </p>
        ) : (
          <div className="space-y-8">
            {plan.sections.map((section, sectionIndex) => (
              <div key={section.id} className="break-inside-avoid">
                {/* Section Header */}
                <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  {sectionIndex + 1}. {section.title}
                </h3>

                {/* Section Items */}
                {section.items.length === 0 ? (
                  <p className="text-gray-400 text-sm italic ml-4">No items in this section</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                        <th className="pb-2 w-20">Time</th>
                        <th className="pb-2 w-24">Type</th>
                        <th className="pb-2">Item</th>
                        <th className="pb-2 w-16 text-right">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item) => {
                        const typeConfig = SERVICE_ITEM_TYPE_MAP[item.type];
                        const startTime = startTimes.get(item.id) || '';

                        return (
                          <tr key={item.id} className="border-t border-gray-100">
                            <td className="py-2 text-gray-600 font-mono text-xs">
                              {startTime}
                            </td>
                            <td className="py-2 text-gray-500">
                              {typeConfig?.label || item.type}
                            </td>
                            <td className="py-2">
                              <div className="font-medium text-gray-900">{item.title}</div>
                              {item.subtitle && (
                                <div className="text-gray-500 text-xs">{item.subtitle}</div>
                              )}
                              {item.scriptureRef && (
                                <div className="text-gray-500 text-xs">
                                  Scripture: {item.scriptureRef}
                                </div>
                              )}
                              {item.ccliNumber && (
                                <div className="text-gray-400 text-xs">
                                  CCLI: {item.ccliNumber}
                                </div>
                              )}
                            </td>
                            <td className="py-2 text-right text-gray-600">
                              {item.duration} min
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Print Footer */}
      <footer className="mt-12 pt-4 border-t text-xs text-gray-400 text-center print:block hidden">
        Generated from Elder-First Church Platform
      </footer>
    </div>
  );
}

/**
 * Print view page for Sunday Planner
 */
export default function SundayPlannerPrintPage() {
  const router = useRouter();
  const [autoPrintTriggered, setAutoPrintTriggered] = useState(false);

  // Fetch current service plan
  const {
    data: plan,
    isLoading,
    error,
  } = trpc.servicePlans.getCurrent.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Auto-trigger print dialog when data loads (optional - triggered by query param)
  useEffect(() => {
    if (plan && !autoPrintTriggered) {
      // Check for auto-print query param
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('auto') === 'true') {
        setAutoPrintTriggered(true);
        // Small delay to ensure render is complete
        setTimeout(() => {
          window.print();
        }, 500);
      }
    }
  }, [plan, autoPrintTriggered]);

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    router.push('/sunday-planner');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-red-600 font-medium">Error loading service plan</p>
        <p className="text-gray-500 text-sm">{error.message}</p>
        <Button variant="outline" onClick={handleBack}>
          Go Back
        </Button>
      </div>
    );
  }

  // No plan state
  if (!plan) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <AlertCircle className="h-12 w-12 text-amber-500" />
        <p className="text-gray-900 font-medium">No service plan available</p>
        <p className="text-gray-500 text-sm">Create a service plan to print it.</p>
        <Button variant="outline" onClick={handleBack}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Print-hidden header with actions */}
      <div className="print:hidden fixed top-0 left-0 right-0 bg-white border-b shadow-sm z-10 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <ArrowLeft size={16} /> Back to Planner
          </Button>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handlePrint} className="gap-2">
              <Printer size={16} /> Print
            </Button>
          </div>
        </div>
      </div>

      {/* Main print content - with top padding for header */}
      <div className="pt-20 print:pt-0">
        <ServicePlanPrintContent plan={plan as ServicePlanData} />
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.75in;
            size: letter;
          }

          body {
            font-size: 10pt;
            line-height: 1.4;
          }

          h1 {
            font-size: 18pt;
          }

          h2 {
            font-size: 14pt;
          }

          h3 {
            font-size: 12pt;
          }

          /* Hide navigation and non-essential elements */
          .print\\:hidden {
            display: none !important;
          }

          /* Show print-only elements */
          .print\\:block {
            display: block !important;
          }

          /* Ensure sections don't break awkwardly */
          .break-inside-avoid {
            page-break-inside: avoid;
          }

          /* Remove shadows and borders for cleaner print */
          .shadow-sm {
            box-shadow: none !important;
          }

          /* Ensure tables print well */
          table {
            border-collapse: collapse;
          }

          th, td {
            vertical-align: top;
          }

          /* Adjust background colors for print */
          .bg-teal-600,
          .bg-gray-100 {
            background-color: transparent !important;
          }
        }
      `}</style>
    </>
  );
}
