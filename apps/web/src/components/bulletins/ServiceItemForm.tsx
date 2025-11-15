'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const SERVICE_ITEM_TYPES = [
  'Welcome',
  'Song',
  'Prayer',
  'Scripture',
  'Sermon',
  'Offering',
  'Benediction',
  'Other',
] as const;

type ServiceItemType = typeof SERVICE_ITEM_TYPES[number];

interface ServiceItemFormProps {
  serviceDate: Date;
  initialData?: {
    id?: string;
    type: ServiceItemType;
    title: string;
    ccliNumber?: string;
    scriptureRef?: string;
    speaker?: string;
    notes?: string;
    duration?: number;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function ServiceItemForm({ serviceDate, initialData, onSubmit, onCancel }: ServiceItemFormProps) {
  const [formData, setFormData] = useState({
    type: initialData?.type || 'Welcome' as ServiceItemType,
    title: initialData?.title || '',
    ccliNumber: initialData?.ccliNumber || '',
    scriptureRef: initialData?.scriptureRef || '',
    speaker: initialData?.speaker || '',
    notes: initialData?.notes || '',
    duration: initialData?.duration?.toString() || '',
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

    if (formData.type === 'Song' && !formData.ccliNumber.trim()) {
      newErrors.ccliNumber = 'CCLI number is required for songs';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        serviceDate: serviceDate.toISOString(),
        duration: formData.duration ? parseInt(formData.duration, 10) : undefined,
        ccliNumber: formData.ccliNumber || undefined,
        scriptureRef: formData.scriptureRef || undefined,
        speaker: formData.speaker || undefined,
        notes: formData.notes || undefined,
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
        <CardTitle>{initialData?.id ? 'Edit' : 'Add'} Service Item</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Select */}
          <div>
            <label className="block text-base font-medium mb-2">Type</label>
            <select
              className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as ServiceItemType })}
            >
              {SERVICE_ITEM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={errors.title}
            required
            placeholder="e.g., Amazing Grace, Opening Prayer"
          />

          {/* CCLI Number (for songs) */}
          {formData.type === 'Song' && (
            <div>
              <Input
                label="CCLI Number"
                value={formData.ccliNumber}
                onChange={(e) => setFormData({ ...formData, ccliNumber: e.target.value })}
                error={errors.ccliNumber}
                required
                placeholder="e.g., 4639462"
              />
              <p className="text-sm text-gray-600 mt-1">Required for copyright compliance</p>
            </div>
          )}

          {/* Scripture Reference (for scripture readings) */}
          {formData.type === 'Scripture' && (
            <Input
              label="Scripture Reference"
              value={formData.scriptureRef}
              onChange={(e) => setFormData({ ...formData, scriptureRef: e.target.value })}
              placeholder="e.g., Psalm 23:1-6"
            />
          )}

          {/* Speaker (for sermons) */}
          {formData.type === 'Sermon' && (
            <Input
              label="Speaker"
              value={formData.speaker}
              onChange={(e) => setFormData({ ...formData, speaker: e.target.value })}
              placeholder="e.g., Pastor John"
            />
          )}

          {/* Duration */}
          <Input
            label="Duration (minutes)"
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            placeholder="Optional"
            min="1"
          />

          {/* Notes */}
          <div>
            <label className="block text-base font-medium mb-2">Notes (Optional)</label>
            <textarea
              className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 min-h-[100px]"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Internal notes, not visible on bulletin"
            />
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
              {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Item' : 'Add Item'}
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
