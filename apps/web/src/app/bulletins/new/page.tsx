'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';

export default function NewBulletinPage() {
  const router = useRouter();
  const [serviceDate, setServiceDate] = useState('');
  const [error, setError] = useState('');

  const createBulletin = trpc.bulletins.create.useMutation({
    onSuccess: (data) => {
      router.push(`/bulletins/${data.id}`);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!serviceDate) {
      setError('Service date is required');
      return;
    }

    // Convert to ISO datetime (assume Sunday service at 10:00 AM)
    const dateTime = new Date(serviceDate + 'T10:00:00');

    createBulletin.mutate({
      serviceDate: dateTime.toISOString(),
    });
  };

  return (
    <ProtectedPage requiredRoles={['admin', 'editor']}>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Bulletin</h1>
        <p className="text-lg text-gray-600">
          Enter the service date to create a new bulletin issue.
        </p>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Bulletin Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="date"
              label="Service Date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              error={error}
              helper="Select the Sunday this bulletin is for"
              required
            />

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                size="lg"
                disabled={createBulletin.isLoading}
              >
                {createBulletin.isLoading ? 'Creating...' : 'Create Bulletin'}
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

      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-bold mb-2">What happens next?</h2>
        <ul className="space-y-2 text-base">
          <li>✓ A new bulletin issue will be created in &quot;Draft&quot; status</li>
          <li>✓ You can add service items (songs, prayers, scripture, etc.)</li>
          <li>✓ Add announcements and schedule events</li>
          <li>✓ Preview the bulletin before locking</li>
          <li>✓ Lock the bulletin by Thursday 2pm for Sunday printing</li>
        </ul>
      </div>
      </div>
    </ProtectedPage>
  );
}
