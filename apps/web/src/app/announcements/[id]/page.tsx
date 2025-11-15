'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AnnouncementForm } from '@/components/announcements/AnnouncementForm';

export default function AnnouncementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const announcementId = params.id as string;
  const utils = trpc.useContext();

  const [isEditing, setIsEditing] = useState(false);

  const { data: announcement, isLoading, error } = trpc.announcements.get.useQuery({
    id: announcementId,
  });

  const updateAnnouncement = trpc.announcements.update.useMutation({
    onSuccess: () => {
      utils.announcements.get.invalidate({ id: announcementId });
      utils.announcements.list.invalidate();
      setIsEditing(false);
    },
    onError: (error) => {
      alert(`Error updating announcement: ${error.message}`);
    },
  });

  const approveAnnouncement = trpc.announcements.approve.useMutation({
    onSuccess: () => {
      utils.announcements.get.invalidate({ id: announcementId });
      utils.announcements.list.invalidate();
      alert('Announcement approved successfully!');
    },
    onError: (error) => {
      alert(`Error approving announcement: ${error.message}`);
    },
  });

  const deleteAnnouncement = trpc.announcements.delete.useMutation({
    onSuccess: () => {
      utils.announcements.list.invalidate();
      router.push('/announcements');
    },
    onError: (error) => {
      alert(`Error deleting announcement: ${error.message}`);
    },
  });

  const handleUpdate = async (data: any) => {
    await updateAnnouncement.mutateAsync({
      id: announcementId,
      ...data,
    });
  };

  const handleApprove = async () => {
    if (confirm(`Approve this announcement?`)) {
      await approveAnnouncement.mutateAsync({ id: announcementId });
    }
  };

  const handleDelete = async () => {
    if (confirm(`Delete "${announcement?.title}"? This cannot be undone.`)) {
      await deleteAnnouncement.mutateAsync({ id: announcementId });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading announcement...</p>
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading announcement: {error?.message || 'Not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <AnnouncementForm
            initialData={announcement}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

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

  const isExpired = announcement.expiresAt && new Date(announcement.expiresAt) < new Date();
  const needsApproval = !announcement.approvedBy;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{announcement.title}</h1>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full text-base font-medium ${getPriorityColor(announcement.priority)}`}>
                {announcement.priority} Priority
              </span>
              {announcement.category && (
                <span className="px-4 py-2 bg-gray-100 text-gray-800 rounded-full text-base font-medium">
                  📁 {announcement.category}
                </span>
              )}
              {announcement.isActive ? (
                <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-base font-medium">
                  ✅ Active
                </span>
              ) : (
                <span className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-base font-medium">
                  Inactive
                </span>
              )}
              {isExpired && (
                <span className="px-4 py-2 bg-gray-400 text-white rounded-full text-base font-medium">
                  Expired
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.push('/announcements')}>
              Back to List
            </Button>
            <Button variant="primary" size="lg" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Approval Status */}
      {needsApproval && (
        <Card variant="elevated" className="mb-6 border-2 border-yellow-300">
          <CardContent className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold mb-1 text-yellow-800">⏳ Pending Approval</h3>
                <p className="text-base text-gray-600">
                  This announcement needs approval before it will be visible.
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={handleApprove}
                disabled={approveAnnouncement.isLoading}
              >
                {approveAnnouncement.isLoading ? 'Approving...' : '✅ Approve Announcement'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Announcement Content */}
      <Card variant="elevated" className="mb-6">
        <CardHeader>
          <CardTitle>Announcement Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Body */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Message</h3>
            <p className="text-base text-gray-700 whitespace-pre-wrap">{announcement.body}</p>
          </div>

          {/* Dates */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Display Period</h3>
            <div className="space-y-1">
              <p className="text-base">
                <span className="font-medium">Starts:</span>{' '}
                {new Date(announcement.startsAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              {announcement.expiresAt && (
                <p className="text-base">
                  <span className="font-medium">Expires:</span>{' '}
                  {new Date(announcement.expiresAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
              {!announcement.expiresAt && (
                <p className="text-base text-gray-600">
                  <span className="font-medium">Expires:</span> Never
                </p>
              )}
            </div>
          </div>

          {/* Approval Info */}
          {announcement.approvedBy && announcement.approvedAt && (
            <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold mb-2">Approval Information</h3>
              <p className="text-base text-gray-700">
                ✅ Approved on {new Date(announcement.approvedAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {new Date(announcement.createdAt).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Last Updated:</span>{' '}
                {new Date(announcement.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Announcement */}
      <Card variant="outlined">
        <CardContent className="py-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold mb-1 text-red-600">Delete Announcement</h3>
              <p className="text-base text-gray-600">
                This action cannot be undone.
              </p>
            </div>
            <Button
              variant="danger"
              size="lg"
              onClick={handleDelete}
              disabled={deleteAnnouncement.isLoading}
            >
              {deleteAnnouncement.isLoading ? 'Deleting...' : 'Delete Announcement'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
