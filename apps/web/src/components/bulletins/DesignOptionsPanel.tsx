'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { trpc } from '@/lib/trpc/client';

// Types matching the backend schema
export interface BulletinSections {
  showWelcomeMessage?: boolean;
  welcomeText?: string;
  showQRBlock?: boolean;
  qrUrl?: string | null;
  showSocialBar?: boolean;
  showNotesPage?: boolean;
  showPrayerRequestCard?: boolean;
  showConnectCard?: boolean;
  showTestimonyBox?: boolean;
  testimonyText?: string | null;
  showScriptureReading?: boolean;
  scriptureReference?: string;
  scriptureVersion?: string;
  scriptureText?: string;
}

export interface BulletinDesignOptions {
  layoutStyle?: 'simple' | 'photoHeader' | 'sidebar';
  primaryColor?: string;
  accentColor?: string;
  fontFamilyHeading?: 'system' | 'serif' | 'sans';
  fontFamilyBody?: 'system' | 'serif' | 'sans';
  showBorderLines?: boolean;
  sections?: BulletinSections;
}

interface DesignOptionsPanelProps {
  bulletinId: string;
  initialOptions: BulletinDesignOptions | null | undefined;
  isLocked: boolean;
  onSave: (options: BulletinDesignOptions) => Promise<void>;
  isSaving?: boolean;
}

// Default values
const DEFAULT_OPTIONS: BulletinDesignOptions = {
  layoutStyle: 'simple',
  primaryColor: '#3B82F6',
  accentColor: '#1E40AF',
  fontFamilyHeading: 'system',
  fontFamilyBody: 'system',
  showBorderLines: true,
  sections: {
    showWelcomeMessage: false,
    welcomeText: '',
    showQRBlock: false,
    qrUrl: '',
    showSocialBar: false,
    showNotesPage: false,
    showPrayerRequestCard: false,
    showConnectCard: false,
    showTestimonyBox: false,
    testimonyText: '',
    showScriptureReading: false,
    scriptureReference: '',
    scriptureVersion: 'eng-kjv',
    scriptureText: '',
  },
};

