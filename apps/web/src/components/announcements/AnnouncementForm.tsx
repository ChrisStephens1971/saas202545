'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const PRIORITY_LEVELS = ['Urgent', 'High', 'Normal'] as const;

interface AnnouncementFormProps {
  initialData?: {
    id?: string;
    title: string;
    body: string;
    priority: 'Urgent' | 'High' | 'Normal';
    category?: string | null;
    isActive: boolean;
    startsAt: Date;
    expiresAt?: Date | null;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function AnnouncementForm({ initialData, onSubmit, onCancel }: AnnouncementFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    body: initialData?.body || '',
    priority: initialData?.priority || 'Normal',
    category: initialData?.category || '',
    isActive: initialData?.isActive ?? true,
    startDate: initialData?.startsAt
      ? new Date(initialData.startsAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    expireDate: initialData?.expiresAt
      ? new Date(initialData.expiresAt).toISOString().split('T')[0]
      : '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.body.trim()) {
      newErrors.body = 'Body text is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const startsAt = new Date(formData.startDate + 'T00:00:00').toISOString();
      const expiresAt = formData.expireDate
        ? new Date(formData.expireDate + 'T23:59:59').toISOString()
        : undefined;

      await onSubmit({
        title: formData.title,
        body: formData.body,
        priority: formData.priority,
        category: formData.category || undefined,
        isActive: formData.isActive,
        startsAt,
        expiresAt,
      });
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>{initialData?.id ? 'Edit' : 'Create'} Announcement</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <Input
            label="Announcement Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={errors.title}
            required
            placeholder="e.g., Upcoming Church Picnic"
          />

          {/* Body */}
          <div>
            <label className="block text-base font-medium mb-2">
              Announcement Text <span className="text-red-600">*</span>
            </label>
            <textarea
              className={`w-full px-4 py-3 text-base border-2 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 min-h-[150px] ${
                errors.body ? 'border-red-500' : 'border-gray-300'
              }`}
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Enter the full announcement text..."
              required
            />
            {errors.body && (
              <p className="text-red-600 text-sm mt-1">{errors.body}</p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-base font-medium mb-2">Priority</label>
            <select
              className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
            >
              {PRIORITY_LEVELS.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-600 mt-1">
              {formData.priority === 'Urgent' && '🔴 Urgent announcements appear first'}
              {formData.priority === 'High' && '🟠 High priority announcements are prominent'}
              {formData.priority === 'Normal' && '🟢 Normal priority'}
            </p>
          </div>

          {/* Category */}
          <Input
            label="Category (Optional)"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., Events, Volunteer, General"
          />

          {/* Start Date */}
          <Input
            label="Display Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            error={errors.startDate}
            required
          />

          {/* Expiration Date */}
          <Input
            label="Expiration Date (Optional)"
            type="date"
            value={formData.expireDate}
            onChange={(e) => setFormData({ ...formData, expireDate: e.target.value })}
          />
          {formData.expireDate && (
            <p className="text-sm text-gray-600 -mt-4">
              Announcement will automatically hide after this date
            </p>
          )}

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              className="w-6 h-6"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            <label htmlFor="isActive" className="text-base font-medium">
              Active (visible to members)
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Announcement' : 'Create Announcement'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
