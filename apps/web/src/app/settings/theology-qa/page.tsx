'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import Link from 'next/link';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  BookOpen,
  FileText,
  Lightbulb,
  Music,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

/**
 * Theology QA Harness - Internal admin page for testing AI suggestions
 * with the current church's theology profile.
 */
export default function TheologyQAPage() {
  const [theme, setTheme] = useState('');
  const [notes, setNotes] = useState('');
  const [sermonId, setSermonId] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);
  const [lastResult, setLastResult] = useState<{
    suggestions: {
      scriptureSuggestions: Array<{ reference: string; reason: string }>;
      outline: Array<{ type: 'section' | 'point'; title?: string; text?: string }>;
      applicationIdeas: Array<{ audience: string; idea: string }>;
      hymnThemes: Array<{ theme: string; reason: string }>;
    };
    meta: {
      fallback: boolean;
      tokensUsed?: number;
      model?: string;
      restrictedTopicTriggered?: boolean;
      politicalContentDetected?: boolean;
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: theologyProfile, isLoading: profileLoading } = trpc.sermonHelper.getTheologyProfile.useQuery();

  const getAISuggestions = trpc.sermonHelper.getAISuggestions.useMutation({
    onSuccess: (data) => {
      // Transform API response to match expected state shape
      // API may return optional fields, but our UI expects required arrays
      setLastResult({
        suggestions: {
          scriptureSuggestions: (data.suggestions.scriptureSuggestions || []).map(s => ({
            reference: s.reference,
            reason: s.reason || '',
          })),
          outline: (data.suggestions.outline || []).map(o => ({
            type: (o.type === 'section' || o.type === 'point' ? o.type : 'point') as 'section' | 'point',
            title: o.title,
            text: o.text,
          })),
          applicationIdeas: (data.suggestions.applicationIdeas || []).map(a => ({
            audience: a.audience || '',
            idea: a.idea,
          })),
          hymnThemes: (data.suggestions.hymnThemes || []).map(h => ({
            theme: h.theme,
            reason: h.reason || '',
          })),
        },
        meta: data.meta,
      });
      setError(null);
    },
    onError: (err) => {
      setError(err.message || 'Failed to get AI suggestions');
      setLastResult(null);
    },
  });

  const handleRunTest = () => {
    if (!theme.trim()) {
      setError('Theme is required');
      return;
    }
    if (!sermonId.trim()) {
      setError('Sermon ID is required (use a valid UUID from your database)');
      return;
    }

    setError(null);
    getAISuggestions.mutate({
      sermonId: sermonId.trim(),
      theme: theme.trim(),
      notes: notes.trim() || undefined,
    });
  };

  const isLoading = getAISuggestions.isPending;

  return (
    <ProtectedPage requiredRoles={['admin']}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Theology QA Harness</h1>
              <p className="text-lg text-gray-600">
                Internal tool for testing AI suggestions with your theology profile
              </p>
            </div>
            <Link href="/settings/theology">
              <Button variant="secondary">Back to Theology Settings</Button>
            </Link>
          </div>
        </div>

        {/* Internal Use Warning */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <Info size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium text-amber-800">Internal Admin Tool</div>
            <div className="text-sm text-amber-700 mt-1">
              This page is for QA testing of the Sermon Helper AI. Use it to verify guardrails
              and theology profile behavior before pastors use the feature.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Theology Profile */}
          <div className="lg:col-span-1">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen size={18} className="text-purple-600" />
                  Current Theology Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profileLoading ? (
                  <p className="text-sm text-gray-500">Loading profile...</p>
                ) : theologyProfile ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Tradition:</span>
                      <div className="text-gray-900">{theologyProfile.tradition}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Bible Translation:</span>
                      <div className="text-gray-900">{theologyProfile.bibleTranslation}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Sermon Style:</span>
                      <div className="text-gray-900">{theologyProfile.sermonStyle}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Sensitivity:</span>
                      <div className="text-gray-900">{theologyProfile.sensitivity}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Preferred Tone:</span>
                      <div className="text-gray-900">{theologyProfile.preferredTone}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Restricted Topics:</span>
                      {theologyProfile.restrictedTopics?.length > 0 ? (
                        <ul className="list-disc list-inside mt-1">
                          {theologyProfile.restrictedTopics.map((topic, i) => (
                            <li key={i} className="text-gray-900">{topic}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-gray-500 italic">None configured</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-500">Failed to load profile</p>
                )}

                <div className="mt-4 pt-4 border-t">
                  <Link href="/settings/theology">
                    <Button variant="outline" size="sm" className="w-full">
                      Edit Theology Profile
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Test Input & Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Test Input */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles size={18} className="text-purple-600" />
                  Test AI Suggestions
                </CardTitle>
                <CardDescription>
                  Enter a sermon theme and notes to test AI response with guardrails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Sermon ID (UUID)"
                  value={sermonId}
                  onChange={(e) => setSermonId(e.target.value)}
                  placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                  helper="A valid sermon UUID from your database (required for testing)"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Theme / Big Idea <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="e.g., God's grace in suffering, predestination, end times"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Try entering a restricted topic to test the guardrail.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any specific direction or context..."
                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  variant="primary"
                  onClick={handleRunTest}
                  disabled={isLoading || !theme.trim() || !sermonId.trim()}
                  className="w-full gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Running Test...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Run Sermon Helper (Dry Run)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            {lastResult && (
              <div className="space-y-4">
                {/* Meta Flags Banner */}
                <Card variant="outlined" className="border-gray-300">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Meta Flags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        lastResult.meta.fallback
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        fallback: {lastResult.meta.fallback ? 'true' : 'false'}
                      </span>
                      {lastResult.meta.restrictedTopicTriggered !== undefined && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          lastResult.meta.restrictedTopicTriggered
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          restrictedTopicTriggered: {lastResult.meta.restrictedTopicTriggered ? 'true' : 'false'}
                        </span>
                      )}
                      {lastResult.meta.politicalContentDetected !== undefined && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          lastResult.meta.politicalContentDetected
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          politicalContentDetected: {lastResult.meta.politicalContentDetected ? 'true' : 'false'}
                        </span>
                      )}
                      {lastResult.meta.tokensUsed !== undefined && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          tokensUsed: {lastResult.meta.tokensUsed}
                        </span>
                      )}
                      {lastResult.meta.model && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          model: {lastResult.meta.model}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Guardrail Banners */}
                {lastResult.meta.restrictedTopicTriggered && (
                  <div
                    className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-lg"
                    data-testid="restricted-topic-banner"
                  >
                    <ShieldAlert size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-amber-800">Restricted Topic</div>
                      <div className="text-sm text-amber-700 mt-1">
                        AI suggestions are disabled for this topic by your church&apos;s theology settings.
                        Please handle this content personally.
                      </div>
                    </div>
                  </div>
                )}

                {lastResult.meta.politicalContentDetected && (
                  <div
                    className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg"
                    data-testid="political-content-banner"
                  >
                    <AlertTriangle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-blue-800">Content Filtered</div>
                      <div className="text-sm text-blue-700 mt-1">
                        Some suggestions were removed due to political content.
                        Please focus on Christ-centered, non-partisan teaching.
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {!lastResult.meta.restrictedTopicTriggered && (
                  <>
                    {/* Scripture Suggestions */}
                    {lastResult.suggestions.scriptureSuggestions.length > 0 && (
                      <Card variant="outlined">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <BookOpen size={18} className="text-amber-600" />
                            Scripture Suggestions ({lastResult.suggestions.scriptureSuggestions.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {lastResult.suggestions.scriptureSuggestions.map((scripture, index) => (
                              <div key={index} className="p-2 bg-amber-50 rounded text-sm">
                                <span className="font-medium">{scripture.reference}</span>
                                <span className="text-gray-600 ml-2">— {scripture.reason}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Outline */}
                    {lastResult.suggestions.outline.length > 0 && (
                      <Card variant="outlined">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText size={18} className="text-blue-600" />
                            Outline ({lastResult.suggestions.outline.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1">
                            {lastResult.suggestions.outline.map((item, index) => (
                              <div key={index} className={`p-2 rounded text-sm ${
                                item.type === 'section' ? 'bg-purple-50 font-medium' : 'bg-blue-50 pl-6'
                              }`}>
                                {item.type === 'section' ? `[Section] ${item.title}` : `• ${item.text}`}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Application Ideas */}
                    {lastResult.suggestions.applicationIdeas.length > 0 && (
                      <Card variant="outlined">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Lightbulb size={18} className="text-green-600" />
                            Application Ideas ({lastResult.suggestions.applicationIdeas.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {lastResult.suggestions.applicationIdeas.map((idea, index) => (
                              <div key={index} className="p-2 bg-green-50 rounded text-sm">
                                <span className="inline-block px-2 py-0.5 bg-green-200 text-green-800 rounded text-xs mr-2">
                                  {idea.audience}
                                </span>
                                {idea.idea}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Hymn Themes */}
                    {lastResult.suggestions.hymnThemes.length > 0 && (
                      <Card variant="outlined">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Music size={18} className="text-pink-600" />
                            Hymn Themes ({lastResult.suggestions.hymnThemes.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {lastResult.suggestions.hymnThemes.map((hymn, index) => (
                              <div key={index} className="p-2 bg-pink-50 rounded text-sm">
                                <span className="font-medium">{hymn.theme}</span>
                                <span className="text-gray-600 ml-2">— {hymn.reason}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                {/* Raw JSON */}
                <Card variant="outlined">
                  <CardHeader className="pb-0">
                    <button
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="flex items-center gap-2 text-left w-full"
                    >
                      <CardTitle className="text-base flex items-center gap-2">
                        Raw JSON Response
                        {showRawJson ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </CardTitle>
                    </button>
                  </CardHeader>
                  {showRawJson && (
                    <CardContent>
                      <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto">
                        {JSON.stringify(lastResult, null, 2)}
                      </pre>
                    </CardContent>
                  )}
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