export function DesignOptionsPanel({
  bulletinId: _bulletinId,
  initialOptions,
  isLocked,
  onSave,
  isSaving = false,
}: DesignOptionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [options, setOptions] = useState<BulletinDesignOptions>(() => ({
    ...DEFAULT_OPTIONS,
    ...initialOptions,
    sections: {
      ...DEFAULT_OPTIONS.sections,
      ...initialOptions?.sections,
    },
  }));
  const [hasChanges, setHasChanges] = useState(false);
  const [scriptureError, setScriptureError] = useState<string | null>(null);

  // Scripture fetch mutation
  const scriptureFetch = trpc.scripture.fetch.useMutation({
    onSuccess: (result) => {
      setScriptureError(null);
      updateSection('scriptureText', result.text);
      if (!options.sections?.scriptureVersion) {
        updateSection('scriptureVersion', result.version);
      }
    },
    onError: (error) => {
      setScriptureError(error.message);
    },
  });

  // Update local state when initialOptions changes
  useEffect(() => {
    setOptions({
      ...DEFAULT_OPTIONS,
      ...initialOptions,
      sections: {
        ...DEFAULT_OPTIONS.sections,
        ...initialOptions?.sections,
      },
    });
    setHasChanges(false);
  }, [initialOptions]);

  const updateOption = <K extends keyof BulletinDesignOptions>(
    key: K,
    value: BulletinDesignOptions[K]
  ) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateSection = <K extends keyof BulletinSections>(
    key: K,
    value: BulletinSections[K]
  ) => {
    setOptions((prev) => ({
      ...prev,
      sections: { ...prev.sections, [key]: value },
    }));
    setHasChanges(true);
  };

  const handleFetchScripture = async () => {
    setScriptureError(null);
    const reference = options.sections?.scriptureReference?.trim();
    const version = options.sections?.scriptureVersion?.trim();

    if (!reference) {
      setScriptureError('Please enter a scripture reference');
      return;
    }

    try {
      await scriptureFetch.mutateAsync({
        reference,
        version: version || undefined,
      });
    } catch (err) {
      // Error is already handled by onError callback
    }
  };

  const handleSave = async () => {
    // Normalize options before saving
    const normalizedOptions: BulletinDesignOptions = {
      ...options,
      sections: options.sections ? {
        ...options.sections,
        // Normalize empty qrUrl to undefined
        qrUrl: options.sections.qrUrl?.trim() || undefined,
        // Normalize empty text fields
        welcomeText: options.sections.welcomeText?.trim() || undefined,
        testimonyText: options.sections.testimonyText?.trim() || undefined,
      } : undefined,
    };
    await onSave(normalizedOptions);
    setHasChanges(false);
  };

  if (isLocked) {
    return (
      <Card variant="outlined" className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Design & Sections
          </CardTitle>
          <CardDescription>
            Bulletin is locked. Unlock to modify design options.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card variant="outlined" className="mb-6">
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Design & Sections
            </CardTitle>
            <CardDescription>
              Customize bulletin layout, colors, and optional sections
            </CardDescription>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="border-t">
          <div className="space-y-6 pt-4">
            {/* Layout Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Layout Style
              </label>
              <div className="flex gap-3">
                {(['simple', 'photoHeader', 'sidebar'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => updateOption('layoutStyle', style)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      options.layoutStyle === style
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {style === 'simple' && 'Simple'}
                    {style === 'photoHeader' && 'Photo Header'}
                    {style === 'sidebar' && 'Sidebar'}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={options.primaryColor || '#3B82F6'}
                    onChange={(e) => updateOption('primaryColor', e.target.value)}
                    className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={options.primaryColor || '#3B82F6'}
                    onChange={(e) => updateOption('primaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={options.accentColor || '#1E40AF'}
                    onChange={(e) => updateOption('accentColor', e.target.value)}
                    className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={options.accentColor || '#1E40AF'}
                    onChange={(e) => updateOption('accentColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="#1E40AF"
                  />
                </div>
              </div>
            </div>

            {/* Fonts */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heading Font
                </label>
                <select
                  value={options.fontFamilyHeading || 'system'}
                  onChange={(e) => updateOption('fontFamilyHeading', e.target.value as 'system' | 'serif' | 'sans')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="system">System Default</option>
                  <option value="serif">Serif (Georgia)</option>
                  <option value="sans">Sans-Serif</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Body Font
                </label>
                <select
                  value={options.fontFamilyBody || 'system'}
                  onChange={(e) => updateOption('fontFamilyBody', e.target.value as 'system' | 'serif' | 'sans')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="system">System Default</option>
                  <option value="serif">Serif (Georgia)</option>
                  <option value="sans">Sans-Serif</option>
                </select>
              </div>
            </div>

            {/* Border Lines */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.showBorderLines ?? true}
                  onChange={(e) => updateOption('showBorderLines', e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Show decorative border lines
                </span>
              </label>
            </div>

            {/* Sections Divider */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Optional Sections</h4>
            </div>

            {/* Welcome Message */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.sections?.showWelcomeMessage ?? false}
                  onChange={(e) => updateSection('showWelcomeMessage', e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Show welcome message
                </span>
              </label>
              {options.sections?.showWelcomeMessage && (
                <textarea
                  value={options.sections?.welcomeText || ''}
                  onChange={(e) => updateSection('welcomeText', e.target.value)}
                  placeholder="Welcome to our worship service! We're glad you're here."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  rows={2}
                  maxLength={500}
                />
              )}
            </div>

            {/* QR Code */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.sections?.showQRBlock ?? false}
                  onChange={(e) => updateSection('showQRBlock', e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Show QR code block
                </span>
              </label>
              {options.sections?.showQRBlock && (
                <input
                  type="url"
                  value={options.sections?.qrUrl || ''}
                  onChange={(e) => updateSection('qrUrl', e.target.value)}
                  placeholder="https://your-church.com/give"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              )}
            </div>

            {/* Social Bar */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.sections?.showSocialBar ?? false}
                  onChange={(e) => updateSection('showSocialBar', e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Show social media bar
                </span>
              </label>
              <p className="text-xs text-gray-500 ml-6">
                Social handles come from organization settings
              </p>
            </div>

            {/* Notes Page */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.sections?.showNotesPage ?? false}
                  onChange={(e) => updateSection('showNotesPage', e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Include notes page
                </span>
              </label>
            </div>

            {/* Prayer Request Card */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.sections?.showPrayerRequestCard ?? false}
                  onChange={(e) => updateSection('showPrayerRequestCard', e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Include prayer request card
                </span>
              </label>
            </div>

            {/* Connect Card */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.sections?.showConnectCard ?? false}
                  onChange={(e) => updateSection('showConnectCard', e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Include connect/guest card
                </span>
              </label>
            </div>

            {/* Testimony Box */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.sections?.showTestimonyBox ?? false}
                  onChange={(e) => updateSection('showTestimonyBox', e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Show testimony highlight
                </span>
              </label>
              {options.sections?.showTestimonyBox && (
                <textarea
                  value={options.sections?.testimonyText || ''}
                  onChange={(e) => updateSection('testimonyText', e.target.value)}
                  placeholder="Share a brief testimony or praise report..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  rows={3}
                  maxLength={1000}
                />
              )}
            </div>

            {/* Scripture Reading */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.sections?.showScriptureReading ?? false}
                  onChange={(e) => updateSection('showScriptureReading', e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Show Scripture reading
                </span>
              </label>
              {options.sections?.showScriptureReading && (
                <div className="space-y-2 ml-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Reference (e.g., John 3:16-18)
                    </label>
                    <input
                      type="text"
                      value={options.sections?.scriptureReference || ''}
                      onChange={(e) => updateSection('scriptureReference', e.target.value)}
                      placeholder="John 3:16-18"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Version / Translation
                    </label>
                    <input
                      type="text"
                      value={options.sections?.scriptureVersion || ''}
                      onChange={(e) => updateSection('scriptureVersion', e.target.value)}
                      placeholder="BSB (default)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      e.g., BSB, KJV, WEB (see{' '}
                      <a
                        href="https://bible.helloao.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 underline"
                      >
                        bible.helloao.org
                      </a>
                      {' '}for available translations)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleFetchScripture}
                      disabled={!options.sections?.scriptureReference || scriptureFetch.isPending}
                    >
                      {scriptureFetch.isPending ? 'Fetching...' : 'Fetch from Scripture API'}
                    </Button>
                  </div>
                  {scriptureError && (
                    <p className="text-xs text-red-600">{scriptureError}</p>
                  )}
                  {options.sections?.scriptureText && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Fetched Text (preview)
                      </label>
                      <textarea
                        value={options.sections.scriptureText}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                        rows={4}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t flex justify-end">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? 'Saving...' : hasChanges ? 'Save Design Options' : 'No Changes'}
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
