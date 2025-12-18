'use client';

/**
 * ServicePlanActions - Action bar for Service Plan page
 *
 * Contains:
 * - Save button (primary when unsaved changes)
 * - Download dropdown (JSON, Text)
 * - Print button
 * - Save as Template button
 * - Clear button
 *
 * Phase 7: Added download dropdown with multiple export formats
 */

import { useState, useRef, useEffect } from 'react';
import { Download, Printer, Save, Trash2, Check, Loader2, ChevronDown, FileJson, FileText, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServicePlanActionsProps {
  /** Callback when Save is clicked */
  onSave?: () => void;
  /** Callback when Download JSON is clicked */
  onDownloadJson?: () => void;
  /** Callback when Download Text is clicked */
  onDownloadText?: () => void;
  /** Callback when Print is clicked */
  onPrint?: () => void;
  /** Callback when Save as Template is clicked */
  onSaveAsTemplate?: () => void;
  /** Callback when Clear is clicked */
  onClear?: () => void;
  /** Callback when View Library is clicked */
  onViewLibrary?: () => void;
  /** Whether any action is in progress */
  isLoading?: boolean;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Whether there are unsaved changes */
  hasUnsavedChanges?: boolean;
}

interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'secondary',
  disabled = false,
}: ActionButtonProps) {
  return (
    <button
      onClick={() => {
        if (!disabled && onClick) {
          onClick();
        } else if (!onClick) {
          console.log(`TODO: ${label}`);
        }
      }}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'min-h-[44px]', // Accessibility: minimum touch target
        variant === 'primary' &&
          'bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500',
        variant === 'secondary' &&
          'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:ring-teal-500',
        variant === 'danger' &&
          'bg-white text-red-600 ring-1 ring-inset ring-gray-300 hover:bg-red-50 focus:ring-red-500',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/**
 * Download dropdown button with multiple export formats
 */
function DownloadDropdown({
  onDownloadJson,
  onDownloadText,
  disabled = false,
}: {
  onDownloadJson?: () => void;
  onDownloadText?: () => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500',
          'min-h-[44px]',
          'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Download className="h-5 w-5" />
        <span className="hidden sm:inline">Download</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button
            onClick={() => {
              onDownloadJson?.();
              setIsOpen(false);
            }}
            className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <FileJson className="h-4 w-4 text-gray-400" />
            <span>Download as JSON</span>
          </button>
          <button
            onClick={() => {
              onDownloadText?.();
              setIsOpen(false);
            }}
            className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <FileText className="h-4 w-4 text-gray-400" />
            <span>Download as Text</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function ServicePlanActions({
  onSave,
  onDownloadJson,
  onDownloadText,
  onPrint,
  onSaveAsTemplate,
  onClear,
  onViewLibrary,
  isLoading = false,
  isSaving = false,
  hasUnsavedChanges = false,
}: ServicePlanActionsProps) {
  // Determine save button state
  const SaveIcon = isSaving ? Loader2 : hasUnsavedChanges ? Save : Check;
  const saveLabel = isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved';

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {/* Save button - primary when unsaved changes */}
      <button
        onClick={() => {
          if (!isSaving && hasUnsavedChanges && onSave) {
            onSave();
          }
        }}
        disabled={isSaving || !hasUnsavedChanges}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500',
          'min-h-[44px]',
          hasUnsavedChanges
            ? 'bg-teal-600 text-white hover:bg-teal-700'
            : 'bg-gray-100 text-gray-500',
          isSaving && 'cursor-wait',
          !hasUnsavedChanges && !isSaving && 'cursor-default'
        )}
      >
        <SaveIcon className={cn('h-5 w-5', isSaving && 'animate-spin')} />
        <span className="hidden sm:inline">{saveLabel}</span>
      </button>

      <DownloadDropdown
        onDownloadJson={onDownloadJson}
        onDownloadText={onDownloadText}
        disabled={isLoading}
      />
      <ActionButton
        icon={Printer}
        label="Print"
        onClick={onPrint}
        disabled={isLoading}
      />
      <ActionButton
        icon={Save}
        label="Save as Template"
        onClick={onSaveAsTemplate}
        disabled={isLoading}
      />
      <ActionButton
        icon={List}
        label="Plan Library"
        onClick={onViewLibrary}
        disabled={isLoading}
      />
      <div className="flex-1" /> {/* Spacer */}
      <ActionButton
        icon={Trash2}
        label="Clear"
        onClick={onClear}
        variant="danger"
        disabled={isLoading}
      />
    </div>
  );
}
