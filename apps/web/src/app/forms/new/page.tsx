'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';

export default function NewFormPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    allowMultipleSubmissions: false,
    requireLogin: false,
    notification_email: '',
  });
  const [error, setError] = useState('');

  const createForm = trpc.forms.create.useMutation({
    onSuccess: (data) => {
      router.push(`/forms/${data.id}`);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title) {
      setError('Form title is required');
      return;
    }

    createForm.mutate({
      title: formData.title,
      description: formData.description || undefined,
      allow_multiple_submissions: formData.allowMultipleSubmissions,
      require_login: formData.requireLogin,
      notification_email: formData.notification_email || undefined,
    });
  };

  return (
    <ProtectedPage requiredRoles={['admin', 'editor']}>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Form</h1>
        <p className="text-lg text-gray-600">
          Create a new form for surveys, registrations, or data collection.
        </p>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Form Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-base text-red-600">{error}</p>
              </div>
            )}

            <Input
              label="Form Title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              placeholder="e.g., Volunteer Registration"
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
                placeholder="Describe the purpose of this form..."
              />
            </div>

            <Input
              type="email"
              label="Notification Email (optional)"
              value={formData.notification_email}
              onChange={(e) =>
                setFormData({ ...formData, notification_email: e.target.value })
              }
              placeholder="admin@church.org"
              // helperText="Receive an email when someone submits this form"
            />

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requireLogin}
                  onChange={(e) =>
                    setFormData({ ...formData, requireLogin: e.target.checked })
                  }
                  className="w-6 h-6"
                />
                <span className="text-base font-medium text-gray-700">
                  Require Login
                </span>
              </label>
              <p className="text-sm text-gray-500 ml-8">
                Only logged-in users can submit this form
              </p>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowMultipleSubmissions}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allowMultipleSubmissions: e.target.checked,
                    })
                  }
                  className="w-6 h-6"
                />
                <span className="text-base font-medium text-gray-700">
                  Allow Multiple Submissions
                </span>
              </label>
              <p className="text-sm text-gray-500 ml-8">
                Users can submit this form more than once
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> After creating the form, you&apos;ll be able to add custom fields
                (text, email, dropdown, etc.) on the form detail page.
              </p>
            </div>

            <div className="flex gap-4 pt-4 border-t">
              <Button type="submit" size="lg" disabled={createForm.isLoading}>
                {createForm.isLoading ? 'Creating...' : 'Create Form'}
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
