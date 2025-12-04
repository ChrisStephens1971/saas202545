'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';

export default function AttendanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [guestCount, setGuestCount] = useState('0');
  const [notes, setNotes] = useState('');

  const { data: session, isLoading, error, refetch } = trpc.attendance.getSession.useQuery({ id: sessionId });
  const { data: peopleData } = trpc.people.list.useQuery({ limit: 100, offset: 0 });

  const deleteSession = trpc.attendance.deleteSession.useMutation({
    onSuccess: () => {
      router.push('/attendance');
    },
  });

  const checkIn = trpc.attendance.checkIn.useMutation({
    onSuccess: () => {
      setShowCheckIn(false);
      setSelectedPersonId('');
      setGuestCount('0');
      setNotes('');
      refetch();
    },
  });

  const checkOut = trpc.attendance.checkOut.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleCheckIn = () => {
    if (!selectedPersonId) return;
    checkIn.mutate({
      sessionId,
      personId: selectedPersonId,
      guestCount: parseInt(guestCount) || 0,
      notes: notes || undefined,
    });
  };

  const handleCheckOut = (personId: string) => {
    if (confirm('Are you sure you want to check out this person?')) {
      checkOut.mutate({ sessionId, personId });
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      deleteSession.mutate({ id: sessionId });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading session...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading session: {error?.message || 'Session not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const records = session.records || [];
  const checkedInPersonIds = new Set(records.map((r: any) => r.person_id));

  return (
    <ProtectedPage requiredRoles={['kiosk', 'admin', 'editor']}>
      <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{session.name}</h1>
          <div className="flex gap-2 items-center">
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {session.category}
            </span>
            <span className="text-gray-600">
              {new Date(session.session_date).toLocaleDateString()}
              {session.session_time && ` at ${session.session_time}`}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.push('/attendance')}>
            Back to Sessions
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete Session
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card variant="elevated">
            <CardContent className="text-center py-6">
              <p className="text-4xl font-bold text-primary-600">{session.total_count || 0}</p>
              <p className="text-sm text-gray-600 mt-2">Total Attendance</p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="text-center py-6">
              <p className="text-4xl font-bold text-green-600">{session.member_count || 0}</p>
              <p className="text-sm text-gray-600 mt-2">Members</p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="text-center py-6">
              <p className="text-4xl font-bold text-blue-600">{session.visitor_count || 0}</p>
              <p className="text-sm text-gray-600 mt-2">Visitors</p>
            </CardContent>
          </Card>
        </div>

        {/* Session Info */}
        {(session.event_title || session.group_name) && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Session Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {session.event_title && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Event</h3>
                    <p className="text-base">{session.event_title}</p>
                  </div>
                )}
                {session.group_name && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Group</h3>
                    <p className="text-base">{session.group_name}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Check-In */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Attendance ({records.length})</CardTitle>
              <Button size="sm" onClick={() => setShowCheckIn(!showCheckIn)}>
                {showCheckIn ? 'Cancel' : 'Check In Person'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showCheckIn && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  value={selectedPersonId}
                  onChange={(e) => setSelectedPersonId(e.target.value)}
                >
                  <option value="">Select a person...</option>
                  {peopleData?.people
                    .filter((p: any) => !checkedInPersonIds.has(p.id))
                    .map((person: any) => (
                      <option key={person.id} value={person.id}>
                        {person.firstName} {person.lastName}
                      </option>
                    ))}
                </select>
                <Input
                  type="number"
                  placeholder="Guest count (optional)"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  min="0"
                />
                <Input
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <Button
                  onClick={handleCheckIn}
                  disabled={!selectedPersonId || checkIn.isLoading}
                  className="w-full"
                >
                  {checkIn.isLoading ? 'Checking In...' : 'Check In'}
                </Button>
                {checkIn.error && (
                  <p className="text-sm text-red-600">{checkIn.error.message}</p>
                )}
              </div>
            )}

            {records.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No one checked in yet.</p>
            ) : (
              <div className="space-y-3">
                {records.map((record: any) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-primary-600">
                          {record.first_name?.[0] || '?'}
                          {record.last_name?.[0] || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">
                          {record.first_name} {record.last_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {record.email}
                          {record.membership_status && (
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                              record.membership_status === 'member'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {record.membership_status}
                            </span>
                          )}
                        </p>
                        {record.guest_count > 0 && (
                          <p className="text-sm text-gray-600">
                            +{record.guest_count} guest{record.guest_count !== 1 ? 's' : ''}
                          </p>
                        )}
                        {record.notes && (
                          <p className="text-sm text-gray-600 italic">{record.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {new Date(record.checked_in_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleCheckOut(record.person_id)}
                        disabled={checkOut.isLoading}
                      >
                        Check Out
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </ProtectedPage>
  );
}
