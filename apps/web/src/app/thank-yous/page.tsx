'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import Link from 'next/link';

export default function ThankYousPage() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    channel: '' as '' | 'Card' | 'Email' | 'Text' | 'Call' | 'In-Person',
    hasDonation: false,
    hasEvent: false,
  });

  const { data, isLoading, error } = trpc.thankYouNotes.list.useQuery({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    channel: filters.channel || undefined,
    hasDonation: filters.hasDonation || undefined,
    hasEvent: filters.hasEvent || undefined,
    limit: 100,
    offset: 0,
  });

  const notes = data?.notes || [];

  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      channel: '',
      hasDonation: false,
      hasEvent: false,
    });
  };

  const hasActiveFilters =
    filters.startDate ||
    filters.endDate ||
    filters.channel ||
    filters.hasDonation ||
    filters.hasEvent;

  return (
    <ProtectedPage requiredRoles={['admin', 'editor', 'submitter']}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Thank-You Notes</h1>
          <p className="text-lg text-gray-600">
            {data?.total || 0} total thank-you notes logged
          </p>
        </div>

        {/* Filters */}
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Filters</CardTitle>
              {hasActiveFilters && (
                <Button variant="outline" onClick={handleResetFilters}>
                  Reset Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-base font-semibold mb-2">From Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-base font-semibold mb-2">To Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>

              {/* Channel Filter */}
              <div>
                <label className="block text-base font-semibold mb-2">Channel</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={filters.channel}
                  onChange={(e) =>
                    setFilters({ ...filters, channel: e.target.value as any })
                  }
                >
                  <option value="">All Channels</option>
                  <option value="Card">Card</option>
                  <option value="Email">Email</option>
                  <option value="Text">Text</option>
                  <option value="Call">Call</option>
                  <option value="In-Person">In-Person</option>
                </select>
              </div>

              {/* Boolean Filters */}
              <div className="space-y-3">
                <label className="block text-base font-semibold mb-2">Context</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasDonation"
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    checked={filters.hasDonation}
                    onChange={(e) =>
                      setFilters({ ...filters, hasDonation: e.target.checked })
                    }
                  />
                  <label htmlFor="hasDonation" className="text-base cursor-pointer">
                    Has Donation
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasEvent"
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    checked={filters.hasEvent}
                    onChange={(e) =>
                      setFilters({ ...filters, hasEvent: e.target.checked })
                    }
                  />
                  <label htmlFor="hasEvent" className="text-base cursor-pointer">
                    Has Event
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card variant="outlined">
            <CardContent className="text-center py-12">
              <p className="text-lg">Loading thank-you notes...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card variant="outlined">
            <CardContent className="text-red-600">
              <p className="text-lg">Error loading thank-you notes: {error.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && notes.length === 0 && (
          <Card variant="outlined">
            <CardContent className="text-center py-12">
              <p className="text-xl text-gray-600 mb-4">
                {hasActiveFilters
                  ? 'No thank-you notes match your filters.'
                  : 'No thank-you notes have been logged yet.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="lg" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Table Display */}
        {!isLoading && !error && notes.length > 0 && (
          <Card variant="outlined">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-base font-bold text-gray-700">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-base font-bold text-gray-700">
                        Person
                      </th>
                      <th className="px-6 py-4 text-left text-base font-bold text-gray-700">
                        Channel
                      </th>
                      <th className="px-6 py-4 text-left text-base font-bold text-gray-700">
                        Subject
                      </th>
                      <th className="px-6 py-4 text-left text-base font-bold text-gray-700">
                        Donation
                      </th>
                      <th className="px-6 py-4 text-left text-base font-bold text-gray-700">
                        Event
                      </th>
                      <th className="px-6 py-4 text-left text-base font-bold text-gray-700">
                        Logged By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {notes.map((note: any) => (
                      <tr key={note.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-base">
                          {new Date(note.note_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-base">
                          {note.person_name ? (
                            <Link
                              href={`/people/${note.person_id}`}
                              className="text-primary-600 hover:underline font-medium"
                            >
                              {note.person_name}
                            </Link>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {note.channel}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-base max-w-xs truncate">
                          {note.subject || (
                            <span className="text-gray-400 italic">No subject</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-base">
                          {note.donation_id ? (
                            <Link
                              href={`/donations/${note.donation_id}`}
                              className="text-green-600 hover:underline"
                            >
                              View
                            </Link>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-base">
                          {note.event_id ? (
                            <Link
                              href={`/events/${note.event_id}`}
                              className="text-purple-600 hover:underline"
                            >
                              View
                            </Link>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-base text-gray-600">
                          {note.created_by_name || (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Load More */}
        {data && data.total > notes.length && (
          <div className="mt-6 text-center">
            <Button variant="outline" size="lg">
              Load More ({data.total - notes.length} remaining)
            </Button>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
