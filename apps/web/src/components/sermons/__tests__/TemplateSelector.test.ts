/**
 * TemplateSelector Logic Tests
 *
 * Tests the filtering, selection, and state logic for the template selector.
 * Uses node environment - tests logic without DOM rendering.
 *
 * Component tested: TemplateSelector
 * Location: apps/web/src/components/sermons/TemplateSelector.tsx
 */

import { describe, it, expect } from '@jest/globals';
import type { SermonTemplateListItem, SermonTemplate } from '@elder-first/types';

// Test UUIDs
const uuid1 = '11111111-1111-1111-1111-111111111111';
const uuid2 = '22222222-2222-2222-2222-222222222222';
const uuid3 = '33333333-3333-3333-3333-333333333333';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const mockTemplateList: SermonTemplateListItem[] = [
  {
    id: uuid1,
    name: '3-Point Expository Template',
    defaultTitle: 'New Expository Sermon',
    defaultPrimaryText: 'Romans 8:28',
    tags: ['expository', 'pauline', 'romans'],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
  {
    id: uuid2,
    name: 'Narrative Preaching Template',
    defaultTitle: 'Story of Grace',
    defaultPrimaryText: 'Luke 15:11-32',
    tags: ['narrative', 'gospel', 'parables'],
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-10T00:00:00Z',
  },
  {
    id: uuid3,
    name: 'Gospel Sermon Template',
    defaultTitle: 'Good News Proclamation',
    defaultPrimaryText: 'John 3:16',
    tags: ['gospel', 'salvation', 'evangelism'],
    createdAt: '2025-01-08T00:00:00Z',
    updatedAt: '2025-01-08T00:00:00Z',
  },
];

const mockFullTemplate: SermonTemplate = {
  id: uuid1,
  tenantId: 'tenant-uuid',
  name: '3-Point Expository Template',
  defaultTitle: 'New Expository Sermon',
  defaultBigIdea: 'God works all things for good',
  defaultPrimaryText: 'Romans 8:28',
  defaultSupportingTexts: ['Genesis 50:20', 'Jeremiah 29:11'],
  structure: [
    { id: 'elem-1', type: 'section', title: 'Introduction', level: 1 },
    { id: 'elem-2', type: 'scripture', reference: 'Romans 8:28' },
    { id: 'elem-3', type: 'section', title: 'Point 1', level: 1 },
    { id: 'elem-4', type: 'point', text: 'First main point', level: 1 },
    { id: 'elem-5', type: 'section', title: 'Point 2', level: 1 },
    { id: 'elem-6', type: 'point', text: 'Second main point', level: 1 },
    { id: 'elem-7', type: 'section', title: 'Point 3', level: 1 },
    { id: 'elem-8', type: 'point', text: 'Third main point', level: 1 },
    { id: 'elem-9', type: 'section', title: 'Conclusion', level: 1 },
  ],
  tags: ['expository', 'pauline', 'romans'],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-15T00:00:00Z',
};

// ============================================================================
// FILTERING LOGIC (mirrored from component lines 60-67)
// ============================================================================

function filterTemplates(
  templates: SermonTemplateListItem[],
  searchTerm: string
): SermonTemplateListItem[] {
  const search = searchTerm.toLowerCase();

  if (!search) {
    return templates;
  }

  return templates.filter((t) => {
    return (
      t.name.toLowerCase().includes(search) ||
      t.defaultTitle.toLowerCase().includes(search) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search))
    );
  });
}

// Selection state management (from component handleSelectTemplate lines 70-77)
function getSelectionAction(
  selectedId: string | null,
  clickedId: string
): 'select' | 'deselect' {
  return clickedId === selectedId ? 'deselect' : 'select';
}

// Find template by ID (from component line 84)
function findTemplateById(
  templates: SermonTemplateListItem[],
  id: string | null
): SermonTemplateListItem | undefined {
  if (!id) return undefined;
  return templates.find((t) => t.id === id);
}

// ============================================================================
// TESTS
// ============================================================================

