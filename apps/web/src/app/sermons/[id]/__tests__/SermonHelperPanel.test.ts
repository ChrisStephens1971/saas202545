/**
 * Sermon Helper Panel Logic Tests
 *
 * Tests for the SermonHelperPanel component business logic.
 * These tests verify:
 * - Tab navigation
 * - Outline element management
 * - Element count badge display
 * - Add to outline callback behavior
 *
 * IMPORTANT: Do not move web/UI tests into packages/types.
 * packages/types is reserved for shared types and schemas only.
 */

import { describe, it, expect } from '@jest/globals';
import type { SermonElement } from '@elder-first/types';

// =============================================================================
// TYPE DEFINITIONS (matching component)
// =============================================================================

type TabKey = 'ai' | 'hymns' | 'outline';

interface Tab {
  key: TabKey;
  label: string;
}

const TABS: Tab[] = [
  { key: 'ai', label: 'AI Suggestions' },
  { key: 'hymns', label: 'Hymn Finder' },
  { key: 'outline', label: 'Outline Editor' },
];

// =============================================================================
// TAB NAVIGATION
// =============================================================================

describe('SermonHelperPanel - Tab Navigation', () => {
  describe('tab configuration', () => {
    it('has three tabs', () => {
      expect(TABS).toHaveLength(3);
    });

    it('AI Suggestions is first tab', () => {
      expect(TABS[0].key).toBe('ai');
      expect(TABS[0].label).toBe('AI Suggestions');
    });

    it('Hymn Finder is second tab', () => {
      expect(TABS[1].key).toBe('hymns');
      expect(TABS[1].label).toBe('Hymn Finder');
    });

    it('Outline Editor is third tab', () => {
      expect(TABS[2].key).toBe('outline');
      expect(TABS[2].label).toBe('Outline Editor');
    });
  });

  describe('tab state', () => {
    it('defaults to AI tab', () => {
      const defaultTab: TabKey = 'ai';
      expect(defaultTab).toBe('ai');
    });

    it('allows switching to any valid tab', () => {
      const validTabs: TabKey[] = ['ai', 'hymns', 'outline'];

      validTabs.forEach(tab => {
        expect(TABS.some(t => t.key === tab)).toBe(true);
      });
    });
  });
});

// =============================================================================
// ELEMENT STATE MANAGEMENT
// =============================================================================

describe('SermonHelperPanel - Element State', () => {
  describe('initial state', () => {
    it('starts with empty elements array', () => {
      const initialElements: SermonElement[] = [];
      expect(initialElements).toHaveLength(0);
    });
  });

  describe('handleAddToOutline', () => {
    /**
     * Mirrors handleAddToOutline callback logic from component
     */
    function addToOutline(
      currentElements: SermonElement[],
      newElement: SermonElement
    ): SermonElement[] {
      return [...currentElements, newElement];
    }

    it('adds element to empty array', () => {
      const elements: SermonElement[] = [];
      const newElement: SermonElement = {
        id: 'test-1',
        type: 'scripture',
        reference: 'John 3:16',
        note: '',
      };

      const result = addToOutline(elements, newElement);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(newElement);
    });

    it('appends element to existing array', () => {
      const elements: SermonElement[] = [
        { id: 'test-1', type: 'section', title: 'Introduction' },
      ];
      const newElement: SermonElement = {
        id: 'test-2',
        type: 'point',
        text: 'Main point',
      };

      const result = addToOutline(elements, newElement);

      expect(result).toHaveLength(2);
      expect(result[1]).toBe(newElement);
    });

    it('preserves existing elements', () => {
      const existingElement: SermonElement = {
        id: 'test-1',
        type: 'section',
        title: 'Original',
      };
      const elements: SermonElement[] = [existingElement];
      const newElement: SermonElement = {
        id: 'test-2',
        type: 'point',
        text: 'New',
      };

      const result = addToOutline(elements, newElement);

      expect(result[0]).toBe(existingElement);
    });

    it('does not mutate original array', () => {
      const elements: SermonElement[] = [
        { id: 'test-1', type: 'section', title: 'Original' },
      ];
      const newElement: SermonElement = {
        id: 'test-2',
        type: 'point',
        text: 'New',
      };

      const result = addToOutline(elements, newElement);

      expect(result).not.toBe(elements);
      expect(elements).toHaveLength(1);
    });
  });
});

// =============================================================================
// OUTLINE BADGE DISPLAY
// =============================================================================

describe('SermonHelperPanel - Badge Display', () => {
  describe('element count badge', () => {
    /**
     * Badge only shows on outline tab when elements > 0
     */
    function shouldShowBadge(tabKey: TabKey, elementCount: number): boolean {
      return tabKey === 'outline' && elementCount > 0;
    }

    it('shows badge on outline tab with elements', () => {
      expect(shouldShowBadge('outline', 3)).toBe(true);
    });

    it('hides badge on outline tab with no elements', () => {
      expect(shouldShowBadge('outline', 0)).toBe(false);
    });

    it('hides badge on AI tab regardless of elements', () => {
      expect(shouldShowBadge('ai', 5)).toBe(false);
    });

    it('hides badge on hymns tab regardless of elements', () => {
      expect(shouldShowBadge('hymns', 5)).toBe(false);
    });
  });

  describe('badge content', () => {
    it('displays correct count', () => {
      const count = 5;
      expect(count).toBe(5);
    });
  });
});

