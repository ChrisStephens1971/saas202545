'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { SermonOutlineSchema, getBlockDefaults, getEffectiveBlockType } from '@elder-first/types';
import { Presentation, Printer, FileText, BookOpen, Lightbulb, StickyNote, ChevronDown, Eye, EyeOff, BookTemplate } from 'lucide-react';
import type { SermonOutline, SermonPathStage, SermonStatus, SermonBlockType, SermonOutlinePoint } from '@elder-first/types';
import { SaveAsTemplateModal } from './SaveAsTemplateModal';

interface SermonBuilderProps {
  sermonId: string;
  sermon: {
    id: string;
    title: string;
    primary_scripture: string | null;
    preacher: string | null;
    sermon_date: string | Date;
    outline: Partial<SermonOutline> | null;
    path_stage: SermonPathStage;
    status: SermonStatus;
    series_title?: string;
  };
  onUpdate: () => void;
}

const PATH_STAGES: { key: SermonPathStage; label: string; icon: string }[] = [
  { key: 'text_setup', label: 'Text & Setup', icon: '1' },
  { key: 'big_idea', label: 'Big Idea', icon: '2' },
  { key: 'outline', label: 'Outline', icon: '3' },
  { key: 'finalize', label: 'Finalize', icon: '4' },
];

const STATUS_OPTIONS: { value: SermonStatus; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready for Sunday' },
  { value: 'preached', label: 'Preached' },
];

// Block type configuration for UI
const BLOCK_TYPE_OPTIONS: { value: SermonBlockType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'POINT', label: 'Point', icon: <FileText size={14} />, color: 'bg-blue-100 text-blue-800' },
  { value: 'SCRIPTURE', label: 'Scripture', icon: <BookOpen size={14} />, color: 'bg-amber-100 text-amber-800' },
  { value: 'ILLUSTRATION', label: 'Illustration', icon: <Lightbulb size={14} />, color: 'bg-green-100 text-green-800' },
  { value: 'NOTE', label: 'Note', icon: <StickyNote size={14} />, color: 'bg-gray-100 text-gray-700' },
];

// 3-Point Sermon Template
const THREE_POINT_TEMPLATE: SermonOutlinePoint[] = [
  { label: 'Introduction', type: 'NOTE', showOnSlides: false, includeInPrint: true },
  { label: 'Point 1', type: 'POINT', showOnSlides: true, includeInPrint: true },
  { label: 'Point 2', type: 'POINT', showOnSlides: true, includeInPrint: true },
  { label: 'Point 3', type: 'POINT', showOnSlides: true, includeInPrint: true },
  { label: 'Application', type: 'NOTE', showOnSlides: false, includeInPrint: true },
  { label: 'Conclusion', type: 'NOTE', showOnSlides: false, includeInPrint: true },
];

/**
 * Create a new block with proper defaults based on type
 */
function createNewBlock(type: SermonBlockType = 'POINT'): SermonOutlinePoint {
  const defaults = getBlockDefaults(type);
  return {
    label: '',
    scriptureRef: '',
    summary: '',
    notes: '',
    type,
    showOnSlides: defaults.showOnSlides,
    includeInPrint: defaults.includeInPrint,
  };
}

/**
 * Safely build a SermonOutline from potentially invalid/null data.
 * Uses Zod safeParse to validate, falls back to empty defaults on failure.
 * This prevents SSR crashes ("Jest worker" errors) from malformed DB data.
 */
function buildSafeOutline(
  rawOutline: unknown,
  primaryScripture: string | null
): SermonOutline {
  // Default outline with empty values
  const defaultOutline: SermonOutline = {
    passage: primaryScripture ?? '',
    audienceFocus: '',
    bigIdea: '',
    mainPoints: [],
    application: '',
    callToAction: '',
    extraNotes: '',
  };

  // If no outline data, return defaults
  if (rawOutline === null || rawOutline === undefined) {
    return defaultOutline;
  }

  // If outline is not an object, return defaults
  if (typeof rawOutline !== 'object') {
    console.warn('[SermonBuilder] outline is not an object, using defaults');
    return defaultOutline;
  }

  // Use Zod safeParse to validate and coerce the outline
  const parseResult = SermonOutlineSchema.safeParse(rawOutline);

  if (parseResult.success) {
    // Valid outline - ensure all fields have values (Zod defaults handle mainPoints)
    return {
      passage: parseResult.data.passage ?? primaryScripture ?? '',
      audienceFocus: parseResult.data.audienceFocus ?? '',
      bigIdea: parseResult.data.bigIdea ?? '',
      mainPoints: parseResult.data.mainPoints ?? [],
      application: parseResult.data.application ?? '',
      callToAction: parseResult.data.callToAction ?? '',
      extraNotes: parseResult.data.extraNotes ?? '',
    };
  }

  // Zod parse failed - log and return defaults
  console.warn('[SermonBuilder] outline failed validation:', parseResult.error.issues);
  return defaultOutline;
}

