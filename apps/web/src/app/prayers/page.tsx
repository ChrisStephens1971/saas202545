'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export default function PrayersPage() {
  const [statusFilter, setStatusFilter] = useState<'active' | 'answered' | 'archived' | undefined>(
    'active'
  );
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    isUrgent: false,
    visibility: 'public' as 'public' | 'leaders_only' | 'private',
  });

  const { data, isLoading, error, refetch } = trpc.prayers.list.useQuery({
    status: statusFilter,
    isUrgent: showUrgentOnly || undefined,
    limit: 50,
    offset: 0,
  });

  const { data: stats } = trpc.prayers.getStats.useQuery();

  const createMutation = trpc.prayers.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowNewRequestForm(false);
      setNewRequest({ title: '', description: '', isUrgent: false, visibility: 'public' });
    },
  });

  const recordPrayerMutation = trpc.prayers.recordPrayer.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newRequest);
  };

  const handlePray = (requestId: string) => {
    recordPrayerMutation.mutate({ prayerRequestId: requestId });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading prayer requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading prayer requests: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const requests = data?.requests || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Prayer Requests</h1>
        <Button size="lg" onClick={() => setShowNewRequestForm(!showNewRequestForm)}>
          {showNewRequestForm ? 'Cancel' : 'Submit Prayer Request'}
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card variant="elevated">
            <CardContent className="text-center py-6">
              <p className="text-3xl font-bold text-primary-600">{stats.active}</p>
              <p className="text-sm text-gray-600 mt-2">Active Requests</p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="text-center py-6">
              <p className="text-3xl font-bold text-green-600">{stats.answered}</p>
              <p className="text-sm text-gray-600 mt-2">Answered</p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="text-center py-6">
              <p className="text-3xl font-bold text-red-600">{stats.urgent}</p>
              <p className="text-sm text-gray-600 mt-2">Urgent</p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="text-center py-6">
              <p className="text-3xl font-bold text-blue-600">{stats.total_prayers}</p>
              <p className="text-sm text-gray-600 mt-2">Total Prayers</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Request Form */}
      {showNewRequestForm && (
        <Card variant="outlined" className="mb-6">
          <CardContent className="py-6">
            <h2 className="text-2xl font-semibold mb-4">Submit Prayer Request</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-base font-medium mb-2">Title</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                  value={newRequest.title}
                  onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                  required
                  maxLength={255}
                />
              </div>

              <div>
                <label className="block text-base font-medium mb-2">Description</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                  rows={4}
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-base font-medium mb-2">Visibility</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                  value={newRequest.visibility}
                  onChange={(e) =>
                    setNewRequest({
                      ...newRequest,
                      visibility: e.target.value as 'public' | 'leaders_only' | 'private',
                    })
                  }
                >
                  <option value="public">Public - Everyone can see</option>
                  <option value="leaders_only">Leaders Only</option>
                  <option value="private">Private - Only me</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isUrgent"
                  className="w-5 h-5"
                  checked={newRequest.isUrgent}
                  onChange={(e) => setNewRequest({ ...newRequest, isUrgent: e.target.checked })}
                />
                <label htmlFor="isUrgent" className="text-base font-medium">
                  Mark as Urgent
                </label>
              </div>

              <div className="flex gap-3">
                <Button type="submit" size="lg" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Submitting...' : 'Submit Prayer Request'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setShowNewRequestForm(false)}
                >
                  Cancel
                </Button>
              </div>

              {createMutation.error && (
                <p className="text-red-600 text-base">Error: {createMutation.error.message}</p>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 max-w-md">
          <label className="block text-base font-medium mb-2">Status</label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter((e.target.value as any) || undefined)}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="answered">Answered</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5"
              checked={showUrgentOnly}
              onChange={(e) => setShowUrgentOnly(e.target.checked)}
            />
            <span className="text-base font-medium">Urgent Only</span>
          </label>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-base text-gray-600 mb-4">
        {data?.total || 0} prayer request{data?.total !== 1 ? 's' : ''} found
      </p>

      {requests.length === 0 ? (
        <Card variant="outlined">
          <CardContent className="text-center py-12">
            <p className="text-xl text-gray-600 mb-6">
              {statusFilter || showUrgentOnly
                ? 'No prayer requests match your filters.'
                : 'No prayer requests yet. Submit one to get started.'}
            </p>
            {!showNewRequestForm && (
              <Button size="lg" onClick={() => setShowNewRequestForm(true)}>
                Submit First Prayer Request
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request: any) => (
            <Card
              key={request.id}
              variant="elevated"
              className={`${request.is_urgent ? 'border-2 border-red-400' : ''}`}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{request.title}</h3>
                      {request.is_urgent && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">
                          URGENT
                        </span>
                      )}
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          request.status === 'active'
                            ? 'bg-blue-100 text-blue-800'
                            : request.status === 'answered'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>

                    <p className="text-base text-gray-700 mb-3">{request.description}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        Requested by:{' '}
                        {request.first_name && request.last_name
                          ? `${request.first_name} ${request.last_name}`
                          : request.requester_name || 'Anonymous'}
                      </span>
                      <span>{new Date(request.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                        {request.prayer_count || 0} people prayed
                      </span>
                    </div>
                  </div>

                  <div className="ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePray(request.id)}
                      disabled={recordPrayerMutation.isPending}
                    >
                      {recordPrayerMutation.isPending ? 'Praying...' : 'I Prayed'}
                    </Button>
                  </div>
                </div>

                {request.status === 'answered' && request.answer_note && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-semibold text-green-700 mb-1">Answer:</p>
                    <p className="text-base text-gray-700">{request.answer_note}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && data.total > requests.length && (
        <div className="mt-6 text-center">
          <Button variant="outline" size="lg">
            Load More ({data.total - requests.length} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
