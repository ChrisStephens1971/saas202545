'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Sparkles, AlertCircle, CheckCircle, Loader2, X, Copy, Check, AlertTriangle } from 'lucide-react';
import type { SermonDraft } from '@elder-first/types';

interface GenerateDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  sermonId: string;
  sermonTitle: string;
}

/**
 * GenerateDraftModal - AI-powered preaching draft generation from SermonPlan
 *
 * Phase 8: Generates a full preaching manuscript (markdown) from an existing
 * SermonPlan. The draft is ephemeral (not stored in DB) and can be copied
 * for use in the pastor's preferred word processor.
 *
 * Respects all existing guardrails:
 * - Restricted topics block generation
 * - Political content is filtered from output
 * - Theology profile shapes the AI prompt
 */
export function GenerateDraftModal({
  isOpen,
  onClose,
  sermonId,
  sermonTitle,
}: GenerateDraftModalProps) {
  const [generatedDraft, setGeneratedDraft] = useState<SermonDraft | null>(null);
  const [politicalContentDetected, setPoliticalContentDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateMutation = trpc.sermonHelper.generateDraftFromPlan.useMutation({
    onSuccess: (data) => {
      setGeneratedDraft(data.draft);
      setPoliticalContentDetected(data.meta.politicalContentDetected ?? false);
      setError(null);
    },
    onError: (err) => {
      setError(err.message || 'Failed to generate draft');
      setGeneratedDraft(null);
      setPoliticalContentDetected(false);
    },
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Automatically start generation when modal opens
      setGeneratedDraft(null);
      setPoliticalContentDetected(false);
      setError(null);
      setCopied(false);
      generateMutation.mutate({ sermonId });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sermonId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setGeneratedDraft(null);
      setPoliticalContentDetected(false);
      setError(null);
      setCopied(false);
    }
  }, [isOpen]);

  const handleCopyToClipboard = async () => {
    if (generatedDraft?.contentMarkdown) {
      try {
        await navigator.clipboard.writeText(generatedDraft.contentMarkdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = generatedDraft.contentMarkdown;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleRegenerate = () => {
    setGeneratedDraft(null);
    setPoliticalContentDetected(false);
    setError(null);
    setCopied(false);
    generateMutation.mutate({ sermonId });
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  const isGenerating = generateMutation.isPending;
  const hasGeneratedDraft = generatedDraft !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles size={20} className="text-purple-600" />
                Generate Preaching Draft
                <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                  Phase 8
                </span>
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                AI-generated manuscript from your sermon plan for &ldquo;{sermonTitle}&rdquo;
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 p-1"
              disabled={isGenerating}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {isGenerating && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Loader2 size={48} className="animate-spin text-purple-600 mb-4" />
                <p className="text-lg font-medium">Generating your preaching draft...</p>
                <p className="text-sm text-gray-400 mt-2">
                  This may take a moment as AI crafts your manuscript.
                </p>
              </div>
            )}

            {error && !isGenerating && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-3">
                  <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Generation Failed</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>

                {/* Helpful hints based on error */}
                {error.includes('restricted topics') && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                    <p className="font-medium flex items-center gap-2">
                      <AlertTriangle size={16} />
                      Restricted Topic Detected
                    </p>
                    <p className="mt-1">
                      Your church&apos;s theology settings have restricted AI assistance for this topic.
                      Please prepare this sermon content personally.
                    </p>
                  </div>
                )}

                {error.includes('No sermon plan') && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                    <p className="font-medium">No Sermon Plan Found</p>
                    <p className="mt-1">
                      Please create a sermon plan first using the Sermon Helper panel.
                      The AI needs your outline, scripture selections, and big idea to generate a draft.
                    </p>
                  </div>
                )}
              </div>
            )}

            {hasGeneratedDraft && !isGenerating && (
              <div className="space-y-4">
                {/* Success notice */}
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Draft generated!</span> Review below and copy to your preferred editor.
                  </div>
                </div>

                {/* Political content warning */}
                {politicalContentDetected && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Content Filtered:</span> Some political content was
                      removed to maintain Christ-centered, non-partisan focus.
                    </div>
                  </div>
                )}

                {/* Draft metadata */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {generatedDraft.styleProfile && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                      Style: {generatedDraft.styleProfile.replace(/_/g, ' ')}
                    </span>
                  )}
                  {generatedDraft.theologyTradition && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {generatedDraft.theologyTradition}
                    </span>
                  )}
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    {generatedDraft.contentMarkdown.length.toLocaleString()} characters
                  </span>
                </div>

                {/* Draft content */}
                <div className="border rounded-lg bg-gray-50 overflow-hidden">
                  <div className="px-4 py-2 bg-gray-100 border-b flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Preaching Manuscript</span>
                    <button
                      onClick={handleCopyToClipboard}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check size={14} className="text-green-600" />
                          <span className="text-green-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          Copy to Clipboard
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                      {generatedDraft.contentMarkdown}
                    </pre>
                  </div>
                </div>

                {/* Usage hint */}
                <p className="text-xs text-gray-500 text-center">
                  💡 Tip: Copy this draft to your word processor for final editing before preaching.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex justify-between items-center">
            <div className="text-xs text-gray-400">
              Generated with AI • Not stored in database
            </div>
            <div className="flex gap-3">
              {hasGeneratedDraft && (
                <button
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2"
                >
                  <Sparkles size={14} />
                  Regenerate
                </button>
              )}
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                disabled={isGenerating}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
