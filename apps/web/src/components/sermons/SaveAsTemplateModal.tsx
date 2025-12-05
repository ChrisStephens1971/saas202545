'use client';

import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Save, AlertCircle, CheckCircle, Loader2, X, BookTemplate } from 'lucide-react';

interface SaveAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  sermonId: string;
  sermonTitle: string;
  onSuccess?: (templateId: string) => void;
}

/**
 * SaveAsTemplateModal - Save current sermon plan as a reusable template
 *
 * Allows pastors to save their sermon plan structure as a template
 * that can be used to bootstrap future sermons.
 */
export function SaveAsTemplateModal({
  isOpen,
  onClose,
  sermonId,
  sermonTitle,
  onSuccess,
}: SaveAsTemplateModalProps) {
  const [templateName, setTemplateName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const createTemplateMutation = trpc.sermonHelper.createTemplateFromPlan.useMutation({
    onSuccess: (data) => {
      setSuccess(true);
      setError(null);
      setTimeout(() => {
        onSuccess?.(data.id);
        onClose();
      }, 1500);
    },
    onError: (err) => {
      setError(err.message || 'Failed to create template');
      setSuccess(false);
    },
  });

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      // Suggest a name based on sermon title
      if (!templateName) {
        setTemplateName(`${sermonTitle} Template`);
      }
    }
  }, [isOpen, sermonTitle, templateName]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTemplateName('');
      setTags([]);
      setTagInput('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (templateName.trim().length < 3) {
      setError('Template name must be at least 3 characters.');
      return;
    }

    if (templateName.trim().length > 200) {
      setError('Template name must be 200 characters or less.');
      return;
    }

    setError(null);
    createTemplateMutation.mutate({
      sermonId,
      name: templateName.trim(),
      tags,
    });
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) {
        handleAddTag();
      } else {
        handleSave();
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!isOpen) return null;

  const isSaving = createTemplateMutation.isPending;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BookTemplate size={20} className="text-purple-600" />
                Save as Template
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Save this sermon&apos;s structure as a reusable template.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
              disabled={isSaving}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {success ? (
              <div className="flex flex-col items-center py-6">
                <CheckCircle size={48} className="text-green-500 mb-3" />
                <p className="text-lg font-medium text-green-700">Template Saved!</p>
                <p className="text-sm text-gray-500 mt-1">
                  You can use this template when creating new sermons.
                </p>
              </div>
            ) : (
              <>
                {/* Template Name */}
                <div>
                  <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name
                  </label>
                  <input
                    ref={inputRef}
                    id="templateName"
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., 3-Point Expository Template"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={isSaving}
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {templateName.length}/200 characters
                  </p>
                </div>

                {/* Tags */}
                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (optional)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      id="tags"
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="e.g., expository, gospel, narrative"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={isSaving || tags.length >= 10}
                    />
                    <button
                      onClick={handleAddTag}
                      disabled={!tagInput.trim() || isSaving || tags.length >= 10}
                      className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="text-purple-500 hover:text-purple-700"
                            disabled={isSaving}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {tags.length}/10 tags. Press Enter or comma to add.
                  </p>
                </div>

                {/* Info */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                      The template will include the sermon&apos;s structure (sections, points,
                      scripture references) but not the specific content or notes.
                    </div>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!success && (
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={templateName.trim().length < 3 || isSaving}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Template
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
