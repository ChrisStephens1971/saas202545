'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface EventFormProps {
  initialData?: {
    id?: string;
    title: string;
    description?: string | null;
    startAt: Date;
    endAt?: Date | null;
    allDay: boolean;
    locationName?: string | null;
    locationAddress?: string | null;
    isPublic: boolean;
    allowRsvp: boolean;
    rsvpLimit?: number | null;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function EventForm({ initialData, onSubmit, onCancel }: EventFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    startDate: initialData?.startAt
      ? new Date(initialData.startAt).toISOString().split('T')[0]
      : '',
    startTime: initialData?.startAt && !initialData.allDay
      ? new Date(initialData.startAt).toTimeString().slice(0, 5)
      : '10:00',
    endDate: initialData?.endAt
      ? new Date(initialData.endAt).toISOString().split('T')[0]
      : '',
    endTime: initialData?.endAt && !initialData.allDay
      ? new Date(initialData.endAt).toTimeString().slice(0, 5)
      : '11:00',
    allDay: initialData?.allDay ?? false,
    locationName: initialData?.locationName || '',
    locationAddress: initialData?.locationAddress || '',
    isPublic: initialData?.isPublic ?? true,
    allowRsvp: initialData?.allowRsvp ?? false,
    rsvpLimit: initialData?.rsvpLimit?.toString() || '',
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

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Build start datetime
      const startAt = formData.allDay
        ? new Date(formData.startDate + 'T00:00:00').toISOString()
        : new Date(formData.startDate + 'T' + formData.startTime).toISOString();

      // Build end datetime
      let endAt = null;
      if (formData.endDate) {
        endAt = formData.allDay
          ? new Date(formData.endDate + 'T23:59:59').toISOString()
          : new Date(formData.endDate + 'T' + formData.endTime).toISOString();
      }

      await onSubmit({
        ...formData,
        startAt,
        endAt,
        rsvpLimit: formData.rsvpLimit ? parseInt(formData.rsvpLimit, 10) : undefined,
        description: formData.description || undefined,
        locationName: formData.locationName || undefined,
        locationAddress: formData.locationAddress || undefined,
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
        <CardTitle>{initialData?.id ? 'Edit' : 'Create'} Event</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <Input
            label="Event Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={errors.title}
            required
            placeholder="e.g., Sunday Worship Service"
          />

          {/* Description */}
          <div>
            <label className="block text-base font-medium mb-2">Description (Optional)</label>
            <textarea
              className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 min-h-[100px]"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Event description..."
            />
          </div>

          {/* All Day Event Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="allDay"
              className="w-6 h-6"
              checked={formData.allDay}
              onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
            />
            <label htmlFor="allDay" className="text-base font-medium">
              All-day event
            </label>
          </div>

          {/* Start Date/Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              error={errors.startDate}
              required
            />
            {!formData.allDay && (
              <Input
                label="Start Time"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            )}
          </div>

          {/* End Date/Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="End Date (Optional)"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
            {!formData.allDay && formData.endDate && (
              <Input
                label="End Time"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            )}
          </div>

          {/* Location */}
          <Input
            label="Location Name (Optional)"
            value={formData.locationName}
            onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
            placeholder="e.g., Main Sanctuary"
          />

          <Input
            label="Location Address (Optional)"
            value={formData.locationAddress}
            onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
            placeholder="e.g., 123 Church St, City, State"
          />

          {/* Public Event */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPublic"
              className="w-6 h-6"
              checked={formData.isPublic}
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
            />
            <label htmlFor="isPublic" className="text-base font-medium">
              Public event (visible to non-members)
            </label>
          </div>

          {/* RSVP Settings */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="allowRsvp"
              className="w-6 h-6"
              checked={formData.allowRsvp}
              onChange={(e) => setFormData({ ...formData, allowRsvp: e.target.checked })}
            />
            <label htmlFor="allowRsvp" className="text-base font-medium">
              Allow RSVP
            </label>
          </div>

          {formData.allowRsvp && (
            <Input
              label="RSVP Limit (Optional)"
              type="number"
              value={formData.rsvpLimit}
              onChange={(e) => setFormData({ ...formData, rsvpLimit: e.target.value })}
              placeholder="Leave empty for unlimited"
              min="1"
            />
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Event' : 'Create Event'}
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