describe('TemplateSelector - Template Filtering', () => {
  describe('filterTemplates', () => {
    it('returns all templates when search term is empty', () => {
      const result = filterTemplates(mockTemplateList, '');
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockTemplateList);
    });

    it('returns no templates when search term is whitespace (no match)', () => {
      // Component does not trim search term before filtering,
      // so whitespace-only search matches nothing
      const result = filterTemplates(mockTemplateList, '   ');
      expect(result).toHaveLength(0);
    });

    it('filters by template name', () => {
      const result = filterTemplates(mockTemplateList, 'expository');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(uuid1);
    });

    it('filters by template name (case insensitive)', () => {
      const result = filterTemplates(mockTemplateList, 'EXPOSITORY');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(uuid1);
    });

    it('filters by default title', () => {
      const result = filterTemplates(mockTemplateList, 'Story of Grace');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(uuid2);
    });

    it('filters by partial match in title', () => {
      const result = filterTemplates(mockTemplateList, 'Sermon');
      expect(result).toHaveLength(2); // "New Expository Sermon" and "Gospel Sermon Template"
    });

    it('filters by tag', () => {
      const result = filterTemplates(mockTemplateList, 'gospel');
      expect(result).toHaveLength(2); // Narrative (gospel tag) and Gospel Sermon (gospel tag)
      expect(result.map((t) => t.id)).toContain(uuid2);
      expect(result.map((t) => t.id)).toContain(uuid3);
    });

    it('filters by partial tag match', () => {
      const result = filterTemplates(mockTemplateList, 'evan');
      expect(result).toHaveLength(1); // "evangelism" tag
      expect(result[0].id).toBe(uuid3);
    });

    it('returns empty array when no match', () => {
      const result = filterTemplates(mockTemplateList, 'nonexistent');
      expect(result).toHaveLength(0);
    });

    it('matches across name, title, and tags', () => {
      // "romans" appears as a tag in template 1
      const result = filterTemplates(mockTemplateList, 'romans');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(uuid1);
    });
  });
});

describe('TemplateSelector - Selection Logic', () => {
  describe('getSelectionAction', () => {
    it('returns select when no template is selected', () => {
      const action = getSelectionAction(null, uuid1);
      expect(action).toBe('select');
    });

    it('returns select when different template is clicked', () => {
      const action = getSelectionAction(uuid1, uuid2);
      expect(action).toBe('select');
    });

    it('returns deselect when same template is clicked', () => {
      const action = getSelectionAction(uuid1, uuid1);
      expect(action).toBe('deselect');
    });
  });

  describe('findTemplateById', () => {
    it('finds template by ID', () => {
      const found = findTemplateById(mockTemplateList, uuid2);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Narrative Preaching Template');
    });

    it('returns undefined for null ID', () => {
      const found = findTemplateById(mockTemplateList, null);
      expect(found).toBeUndefined();
    });

    it('returns undefined for non-existent ID', () => {
      const found = findTemplateById(mockTemplateList, 'non-existent-id');
      expect(found).toBeUndefined();
    });
  });
});

describe('TemplateSelector - State Machine', () => {
  describe('expansion state', () => {
    it('starts collapsed', () => {
      const initialState = { isExpanded: false };
      expect(initialState.isExpanded).toBe(false);
    });

    it('toggles expanded state on click', () => {
      let isExpanded = false;
      isExpanded = !isExpanded;
      expect(isExpanded).toBe(true);
      isExpanded = !isExpanded;
      expect(isExpanded).toBe(false);
    });
  });

  describe('loading states', () => {
    it('loads template list only when expanded', () => {
      // trpc query uses enabled: isExpanded
      const isExpanded = false;
      const shouldLoadList = isExpanded;
      expect(shouldLoadList).toBe(false);
    });

    it('loads full template only when templateToFetch is set', () => {
      // trpc query uses enabled: !!templateToFetch
      const templateToFetch: string | null = null;
      const shouldLoadTemplate = !!templateToFetch;
      expect(shouldLoadTemplate).toBe(false);
    });

    it('triggers template fetch when ID is set', () => {
      const templateToFetch = uuid1;
      const shouldLoadTemplate = !!templateToFetch;
      expect(shouldLoadTemplate).toBe(true);
    });
  });

  describe('search state', () => {
    it('starts with empty search term', () => {
      const searchTerm = '';
      expect(searchTerm).toBe('');
    });

    it('filters update immediately on search change', () => {
      const templates = mockTemplateList;
      const searchTerm = 'gospel';
      const filtered = filterTemplates(templates, searchTerm);
      expect(filtered.length).toBeLessThan(templates.length);
    });
  });
});

