'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';

export default function NewPersonPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    memberSince: '',
    membershipStatus: 'member' as 'member' | 'attendee' | 'visitor',
  });
  const [error, setError] = useState('');

  const createPerson = trpc.people.create.useMutation({
    onSuccess: (data) => {
      router.push(`/people/${data.id}`);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName || !formData.lastName) {
      setError('First name and last name are required');
      return;
    }

    createPerson.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      memberSince: formData.memberSince || undefined,
      membershipStatus: formData.membershipStatus,
    });
  };

  return (
    <ProtectedPage requiredRoles={['admin', 'editor']}>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Add Person</h1>
        <p className="text-lg text-gray-600">
          Add a new church member, attendee, or visitor.
        </p>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Person Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-base text-red-600">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="First Name"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                type="email"
                label="Email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              <Input
                type="tel"
                label="Phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                type="date"
                label="Date of Birth"
                value={formData.dateOfBirth}
                onChange={(e) =>
                  setFormData({ ...formData, dateOfBirth: e.target.value })
                }
              />
              <Input
                type="date"
                label="Member Since"
                value={formData.memberSince}
                onChange={(e) =>
                  setFormData({ ...formData, memberSince: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Membership Status
              </label>
              <div className="flex gap-4">
                {['member', 'attendee', 'visitor'].map((status) => (
                  <label key={status} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="membershipStatus"
                      value={status}
                      checked={formData.membershipStatus === status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          membershipStatus: e.target.value as any,
                        })
                      }
                      className="w-6 h-6"
                    />
                    <span className="text-base">
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t">
              <Button type="submit" size="lg" disabled={createPerson.isLoading}>
                {createPerson.isLoading ? 'Adding...' : 'Add Person'}
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