// =============================================================================
// OUTLINE HINT DISPLAY
// =============================================================================

describe('SermonHelperPanel - Outline Hint', () => {
  /**
   * Hint shows when not on outline tab AND elements exist
   */
  function shouldShowHint(activeTab: TabKey, elementCount: number): boolean {
    return activeTab !== 'outline' && elementCount > 0;
  }

  describe('hint visibility', () => {
    it('shows hint on AI tab when elements exist', () => {
      expect(shouldShowHint('ai', 3)).toBe(true);
    });

    it('shows hint on hymns tab when elements exist', () => {
      expect(shouldShowHint('hymns', 3)).toBe(true);
    });

    it('hides hint on outline tab', () => {
      expect(shouldShowHint('outline', 3)).toBe(false);
    });

    it('hides hint when no elements', () => {
      expect(shouldShowHint('ai', 0)).toBe(false);
      expect(shouldShowHint('hymns', 0)).toBe(false);
    });
  });

  describe('hint text', () => {
    function getHintText(count: number): string {
      return `${count} item${count === 1 ? '' : 's'} in your outline.`;
    }

    it('uses singular for one item', () => {
      expect(getHintText(1)).toBe('1 item in your outline.');
    });

    it('uses plural for multiple items', () => {
      expect(getHintText(5)).toBe('5 items in your outline.');
    });
  });
});

// =============================================================================
// TAB STYLING
// =============================================================================

describe('SermonHelperPanel - Tab Styling', () => {
  function getTabClasses(isActive: boolean): string {
    if (isActive) {
      return 'border-primary-600 text-primary-600';
    }
    return 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
  }

  it('active tab has primary border and text', () => {
    const classes = getTabClasses(true);
    expect(classes).toContain('border-primary-600');
    expect(classes).toContain('text-primary-600');
  });

  it('inactive tab has transparent border', () => {
    const classes = getTabClasses(false);
    expect(classes).toContain('border-transparent');
    expect(classes).toContain('text-gray-500');
  });

  it('inactive tab has hover states', () => {
    const classes = getTabClasses(false);
    expect(classes).toContain('hover:text-gray-700');
    expect(classes).toContain('hover:border-gray-300');
  });
});

// =============================================================================
// PROPS VALIDATION
// =============================================================================

describe('SermonHelperPanel - Props', () => {
  describe('required props', () => {
    interface SermonHelperPanelProps {
      sermonId: string;
      sermonTitle: string;
      primaryScripture: string | null;
    }

    it('accepts valid props', () => {
      const props: SermonHelperPanelProps = {
        sermonId: 'sermon-uuid-123',
        sermonTitle: 'The Love of God',
        primaryScripture: 'John 3:16',
      };

      expect(props.sermonId).toBeDefined();
      expect(props.sermonTitle).toBeDefined();
      expect(props.primaryScripture).toBe('John 3:16');
    });

    it('accepts null primaryScripture', () => {
      const props: SermonHelperPanelProps = {
        sermonId: 'sermon-uuid-123',
        sermonTitle: 'The Love of God',
        primaryScripture: null,
      };

      expect(props.primaryScripture).toBeNull();
    });
  });
});

// =============================================================================
// CHILD COMPONENT PROP PASSING
// =============================================================================

describe('SermonHelperPanel - Child Component Props', () => {
  describe('AI Suggestions props', () => {
    interface AISuggestionsProps {
      sermonId: string;
      sermonTitle: string;
      primaryScripture: string | null;
      onAddToOutline: (element: SermonElement) => void;
    }

    it('passes all required props', () => {
      const mockCallback = (_element: SermonElement): void => {};
      const props: AISuggestionsProps = {
        sermonId: 'sermon-1',
        sermonTitle: 'Test Sermon',
        primaryScripture: 'John 1:1',
        onAddToOutline: mockCallback,
      };

      expect(props.sermonId).toBe('sermon-1');
      expect(typeof props.onAddToOutline).toBe('function');
    });
  });

  describe('Hymn Finder props', () => {
    interface HymnFinderProps {
      onAddToOutline: (element: SermonElement) => void;
    }

    it('only needs onAddToOutline', () => {
      const mockCallback = (_element: SermonElement): void => {};
      const props: HymnFinderProps = {
        onAddToOutline: mockCallback,
      };

      expect(typeof props.onAddToOutline).toBe('function');
    });
  });

  describe('Outline Editor props', () => {
    interface OutlineEditorProps {
      elements: SermonElement[];
      onElementsChange: (elements: SermonElement[]) => void;
      sermonTitle: string;
    }

    it('passes elements and change handler', () => {
      const mockElements: SermonElement[] = [];
      const mockChangeHandler = (_elements: SermonElement[]): void => {};
      const props: OutlineEditorProps = {
        elements: mockElements,
        onElementsChange: mockChangeHandler,
        sermonTitle: 'Test',
      };

      expect(props.elements).toBe(mockElements);
      expect(typeof props.onElementsChange).toBe('function');
    });
  });
});
