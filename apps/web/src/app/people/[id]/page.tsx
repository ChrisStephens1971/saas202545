'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { GivingSummarySection } from '@/components/people/GivingSummarySection';

export default function PersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const personId = params.id as string;
  const utils = trpc.useContext();

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteFormData, setNoteFormData] = useState({
    noteDate: new Date().toISOString().split('T')[0],
    channel: 'Email' as 'Card' | 'Email' | 'Text' | 'Call' | 'In-Person',
    subject: '',
    body: '',
  });

  const { data: person, isLoading, error } = trpc.people.get.useQuery({
    id: personId,
  });

  const { data: notesData } = trpc.thankYouNotes.list.useQuery({
    personId,
    limit: 50,
    offset: 0,
  });

  const createNote = trpc.thankYouNotes.create.useMutation({
    onSuccess: () => {
      utils.thankYouNotes.list.invalidate({ personId });
      setShowNoteForm(false);
      setNoteFormData({
        noteDate: new Date().toISOString().split('T')[0],
        channel: 'Email',
        subject: '',
        body: '',
      });
    },
    onError: (error) => {
      alert(`Error logging thank-you note: ${error.message}`);
    },
  });

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createNote.mutateAsync({
      personId,
      noteDate: noteFormData.noteDate,
      channel: noteFormData.channel,
      subject: noteFormData.subject || undefined,
      body: noteFormData.body || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading person...</p>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading person: {error?.message || 'Not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const notes = notesData?.notes || [];

  return (
    <ProtectedPage requiredRoles={['admin', 'editor', 'submitter']}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {person.firstName} {person.lastName}
              </h1>
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 bg-primary-100 text-primary-800 rounded-full text-base font-medium">
                  {person.membershipStatus?.charAt(0).toUpperCase() +
                    person.membershipStatus?.slice(1) || 'Unknown'}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => router.push('/people')}>
                Back to People
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  console.log('Edit person clicked', personId);
                  router.push(`/people/${personId}/edit`);
                }}
              >
                Edit Person
              </Button>
            </div>
          </div>
        </div>

        {/* Person Details */}
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {person.email && (
              <div>
                <span className="font-semibold">Email:</span>{' '}
                <a href={`mailto:${person.email}`} className="text-primary-600 hover:underline">
                  {person.email}
                </a>
              </div>
            )}
            {person.phone && (
              <div>
                <span className="font-semibold">Phone:</span>{' '}
                <a href={`tel:${person.phone}`} className="text-primary-600 hover:underline">
                  {person.phone}
                </a>
              </div>
            )}
            {person.dateOfBirth && (
              <div>
                <span className="font-semibold">Date of Birth:</span>{' '}
                {new Date(person.dateOfBirth).toLocaleDateString()}
              </div>
            )}
            {person.memberSince && (
              <div>
                <span className="font-semibold">Member Since:</span>{' '}
                {new Date(person.memberSince).toLocaleDateString()}
              </div>
            )}
            {person.envelopeNumber && (
              <div>
                <span className="font-semibold">Envelope Number:</span>{' '}
                {person.envelopeNumber}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Giving Summary Section */}
        <GivingSummarySection personId={personId} personName={`${person.firstName} ${person.lastName}`} />

        {/* Thank-You Notes Section */}
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Thank-You Notes ({notes.length})</CardTitle>
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowNoteForm(!showNoteForm)}
              >
                {showNoteForm ? 'Cancel' : 'Log Thank-You Note'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Note Form */}
            {showNoteForm && (
              <form onSubmit={handleNoteSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-base font-semibold mb-2">Date</label>
                      <input
                        type="date"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        value={noteFormData.noteDate}
                        onChange={(e) =>
                          setNoteFormData({ ...noteFormData, noteDate: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-base font-semibold mb-2">Channel</label>
                      <select
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        value={noteFormData.channel}
                        onChange={(e) =>
                          setNoteFormData({
                            ...noteFormData,
                            channel: e.target.value as any,
                          })
                        }
                      >
                        <option value="Card">Card</option>
                        <option value="Email">Email</option>
                        <option value="Text">Text</option>
                        <option value="Call">Call</option>
                        <option value="In-Person">In-Person</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-base font-semibold mb-2">Subject</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Brief subject..."
                      value={noteFormData.subject}
                      onChange={(e) =>
                        setNoteFormData({ ...noteFormData, subject: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-base font-semibold mb-2">Message</label>
                    <textarea
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      rows={4}
                      placeholder="Note details..."
                      value={noteFormData.body}
                      onChange={(e) =>
                        setNoteFormData({ ...noteFormData, body: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" disabled={createNote.isLoading}>
                      {createNote.isLoading ? 'Saving...' : 'Save Thank-You Note'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNoteForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* Notes List */}
            {notes.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No thank-you notes logged yet. Click &quot;Log Thank-You Note&quot; to add one.
              </p>
            ) : (
              <div className="space-y-3">
                {notes.map((note: any) => (
                  <div
                    key={note.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-semibold">
                          {new Date(note.note_date).toLocaleDateString()}
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {note.channel}
                        </span>
                        {note.donation_id && (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                            Donation
                          </span>
                        )}
                        {note.event_id && (
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                            Event
                          </span>
                        )}
                      </div>
                    </div>
                    {note.subject && (
                      <h4 className="font-semibold text-lg mb-1">{note.subject}</h4>
                    )}
                    {note.body && <p className="text-gray-700 whitespace-pre-wrap">{note.body}</p>}
                    {note.created_by_name && (
                      <p className="text-sm text-gray-500 mt-2">
                        Logged by {note.created_by_name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}
