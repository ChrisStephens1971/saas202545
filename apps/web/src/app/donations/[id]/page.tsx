'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';

export default function DonationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const donationId = params.id as string;
  const utils = trpc.useContext();

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteFormData, setNoteFormData] = useState({
    noteDate: new Date().toISOString().split('T')[0],
    channel: 'Email' as 'Card' | 'Email' | 'Text' | 'Call' | 'In-Person',
    subject: '',
    body: '',
  });

  const { data: donation, isLoading, error } = trpc.donations.get.useQuery({
    id: donationId,
  });

  const { data: notesData } = trpc.thankYouNotes.list.useQuery({
    donationId,
    limit: 50,
    offset: 0,
  });

  const createNote = trpc.thankYouNotes.create.useMutation({
    onSuccess: () => {
      utils.thankYouNotes.list.invalidate({ donationId });
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
    if (!donation?.person_id) {
      alert('Cannot create thank-you note: donor information missing');
      return;
    }
    await createNote.mutateAsync({
      personId: donation.person_id,
      donationId,
      noteDate: noteFormData.noteDate,
      channel: noteFormData.channel,
      subject: noteFormData.subject || undefined,
      body: noteFormData.body || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading donation...</p>
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading donation: {error?.message || 'Not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const notes = notesData?.notes || [];
  const donorName = donation.first_name && donation.last_name
    ? `${donation.first_name} ${donation.last_name}`
    : donation.donor_name || 'Anonymous';

  return (
    <ProtectedPage requiredRoles={['admin', 'editor', 'submitter']}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                ${parseFloat(donation.amount).toFixed(2)} Donation
              </h1>
              <div className="flex items-center gap-3">
                <span
                  className={`px-4 py-2 rounded-full text-base font-medium ${
                    donation.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : donation.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                </span>
              </div>
            </div>
            <Button variant="secondary" onClick={() => router.push('/donations')}>
              Back to Donations
            </Button>
          </div>
        </div>

        {/* Donation Details */}
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <CardTitle>Donation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="font-semibold">Donor:</span> {donorName}
            </div>
            <div>
              <span className="font-semibold">Amount:</span> ${parseFloat(donation.amount).toFixed(2)}
            </div>
            <div>
              <span className="font-semibold">Date:</span>{' '}
              {new Date(donation.donation_date).toLocaleDateString()}
            </div>
            <div>
              <span className="font-semibold">Method:</span>{' '}
              {donation.donation_method.replace('_', ' ')}
            </div>
            {donation.campaign_name && (
              <div>
                <span className="font-semibold">Campaign:</span> {donation.campaign_name}
              </div>
            )}
            {donation.fund_name && (
              <div>
                <span className="font-semibold">Fund:</span> {donation.fund_name}
              </div>
            )}
            {donation.notes && (
              <div>
                <span className="font-semibold">Notes:</span>
                <p className="text-gray-700 mt-1">{donation.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Thank-You Notes Section */}
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Thank-You Notes ({notes.length})</CardTitle>
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowNoteForm(!showNoteForm)}
                disabled={!donation.person_id}
              >
                {showNoteForm ? 'Cancel' : 'Log Thank-You for Donation'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!donation.person_id && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  Cannot log thank-you notes for anonymous donations.
                </p>
              </div>
            )}

            {/* Note Form */}
            {showNoteForm && donation.person_id && (
              <form onSubmit={handleNoteSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-4">
                  Logging thank-you note for <strong>{donorName}</strong> regarding this donation.
                </p>
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
                      placeholder="Thank you for your generous donation"
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
                      placeholder="Thank-you message..."
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
                No thank-you logged yet for this donation.
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
