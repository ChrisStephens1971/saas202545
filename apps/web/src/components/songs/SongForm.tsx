'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface SongFormProps {
  initialData?: {
    id?: string;
    title: string;
    alternateTitle?: string | null;
    firstLine?: string | null;
    tuneName?: string | null;
    hymnNumber?: string | null;
    hymnalCode?: string | null;
    author?: string | null;
    composer?: string | null;
    isPublicDomain?: boolean;
    ccliNumber?: string | null;
    copyrightNotice?: string | null;
    defaultKey?: string | null;
    defaultTempo?: number | null;
    lyrics?: string | null;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const HYMNAL_CODES = [
  { code: 'UMH', name: 'United Methodist Hymnal' },
  { code: 'CH', name: 'Chalice Hymnal' },
  { code: 'PH', name: 'Presbyterian Hymnal' },
  { code: 'ELW', name: 'Evangelical Lutheran Worship' },
  { code: 'TFWS', name: 'The Faith We Sing' },
  { code: 'W&S', name: 'Worship & Song' },
  { code: 'NCH', name: 'New Century Hymnal' },
  { code: 'LBW', name: 'Lutheran Book of Worship' },
  { code: 'WOV', name: 'With One Voice' },
];

const MUSICAL_KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bbm', 'Bm',
];

