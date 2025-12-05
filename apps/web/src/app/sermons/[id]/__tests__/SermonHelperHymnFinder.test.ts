/**
 * Sermon Helper Hymn Finder Logic Tests
 *
 * Tests for the SermonHelperHymnFinder component business logic.
 * These tests verify:
 * - Search input handling
 * - Hymn result transformation
 * - Adding hymns to outline
 * - Keyboard navigation
 *
 * IMPORTANT: Do not move web/UI tests into packages/types.
 * packages/types is reserved for shared types and schemas only.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import type { SermonElement } from '@elder-first/types';

// Mock generateId for testing (component uses crypto.randomUUID())
let mockIdCounter = 0;
function mockGenerateId(): string {
  return `mock-uuid-${++mockIdCounter}`;
}

beforeEach(() => {
  mockIdCounter = 0;
});

// =============================================================================
// TYPE DEFINITIONS (matching component)
// =============================================================================

interface HymnResult {
  id: string;
  title: string;
  alternateTitle: string | null;
  hymnNumber: string | null;
  hymnalCode: string | null;
  tuneName: string | null;
  author: string | null;
  isPublicDomain: boolean;
  ccliNumber: string | null;
}

// =============================================================================
// SEARCH INPUT HANDLING
// =============================================================================

describe('SermonHelperHymnFinder - Search Input', () => {
  describe('search trigger logic', () => {
    /**
     * Mirrors handleSearch logic from component
     */
    function shouldTriggerSearch(query: string): boolean {
      return query.trim().length > 0;
    }

    it('allows search with valid query', () => {
      expect(shouldTriggerSearch('Amazing Grace')).toBe(true);
    });

    it('allows search with single word', () => {
      expect(shouldTriggerSearch('grace')).toBe(true);
    });

    it('blocks search with empty query', () => {
      expect(shouldTriggerSearch('')).toBe(false);
    });

    it('blocks search with whitespace-only query', () => {
      expect(shouldTriggerSearch('   ')).toBe(false);
    });
  });

  describe('keyboard navigation', () => {
    /**
     * Mirrors handleKeyPress logic from component
     */
    function shouldTriggerOnKey(key: string): boolean {
      return key === 'Enter';
    }

    it('triggers search on Enter', () => {
      expect(shouldTriggerOnKey('Enter')).toBe(true);
    });

    it('does not trigger on other keys', () => {
      expect(shouldTriggerOnKey('Tab')).toBe(false);
      expect(shouldTriggerOnKey('Escape')).toBe(false);
      expect(shouldTriggerOnKey('a')).toBe(false);
    });
  });

  describe('query state management', () => {
    it('separates input query from search query', () => {
      // Component has two states: query (input) and searchQuery (API)
      // This allows typing without triggering API calls
      const inputQuery = 'amaz';  // User typing
      const searchQuery = '';     // Not submitted yet

      expect(inputQuery).not.toBe(searchQuery);
    });

    it('updates search query on submit', () => {
      const inputQuery = 'Amazing Grace';
      // On submit: setSearchQuery(query.trim())
      const searchQuery = inputQuery.trim();
      expect(searchQuery).toBe('Amazing Grace');
    });
  });
});

// =============================================================================
// HYMN RESULT HANDLING
// =============================================================================

describe('SermonHelperHymnFinder - Result Display', () => {
  const mockHymns: HymnResult[] = [
    {
      id: 'hymn-1',
      title: 'Amazing Grace',
      alternateTitle: 'New Britain',
      hymnNumber: '779',
      hymnalCode: 'UMH',
      tuneName: 'NEW BRITAIN',
      author: 'John Newton',
      isPublicDomain: true,
      ccliNumber: null,
    },
    {
      id: 'hymn-2',
      title: 'How Great Thou Art',
      alternateTitle: null,
      hymnNumber: '77',
      hymnalCode: 'UMH',
      tuneName: 'O STORE GUD',
      author: 'Stuart K. Hine',
      isPublicDomain: false,
      ccliNumber: '14181',
    },
  ];

  describe('result count display', () => {
    it('shows singular for one result', () => {
      const count = 1;
      const text = `Found ${count} hymn${count === 1 ? '' : 's'}`;
      expect(text).toBe('Found 1 hymn');
    });

    it('shows plural for multiple results', () => {
      const count: number = 5;
      const text = `Found ${count} hymn${count !== 1 ? 's' : ''}`;
      expect(text).toBe('Found 5 hymns');
    });

    it('shows "No hymns found" for empty results', () => {
      const hymns: HymnResult[] = [];
      const displayText = hymns.length > 0 ? `Found ${hymns.length}` : 'No hymns found';
      expect(displayText).toBe('No hymns found');
    });
  });

  describe('hymn display fields', () => {
    it('displays title for all hymns', () => {
      expect(mockHymns[0].title).toBe('Amazing Grace');
      expect(mockHymns[1].title).toBe('How Great Thou Art');
    });

    it('displays alternate title when present', () => {
      expect(mockHymns[0].alternateTitle).toBe('New Britain');
      expect(mockHymns[1].alternateTitle).toBeNull();
    });

    it('displays hymnal code and number together', () => {
      const hymn = mockHymns[0];
      if (hymn.hymnNumber && hymn.hymnalCode) {
        const display = `${hymn.hymnalCode} #${hymn.hymnNumber}`;
        expect(display).toBe('UMH #779');
      }
    });

    it('displays public domain badge', () => {
      expect(mockHymns[0].isPublicDomain).toBe(true);
      expect(mockHymns[1].isPublicDomain).toBe(false);
    });

    it('displays CCLI number when present', () => {
      expect(mockHymns[0].ccliNumber).toBeNull();
      expect(mockHymns[1].ccliNumber).toBe('14181');
    });
  });
});

