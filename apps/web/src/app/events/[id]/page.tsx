'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EventForm } from '@/components/events/EventForm';
import { ProtectedPage } from '@/components/auth/ProtectedPage';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const utils = trpc.useContext();

  const [isEditing, setIsEditing] = useState(false);

  const { data: event, isLoading, error } = trpc.events.get.useQuery({
    id: eventId,
  });

  const updateEvent = trpc.events.update.useMutation({
    onSuccess: () => {
      utils.events.get.invalidate({ id: eventId });
      utils.events.list.invalidate();
      setIsEditing(false);
    },
    onError: (error) => {
      alert(`Error updating event: ${error.message}`);
    },
  });

  const deleteEvent = trpc.events.delete.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      router.push('/events');
    },
    onError: (error) => {
      alert(`Error deleting event: ${error.message}`);
    },
  });

  const handleUpdate = async (data: any) => {
    await updateEvent.mutateAsync({
      id: eventId,
      ...data,
    });
  };

  const handleDelete = async () => {
    if (confirm(`Delete "${event?.title}"? This cannot be undone.`)) {
      await deleteEvent.mutateAsync({ id: eventId });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading event...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading event: {error?.message || 'Not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <EventForm
            initialData={event}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  const formatDateTime = (date: Date | string, allDay: boolean) => {
    const d = new Date(date);
    if (allDay) {
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return d.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <ProtectedPage requiredRoles={['admin', 'editor', 'submitter']}>
      <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
            <div className="flex items-center gap-3">
              <span className="px-4 py-2 bg-primary-100 text-primary-800 rounded-full text-base font-medium">
                📅 {event.allDay ? 'All Day' : 'Timed Event'}
              </span>
              {event.isPublic && (
                <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-base font-medium">
                  🌐 Public
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.push('/events')}>
              Back to Calendar
            </Button>
            <Button variant="primary" size="lg" onClick={() => setIsEditing(true)}>
              Edit Event
            </Button>
          </div>
        </div>
      </div>

      {/* Event Details */}
      <Card variant="elevated" className="mb-6">
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description */}
          {event.description && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-base text-gray-700 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Date & Time */}
          <div>
            <h3 className="text-lg font-semibold mb-2">When</h3>
            <div className="space-y-2">
              <p className="text-base flex items-center gap-2">
                <span className="font-medium">Starts:</span>
                {formatDateTime(event.startAt, event.allDay)}
              </p>
              {event.endAt && (
                <p className="text-base flex items-center gap-2">
                  <span className="font-medium">Ends:</span>
                  {formatDateTime(event.endAt, event.allDay)}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          {event.locationName && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Location</h3>
              <p className="text-base text-gray-700">{event.locationName}</p>
              {event.locationAddress && (
                <p className="text-base text-gray-600">{event.locationAddress}</p>
              )}
            </div>
          )}

          {/* RSVP */}
          {event.allowRsvp && (
            <div>
              <h3 className="text-lg font-semibold mb-2">RSVP</h3>
              <p className="text-base text-gray-700">
                RSVP is enabled
                {event.rsvpLimit && ` (Limited to ${event.rsvpLimit} attendees)`}
              </p>
              <Button variant="primary" size="lg" className="mt-3">
                RSVP for Event
              </Button>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {new Date(event.createdAt).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Last Updated:</span>{' '}
                {new Date(event.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Event */}
      <Card variant="outlined">
        <CardContent className="py-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold mb-1 text-red-600">Delete Event</h3>
              <p className="text-base text-gray-600">
                This action cannot be undone.
              </p>
            </div>
            <Button
              variant="danger"
              size="lg"
              onClick={handleDelete}
              disabled={deleteEvent.isLoading}
            >
              {deleteEvent.isLoading ? 'Deleting...' : 'Delete Event'}
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </ProtectedPage>
  );
}
