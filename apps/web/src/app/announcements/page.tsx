'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Link from 'next/link';

export default function AnnouncementsPage() {
  const utils = trpc.useContext();
  const [showExpired, setShowExpired] = useState(false);

  const { data: announcementsData, isLoading } = trpc.announcements.list.useQuery({
    includeExpired: showExpired,
    limit: 50,
  });

  const approveAnnouncement = trpc.announcements.approve.useMutation({
    onSuccess: () => {
      utils.announcements.list.invalidate();
    },
    onError: (error) => {
      alert(`Error approving announcement: ${error.message}`);
    },
  });

  const deleteAnnouncement = trpc.announcements.delete.useMutation({
    onSuccess: () => {
      utils.announcements.list.invalidate();
    },
    onError: (error) => {
      alert(`Error deleting announcement: ${error.message}`);
    },
  });

  const announcements = announcementsData?.announcements || [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-100 text-red-800';
      case 'High':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const handleApprove = async (id: string, title: string) => {
    if (confirm(`Approve announcement: "${title}"?`)) {
      await approveAnnouncement.mutateAsync({ id });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Delete announcement: "${title}"? This cannot be undone.`)) {
      await deleteAnnouncement.mutateAsync({ id });
    }
  };

  const isExpired = (expiresAt: Date | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Announcements</h1>
          <p className="text-lg text-gray-600">
            {announcements.length} announcements
          </p>
        </div>
        <Link href="/announcements/new">
          <Button variant="primary" size="lg">
            Create Announcement
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card variant="outlined" className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="showExpired"
              className="w-6 h-6"
              checked={showExpired}
              onChange={(e) => setShowExpired(e.target.checked)}
            />
            <label htmlFor="showExpired" className="text-base font-medium">
              Show expired announcements
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Announcements List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card variant="outlined">
            <CardContent className="text-center py-8">
              <p className="text-lg">Loading announcements...</p>
            </CardContent>
          </Card>
        ) : announcements.length === 0 ? (
          <Card variant="outlined">
            <CardContent className="text-center py-12">
              <p className="text-lg text-gray-600 mb-6">
                No announcements found.
              </p>
              <Link href="/announcements/new">
                <Button size="lg">Create First Announcement</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => {
            const expired = isExpired(announcement.expiresAt);
            const needsApproval = !announcement.approvedBy;

            return (
              <Card
                key={announcement.id}
                variant="elevated"
                className={`${expired ? 'opacity-60' : ''}`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle>{announcement.title}</CardTitle>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(announcement.priority)}`}>
                          {announcement.priority}
                        </span>
                        {!announcement.isActive && (
                          <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium">
                            Inactive
                          </span>
                        )}
                        {expired && (
                          <span className="px-3 py-1 bg-gray-400 text-white rounded-full text-sm font-medium">
                            Expired
                          </span>
                        )}
                        {needsApproval && (
                          <span className="px-3 py-1 bg-yellow-200 text-yellow-900 rounded-full text-sm font-medium">
                            ⏳ Pending Approval
                          </span>
                        )}
                        {!needsApproval && (
                          <span className="px-3 py-1 bg-green-200 text-green-900 rounded-full text-sm font-medium">
                            ✅ Approved
                          </span>
                        )}
                      </div>
                      <CardDescription>
                        {announcement.category && (
                          <span className="mr-3">📁 {announcement.category}</span>
                        )}
                        Starts: {new Date(announcement.startsAt).toLocaleDateString()}
                        {announcement.expiresAt && (
                          <> • Expires: {new Date(announcement.expiresAt).toLocaleDateString()}</>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {needsApproval && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApprove(announcement.id, announcement.title)}
                          disabled={approveAnnouncement.isLoading}
                        >
                          ✅ Approve
                        </Button>
                      )}
                      <Link href={`/announcements/${announcement.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(announcement.id, announcement.title)}
                        disabled={deleteAnnouncement.isLoading}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-base text-gray-700 whitespace-pre-wrap">
                    {announcement.body.length > 200
                      ? `${announcement.body.substring(0, 200)}...`
                      : announcement.body}
                  </p>
                  {announcement.approvedBy && announcement.approvedAt && (
                    <div className="mt-4 text-sm text-gray-600">
                      Approved on {new Date(announcement.approvedAt).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