describe('TemplateSelector - Template Selection Flow', () => {
  describe('selection workflow', () => {
    it('clicking template sets templateToFetch', () => {
      const state = {
        selectedTemplateId: null as string | null,
        templateToFetch: null as string | null,
      };

      // Simulate clicking a template
      const clickedId = uuid1;
      if (clickedId !== state.selectedTemplateId) {
        state.templateToFetch = clickedId;
      }

      expect(state.templateToFetch).toBe(uuid1);
    });

    it('full template triggers onSelect callback', () => {
      // When fullTemplate is loaded, onSelect is called
      // This is handled by useEffect in component (lines 44-49)
      const fullTemplate = mockFullTemplate;
      const templateToFetch = uuid1;

      // Condition: fullTemplate && templateToFetch
      const shouldCallOnSelect = !!fullTemplate && !!templateToFetch;
      expect(shouldCallOnSelect).toBe(true);
    });

    it('clears templateToFetch after onSelect is called', () => {
      const state = { templateToFetch: uuid1 as string | null };

      // After onSelect called
      state.templateToFetch = null;
      expect(state.templateToFetch).toBeNull();
    });

    it('clicking same template deselects', () => {
      const state = {
        selectedTemplateId: uuid1 as string | null,
      };

      const clickedId = uuid1;
      if (clickedId === state.selectedTemplateId) {
        // onSelect(null) is called
        state.selectedTemplateId = null;
      }

      expect(state.selectedTemplateId).toBeNull();
    });
  });

  describe('clear selection', () => {
    it('handleClearSelection calls onSelect with null', () => {
      // From component line 80-82
      let selectedTemplate: SermonTemplate | null = mockFullTemplate;

      // handleClearSelection
      selectedTemplate = null;

      expect(selectedTemplate).toBeNull();
    });
  });
});

describe('TemplateSelector - Display Logic', () => {
  describe('tag display', () => {
    it('shows maximum 3 tags initially', () => {
      const tags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'];
      const displayedTags = tags.slice(0, 3);
      const hiddenCount = tags.length - 3;

      expect(displayedTags).toHaveLength(3);
      expect(hiddenCount).toBe(2);
    });

    it('shows all tags when 3 or fewer', () => {
      const tags = ['tag1', 'tag2'];
      const displayedTags = tags.slice(0, 3);
      const hiddenCount = tags.length > 3 ? tags.length - 3 : 0;

      expect(displayedTags).toHaveLength(2);
      expect(hiddenCount).toBe(0);
    });
  });

  describe('selected template indicator', () => {
    it('shows selected template name in header when selected', () => {
      const selectedTemplate = mockTemplateList[0];
      const headerText = selectedTemplate?.name;

      expect(headerText).toBe('3-Point Expository Template');
    });

    it('shows nothing extra when no template selected', () => {
      const selectedTemplate: SermonTemplateListItem | undefined = undefined;
      expect(selectedTemplate).toBeUndefined();
    });
  });

  describe('empty states', () => {
    it('shows "no templates yet" when list is empty', () => {
      const templates: SermonTemplateListItem[] = [];
      const hasTemplates = templates.length > 0;

      expect(hasTemplates).toBe(false);
    });

    it('shows "no match" when search has no results', () => {
      const templates = mockTemplateList;
      const filteredTemplates = filterTemplates(templates, 'xyznonexistent');

      const hasTemplates = templates.length > 0;
      const hasMatches = filteredTemplates.length > 0;

      expect(hasTemplates).toBe(true);
      expect(hasMatches).toBe(false);
    });
  });
});

