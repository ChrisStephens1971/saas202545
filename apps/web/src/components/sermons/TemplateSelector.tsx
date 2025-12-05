'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { BookTemplate, ChevronDown, ChevronUp, Check, Loader2, Search } from 'lucide-react';
import type { SermonTemplateListItem, SermonTemplate } from '@elder-first/types';

interface TemplateSelectorProps {
  onSelect: (template: SermonTemplate | null) => void;
  selectedTemplateId?: string | null;
}

/**
 * TemplateSelector - Collapsible template picker for new sermons
 *
 * Allows users to browse and select a template when creating a new sermon.
 * When selected, the template's default values pre-fill the form.
 * Creates a sermon plan with the template's structure after sermon creation.
 */
export function TemplateSelector({ onSelect, selectedTemplateId }: TemplateSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [templateToFetch, setTemplateToFetch] = useState<string | null>(null);

  // Fetch template list - listTemplates takes no input, returns array directly
  const { data: templatesData, isLoading: isLoadingList } = trpc.sermonHelper.listTemplates.useQuery(
    undefined,
    { enabled: isExpanded }
  );

  const templates = templatesData || [];

  // Fetch full template data when a template is selected
  const {
    data: fullTemplate,
    isLoading: isLoadingTemplate,
    error: templateError,
  } = trpc.sermonHelper.getTemplate.useQuery(
    { templateId: templateToFetch! },
    { enabled: !!templateToFetch }
  );

  // When full template is loaded, pass it to parent
  useEffect(() => {
    if (fullTemplate && templateToFetch) {
      onSelect(fullTemplate as SermonTemplate);
      setTemplateToFetch(null);
    }
  }, [fullTemplate, templateToFetch, onSelect]);

  // Handle errors
  useEffect(() => {
    if (templateError) {
      console.error('Failed to fetch template:', templateError);
      setTemplateToFetch(null);
    }
  }, [templateError]);

  // Filter templates by search term
  const filteredTemplates = templates.filter((t: SermonTemplateListItem) => {
    const search = searchTerm.toLowerCase();
    return (
      t.name.toLowerCase().includes(search) ||
      t.defaultTitle.toLowerCase().includes(search) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search))
    );
  });

  // Handle template selection - fetch full template data
  const handleSelectTemplate = (templateId: string) => {
    if (templateId === selectedTemplateId) {
      // Deselect if clicking same template
      onSelect(null);
      return;
    }
    setTemplateToFetch(templateId);
  };

  // Clear selection
  const handleClearSelection = () => {
    onSelect(null);
  };

  const selectedTemplate = templates.find((t: SermonTemplateListItem) => t.id === selectedTemplateId);

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50">
      {/* Header - Collapsible Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <BookTemplate size={18} className="text-purple-600" />
          <span className="font-medium text-gray-800">Start from Template</span>
          {selectedTemplate && (
            <span className="text-sm text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
              {selectedTemplate.name}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp size={18} className="text-gray-500" />
        ) : (
          <ChevronDown size={18} className="text-gray-500" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200">
          {/* Search */}
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Template List */}
          {isLoadingList ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-purple-600" />
              <span className="ml-2 text-gray-600">Loading templates...</span>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              {templates.length === 0 ? (
                <>
                  <BookTemplate size={32} className="mx-auto mb-2 text-gray-400" />
                  <p>No templates yet.</p>
                  <p className="text-sm mt-1">
                    Create a sermon and use &quot;Save as Template&quot; to save its structure.
                  </p>
                </>
              ) : (
                <p>No templates match your search.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredTemplates.map((template: SermonTemplateListItem) => {
                const isSelected = template.id === selectedTemplateId;
                const isLoadingThisTemplate = template.id === templateToFetch && isLoadingTemplate;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectTemplate(template.id)}
                    disabled={isLoadingTemplate}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">
                            {template.name}
                          </span>
                          {isLoadingThisTemplate && (
                            <Loader2 size={14} className="animate-spin text-purple-600" />
                          )}
                        </div>
                        {template.defaultPrimaryText && (
                          <p className="text-sm text-gray-600 mt-0.5">
                            {template.defaultPrimaryText}
                          </p>
                        )}
                        {template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {template.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {template.tags.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{template.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check size={18} className="text-purple-600 flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Clear Selection Button */}
          {selectedTemplateId && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="mt-3 text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Clear selection (start blank)
            </button>
          )}

          {/* Helper Text */}
          <p className="text-xs text-gray-500 mt-3">
            Select a template to pre-fill form fields and sermon outline structure.
          </p>
        </div>
      )}
    </div>
  );
}