export function SermonBuilder({ sermonId, sermon, onUpdate }: SermonBuilderProps) {
  const utils = trpc.useContext();

  // Query AI configuration status - determines if AI buttons are enabled
  const { data: aiConfig, isLoading: aiConfigLoading } = trpc.ai.aiConfig.useQuery();
  const isAiEnabled = aiConfig?.enabled ?? false;
  const router = useRouter(); // Add router hook

  // Local state for the outline (optimistic updates)
  // Uses buildSafeOutline to safely parse and validate outline data from the DB,
  // preventing crashes from null/malformed data during SSR
  const [outline, setOutline] = useState<SermonOutline>(() => {
    return buildSafeOutline(sermon.outline, sermon.primary_scripture);
  });

  const [currentStage, setCurrentStage] = useState<SermonPathStage>(
    sermon.path_stage || 'text_setup'
  );
  const [status, setStatus] = useState<SermonStatus>(sermon.status || 'draft');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Update sermon mutation
  const updateSermon = trpc.sermons.update.useMutation({
    onSuccess: () => {
      utils.sermons.get.invalidate({ id: sermonId });
      onUpdate();
      setSaveMessage('Saved!');
      setTimeout(() => setSaveMessage(''), 2000);
    },
    onError: (error) => {
      alert(`Error saving: ${error.message}`);
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  // Ready and sync mutation
  const setReadyAndSync = trpc.sermons.setReadyAndSync.useMutation({
    onSuccess: (data) => {
      utils.sermons.get.invalidate({ id: sermonId });
      onUpdate();
      if (data.syncedServiceItems > 0) {
        setSaveMessage(`Saved and synced to ${data.syncedServiceItems} service item(s)!`);
      } else {
        setSaveMessage('Set to Ready!');
      }
      setTimeout(() => setSaveMessage(''), 3000);
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  // AI mutations
  const suggestBigIdea = trpc.ai.suggestBigIdea.useMutation();
  const suggestOutline = trpc.ai.suggestOutline.useMutation();
  const shortenText = trpc.ai.shortenText.useMutation();

  // Auto-save debounce
  const saveOutline = useCallback(async () => {
    setIsSaving(true);
    await updateSermon.mutateAsync({
      id: sermonId,
      outline,
      pathStage: currentStage,
      status,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updateSermon is a tRPC mutation; adding it causes callback recreation on every render
  }, [sermonId, outline, currentStage, status]);

  // Navigate between stages
  const goToStage = (stage: SermonPathStage) => {
    setCurrentStage(stage);
    updateSermon.mutate({
      id: sermonId,
      pathStage: stage,
    });
  };

  const goNext = () => {
    const currentIndex = PATH_STAGES.findIndex(s => s.key === currentStage);
    if (currentIndex < PATH_STAGES.length - 1) {
      goToStage(PATH_STAGES[currentIndex + 1].key);
    }
  };

  const goPrev = () => {
    const currentIndex = PATH_STAGES.findIndex(s => s.key === currentStage);
    if (currentIndex > 0) {
      goToStage(PATH_STAGES[currentIndex - 1].key);
    }
  };

  // AI Handlers
  const handleSuggestBigIdea = async () => {
    if (!outline.passage) {
      alert('Please enter a scripture passage first.');
      return;
    }
    try {
      const result = await suggestBigIdea.mutateAsync({
        passage: outline.passage,
        title: sermon.title,
        audienceFocus: outline.audienceFocus,
      });
      // Show options to user
      const options = [result.bigIdea, ...(result.alternatives || [])];
      const choice = prompt(
        `AI Suggestions:\n\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}\n\nEnter number to accept (or 0 to cancel):`
      );
      if (choice && parseInt(choice) > 0 && parseInt(choice) <= options.length) {
        setOutline(prev => ({ ...prev, bigIdea: options[parseInt(choice) - 1] }));
      }
    } catch (error: any) {
      alert(`AI Error: ${error.message}`);
    }
  };

  const handleSuggestOutline = async () => {
    if (!outline.passage) {
      alert('Please enter a scripture passage first.');
      return;
    }
    try {
      const result = await suggestOutline.mutateAsync({
        passage: outline.passage,
        title: sermon.title,
        bigIdea: outline.bigIdea,
        desiredPoints: 3,
      });
      if (result.mainPoints && confirm(`AI generated ${result.mainPoints.length} points. Replace current outline?`)) {
        setOutline(prev => ({
          ...prev,
          mainPoints: result.mainPoints!.map(p => ({
            label: p.label,
            scriptureRef: p.scriptureRef || '',
            summary: p.summary || '',
            notes: '',
          })),
        }));
      }
    } catch (error: any) {
      alert(`AI Error: ${error.message}`);
    }
  };

  const handleShortenText = async (text: string, onAccept: (shortened: string) => void) => {
    if (!text || text.length < 50) {
      alert('Text is already short enough.');
      return;
    }
    try {
      const result = await shortenText.mutateAsync({
        text,
        maxSentences: 3,
      });
      if (confirm(`Shortened text:\n\n"${result.shortened}"\n\nAccept?`)) {
        onAccept(result.shortened);
      }
    } catch (error: any) {
      alert(`AI Error: ${error.message}`);
    }
  };

  // Handle status change with sync
  const handleStatusChange = async (newStatus: SermonStatus) => {
    setStatus(newStatus);
    if (newStatus === 'ready') {
      await setReadyAndSync.mutateAsync({ id: sermonId });
    } else {
      await updateSermon.mutateAsync({
        id: sermonId,
        status: newStatus,
      });
    }
  };

  // Add a new main point with proper defaults
  const addMainPoint = (type: SermonBlockType = 'POINT') => {
    setOutline(prev => ({
      ...prev,
      mainPoints: [...prev.mainPoints, createNewBlock(type)],
    }));
  };

  // Insert 3-point template
  const insertTemplate = () => {
    if (outline.mainPoints.length > 0) {
      if (!confirm('This will replace your current outline with a 3-point template. Continue?')) {
        return;
      }
    }
    setOutline(prev => ({
      ...prev,
      mainPoints: THREE_POINT_TEMPLATE.map(p => ({ ...p })), // Clone to avoid mutation
    }));
  };

  // Update block type and apply defaults for new type
  const updateBlockType = (index: number, newType: SermonBlockType) => {
    const defaults = getBlockDefaults(newType);
    setOutline(prev => ({
      ...prev,
      mainPoints: prev.mainPoints.map((p, i) =>
        i === index
          ? {
              ...p,
              type: newType,
              // Only apply defaults if flags were previously undefined (preserving explicit user choices)
              showOnSlides: p.showOnSlides !== undefined ? p.showOnSlides : defaults.showOnSlides,
              includeInPrint: p.includeInPrint !== undefined ? p.includeInPrint : defaults.includeInPrint,
            }
          : p
      ),
    }));
  };

  // Toggle block flag
  const toggleBlockFlag = (index: number, flag: 'showOnSlides' | 'includeInPrint') => {
    setOutline(prev => ({
      ...prev,
      mainPoints: prev.mainPoints.map((p, i) => {
        if (i !== index) return p;
        const effectiveType = getEffectiveBlockType(p.type);
        const defaults = getBlockDefaults(effectiveType);
        const currentValue = p[flag] ?? defaults[flag];
        return { ...p, [flag]: !currentValue };
      }),
    }));
  };

  // Remove a main point
  const removeMainPoint = (index: number) => {
    setOutline(prev => ({
      ...prev,
      mainPoints: prev.mainPoints.filter((_, i) => i !== index),
    }));
  };

  // Update a main point
  const updateMainPoint = (index: number, field: string, value: string) => {
    setOutline(prev => ({
      ...prev,
      mainPoints: prev.mainPoints.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }));
  };

  // Render step content - must return a value for all cases
  const renderStepContent = (): React.ReactNode => {
    switch (currentStage) {
      case 'text_setup':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-base font-semibold mb-2">Sermon Title</label>
              <p className="text-lg text-gray-900 bg-gray-100 px-4 py-3 rounded-lg">
                {sermon.title}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Edit title in the main sermon form above.
              </p>
            </div>

            <div>
              <label className="block text-base font-semibold mb-2">Scripture Passage</label>
              <Input
                value={outline.passage || ''}
                onChange={(e) => setOutline(prev => ({ ...prev, passage: e.target.value }))}
                placeholder="e.g., Ephesians 2:1-10"
              />
              <p className="text-sm text-gray-500 mt-1">
                The main text you&apos;ll be preaching from.
              </p>
            </div>

            {sermon.series_title && (
              <div>
                <label className="block text-base font-semibold mb-2">Series</label>
                <p className="text-base text-gray-700 bg-purple-50 px-4 py-3 rounded-lg">
                  {sermon.series_title}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button variant="primary" size="lg" onClick={goNext}>
                Next: Big Idea & Audience
              </Button>
            </div>
          </div>
        );

      case 'big_idea':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-base font-semibold mb-2">Audience Focus</label>
              <Input
                value={outline.audienceFocus || ''}
                onChange={(e) => setOutline(prev => ({ ...prev, audienceFocus: e.target.value }))}
                placeholder="e.g., Sunday AM adults, mixed spiritual maturity"
              />
              <p className="text-sm text-gray-500 mt-1">
                Who are you preaching to? This helps focus your message.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-base font-semibold">Big Idea</label>
                <div className="relative group">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSuggestBigIdea}
                    disabled={!isAiEnabled || suggestBigIdea.isLoading || aiConfigLoading}
                  >
                    {suggestBigIdea.isLoading ? 'Thinking...' : 'Suggest with AI'}
                  </Button>
                  {!isAiEnabled && !aiConfigLoading && (
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      AI not configured (OPENAI_API_KEY missing)
                    </span>
                  )}
                </div>
              </div>
              <textarea
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                rows={3}
                value={outline.bigIdea || ''}
                onChange={(e) => setOutline(prev => ({ ...prev, bigIdea: e.target.value }))}
                placeholder="One sentence that captures the main point of your sermon..."
              />
              <p className="text-sm text-gray-500 mt-1">
                What&apos;s the one thing you want people to remember?
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={goPrev}>
                Back
              </Button>
              <Button variant="primary" size="lg" onClick={goNext}>
                Next: Outline
              </Button>
            </div>
          </div>
        );

      case 'outline':
        return (
          <div className="space-y-6">
            {/* Main Points */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-lg font-semibold">Sermon Blocks</label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={insertTemplate}
                    title="Insert a basic 3-point sermon structure"
                  >
                    📋 3-Point Template
                  </Button>
                  <div className="relative group">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSuggestOutline}
                      disabled={!isAiEnabled || suggestOutline.isLoading || aiConfigLoading}
                    >
                      {suggestOutline.isLoading ? 'Generating...' : '✨ AI Outline'}
                    </Button>
                    {!isAiEnabled && !aiConfigLoading && (
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        AI not configured
                      </span>
                    )}
                  </div>
                  <Button variant="primary" size="sm" onClick={() => addMainPoint('POINT')}>
                    + Add Block
                  </Button>
                </div>
              </div>

              {outline.mainPoints.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 mb-3">
                    No blocks yet. Start with a template or add blocks manually.
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={insertTemplate}>
                      📋 Use 3-Point Template
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {outline.mainPoints.map((point, index) => {
                  const effectiveType = getEffectiveBlockType(point.type);
                  const typeConfig = BLOCK_TYPE_OPTIONS.find(t => t.value === effectiveType) || BLOCK_TYPE_OPTIONS[0];
                  const defaults = getBlockDefaults(effectiveType);
                  const showOnSlides = point.showOnSlides ?? defaults.showOnSlides;
                  const includeInPrint = point.includeInPrint ?? defaults.includeInPrint;

                  return (
                    <Card key={index} variant="outlined" className="relative">
                      <CardContent className="pt-6">
                        {/* Block Header: Type selector, flags, and delete */}
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            {/* Block Type Selector */}
                            <div className="relative">
                              <select
                                value={effectiveType}
                                onChange={(e) => updateBlockType(index, e.target.value as SermonBlockType)}
                                className={`appearance-none pl-3 pr-8 py-1.5 text-sm font-medium rounded-md border cursor-pointer ${typeConfig.color}`}
                              >
                                {BLOCK_TYPE_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                            </div>

                            <span className="text-sm text-gray-500">Block {index + 1}</span>
                          </div>

                          {/* Flag Toggles and Delete */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleBlockFlag(index, 'showOnSlides')}
                              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                                showOnSlides
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                              title={showOnSlides ? 'Shown on slides' : 'Hidden from slides'}
                            >
                              {showOnSlides ? <Eye size={12} /> : <EyeOff size={12} />}
                              Slides
                            </button>
                            <button
                              onClick={() => toggleBlockFlag(index, 'includeInPrint')}
                              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                                includeInPrint
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                              title={includeInPrint ? 'Included in print' : 'Hidden from print'}
                            >
                              <Printer size={12} />
                              Print
                            </button>
                            <button
                              onClick={() => removeMainPoint(index)}
                              className="text-gray-400 hover:text-red-500 p-1 ml-2"
                              title="Remove block"
                            >
                              &times;
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium mb-1">
                                {effectiveType === 'SCRIPTURE' ? 'Scripture Title/Reference' :
                                 effectiveType === 'ILLUSTRATION' ? 'Illustration Title' :
                                 effectiveType === 'NOTE' ? 'Note Title' : 'Point Label'}
                              </label>
                              <Input
                                value={point.label}
                                onChange={(e) => updateMainPoint(index, 'label', e.target.value)}
                                placeholder={
                                  effectiveType === 'SCRIPTURE' ? 'e.g., Reading from Ephesians' :
                                  effectiveType === 'ILLUSTRATION' ? 'e.g., The Potter & Clay' :
                                  effectiveType === 'NOTE' ? 'e.g., Transition to main points' :
                                  'e.g., We were dead in sin'
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Scripture Ref</label>
                              <Input
                                value={point.scriptureRef || ''}
                                onChange={(e) => updateMainPoint(index, 'scriptureRef', e.target.value)}
                                placeholder="e.g., Eph 2:1-3"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-sm font-medium">
                                {effectiveType === 'SCRIPTURE' ? 'Scripture Text' :
                                 effectiveType === 'ILLUSTRATION' ? 'Story/Example' :
                                 effectiveType === 'NOTE' ? 'Note Content' : 'Summary'}
                              </label>
                              {point.summary && point.summary.length > 100 && (
                                <div className="relative group">
                                  <button
                                    onClick={() => handleShortenText(point.summary || '', (shortened) =>
                                      updateMainPoint(index, 'summary', shortened)
                                    )}
                                    className={`text-xs ${isAiEnabled ? 'text-primary-600 hover:underline' : 'text-gray-400 cursor-not-allowed'}`}
                                    disabled={!isAiEnabled || shortenText.isLoading}
                                  >
                                    ✨ Shorten
                                  </button>
                                  {!isAiEnabled && !aiConfigLoading && (
                                    <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                      AI not configured
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <textarea
                              className="w-full px-4 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                              rows={2}
                              value={point.summary || ''}
                              onChange={(e) => updateMainPoint(index, 'summary', e.target.value)}
                              placeholder={
                                effectiveType === 'SCRIPTURE' ? 'Paste scripture text here...' :
                                effectiveType === 'ILLUSTRATION' ? 'Describe the illustration...' :
                                effectiveType === 'NOTE' ? 'Write your note...' :
                                '1-3 sentences...'
                              }
                            />
                          </div>

                          <details className="text-sm">
                            <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                              Additional Notes (optional)
                            </summary>
                            <textarea
                              className="w-full mt-2 px-4 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-primary-500"
                              rows={3}
                              value={point.notes || ''}
                              onChange={(e) => updateMainPoint(index, 'notes', e.target.value)}
                              placeholder="Extended notes, quotes, reminders..."
                            />
                          </details>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Application */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-base font-semibold">Application</label>
                {outline.application && outline.application.length > 100 && (
                  <div className="relative group">
                    <button
                      onClick={() => handleShortenText(outline.application || '', (shortened) =>
                        setOutline(prev => ({ ...prev, application: shortened }))
                      )}
                      className={`text-xs ${isAiEnabled ? 'text-primary-600 hover:underline' : 'text-gray-400 cursor-not-allowed'}`}
                      disabled={!isAiEnabled || shortenText.isLoading}
                    >
                      Shorten with AI
                    </button>
                    {!isAiEnabled && !aiConfigLoading && (
                      <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        AI not configured
                      </span>
                    )}
                  </div>
                )}
              </div>
              <textarea
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                rows={3}
                value={outline.application || ''}
                onChange={(e) => setOutline(prev => ({ ...prev, application: e.target.value }))}
                placeholder="How should people apply this message to their lives?"
              />
            </div>

            {/* Call to Action */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-base font-semibold">Call to Action</label>
                {outline.callToAction && outline.callToAction.length > 100 && (
                  <div className="relative group">
                    <button
                      onClick={() => handleShortenText(outline.callToAction || '', (shortened) =>
                        setOutline(prev => ({ ...prev, callToAction: shortened }))
                      )}
                      className={`text-xs ${isAiEnabled ? 'text-primary-600 hover:underline' : 'text-gray-400 cursor-not-allowed'}`}
                      disabled={!isAiEnabled || shortenText.isLoading}
                    >
                      Shorten with AI
                    </button>
                    {!isAiEnabled && !aiConfigLoading && (
                      <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        AI not configured
                      </span>
                    )}
                  </div>
                )}
              </div>
              <textarea
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                rows={2}
                value={outline.callToAction || ''}
                onChange={(e) => setOutline(prev => ({ ...prev, callToAction: e.target.value }))}
                placeholder="What specific action should they take this week?"
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={goPrev}>
                Back
              </Button>
              <Button variant="primary" size="lg" onClick={goNext}>
                Next: Finalize
              </Button>
            </div>
          </div>
        );

      case 'finalize':
        return (
          <div className="space-y-6">
            {/* Status Selector */}
            <div>
              <label className="block text-base font-semibold mb-2">Sermon Status</label>
              <select
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as SermonStatus)}
                disabled={setReadyAndSync.isLoading || updateSermon.isLoading}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Setting to &quot;Ready for Sunday&quot; will sync to any linked service items.
              </p>
            </div>

            {/* Bulletin Preview */}
            <Card variant="outlined" className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">Bulletin Preview</CardTitle>
              </CardHeader>
              <CardContent className="text-blue-800">
                <div className="space-y-2">
                  <p><strong>Title:</strong> {sermon.title}</p>
                  <p><strong>Scripture:</strong> {outline.passage || sermon.primary_scripture || '—'}</p>
                  <p><strong>Preacher:</strong> {sermon.preacher || '—'}</p>
                  {outline.mainPoints.length > 0 && (
                    <div>
                      <strong>Main Points:</strong>
                      <ul className="list-disc list-inside ml-2 mt-1">
                        {outline.mainPoints.slice(0, 3).map((p, i) => (
                          <li key={i}>{p.label || `Point ${i + 1}`}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Extra Notes */}
            <div>
              <label className="block text-base font-semibold mb-2">Extra Notes</label>
              <textarea
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                rows={3}
                value={outline.extraNotes || ''}
                onChange={(e) => setOutline(prev => ({ ...prev, extraNotes: e.target.value }))}
                placeholder="Any other notes for yourself..."
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={goPrev}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsTemplateModalOpen(true)}
                  disabled={outline.mainPoints.length === 0}
                  className="gap-2"
                  title={outline.mainPoints.length === 0 ? 'Add some outline blocks first' : 'Save this structure as a reusable template'}
                >
                  <BookTemplate size={16} />
                  Save as Template
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={saveOutline}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Outline'}
                </Button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Sermon Builder</CardTitle>
          <div className="flex items-center gap-4">
            {saveMessage && (
              <span className="text-sm text-green-600 font-medium">{saveMessage}</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/sermons/${sermonId}/print`)}
              className="gap-2"
            >
              <Printer size={16} /> Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/sermons/${sermonId}/preach`)}
              className="gap-2"
            >
              <Presentation size={16} /> Preach Mode
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stepper */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {PATH_STAGES.map((stage, index) => {
              const isActive = stage.key === currentStage;
              const isPast = PATH_STAGES.findIndex(s => s.key === currentStage) > index;

              return (
                <button
                  key={stage.key}
                  onClick={() => goToStage(stage.key)}
                  className={`flex-1 flex flex-col items-center p-3 transition-colors ${isActive
                    ? 'text-primary-700'
                    : isPast
                      ? 'text-green-600'
                      : 'text-gray-400'
                    }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mb-2 ${isActive
                      ? 'bg-primary-600 text-white'
                      : isPast
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                      }`}
                  >
                    {isPast ? '✓' : stage.icon}
                  </div>
                  <span className={`text-sm font-medium ${isActive ? 'text-primary-700' : ''}`}>
                    {stage.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-300"
              style={{
                width: `${((PATH_STAGES.findIndex(s => s.key === currentStage) + 1) / PATH_STAGES.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Step Content */}
        {renderStepContent()}
      </CardContent>

      {/* Save as Template Modal */}
      <SaveAsTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        sermonId={sermonId}
        sermonTitle={sermon.title}
        onSuccess={() => {
          setSaveMessage('Template saved!');
          setTimeout(() => setSaveMessage(''), 3000);
        }}
      />
    </Card>
  );
}