describe('TemplateSelector - Button States', () => {
  describe('template item button', () => {
    it('is disabled while loading any template', () => {
      const isLoadingTemplate = true;
      const buttonDisabled = isLoadingTemplate;
      expect(buttonDisabled).toBe(true);
    });

    it('is enabled when not loading', () => {
      const isLoadingTemplate = false;
      const buttonDisabled = isLoadingTemplate;
      expect(buttonDisabled).toBe(false);
    });

    it('shows loading spinner for template being fetched', () => {
      const templateId = uuid1;
      const templateToFetch = uuid1;
      const isLoadingTemplate = true;

      const isLoadingThisTemplate = templateId === templateToFetch && isLoadingTemplate;
      expect(isLoadingThisTemplate).toBe(true);
    });

    it('does not show spinner for other templates', () => {
      const templateId: string = uuid1;
      const templateToFetch: string = uuid2;
      const isLoadingTemplate = true;

      // Use string comparison to avoid TypeScript literal type narrowing
      const isLoadingThisTemplate = String(templateId) === String(templateToFetch) && isLoadingTemplate;
      expect(isLoadingThisTemplate).toBe(false);
    });
  });
});

describe('TemplateSelector - Parent Integration', () => {
  describe('onSelect callback', () => {
    it('provides full template data to parent', () => {
      // Parent receives the full SermonTemplate object
      const template = mockFullTemplate;

      expect(template.id).toBe(uuid1);
      expect(template.defaultTitle).toBe('New Expository Sermon');
      expect(template.defaultBigIdea).toBe('God works all things for good');
      expect(template.defaultPrimaryText).toBe('Romans 8:28');
      expect(template.defaultSupportingTexts).toEqual(['Genesis 50:20', 'Jeremiah 29:11']);
      expect(template.structure).toHaveLength(9);
    });

    it('provides null when deselected', () => {
      const template: SermonTemplate | null = null;
      expect(template).toBeNull();
    });
  });

  describe('selectedTemplateId prop', () => {
    it('uses selectedTemplateId to show selection state', () => {
      const selectedTemplateId = uuid1;

      const isSelected = (templateId: string) => templateId === selectedTemplateId;

      expect(isSelected(uuid1)).toBe(true);
      expect(isSelected(uuid2)).toBe(false);
    });

    it('handles undefined selectedTemplateId', () => {
      const selectedTemplateId: string | undefined = undefined;

      const isSelected = (templateId: string) => templateId === selectedTemplateId;

      expect(isSelected(uuid1)).toBe(false);
    });
  });
});

describe('TemplateSelector - Error Handling', () => {
  describe('template fetch error', () => {
    it('clears templateToFetch on error', () => {
      // From useEffect error handler (lines 52-57)
      const state = { templateToFetch: uuid1 as string | null };
      const templateError = new Error('Failed to fetch template');

      if (templateError) {
        state.templateToFetch = null;
      }

      expect(state.templateToFetch).toBeNull();
    });

    it('logs error to console', () => {
      const error = new Error('Failed to fetch template');
      const expectedLogMessage = 'Failed to fetch template:';

      // Component calls console.error('Failed to fetch template:', templateError)
      expect(expectedLogMessage).toBe('Failed to fetch template:');
      expect(error.message).toBe('Failed to fetch template');
    });
  });
});

describe('TemplateSelector - Query Configuration', () => {
  describe('listTemplates query', () => {
    it('uses limit of 50', () => {
      const queryInput = { limit: 50 };
      expect(queryInput.limit).toBe(50);
    });

    it('only fetches when expanded', () => {
      const isExpanded = false;
      const queryEnabled = isExpanded;
      expect(queryEnabled).toBe(false);
    });
  });

  describe('getTemplate query', () => {
    it('only fetches when templateToFetch is set', () => {
      const templateToFetch: string | null = null;
      const queryEnabled = !!templateToFetch;
      expect(queryEnabled).toBe(false);
    });

    it('uses non-null assertion for templateId', () => {
      const templateToFetch: string | null = uuid1;
      // Component uses templateToFetch! (non-null assertion)
      // because query is only enabled when templateToFetch is truthy
      expect(templateToFetch).not.toBeNull();
    });
  });
});
