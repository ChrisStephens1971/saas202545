'use client';

import { useState, useEffect, useRef } from 'react';

interface TextEditModalProps {
  isOpen: boolean;
  currentText: string;
  onSave: (text: string) => void;
  onClose: () => void;
  title?: string;
}

/**
 * TextEditModal - A better text editing experience than prompt()
 *
 * Provides a proper textarea with formatting preview
 */
export function TextEditModal({
  isOpen,
  currentText,
  onSave,
  onClose,
  title = 'Edit Text'
}: TextEditModalProps) {
  const [text, setText] = useState(currentText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(currentText);
  }, [currentText]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      // Focus and select all text when modal opens
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(text);
    onClose();
  };

  const handleCancel = () => {
    setText(currentText); // Reset to original
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to save
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              Enter your text below. Press Ctrl+Enter to save.
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-64 px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your text here..."
            />
            <div className="mt-2 text-xs text-gray-500">
              {text.length} characters
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Text
            </button>
          </div>
        </div>
      </div>
    </>
  );
}