'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Sparkles, Plus, Loader2, AlertCircle, BookOpen, FileText, Lightbulb, Music, ShieldAlert, AlertTriangle } from 'lucide-react';
import type { SermonElement, SermonHelperSuggestions } from '@elder-first/types';

interface SermonHelperAISuggestionsProps {
  sermonId: string;
  sermonTitle: string;
  primaryScripture: string | null;
  onAddToOutline: (element: SermonElement) => void;
}

/**
 * Generate a simple UUID for client-side element IDs
 */
function generateId(): string {
  return crypto.randomUUID();
}

export function SermonHelperAISuggestions({
  sermonId,
  sermonTitle: _sermonTitle,
  primaryScripture,
  onAddToOutline,
}: SermonHelperAISuggestionsProps) {
  // sermonTitle available for future use (currently using primaryScripture as default theme)
  void _sermonTitle;
  const [theme, setTheme] = useState(primaryScripture || '');
  const [notes, setNotes] = useState('');
  const [suggestions, setSuggestions] = useState<SermonHelperSuggestions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restrictedTopicTriggered, setRestrictedTopicTriggered] = useState(false);
  const [politicalContentDetected, setPoliticalContentDetected] = useState(false);

  const getAISuggestions = trpc.sermonHelper.getAISuggestions.useMutation({
    onSuccess: (data) => {
      setSuggestions(data.suggestions);
      setError(null);
      setRestrictedTopicTriggered(data.meta.restrictedTopicTriggered ?? false);
      setPoliticalContentDetected(data.meta.politicalContentDetected ?? false);
      if (data.meta.fallback) {
        setError('AI returned incomplete results. Try again or adjust your theme.');
      }
    },
    onError: (err) => {
      setError(err.message || 'Failed to get AI suggestions. Please try again.');
      setSuggestions(null);
      setRestrictedTopicTriggered(false);
      setPoliticalContentDetected(false);
    },
  });

  const handleGenerate = () => {
    if (!theme.trim()) {
      setError('Please enter a theme or big idea for your sermon.');
      return;
    }
    setError(null);
    getAISuggestions.mutate({
      sermonId,
      theme: theme.trim(),
      notes: notes.trim() || undefined,
    });
  };

  // Add scripture suggestion to outline
  const addScripture = (reference: string) => {
    onAddToOutline({
      id: generateId(),
      type: 'scripture',
      reference,
      note: '',
    });
  };

  // Add outline item (section or point) to outline
  const addOutlineItem = (item: { type: 'section' | 'point'; title?: string; text?: string }) => {
    if (item.type === 'section') {
      onAddToOutline({
        id: generateId(),
        type: 'section',
        title: item.title || '',
      });
    } else {
      onAddToOutline({
        id: generateId(),
        type: 'point',
        text: item.text || '',
      });
    }
  };

  const isLoading = getAISuggestions.isPending;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card variant="outlined">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles size={20} className="text-purple-600" />
            AI Sermon Helper
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Theme / Big Idea <span className="text-red-500">*</span>
            </label>
            <Input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g., God's grace in suffering, or John 3:16"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the main theme, scripture passage, or big idea for your sermon.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific direction, audience considerations, or context..."
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
            onClick={handleGenerate}
            disabled={isLoading || !theme.trim()}
            className="w-full gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating Suggestions...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate AI Suggestions
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Suggestions are generated based on your church&apos;s theology profile.
            Always review AI output before using.
          </p>
        </CardContent>
      </Card>

      {/* Guardrail Banners */}
      {restrictedTopicTriggered && (
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

      {politicalContentDetected && (
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

      {/* Results Section */}
      {suggestions && !restrictedTopicTriggered && (
        <div className="space-y-4">
          {/* Scripture Suggestions */}
          {suggestions.scriptureSuggestions && suggestions.scriptureSuggestions.length > 0 && (
            <Card variant="outlined">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen size={18} className="text-amber-600" />
                  Scripture Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suggestions.scriptureSuggestions!.map((scripture, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between gap-3 p-3 bg-amber-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-amber-800">{scripture.reference}</div>
                        <div className="text-sm text-gray-600 mt-1">{scripture.reason}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addScripture(scripture.reference)}
                        className="flex-shrink-0 gap-1"
                      >
                        <Plus size={14} /> Add
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Outline Suggestions */}
          {suggestions.outline && suggestions.outline.length > 0 && (
            <Card variant="outlined">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" />
                  Outline Skeleton
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {suggestions.outline!.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-start justify-between gap-3 p-3 rounded-lg ${
                        item.type === 'section' ? 'bg-purple-50' : 'bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {item.type === 'section' ? (
                          <span className="text-purple-600 font-semibold">[Section]</span>
                        ) : (
                          <span className="text-blue-600">•</span>
                        )}
                        <span className={item.type === 'section' ? 'font-medium' : ''}>
                          {item.title || item.text}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addOutlineItem({ type: item.type as 'section' | 'point', title: item.title, text: item.text })}
                        className="flex-shrink-0 gap-1"
                      >
                        <Plus size={14} /> Add
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Application Ideas */}
          {suggestions.applicationIdeas && suggestions.applicationIdeas.length > 0 && (
            <Card variant="outlined">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb size={18} className="text-green-600" />
                  Application Ideas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suggestions.applicationIdeas!.map((idea, index) => (
                    <div
                      key={index}
                      className="p-3 bg-green-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 bg-green-200 text-green-800 rounded-full">
                          {idea.audience}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">{idea.idea}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Application ideas are for reference. Add them as notes to your outline if helpful.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Hymn Themes */}
          {suggestions.hymnThemes && suggestions.hymnThemes.length > 0 && (
            <Card variant="outlined">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Music size={18} className="text-pink-600" />
                  Hymn Theme Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {suggestions.hymnThemes!.map((hymn, index) => (
                    <div
                      key={index}
                      className="p-3 bg-pink-50 rounded-lg"
                    >
                      <div className="font-medium text-pink-800">{hymn.theme}</div>
                      <div className="text-sm text-gray-600 mt-1">{hymn.reason}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Use the Hymn Finder tab to search for specific hymns matching these themes.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
