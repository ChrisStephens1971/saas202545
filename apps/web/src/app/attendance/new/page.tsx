'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';

export default function NewAttendanceSessionPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    category: 'SundayService' as 'SundayService' | 'SmallGroup' | 'Event' | 'Class' | 'Meeting' | 'Other',
    eventId: '',
    groupId: '',
    sessionDate: new Date().toISOString().split('T')[0],
    sessionTime: '',
  });
  const [error, setError] = useState('');

  // Fetch events and groups for linking
  const { data: eventsData } = trpc.events.list.useQuery({ limit: 100 });
  const { data: groupsData } = trpc.groups.list.useQuery({ limit: 100 });

  const createSession = trpc.attendance.createSession.useMutation({
    onSuccess: (data) => {
      router.push(`/attendance/${data.id}`);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.sessionDate) {
      setError('Name and date are required');
      return;
    }

    createSession.mutate({
      name: formData.name,
      category: formData.category,
      eventId: formData.eventId || undefined,
      groupId: formData.groupId || undefined,
      sessionDate: formData.sessionDate,
      sessionTime: formData.sessionTime || undefined,
    });
  };

  return (
    <ProtectedPage requiredRoles={['kiosk']}>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Attendance Session</h1>
        <p className="text-lg text-gray-600">
          Create a new attendance tracking session for a service, event, or meeting.
        </p>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-base text-red-600">{error}</p>
              </div>
            )}

            <Input
              label="Session Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="e.g., Sunday Morning Service"
            />

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as any })
                }
                required
              >
                <option value="SundayService">Sunday Service</option>
                <option value="SmallGroup">Small Group</option>
                <option value="Event">Event</option>
                <option value="Class">Class</option>
                <option value="Meeting">Meeting</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                type="date"
                label="Session Date"
                value={formData.sessionDate}
                onChange={(e) =>
                  setFormData({ ...formData, sessionDate: e.target.value })
                }
                required
              />
              <Input
                type="time"
                label="Session Time (optional)"
                value={formData.sessionTime}
                onChange={(e) =>
                  setFormData({ ...formData, sessionTime: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Link to Event (optional)
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={formData.eventId}
                  onChange={(e) =>
                    setFormData({ ...formData, eventId: e.target.value })
                  }
                >
                  <option value="">No event</option>
                  {eventsData?.events.map((event: any) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Link to Group (optional)
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={formData.groupId}
                  onChange={(e) =>
                    setFormData({ ...formData, groupId: e.target.value })
                  }
                >
                  <option value="">No group</option>
                  {groupsData?.groups.map((group: any) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> After creating the session, you'll be able to check people
                in and track attendance counts automatically.
              </p>
            </div>

            <div className="flex gap-4 pt-4 border-t">
              <Button type="submit" size="lg" disabled={createSession.isLoading}>
                {createSession.isLoading ? 'Creating...' : 'Create Session'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </ProtectedPage>
  );
}