export function SongForm({ initialData, onSubmit, onCancel, isSubmitting }: SongFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    alternateTitle: initialData?.alternateTitle || '',
    firstLine: initialData?.firstLine || '',
    tuneName: initialData?.tuneName || '',
    hymnNumber: initialData?.hymnNumber || '',
    hymnalCode: initialData?.hymnalCode || '',
    author: initialData?.author || '',
    composer: initialData?.composer || '',
    isPublicDomain: initialData?.isPublicDomain || false,
    ccliNumber: initialData?.ccliNumber || '',
    copyrightNotice: initialData?.copyrightNotice || '',
    defaultKey: initialData?.defaultKey || '',
    defaultTempo: initialData?.defaultTempo?.toString() || '',
    lyrics: initialData?.lyrics || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.defaultTempo && (parseInt(formData.defaultTempo) < 20 || parseInt(formData.defaultTempo) > 300)) {
      newErrors.defaultTempo = 'Tempo must be between 20 and 300 BPM';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit({
      title: formData.title.trim(),
      alternateTitle: formData.alternateTitle.trim() || undefined,
      firstLine: formData.firstLine.trim() || undefined,
      tuneName: formData.tuneName.trim() || undefined,
      hymnNumber: formData.hymnNumber.trim() || undefined,
      hymnalCode: formData.hymnalCode || undefined,
      author: formData.author.trim() || undefined,
      composer: formData.composer.trim() || undefined,
      isPublicDomain: formData.isPublicDomain,
      ccliNumber: formData.ccliNumber.trim() || undefined,
      copyrightNotice: formData.copyrightNotice.trim() || undefined,
      defaultKey: formData.defaultKey || undefined,
      defaultTempo: formData.defaultTempo ? parseInt(formData.defaultTempo, 10) : undefined,
      lyrics: formData.lyrics.trim() || undefined,
    });
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>{initialData?.id ? 'Edit Song' : 'Add New Song'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Section */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <Input
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  error={errors.title}
                  required
                  placeholder="e.g., Amazing Grace"
                />
              </div>

              {/* Alternate Title */}
              <Input
                label="Alternate Title"
                value={formData.alternateTitle}
                onChange={(e) => setFormData({ ...formData, alternateTitle: e.target.value })}
                placeholder="e.g., My Chains Are Gone"
                helper="Another name this song is known by"
              />

              {/* First Line */}
              <Input
                label="First Line"
                value={formData.firstLine}
                onChange={(e) => setFormData({ ...formData, firstLine: e.target.value })}
                placeholder="e.g., Amazing grace how sweet the sound"
                helper="Helps identify the song"
              />

              {/* Tune Name */}
              <Input
                label="Tune Name"
                value={formData.tuneName}
                onChange={(e) => setFormData({ ...formData, tuneName: e.target.value })}
                placeholder="e.g., NEW BRITAIN"
                helper="Traditional tune name (usually all caps)"
              />
            </div>
          </div>

          {/* Hymnal Info Section */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">Hymnal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hymnal Code */}
              <div>
                <label className="block text-base font-medium mb-2">Hymnal</label>
                <select
                  className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  value={formData.hymnalCode}
                  onChange={(e) => setFormData({ ...formData, hymnalCode: e.target.value })}
                >
                  <option value="">Select hymnal...</option>
                  {HYMNAL_CODES.map((h) => (
                    <option key={h.code} value={h.code}>
                      {h.code} - {h.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">Which hymnal this song is from</p>
              </div>

              {/* Hymn Number */}
              <Input
                label="Hymn Number"
                value={formData.hymnNumber}
                onChange={(e) => setFormData({ ...formData, hymnNumber: e.target.value })}
                placeholder="e.g., 378 or 378a"
                helper="Number in the hymnal"
              />
            </div>
          </div>

          {/* Attribution Section */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">Attribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Author */}
              <Input
                label="Author / Lyricist"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="e.g., John Newton"
              />

              {/* Composer */}
              <Input
                label="Composer"
                value={formData.composer}
                onChange={(e) => setFormData({ ...formData, composer: e.target.value })}
                placeholder="e.g., Traditional"
              />
            </div>
          </div>

          {/* Copyright Section */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">Copyright & Licensing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Public Domain */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPublicDomain"
                  checked={formData.isPublicDomain}
                  onChange={(e) => setFormData({ ...formData, isPublicDomain: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isPublicDomain" className="text-base font-medium">
                  Public Domain
                </label>
              </div>

              {/* CCLI Number */}
              <Input
                label="CCLI Song Number"
                value={formData.ccliNumber}
                onChange={(e) => setFormData({ ...formData, ccliNumber: e.target.value })}
                placeholder="e.g., 4639462"
                helper={formData.isPublicDomain
                  ? "Not required for public domain hymns"
                  : "Recommended for non-public domain songs"}
              />

              {/* Copyright Notice */}
              <div className="md:col-span-2">
                <label className="block text-base font-medium mb-2">Copyright Notice</label>
                <textarea
                  className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  rows={2}
                  value={formData.copyrightNotice}
                  onChange={(e) => setFormData({ ...formData, copyrightNotice: e.target.value })}
                  placeholder="e.g., © 2006 worshiptogether.com songs / sixsteps Music"
                />
              </div>
            </div>
          </div>

          {/* Performance Defaults Section */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">Performance Defaults</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Default Key */}
              <div>
                <label className="block text-base font-medium mb-2">Default Key</label>
                <select
                  className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  value={formData.defaultKey}
                  onChange={(e) => setFormData({ ...formData, defaultKey: e.target.value })}
                >
                  <option value="">Select key...</option>
                  {MUSICAL_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>

              {/* Default Tempo */}
              <Input
                label="Default Tempo (BPM)"
                type="number"
                value={formData.defaultTempo}
                onChange={(e) => setFormData({ ...formData, defaultTempo: e.target.value })}
                error={errors.defaultTempo}
                placeholder="e.g., 72"
                min="20"
                max="300"
              />
            </div>
          </div>

          {/* Lyrics Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Lyrics</h3>
            <div>
              <label className="block text-base font-medium mb-2">Full Lyrics</label>
              <textarea
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 font-mono"
                rows={10}
                value={formData.lyrics}
                onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                placeholder="Enter full song lyrics here..."
              />
              <p className="text-sm text-gray-500 mt-1">
                Optional: Enter the complete lyrics for reference
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Song' : 'Add Song'}
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
