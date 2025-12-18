'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import Link from 'next/link';

// Standard IRS boilerplate for church donations
const TAX_STATEMENT_BOILERPLATE = `No goods or services were provided in exchange for these contributions, other than intangible religious benefits.`;

export default function PersonTaxStatementPage() {
  const params = useParams();
  const router = useRouter();
  const year = parseInt(params.year as string, 10);
  const personId = params.personId as string;
  const utils = trpc.useContext();

  const [deliverySuccess, setDeliverySuccess] = useState<string | null>(null);

  const { data: statement, isLoading, error } = trpc.donations.getTaxStatementForPerson.useQuery({
    personId,
    year,
  });

  const { data: deliveryHistory, isLoading: deliveryLoading } =
    trpc.donations.getTaxStatementDeliveryHistory.useQuery({
      personId,
      year,
    });

  const logDelivery = trpc.donations.logTaxStatementDelivery.useMutation({
    onSuccess: (data) => {
      utils.donations.getTaxStatementDeliveryHistory.invalidate({ personId, year });
      utils.donations.getTaxSummariesForYear.invalidate({ year });
      const methodLabel = data.method === 'printed' ? 'Printed/Mailed' : 'Emailed';
      setDeliverySuccess(`Marked as ${methodLabel}`);
      setTimeout(() => setDeliverySuccess(null), 3000);
    },
  });

  const handleMarkPrinted = () => {
    logDelivery.mutate({
      personId,
      year,
      method: 'printed',
      destination: undefined,
      notes: 'Marked printed from tax statement page',
    });
  };

  const handleMarkEmailed = () => {
    // Use person's email if available, otherwise prompt
    let email = statement?.email;
    if (!email) {
      email = window.prompt('Enter email address:');
      if (!email) return;
    }
    logDelivery.mutate({
      personId,
      year,
      method: 'emailed',
      destination: email,
      notes: 'Marked emailed from tax statement page',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number | string, currency: string = 'USD') => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(numAmount);
  };

  const handlePrint = () => {
    window.print();
  };

  // Format address from branding fields
  const formatAddress = () => {
    if (!statement?.orgBranding) return null;
    const { addressLine1, addressLine2, city, state, postalCode, country } = statement.orgBranding;

    const lines: string[] = [];
    if (addressLine1) lines.push(addressLine1);
    if (addressLine2) lines.push(addressLine2);

    // Format city, state ZIP
    const cityStateZip: string[] = [];
    if (city) cityStateZip.push(city);
    if (state) {
      if (city) {
        // "City, State"
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

  if (isLoading) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor']}>
        <div className="container mx-auto px-4 py-8">
          <p className="text-lg text-gray-600">Loading tax statement...</p>
        </div>
      </ProtectedPage>
    );
  }

  if (error || !statement) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor']}>
        <div className="container mx-auto px-4 py-8">
          <Card variant="outlined">
            <CardContent className="text-center py-12">
              <p className="text-lg text-red-600 mb-4">
                Error loading tax statement: {error?.message || 'Statement not found'}
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

  // Get org branding with fallbacks
  const orgBranding = statement.orgBranding;
  const churchName = orgBranding?.legalName || 'Organization';
  const addressLines = formatAddress();
  const hasContactInfo = orgBranding?.phone || orgBranding?.email;
  const customFooter = orgBranding?.taxStatementFooter;

  return (
    <ProtectedPage requiredRoles={['admin', 'editor']}>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Navigation (hidden when printing) */}
        <div className="mb-6 flex justify-between items-center print:hidden">
          <Link href="/donations/tax-statements">
            <Button variant="secondary">Back to Tax Statements</Button>
          </Link>
          <Button variant="primary" size="lg" onClick={handlePrint}>
            Print / Save as PDF
          </Button>
        </div>

        {/* Printable Statement */}
        <Card variant="elevated" className="print:shadow-none print:border-none">
          <CardContent className="p-8 print:p-0">
            {/* Header with Organization Branding */}
            <div className="text-center mb-8 border-b pb-6">
              {/* Logo (if available) */}
              {orgBranding?.logoUrl && (
                <div className="mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic user-uploaded logo for printable tax statement; dimensions vary by org */}
                  <img
                    src={orgBranding.logoUrl}
                    alt={churchName}
                    className="h-16 mx-auto object-contain"
                  />
                </div>
              )}

              {/* Church Name */}
              <h1 className="text-2xl font-bold mb-2">{churchName}</h1>

              {/* Address */}
              {addressLines && addressLines.length > 0 && (
                <div className="text-sm text-gray-600 mb-2">
                  {addressLines.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              )}

              {/* Contact Info */}
              {hasContactInfo && (
                <div className="text-sm text-gray-600 mb-2">
                  {orgBranding?.phone && orgBranding?.email ? (
                    <p>{orgBranding.phone} | {orgBranding.email}</p>
                  ) : (
                    <p>{orgBranding?.phone || orgBranding?.email}</p>
                  )}
                </div>
              )}

              {/* EIN */}
              {orgBranding?.ein && (
                <p className="text-sm text-gray-600 mb-2">
                  EIN: {orgBranding.ein}
                </p>
              )}

              <h2 className="text-xl font-semibold text-gray-700 mt-4">
                Year-End Contribution Statement
              </h2>
              <p className="text-lg text-gray-600 mt-2">Tax Year {year}</p>
            </div>

            {/* Donor Information */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Donor Information</h3>
              <div className="bg-gray-50 p-4 rounded-lg print:bg-white print:border print:border-gray-200">
                <p className="text-lg font-medium">{statement.fullName}</p>
                {statement.envelopeNumber && (
                  <p className="text-gray-600">Envelope #: {statement.envelopeNumber}</p>
                )}
                {statement.email && (
                  <p className="text-gray-600">{statement.email}</p>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Contribution Summary</h3>
              <div className="bg-primary-50 p-6 rounded-lg print:bg-gray-100 print:border print:border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg text-gray-700">
                    Total Tax-Deductible Contributions
                  </span>
                  <span className="text-2xl font-bold text-primary-800 print:text-gray-900">
                    {formatCurrency(statement.totalAmount, statement.currency)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {statement.donationCount} contribution{statement.donationCount !== 1 ? 's' : ''} in {year}
                </p>
              </div>
            </div>

            {/* Fund Breakdown */}
            {statement.fundBreakdown && statement.fundBreakdown.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Breakdown by Fund</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Fund
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {statement.fundBreakdown.map((fund: { fundId?: string; fundName: string; totalAmount: number }, index: number) => (
                        <tr key={fund.fundId || index}>
                          <td className="px-4 py-3 text-base">{fund.fundName}</td>
                          <td className="px-4 py-3 text-base text-right font-medium">
                            {formatCurrency(fund.totalAmount, statement.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td className="px-4 py-3 text-base font-semibold">Total</td>
                        <td className="px-4 py-3 text-base text-right font-bold">
                          {formatCurrency(statement.totalAmount, statement.currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* IRS Boilerplate Statement */}
            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg print:bg-white print:border-gray-300">
              <p className="text-sm text-blue-800 print:text-gray-700 italic">
                {TAX_STATEMENT_BOILERPLATE}
              </p>
            </div>

            {/* Custom Footer (if configured) */}
            {customFooter && (
              <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg print:bg-white">
                <p className="text-sm text-gray-700">{customFooter}</p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t pt-6 text-center text-sm text-gray-500">
              <p className="mb-2">
                This statement is provided for your tax records by {churchName}.
              </p>
              <p>
                Please consult with a tax professional regarding the deductibility of your contributions.
              </p>
              <p className="mt-4 text-xs">
                Generated on {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Print button at bottom (hidden when printing) */}
        <div className="mt-6 text-center print:hidden">
          <Button variant="primary" size="lg" onClick={handlePrint}>
            Print / Save as PDF
          </Button>
        </div>

        {/* Delivery History Section (hidden when printing) */}
        <Card variant="elevated" className="mt-6 print:hidden">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Delivery History</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkPrinted}
                  disabled={logDelivery.isLoading}
                >
                  {logDelivery.isLoading ? 'Saving...' : 'Mark as Printed/Mailed'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkEmailed}
                  disabled={logDelivery.isLoading}
                >
                  {logDelivery.isLoading ? 'Saving...' : 'Mark as Emailed'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Success message */}
            {deliverySuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm">{deliverySuccess}</p>
              </div>
            )}

            {/* Loading state */}
            {deliveryLoading && (
              <p className="text-gray-500 text-sm">Loading history...</p>
            )}

            {/* Empty state */}
            {!deliveryLoading && (!deliveryHistory || deliveryHistory.length === 0) && (
              <p className="text-gray-500 text-sm">
                No deliveries recorded for this year. Use the buttons above to mark this statement as delivered.
              </p>
            )}

            {/* History table */}
            {!deliveryLoading && deliveryHistory && deliveryHistory.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Delivered At</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Method</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Destination</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {deliveryHistory.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-4 py-2 text-gray-600">
                          {formatDateTime(typeof entry.deliveredAt === 'string' ? entry.deliveredAt : entry.deliveredAt.toISOString())}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            entry.method === 'printed'
                              ? 'bg-blue-100 text-blue-800'
                              : entry.method === 'emailed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {entry.method === 'printed' ? 'Printed' : entry.method === 'emailed' ? 'Emailed' : 'Other'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {entry.destination || '—'}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {entry.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
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
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          .print\\:border {
            border-width: 1px !important;
          }
          .print\\:border-gray-200 {
            border-color: #e5e7eb !important;
          }
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          .print\\:text-gray-700 {
            color: #374151 !important;
          }
          .print\\:text-gray-900 {
            color: #111827 !important;
          }
        }
      `}</style>
    </ProtectedPage>
  );
}
