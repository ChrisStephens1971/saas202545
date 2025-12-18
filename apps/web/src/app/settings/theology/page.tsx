'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import Link from 'next/link';
import { Info, ShieldAlert, AlertTriangle, BookOpen, X, Plus } from 'lucide-react';
import {
  THEOLOGY_TRADITION_OPTIONS,
  type TheologyTradition,
  type BibleTranslation,
  type TheologySensitivity,
} from '@elder-first/types';

const BIBLE_TRANSLATIONS = [
  'ESV', 'NIV', 'CSB', 'NASB', 'KJV', 'NKJV', 'NLT', 'MSG', 'Other',
] as const;

const SERMON_STYLES = [
  { value: 'expository', label: 'Expository', description: 'Verse-by-verse through a passage' },
  { value: 'topical', label: 'Topical', description: 'Theme-based from multiple passages' },
  { value: 'textual', label: 'Textual', description: 'Single passage exposition' },
  { value: 'narrative', label: 'Narrative', description: 'Story-driven approach' },
] as const;

const SENSITIVITY_LEVELS = [
  { value: 'conservative', label: 'Conservative', description: 'Very cautious with sensitive topics' },
  { value: 'moderate', label: 'Moderate', description: 'Balanced approach with care' },
  { value: 'progressive', label: 'Progressive', description: 'More latitude for mature discussion' },
] as const;

