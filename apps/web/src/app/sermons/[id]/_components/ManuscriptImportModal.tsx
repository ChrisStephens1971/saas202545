'use client';

import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { FileUp, AlertCircle, CheckCircle, Loader2, X, Sparkles } from 'lucide-react';
import type { SermonElement, SermonPlanDraft } from '@elder-first/types';

interface ManuscriptImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sermonId: string;
  sermonTitle: string;
  onImport: (draft: SermonPlanDraft) => void;
}

/**
 * ManuscriptImportModal - AI-powered manuscript-to-outline extraction
 *
 * Allows pastors to paste their sermon manuscript and have AI extract
 * a structured outline (SermonPlanDraft) from it.
 *
 * Privacy: Manuscript text is only sent to AI for extraction and is NOT
 * stored in the database as-is.
 */
export function ManuscriptImportModal({
  isOpen,
  onClose,
  sermonId,
  sermonTitle,
  onImport,
}: ManuscriptImportModalProps) {
  const [manuscriptText, setManuscriptText] = useState('');
  const [extractedDraft, setExtractedDraft] = useState<SermonPlanDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const importMutation = trpc.sermonHelper.importFromManuscript.useMutation({
    onSuccess: (data) => {
      setExtractedDraft(data.draft);
      setError(null);
    },
    onError: (err) => {
      setError(err.message || 'Failed to extract outline from manuscript');
      setExtractedDraft(null);
    },
  });

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setManuscriptText('');
      setExtractedDraft(null);
      setError(null);
    }
  }, [isOpen]);

  const handleExtract = () => {
    if (manuscriptText.trim().length < 100) {
      setError('Please enter at least 100 characters of manuscript text.');
      return;
    }

    setError(null);
    importMutation.mutate({
      sermonId,
      manuscriptText: manuscriptText.trim(),
    });
  };

  const handleConfirmImport = () => {
    if (extractedDraft) {
      onImport(extractedDraft);
      onClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  const isExtracting = importMutation.isPending;
  const hasExtractedDraft = extractedDraft !== null;
  const characterCount = manuscriptText.length;
  const isValidLength = characterCount >= 100 && characterCount <= 50000;

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
                <FileUp size={20} className="text-purple-600" />
                Import from Manuscript
                <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded">
                  Beta
                </span>
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Paste your sermon manuscript below. AI will extract a structured outline.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {!hasExtractedDraft ? (
              // Step 1: Input manuscript
              <div className="space-y-4">
                {/* Privacy notice */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Privacy Notice:</span> Your manuscript
                      is only used to generate this outline and is not stored as-is. Only
                      the extracted structure is saved.
                    </div>
                  </div>
                </div>

                {/* Sermon title for context */}
                <div className="text-sm text-gray-600">
                  Extracting outline for: <span className="font-medium">{sermonTitle}</span>
                </div>

                {/* Textarea */}
                <div>
                  <label htmlFor="manuscript" className="block text-sm font-medium text-gray-700 mb-1">
                    Manuscript Text
                  </label>
                  <textarea
                    ref={textareaRef}
                    id="manuscript"
                    value={manuscriptText}
                    onChange={(e) => setManuscriptText(e.target.value)}
                    placeholder="Paste your sermon manuscript here...

Example: Your sermon text with introduction, main points, scripture references, illustrations, and conclusion."
                    className="w-full h-80 px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={isExtracting}
                  />
                  <div className="mt-1 flex justify-between text-xs text-gray-500">
                    <span>
                      {characterCount < 100 && (
                        <span className="text-amber-600">
                          {100 - characterCount} more characters needed
                        </span>
                      )}
                      {characterCount >= 100 && characterCount <= 50000 && (
                        <span className="text-green-600">Valid length</span>
                      )}
                      {characterCount > 50000 && (
                        <span className="text-red-600">
                          Text too long ({characterCount - 50000} over limit)
                        </span>
                      )}
                    </span>
                    <span>{characterCount.toLocaleString()} / 50,000 characters</span>
                  </div>
                </div>

                {/* Error display */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            ) : (
              // Step 2: Review extracted draft
              <div className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Outline extracted!</span> Review the
                    structure below before importing.
                  </div>
                </div>

                {/* Extracted draft preview */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {extractedDraft.title || 'Untitled'}
                  </h4>

                  {extractedDraft.bigIdea && (
                    <div className="mb-3">
                      <span className="text-xs uppercase text-gray-500 font-medium">Big Idea</span>
                      <p className="text-sm text-gray-700">{extractedDraft.bigIdea}</p>
                    </div>
                  )}

                  {extractedDraft.primaryText && (
                    <div className="mb-3">
                      <span className="text-xs uppercase text-gray-500 font-medium">Primary Text</span>
                      <p className="text-sm text-gray-700">{extractedDraft.primaryText}</p>
                    </div>
                  )}

                  {extractedDraft.supportingTexts && extractedDraft.supportingTexts.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs uppercase text-gray-500 font-medium">Supporting Texts</span>
                      <p className="text-sm text-gray-700">
                        {extractedDraft.supportingTexts.join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Elements preview */}
                  <div className="mt-4">
                    <span className="text-xs uppercase text-gray-500 font-medium mb-2 block">
                      Outline ({extractedDraft.elements.length} elements)
                    </span>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {extractedDraft.elements.map((element, index) => (
                        <ElementPreview key={element.id || index} element={element} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Back button */}
                <button
                  onClick={() => setExtractedDraft(null)}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  ← Edit manuscript and try again
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
              disabled={isExtracting}
            >
              Cancel
            </button>

            {!hasExtractedDraft ? (
              <button
                onClick={handleExtract}
                disabled={!isValidLength || isExtracting}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isExtracting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Extract Outline
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleConfirmImport}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle size={16} />
                Use This Outline
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * ElementPreview - Renders a single SermonElement in the preview
 */
function ElementPreview({ element }: { element: SermonElement }) {
  switch (element.type) {
    case 'section':
      return (
        <div className="pl-0 py-1 border-l-4 border-blue-500 pl-2 bg-blue-50 rounded-r">
          <span className="text-xs text-blue-600 uppercase font-medium">Section</span>
          <p className="text-sm font-medium text-gray-900">{element.title}</p>
        </div>
      );
    case 'point':
      return (
        <div className="pl-4 py-1 border-l-2 border-green-400 pl-2">
          <span className="text-xs text-green-600 uppercase font-medium">Point</span>
          <p className="text-sm text-gray-800">{element.text}</p>
        </div>
      );
    case 'note':
      return (
        <div className="pl-6 py-1 border-l-2 border-yellow-400 pl-2">
          <span className="text-xs text-yellow-600 uppercase font-medium">Note</span>
          <p className="text-sm text-gray-600 italic">{element.text}</p>
        </div>
      );
    case 'scripture':
      return (
        <div className="pl-4 py-1 border-l-2 border-purple-400 pl-2">
          <span className="text-xs text-purple-600 uppercase font-medium">Scripture</span>
          <p className="text-sm text-gray-800 font-medium">{element.reference}</p>
          {element.note && <p className="text-xs text-gray-500">{element.note}</p>}
        </div>
      );
    case 'hymn':
      return (
        <div className="pl-4 py-1 border-l-2 border-teal-400 pl-2">
          <span className="text-xs text-teal-600 uppercase font-medium">Hymn</span>
          <p className="text-sm text-gray-800">{element.title}</p>
          {element.note && <p className="text-xs text-gray-500">{element.note}</p>}
        </div>
      );
    default:
      return null;
  }
}
