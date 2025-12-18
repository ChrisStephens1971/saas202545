'use client';

/**
 * SaveAsTemplateModal - Modal dialog for saving a service plan as a template
 *
 * Prompts user for template name and optional description.
 * Used from the ServicePlanEditor when "Save as Template" is clicked.
 *
 * Phase 8: Templates & Plan Library UX
 */

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, AlertCircle, LayoutTemplate } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaveAsTemplateModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when save is confirmed */
  onSave: (name: string, description?: string) => Promise<void>;
  /** Default template name */
  defaultName?: string;
  /** Whether save is in progress */
  isLoading?: boolean;
  /** Error message to display */
  error?: string;
}

export function SaveAsTemplateModal({
  isOpen,
  onClose,
  onSave,
  defaultName = 'New Template',
  isLoading = false,
  error,
}: SaveAsTemplateModalProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setDescription('');
      setLocalError(null);
      // Focus input after modal animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultName]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isLoading) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setLocalError('Template name is required');
      inputRef.current?.focus();
      return;
    }

    if (trimmedName.length > 255) {
      setLocalError('Template name must be 255 characters or less');
      inputRef.current?.focus();
      return;
    }

    try {
      await onSave(trimmedName, description.trim() || undefined);
    } catch {
      // Error is handled by parent component via error prop
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  const displayError = error || localError;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={() => !isLoading && onClose()}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-xl bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="template-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <LayoutTemplate className="h-5 w-5 text-purple-600" />
              </div>
              <h2 id="template-modal-title" className="text-lg font-semibold text-gray-900">
                Save as Template
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className={cn(
                'rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600',
                isLoading && 'cursor-not-allowed opacity-50'
              )}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 px-6 py-4">
              {/* Description */}
              <p className="text-sm text-gray-600">
                Save this service plan structure as a reusable template. You can use it to quickly
                create new plans in the future.
              </p>

              {/* Error message */}
              {displayError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{displayError}</span>
                </div>
              )}

              {/* Template name input */}
              <div>
                <label
                  htmlFor="template-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  ref={inputRef}
                  id="template-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  placeholder="e.g., Regular Sunday Service"
                  className={cn(
                    'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm',
                    'focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500',
                    'placeholder:text-gray-400',
                    isLoading && 'cursor-not-allowed bg-gray-50'
                  )}
                  maxLength={255}
                />
              </div>

              {/* Description input (optional) */}
              <div>
                <label
                  htmlFor="template-description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Description <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="template-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  placeholder="Brief description of this template..."
                  rows={2}
                  className={cn(
                    'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm',
                    'focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500',
                    'placeholder:text-gray-400 resize-none',
                    isLoading && 'cursor-not-allowed bg-gray-50'
                  )}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium text-gray-700',
                  'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2',
                  isLoading && 'cursor-not-allowed opacity-50'
                )}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white',
                  'hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
                  isLoading && 'cursor-wait'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <LayoutTemplate className="h-4 w-4" />
                    Save Template
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
