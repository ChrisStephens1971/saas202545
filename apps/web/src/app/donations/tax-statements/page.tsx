'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import Link from 'next/link';

export default function TaxStatementsPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data: taxData, isLoading, error } = trpc.donations.getTaxSummariesForYear.useQuery({
    year: selectedYear,
  });

  // Fetch org branding for header
  const { data: orgBranding } = trpc.org.getBranding.useQuery();

  const exportCsvMutation = trpc.donations.exportTaxSummariesCsv.useMutation({
    onSuccess: (data) => {
      // Create blob and trigger download
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsExporting(false);
      setExportError(null);
    },
    onError: (error) => {
      setExportError(error.message);
      setIsExporting(false);
    },
  });

  // Extract summaries from the response
  const taxSummaries = taxData?.summaries || [];
  const totalDonations = taxData?.totalAmount || 0;

  // Generate year options (current year and past 7 years for IRS record-keeping)
  const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear - i);

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    setExportError(null);
    exportCsvMutation.mutate({ year: selectedYear });
  };

  return (
    <ProtectedPage requiredRoles={['admin', 'editor']}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Year-End Tax Statements
                {orgBranding?.legalName && (
                  <span className="text-gray-500 font-normal text-xl ml-2">
                    &middot; {orgBranding.legalName}
                  </span>
                )}
              </h1>
              <p className="text-lg text-gray-600">
                Generate and manage tax-deductible giving statements for donors
              </p>
              {orgBranding?.ein && (
                <p className="text-sm text-gray-500 mt-1">EIN: {orgBranding.ein}</p>
              )}
            </div>
            <Link href="/donations">
              <Button variant="secondary" size="lg">
                Back to Donations
              </Button>
            </Link>
          </div>
        </div>

        {/* Year Selector and Export */}
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <CardTitle>Tax Year:</CardTitle>
                <select
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-lg"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={handleExportCSV}
                disabled={!taxSummaries || taxSummaries.length === 0 || isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Export Error */}
        {exportError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">Export failed: {exportError}</p>
          </div>
        )}

        {/* Summary Stats */}
        {taxSummaries && taxSummaries.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card variant="elevated">
              <CardContent className="text-center py-6">
                <p className="text-3xl font-bold text-primary-600">
                  {taxSummaries.length}
                </p>
                <p className="text-sm text-gray-600 mt-2">Donors with Tax-Deductible Gifts</p>
              </CardContent>
            </Card>
            <Card variant="elevated">
              <CardContent className="text-center py-6">
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(totalDonations)}
                </p>
                <p className="text-sm text-gray-600 mt-2">Total Tax-Deductible ({selectedYear})</p>
              </CardContent>
            </Card>
            <Card variant="elevated">
              <CardContent className="text-center py-6">
                <p className="text-3xl font-bold text-blue-600">
                  {formatCurrency(totalDonations / taxSummaries.length)}
                </p>
                <p className="text-sm text-gray-600 mt-2">Average Per Donor</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card variant="outlined">
            <CardContent className="text-center py-12">
              <p className="text-lg text-gray-600">Loading tax statements for {selectedYear}...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card variant="outlined">
            <CardContent className="text-center py-12">
              <p className="text-lg text-red-600">
                Error loading tax statements: {error.message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && (!taxSummaries || taxSummaries.length === 0) && (
          <Card variant="outlined">
            <CardContent className="text-center py-12">
              <p className="text-xl text-gray-600 mb-4">
                No tax-deductible donations found for {selectedYear}
              </p>
              <p className="text-base text-gray-500 mb-6">
                Tax statements will appear here once donations are recorded with tax-deductible status.
              </p>
              <Link href="/donations/new">
                <Button size="lg">Record Donation</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Tax Statements Table */}
        {!isLoading && taxSummaries && taxSummaries.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Donor Tax Statements ({selectedYear})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Env #
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Donor Name
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Email
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                        # of Donations
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                        Total Tax-Deductible
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Delivery Status
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {taxSummaries.map((summary) => (
                      <tr key={summary.personId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-base text-gray-600">
                          {summary.envelopeNumber || '—'}
                        </td>
                        <td className="px-6 py-4 text-base">
                          <Link
                            href={`/people/${summary.personId}`}
                            className="text-primary-600 hover:underline font-medium"
                          >
                            {summary.firstName} {summary.lastName}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-base text-gray-600">
                          {summary.email || '—'}
                        </td>
                        <td className="px-6 py-4 text-base text-center text-gray-600">
                          {summary.donationCount}
                        </td>
                        <td className="px-6 py-4 text-base text-right font-semibold text-gray-900">
                          {formatCurrency(summary.totalAmount)}
                        </td>
                        <td className="px-6 py-4 text-base">
                          {summary.latestDelivery ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                              summary.latestDelivery.method === 'printed'
                                ? 'bg-blue-100 text-blue-800'
                                : summary.latestDelivery.method === 'emailed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {summary.latestDelivery.method === 'printed' ? 'Printed' : summary.latestDelivery.method === 'emailed' ? 'Emailed' : 'Other'}
                              <span className="text-xs opacity-75">
                                {new Date(summary.latestDelivery.deliveredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              Not delivered
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <Link href={`/donations/tax-statements/${selectedYear}/${summary.personId}`}>
                              <Button variant="primary" size="sm">
                                View Statement
                              </Button>
                            </Link>
                            <Link href={`/people/${summary.personId}`}>
                              <Button variant="outline" size="sm">
                                Profile
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Information Note */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This report includes only tax-deductible contributions with
                  &quot;completed&quot; status. Non-tax-deductible contributions are excluded.
                  For individual donor details and fund breakdown, click &quot;View Details&quot;
                  or navigate to the person&apos;s profile.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedPage>
  );
}