export default function TheologySettingsPage() {
  // Track the canonical stored value for tradition
  const [formData, setFormData] = useState({
    tradition: 'Non-denominational evangelical' as TheologyTradition,
    bibleTranslation: 'ESV',
    sermonStyle: 'expository',
    sensitivity: 'moderate',
    restrictedTopics: [] as string[],
    preferredTone: 'warm and pastoral',
  });
  // Track the selected UI label separately (for display only)
  const [selectedTraditionLabel, setSelectedTraditionLabel] = useState('Non-denominational evangelical');
  const [newTopic, setNewTopic] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: theologyProfile, isLoading } = trpc.sermonHelper.getTheologyProfile.useQuery();
  const utils = trpc.useContext();

  const updateTheology = trpc.sermonHelper.updateTheologyProfile.useMutation({
    onSuccess: () => {
      setSuccess('Theology settings saved successfully!');
      setError('');
      utils.sermonHelper.getTheologyProfile.invalidate();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message);
      setSuccess('');
    },
  });

  // Find the first matching label for a stored canonical value
  const findLabelForValue = (value: string): string => {
    const option = THEOLOGY_TRADITION_OPTIONS.find(opt => opt.value === value);
    return option?.label ?? value;
  };

  // Populate form when data loads
  useEffect(() => {
    if (theologyProfile) {
      const canonicalTradition = theologyProfile.tradition as TheologyTradition;
      setFormData({
        tradition: canonicalTradition,
        bibleTranslation: theologyProfile.bibleTranslation,
        sermonStyle: theologyProfile.sermonStyle,
        sensitivity: theologyProfile.sensitivity,
        restrictedTopics: theologyProfile.restrictedTopics || [],
        preferredTone: theologyProfile.preferredTone,
      });
      // Set the display label based on the stored value
      setSelectedTraditionLabel(findLabelForValue(canonicalTradition));
    }
  }, [theologyProfile]);

  const handleChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  const handleAddTopic = () => {
    const trimmed = newTopic.trim();
    if (!trimmed) return;
    if (formData.restrictedTopics.length >= 20) {
      setError('Maximum 20 restricted topics allowed');
      return;
    }
    if (trimmed.length > 100) {
      setError('Topic must be 100 characters or less');
      return;
    }
    if (formData.restrictedTopics.includes(trimmed)) {
      setError('Topic already exists');
      return;
    }
    setFormData(prev => ({
      ...prev,
      restrictedTopics: [...prev.restrictedTopics, trimmed],
    }));
    setNewTopic('');
    setError('');
  };

  const handleRemoveTopic = (topic: string) => {
    setFormData(prev => ({
      ...prev,
      restrictedTopics: prev.restrictedTopics.filter(t => t !== topic),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // formData.tradition now contains canonical values from THEOLOGICAL_TRADITIONS
    updateTheology.mutate({
      tradition: formData.tradition,
      bibleTranslation: formData.bibleTranslation as BibleTranslation,
      sermonStyle: formData.sermonStyle as 'expository' | 'topical' | 'textual' | 'narrative',
      sensitivity: formData.sensitivity as TheologySensitivity,
      restrictedTopics: formData.restrictedTopics,
      preferredTone: formData.preferredTone,
    });
  };

  if (isLoading) {
    return (
      <ProtectedPage requiredRoles={['admin']}>
        <div className="container mx-auto px-4 py-8">
          <p className="text-lg text-gray-600">Loading theology settings...</p>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage requiredRoles={['admin']}>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Theology Settings</h1>
              <p className="text-lg text-gray-600">
                Configure your church&apos;s theological profile for AI-powered sermon assistance
              </p>
            </div>
            <Link href="/settings">
              <Button variant="secondary">Back to Settings</Button>
            </Link>
          </div>
        </div>

        {/* AI Guardrails Info Panel */}
        <Card variant="outlined" className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Info size={20} className="text-blue-600" />
              <CardTitle className="text-lg text-blue-800">How AI Guardrails Work</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-700">
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Theology-Aware AI:</strong> AI suggestions respect your church&apos;s theological tradition and preferred Bible translation.
              </li>
              <li>
                <strong>Restricted Topics:</strong> If the sermon theme or notes contain any restricted topics, AI suggestions will be automatically disabled and the pastor will be prompted to handle the content personally.
              </li>
              <li>
                <strong>Political Filter:</strong> Partisan political content in AI suggestions is automatically filtered out, ensuring Christ-centered, non-partisan teaching.
              </li>
            </ul>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-blue-200">
              <a
                href="/docs/sermons/SERMON-HELPER-BACKEND.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 underline hover:text-blue-800"
              >
                Learn more about AI guardrails
              </a>
              <Link
                href="/settings/theology-qa"
                className="text-xs text-blue-600 underline hover:text-blue-800"
              >
                Test AI guardrails (QA Harness)
              </Link>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600">{success}</p>
            </div>
          )}

          {/* Theological Identity */}
          <Card variant="elevated" className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-purple-600" />
                <CardTitle>Theological Identity</CardTitle>
              </div>
              <CardDescription>
                Define your church&apos;s theological tradition and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Theological Tradition
                </label>
                <select
                  value={selectedTraditionLabel}
                  onChange={(e) => {
                    const selectedLabel = e.target.value;
                    const option = THEOLOGY_TRADITION_OPTIONS.find(opt => opt.label === selectedLabel);
                    if (option) {
                      setSelectedTraditionLabel(selectedLabel);
                      handleChange('tradition', option.value);
                    }
                  }}
                  className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {THEOLOGY_TRADITION_OPTIONS.map((option) => (
                    <option key={option.label} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  AI will stay within mainstream theology for your tradition.
                </p>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Preferred Bible Translation
                </label>
                <select
                  value={formData.bibleTranslation}
                  onChange={(e) => handleChange('bibleTranslation', e.target.value)}
                  className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {BIBLE_TRANSLATIONS.map((translation) => (
                    <option key={translation} value={translation}>
                      {translation}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  AI will use versification compatible with this translation.
                </p>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Sermon Style
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {SERMON_STYLES.map((style) => (
                    <label
                      key={style.value}
                      className={`flex flex-col p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        formData.sermonStyle === style.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="sermonStyle"
                        value={style.value}
                        checked={formData.sermonStyle === style.value}
                        onChange={(e) => handleChange('sermonStyle', e.target.value)}
                        className="sr-only"
                      />
                      <span className="font-medium">{style.label}</span>
                      <span className="text-xs text-gray-500">{style.description}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Input
                label="Preferred Tone"
                value={formData.preferredTone}
                onChange={(e) => handleChange('preferredTone', e.target.value)}
                placeholder="e.g., warm and pastoral, reverent and teaching-focused"
                helper="How should AI suggestions sound? (max 100 characters)"
                maxLength={100}
              />
            </CardContent>
          </Card>

          {/* Sensitivity & Guardrails */}
          <Card variant="elevated" className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldAlert size={20} className="text-amber-600" />
                <CardTitle>Sensitivity & Guardrails</CardTitle>
              </div>
              <CardDescription>
                Configure how cautious AI should be with sensitive topics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Sensitivity Level
                </label>
                <div className="space-y-2">
                  {SENSITIVITY_LEVELS.map((level) => (
                    <label
                      key={level.value}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        formData.sensitivity === level.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="sensitivity"
                        value={level.value}
                        checked={formData.sensitivity === level.value}
                        onChange={(e) => handleChange('sensitivity', e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <span className="font-medium">{level.label}</span>
                        <span className="text-sm text-gray-500 ml-2">— {level.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Restricted AI Topics */}
          <Card variant="elevated" className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-600" />
                <CardTitle>Restricted AI Topics</CardTitle>
              </div>
              <CardDescription>
                Topics where AI assistance will be disabled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>How this works:</strong> If the sermon theme or notes contain any of these phrases,
                  AI suggestions will be disabled for that request and the pastor will be prompted to handle
                  the topic personally. No AI tokens are consumed.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Restricted Topic
                </label>
                <div className="flex gap-2">
                  <Input
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="e.g., predestination, speaking in tongues"
                    className="flex-1"
                    maxLength={100}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTopic();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddTopic}
                    disabled={!newTopic.trim()}
                  >
                    <Plus size={16} className="mr-1" />
                    Add
                  </Button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.restrictedTopics.length}/20 topics • Max 100 characters each
                </p>
              </div>

              {formData.restrictedTopics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.restrictedTopics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 border border-gray-300 rounded-full text-sm"
                    >
                      {topic}
                      <button
                        type="button"
                        onClick={() => handleRemoveTopic(topic)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {formData.restrictedTopics.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  No restricted topics configured. AI will assist with all themes.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link href="/settings">
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={updateTheology.isPending}
            >
              {updateTheology.isPending ? 'Saving...' : 'Save Theology Settings'}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedPage>
  );
}
