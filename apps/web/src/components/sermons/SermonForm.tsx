'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { trpc } from '@/lib/trpc/client';

interface SermonFormProps {
  initialData?: {
    id?: string;
    title: string;
    sermonDate: string;
    seriesId?: string | null;
    preacher?: string | null;
    primaryScripture?: string | null;
    additionalScripture?: string | null;
    manuscript?: string | null;
    audioUrl?: string | null;
    videoUrl?: string | null;
    tags?: string[] | null;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function SermonForm({ initialData, onSubmit, onCancel }: SermonFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    sermonDate: initialData?.sermonDate
      ? new Date(initialData.sermonDate).toISOString().split('T')[0]
      : '',
    seriesId: initialData?.seriesId || '',
    preacher: initialData?.preacher || '',
    primaryScripture: initialData?.primaryScripture || '',
    additionalScripture: initialData?.additionalScripture || '',
    manuscript: initialData?.manuscript || '',
    audioUrl: initialData?.audioUrl || '',
    videoUrl: initialData?.videoUrl || '',
    tags: initialData?.tags?.join(', ') || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch sermon series for dropdown
  const { data: seriesData } = trpc.sermons.listSeries.useQuery({
    limit: 100,
    offset: 0,
  });

  const seriesList = seriesData?.series || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.sermonDate) {
      newErrors.sermonDate = 'Sermon date is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        title: formData.title,
        sermonDate: formData.sermonDate,
        seriesId: formData.seriesId || undefined,
        preacher: formData.preacher || undefined,
        primaryScripture: formData.primaryScripture || undefined,
        additionalScripture: formData.additionalScripture || undefined,
        manuscript: formData.manuscript || undefined,
        audioUrl: formData.audioUrl || undefined,
        videoUrl: formData.videoUrl || undefined,
        tags: formData.tags
          ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
          : undefined,
      });
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>{initialData ? 'Edit Sermon' : 'New Sermon'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-base font-semibold mb-2">
              Title <span className="text-red-600">*</span>
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter sermon title..."
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* Sermon Date */}
          <div>
            <label className="block text-base font-semibold mb-2">
              Date <span className="text-red-600">*</span>
            </label>
            <Input
              type="date"
              value={formData.sermonDate}
              onChange={(e) => setFormData({ ...formData, sermonDate: e.target.value })}
              className={errors.sermonDate ? 'border-red-500' : ''}
            />
            {errors.sermonDate && (
              <p className="text-red-600 text-sm mt-1">{errors.sermonDate}</p>
            )}
          </div>

          {/* Sermon Series */}
          <div>
            <label className="block text-base font-semibold mb-2">Sermon Series</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={formData.seriesId}
              onChange={(e) => setFormData({ ...formData, seriesId: e.target.value })}
            >
              <option value="">No series</option>
              {seriesList.map((series: any) => (
                <option key={series.id} value={series.id}>
                  {series.title}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-600 mt-1">Optional: assign to a sermon series</p>
          </div>

          {/* Preacher */}
          <div>
            <label className="block text-base font-semibold mb-2">Preacher</label>
            <Input
              value={formData.preacher}
              onChange={(e) => setFormData({ ...formData, preacher: e.target.value })}
              placeholder="Enter preacher name..."
            />
          </div>

          {/* Primary Scripture */}
          <div>
            <label className="block text-base font-semibold mb-2">Primary Scripture</label>
            <Input
              value={formData.primaryScripture}
              onChange={(e) =>
                setFormData({ ...formData, primaryScripture: e.target.value })
              }
              placeholder="e.g., John 3:16"
            />
          </div>

          {/* Additional Scripture */}
          <div>
            <label className="block text-base font-semibold mb-2">
              Additional Scripture
            </label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={2}
              value={formData.additionalScripture}
              onChange={(e) =>
                setFormData({ ...formData, additionalScripture: e.target.value })
              }
              placeholder="Additional scripture references..."
            />
          </div>

          {/* Manuscript */}
          <div>
            <label className="block text-base font-semibold mb-2">Manuscript</label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={8}
              value={formData.manuscript}
              onChange={(e) => setFormData({ ...formData, manuscript: e.target.value })}
              placeholder="Enter sermon manuscript or notes..."
            />
          </div>

          {/* Audio URL */}
          <div>
            <label className="block text-base font-semibold mb-2">Audio URL</label>
            <Input
              type="url"
              value={formData.audioUrl}
              onChange={(e) => setFormData({ ...formData, audioUrl: e.target.value })}
              placeholder="https://..."
            />
            <p className="text-sm text-gray-600 mt-1">Link to audio recording</p>
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-base font-semibold mb-2">Video URL</label>
            <Input
              type="url"
              value={formData.videoUrl}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="https://..."
            />
            <p className="text-sm text-gray-600 mt-1">Link to video recording</p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-base font-semibold mb-2">Tags</label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="faith, hope, love (comma-separated)"
            />
            <p className="text-sm text-gray-600 mt-1">Enter tags separated by commas</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Create Sermon'}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
