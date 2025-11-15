'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function NewGroupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    leaderId: '',
    isPublic: true,
    maxMembers: '',
  });
  const [error, setError] = useState('');

  // Fetch people for leader selection
  const { data: peopleData } = trpc.people.list.useQuery({
    limit: 100,
    offset: 0,
  });

  const createGroup = trpc.groups.create.useMutation({
    onSuccess: (data) => {
      router.push(`/groups/${data.id}`);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name) {
      setError('Group name is required');
      return;
    }

    createGroup.mutate({
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category || undefined,
      leaderId: formData.leaderId || undefined,
      isPublic: formData.isPublic,
      maxMembers: formData.maxMembers ? parseInt(formData.maxMembers) : undefined,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Group</h1>
        <p className="text-lg text-gray-600">
          Create a new small group, ministry team, or fellowship group.
        </p>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Group Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-base text-red-600">{error}</p>
              </div>
            )}

            <Input
              label="Group Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="e.g., Young Adults Fellowship"
            />

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the purpose and activities of this group..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                >
                  <option value="">Select category</option>
                  <option value="small-group">Small Group</option>
                  <option value="ministry">Ministry</option>
                  <option value="service">Service</option>
                  <option value="study">Study</option>
                  <option value="fellowship">Fellowship</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Leader
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={formData.leaderId}
                  onChange={(e) =>
                    setFormData({ ...formData, leaderId: e.target.value })
                  }
                >
                  <option value="">No leader assigned</option>
                  {peopleData?.people.map((person: any) => (
                    <option key={person.id} value={person.id}>
                      {person.firstName} {person.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              type="number"
              label="Max Members (optional)"
              value={formData.maxMembers}
              onChange={(e) =>
                setFormData({ ...formData, maxMembers: e.target.value })
              }
              placeholder="Leave empty for unlimited"
              min="1"
            />

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) =>
                    setFormData({ ...formData, isPublic: e.target.checked })
                  }
                  className="w-6 h-6"
                />
                <span className="text-base font-medium text-gray-700">
                  Public Group (visible to all members)
                </span>
              </label>
              <p className="text-sm text-gray-500 mt-1 ml-8">
                Private groups are only visible to members and leaders
              </p>
            </div>

            <div className="flex gap-4 pt-4 border-t">
              <Button type="submit" size="lg" disabled={createGroup.isLoading}>
                {createGroup.isLoading ? 'Creating...' : 'Create Group'}
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