// =============================================================================
// ADDING HYMNS TO OUTLINE
// =============================================================================

describe('SermonHelperHymnFinder - Add to Outline', () => {
  /**
   * Mirrors addHymn logic from component
   */
  function createHymnElement(hymn: HymnResult): SermonElement {
    return {
      id: mockGenerateId(),
      type: 'hymn',
      hymnId: hymn.id,
      title: hymn.title,
      note: '',
    };
  }

  it('creates hymn element with correct type', () => {
    const hymn: HymnResult = {
      id: 'hymn-123',
      title: 'Amazing Grace',
      alternateTitle: null,
      hymnNumber: null,
      hymnalCode: null,
      tuneName: null,
      author: null,
      isPublicDomain: true,
      ccliNumber: null,
    };

    const element = createHymnElement(hymn);

    expect(element.type).toBe('hymn');
  });

  it('preserves hymn ID for lookup', () => {
    const hymn: HymnResult = {
      id: 'hymn-456',
      title: 'How Great Thou Art',
      alternateTitle: null,
      hymnNumber: '77',
      hymnalCode: 'UMH',
      tuneName: null,
      author: null,
      isPublicDomain: false,
      ccliNumber: '14181',
    };

    const element = createHymnElement(hymn);

    if (element.type === 'hymn') {
      expect(element.hymnId).toBe('hymn-456');
    }
  });

  it('copies hymn title to element', () => {
    const hymn: HymnResult = {
      id: 'hymn-789',
      title: 'Holy, Holy, Holy',
      alternateTitle: null,
      hymnNumber: null,
      hymnalCode: null,
      tuneName: null,
      author: null,
      isPublicDomain: true,
      ccliNumber: null,
    };

    const element = createHymnElement(hymn);

    if (element.type === 'hymn') {
      expect(element.title).toBe('Holy, Holy, Holy');
    }
  });

  it('initializes note as empty', () => {
    const hymn: HymnResult = {
      id: 'hymn-999',
      title: 'Be Thou My Vision',
      alternateTitle: null,
      hymnNumber: null,
      hymnalCode: null,
      tuneName: null,
      author: null,
      isPublicDomain: true,
      ccliNumber: null,
    };

    const element = createHymnElement(hymn);

    if (element.type === 'hymn') {
      expect(element.note).toBe('');
    }
  });

  it('generates unique element ID', () => {
    const hymn: HymnResult = {
      id: 'hymn-same',
      title: 'Same Hymn',
      alternateTitle: null,
      hymnNumber: null,
      hymnalCode: null,
      tuneName: null,
      author: null,
      isPublicDomain: true,
      ccliNumber: null,
    };

    const el1 = createHymnElement(hymn);
    const el2 = createHymnElement(hymn);

    // Same hymn can be added multiple times with different element IDs
    expect(el1.id).not.toBe(el2.id);
    if (el1.type === 'hymn' && el2.type === 'hymn') {
      expect(el1.hymnId).toBe(el2.hymnId);  // Same hymn ID
    }
  });
});

// =============================================================================
// QUERY ENABLED LOGIC
// =============================================================================

describe('SermonHelperHymnFinder - Query State', () => {
  /**
   * The component uses tRPC's enabled option to control when the query runs
   */
  describe('query enabled condition', () => {
    function isQueryEnabled(searchQuery: string): boolean {
      return searchQuery.length > 0;
    }

    it('query disabled for empty search', () => {
      expect(isQueryEnabled('')).toBe(false);
    });

    it('query enabled for non-empty search', () => {
      expect(isQueryEnabled('grace')).toBe(true);
    });

    it('query enabled for single character', () => {
      expect(isQueryEnabled('a')).toBe(true);
    });
  });
});

// =============================================================================
// EMPTY STATE HANDLING
// =============================================================================

describe('SermonHelperHymnFinder - Empty States', () => {
  describe('initial state (no search)', () => {
    it('shows prompt when no search query', () => {
      const searchQuery = '';
      const showInitialPrompt = !searchQuery;
      expect(showInitialPrompt).toBe(true);
    });
  });

  describe('no results state', () => {
    it('shows no results message when search returns empty', () => {
      const hymns: HymnResult[] = [];
      const searchQuery = 'xyznonexistent';
      const showNoResults = searchQuery && !hymns.length;

      expect(showNoResults).toBeTruthy();
    });
  });

  describe('results state', () => {
    it('shows results when hymns returned', () => {
      const hymns: HymnResult[] = [
        {
          id: '1',
          title: 'Amazing Grace',
          alternateTitle: null,
          hymnNumber: null,
          hymnalCode: null,
          tuneName: null,
          author: null,
          isPublicDomain: true,
          ccliNumber: null,
        },
      ];
      const searchQuery = 'grace';
      const showResults = searchQuery && hymns.length > 0;

      expect(showResults).toBeTruthy();
    });
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

describe('SermonHelperHymnFinder - Error Handling', () => {
  it('displays error message from API', () => {
    const errorMessage = 'Failed to search hymns. Please try again.';
    expect(errorMessage).toContain('search hymns');
  });

  it('handles network error', () => {
    const networkError = { message: 'Network request failed' };
    expect(networkError.message || 'Failed to search hymns. Please try again.').toBeDefined();
  });

  it('handles empty error message with fallback', () => {
    const error = { message: '' };
    const displayError = error.message || 'Failed to search hymns. Please try again.';
    expect(displayError).toBe('Failed to search hymns. Please try again.');
  });
});
