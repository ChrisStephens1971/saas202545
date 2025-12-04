'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export default function CommunicationsPage() {
  const [statusFilter, setStatusFilter] = useState<
    'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled' | undefined
  >(undefined);
  const [showNewCampaignForm, setShowNewCampaignForm] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    communicationType: 'email' as 'email' | 'sms' | 'push',
    subject: '',
    body: '',
  });

  const { data, isLoading, error, refetch } = trpc.communications.listCampaigns.useQuery({
    status: statusFilter,
    limit: 50,
    offset: 0,
  });

  const createMutation = trpc.communications.createCampaign.useMutation({
    onSuccess: () => {
      refetch();
      setShowNewCampaignForm(false);
      setNewCampaign({
        name: '',
        communicationType: 'email',
        subject: '',
        body: '',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newCampaign);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading communications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading communications: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const campaigns = data?.campaigns || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Communications & Campaigns</h1>
        <Button size="lg" onClick={() => setShowNewCampaignForm(!showNewCampaignForm)}>
          {showNewCampaignForm ? 'Cancel' : 'Create Campaign'}
        </Button>
      </div>

      {/* Info Banner */}
      <Card variant="outlined" className="mb-6">
        <CardContent className="py-4">
          <p className="text-base text-gray-700">
            Send email and SMS campaigns to your church members. Track opens, clicks, and delivery
            status.
          </p>
        </CardContent>
      </Card>

      {/* New Campaign Form */}
      {showNewCampaignForm && (
        <Card variant="outlined" className="mb-6">
          <CardContent className="py-6">
            <h2 className="text-2xl font-semibold mb-4">Create Campaign</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-base font-medium mb-2">Campaign Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  required
                  maxLength={255}
                  placeholder="e.g., Sunday Service Reminder"
                />
              </div>

              <div>
                <label className="block text-base font-medium mb-2">Type</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                  value={newCampaign.communicationType}
                  onChange={(e) =>
                    setNewCampaign({
                      ...newCampaign,
                      communicationType: e.target.value as 'email' | 'sms' | 'push',
                    })
                  }
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="push">Push Notification</option>
                </select>
              </div>

              {newCampaign.communicationType === 'email' && (
                <div>
                  <label className="block text-base font-medium mb-2">Subject</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                    value={newCampaign.subject}
                    onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                    required={newCampaign.communicationType === 'email'}
                    maxLength={255}
                  />
                </div>
              )}

              <div>
                <label className="block text-base font-medium mb-2">
                  Message Body
                  {newCampaign.communicationType === 'sms' && (
                    <span className="text-sm text-gray-500 ml-2">(160 char limit for SMS)</span>
                  )}
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                  rows={6}
                  value={newCampaign.body}
                  onChange={(e) => setNewCampaign({ ...newCampaign, body: e.target.value })}
                  required
                  maxLength={newCampaign.communicationType === 'sms' ? 160 : undefined}
                />
                {newCampaign.communicationType === 'sms' && (
                  <p className="text-sm text-gray-500 mt-1">
                    {newCampaign.body.length}/160 characters
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button type="submit" size="lg" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Campaign (Draft)'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setShowNewCampaignForm(false)}
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

      {/* Status Filter */}
      <div className="mb-6 max-w-md">
        <label className="block text-base font-medium mb-2">Status Filter</label>
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
          value={statusFilter || ''}
          onChange={(e) => setStatusFilter((e.target.value as any) || undefined)}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="sending">Sending</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Results Count */}
      <p className="text-base text-gray-600 mb-4">
        {data?.total || 0} campaign{data?.total !== 1 ? 's' : ''} found
      </p>

      {campaigns.length === 0 ? (
        <Card variant="outlined">
          <CardContent className="text-center py-12">
            <p className="text-xl text-gray-600 mb-6">
              {statusFilter
                ? `No ${statusFilter} campaigns found.`
                : 'No campaigns yet. Create your first campaign to get started.'}
            </p>
            {!showNewCampaignForm && (
              <Button size="lg" onClick={() => setShowNewCampaignForm(true)}>
                Create First Campaign
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign: any) => (
            <Card key={campaign.id} variant="elevated" className="hover:shadow-xl transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{campaign.name}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium uppercase ${
                          campaign.communication_type === 'email'
                            ? 'bg-blue-100 text-blue-800'
                            : campaign.communication_type === 'sms'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {campaign.communication_type}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          campaign.status === 'sent'
                            ? 'bg-green-100 text-green-800'
                            : campaign.status === 'sending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : campaign.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : campaign.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                    </div>

                    {campaign.subject && (
                      <p className="text-base font-medium text-gray-700 mb-1">
                        Subject: {campaign.subject}
                      </p>
                    )}

                    <p className="text-base text-gray-600 mb-3 line-clamp-2">{campaign.body}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
                      {campaign.scheduled_at && (
                        <span>
                          Scheduled: {new Date(campaign.scheduled_at).toLocaleString()}
                        </span>
                      )}
                      {campaign.sent_at && (
                        <span>Sent: {new Date(campaign.sent_at).toLocaleString()}</span>
                      )}
                    </div>

                    {/* Campaign Stats */}
                    {campaign.status === 'sent' && campaign.total_recipients > 0 && (
                      <div className="grid grid-cols-5 gap-3 mt-3">
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-700">
                            {campaign.total_recipients}
                          </p>
                          <p className="text-xs text-gray-500">Recipients</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-600">{campaign.sent_count}</p>
                          <p className="text-xs text-gray-500">Sent</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-600">
                            {campaign.delivered_count}
                          </p>
                          <p className="text-xs text-gray-500">Delivered</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-purple-600">
                            {campaign.opened_count}
                          </p>
                          <p className="text-xs text-gray-500">Opened</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-orange-600">
                            {campaign.clicked_count}
                          </p>
                          <p className="text-xs text-gray-500">Clicked</p>
                        </div>
                      </div>
                    )}

                    {/* Delivery Rates */}
                    {campaign.status === 'sent' && campaign.total_recipients > 0 && (
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 w-24">Delivery:</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{
                                width: `${
                                  (campaign.delivered_count / campaign.total_recipients) * 100
                                }%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-700 w-12 text-right">
                            {Math.round(
                              (campaign.delivered_count / campaign.total_recipients) * 100
                            )}
                            %
                          </span>
                        </div>
                        {campaign.communication_type === 'email' && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 w-24">Open Rate:</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full"
                                style={{
                                  width: `${
                                    (campaign.opened_count / campaign.delivered_count) * 100 || 0
                                  }%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700 w-12 text-right">
                              {Math.round(
                                (campaign.opened_count / campaign.delivered_count) * 100 || 0
                              )}
                              %
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && data.total > campaigns.length && (
        <div className="mt-6 text-center">
          <Button variant="outline" size="lg">
            Load More ({data.total - campaigns.length} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
