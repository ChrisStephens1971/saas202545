'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function NewDonationPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    personId: '',
    donorName: '',
    donorEmail: '',
    amount: '',
    donationMethod: 'cash' as any,
    donationFrequency: 'one_time' as any,
    status: 'completed' as any,
    campaignId: '',
    fundName: '',
    donationDate: new Date().toISOString().split('T')[0],
    checkNumber: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const { data: peopleData } = trpc.people.list.useQuery({ limit: 100, offset: 0 });
  const { data: campaignsData } = trpc.donations.listCampaigns.useQuery({ limit: 100, offset: 0 });

  const createDonation = trpc.donations.create.useMutation({
    onSuccess: (data) => {
      router.push(`/donations/${data.id}`);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid donation amount');
      return;
    }

    createDonation.mutate({
      personId: formData.personId || undefined,
      donorName: formData.donorName || undefined,
      donorEmail: formData.donorEmail || undefined,
      amount: parseFloat(formData.amount),
      donationMethod: formData.donationMethod,
      donationFrequency: formData.donationFrequency,
      status: formData.status,
      campaignId: formData.campaignId || undefined,
      fundName: formData.fundName || undefined,
      donationDate: formData.donationDate,
      checkNumber: formData.checkNumber || undefined,
      notes: formData.notes || undefined,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Record Donation</h1>
        <p className="text-lg text-gray-600">
          Record a new donation or gift received.
        </p>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Donation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-base text-red-600">{error}</p>
              </div>
            )}

            {/* Donor Selection */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Donor (from People)
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={formData.personId}
                onChange={(e) => setFormData({ ...formData, personId: e.target.value })}
              >
                <option value="">Anonymous / Non-person donor</option>
                {peopleData?.people.map((person: any) => (
                  <option key={person.id} value={person.id}>
                    {person.firstName} {person.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Or Manual Donor Info */}
            {!formData.personId && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Donor Name (optional)"
                  value={formData.donorName}
                  onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                  placeholder="John Doe"
                />
                <Input
                  type="email"
                  label="Donor Email (optional)"
                  value={formData.donorEmail}
                  onChange={(e) => setFormData({ ...formData, donorEmail: e.target.value })}
                  placeholder="donor@example.com"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <Input
                type="number"
                label="Amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                placeholder="100.00"
                step="0.01"
                min="0.01"
              />
              <Input
                type="date"
                label="Donation Date"
                value={formData.donationDate}
                onChange={(e) => setFormData({ ...formData, donationDate: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  value={formData.donationMethod}
                  onChange={(e) => setFormData({ ...formData, donationMethod: e.target.value as any })}
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="online">Online</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  required
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            {formData.donationMethod === 'check' && (
              <Input
                label="Check Number"
                value={formData.checkNumber}
                onChange={(e) => setFormData({ ...formData, checkNumber: e.target.value })}
                placeholder="12345"
              />
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Campaign (optional)
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  value={formData.campaignId}
                  onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                >
                  <option value="">General Fund</option>
                  {campaignsData?.campaigns.map((campaign: any) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Fund Name (optional)"
                value={formData.fundName}
                onChange={(e) => setFormData({ ...formData, fundName: e.target.value })}
                placeholder="e.g., Building Fund"
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this donation..."
              />
            </div>

            <div className="flex gap-4 pt-4 border-t">
              <Button type="submit" size="lg" disabled={createDonation.isLoading}>
                {createDonation.isLoading ? 'Recording...' : 'Record Donation'}
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
  );
}
