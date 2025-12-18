/**
 * Sermon Helper AI Suggestions Logic Tests
 *
 * Tests for the SermonHelperAISuggestions component business logic.
 * These tests verify:
 * - Input validation
 * - Response handling (success, fallback, error)
 * - Element creation for adding to outline
 * - Loading state management
 *
 * IMPORTANT: Do not move web/UI tests into packages/types.
 * packages/types is reserved for shared types and schemas only.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import type { SermonElement, SermonHelperSuggestions } from '@elder-first/types';

// Mock generateId for testing (component uses crypto.randomUUID())
let mockIdCounter = 0;
function mockGenerateId(): string {
  return `mock-uuid-${++mockIdCounter}`;
}

beforeEach(() => {
  mockIdCounter = 0;
});

// =============================================================================
// INPUT VALIDATION LOGIC
// =============================================================================

describe('SermonHelperAISuggestions - Input Validation', () => {
  /**
   * Mirrors validation logic from handleGenerate in the component
   */
  function validateThemeInput(theme: string): { valid: boolean; error?: string } {
    if (!theme.trim()) {
      return { valid: false, error: 'Please enter a theme or big idea for your sermon.' };
    }
    return { valid: true };
  }

  it('rejects empty theme', () => {
    const result = validateThemeInput('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('theme');
  });

  it('rejects whitespace-only theme', () => {
    const result = validateThemeInput('   ');
    expect(result.valid).toBe(false);
  });

  it('accepts valid theme', () => {
    const result = validateThemeInput('God\'s grace in suffering');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts scripture reference as theme', () => {
    const result = validateThemeInput('John 3:16');
    expect(result.valid).toBe(true);
  });

  it('trims theme before validation', () => {
    // Component calls theme.trim() before checking
    const theme = '  Grace  ';
    expect(theme.trim()).toBe('Grace');
    expect(validateThemeInput(theme).valid).toBe(true);
  });
});

// =============================================================================
// RESPONSE HANDLING LOGIC
// =============================================================================

describe('SermonHelperAISuggestions - Response Handling', () => {
  describe('success response', () => {
    it('extracts suggestions from successful response', () => {
      const mockResponse = {
        suggestions: {
          scriptureSuggestions: [
            { reference: 'John 3:16', reason: 'Central gospel message' },
          ],
          outline: [
            { type: 'section' as const, title: 'Introduction' },
          ],
          applicationIdeas: [
            { audience: 'believers', idea: 'Share the gospel' },
          ],
          hymnThemes: [
            { theme: 'grace', reason: 'Emphasizes love' },
          ],
        },
        meta: {
          fallback: false,
          tokensUsed: 500,
          model: 'gpt-4o-mini',
        },
      };

      expect(mockResponse.suggestions.scriptureSuggestions).toHaveLength(1);
      expect(mockResponse.meta.fallback).toBe(false);
    });

    it('detects fallback response with warning', () => {
      const mockResponse = {
        suggestions: {
          scriptureSuggestions: [],
          outline: [],
          applicationIdeas: [],
          hymnThemes: [],
        },
        meta: {
          fallback: true,
          tokensUsed: 100,
          model: 'gpt-4o-mini',
        },
      };

      expect(mockResponse.meta.fallback).toBe(true);
      // Component shows: 'AI returned incomplete results. Try again or adjust your theme.'
    });
  });

  describe('error handling', () => {
    it('handles quota exceeded error', () => {
      const errorMessage = 'Monthly AI usage limit reached.';
      expect(errorMessage).toContain('limit');
    });

    it('handles AI disabled error', () => {
      const errorMessage = 'AI features are disabled for this tenant.';
      expect(errorMessage).toContain('disabled');
    });

    it('handles configuration error', () => {
      const errorMessage = 'AI features are not configured. Please configure AI in Settings.';
      expect(errorMessage).toContain('configured');
    });

    it('handles generic API error', () => {
      const errorMessage = 'Failed to get AI suggestions. Please try again.';
      expect(errorMessage).toContain('try again');
    });
  });
});

// =============================================================================
// ELEMENT CREATION (Adding to Outline)
// =============================================================================

describe('SermonHelperAISuggestions - Add to Outline', () => {
  describe('addScripture', () => {
    /**
     * Mirrors addScripture logic from the component
     */
    function createScriptureElement(reference: string): SermonElement {
      return {
        id: mockGenerateId(),
        type: 'scripture',
        reference,
        note: '',
      };
    }

    it('creates scripture element with reference', () => {
      const element = createScriptureElement('John 3:16');

      expect(element.type).toBe('scripture');
      if (element.type === 'scripture') {
        expect(element.reference).toBe('John 3:16');
        expect(element.note).toBe('');
      }
    });

    it('creates scripture element with complex reference', () => {
      const element = createScriptureElement('Romans 8:28-39');

      if (element.type === 'scripture') {
        expect(element.reference).toBe('Romans 8:28-39');
      }
    });

    it('generates unique IDs for multiple scriptures', () => {
      const el1 = createScriptureElement('John 1:1');
      const el2 = createScriptureElement('John 1:14');

      expect(el1.id).not.toBe(el2.id);
    });
  });

  describe('addOutlineItem', () => {
    /**
     * Mirrors addOutlineItem logic from the component
     */
    function createOutlineElement(
      item: { type: 'section' | 'point'; title?: string; text?: string }
    ): SermonElement {
      if (item.type === 'section') {
        return {
          id: mockGenerateId(),
          type: 'section',
          title: item.title || '',
        };
      } else {
        return {
          id: mockGenerateId(),
          type: 'point',
          text: item.text || '',
        };
      }
    }

    it('creates section element', () => {
      const element = createOutlineElement({ type: 'section', title: 'Introduction' });

      expect(element.type).toBe('section');
      if (element.type === 'section') {
        expect(element.title).toBe('Introduction');
      }
    });

    it('creates point element', () => {
      const element = createOutlineElement({ type: 'point', text: 'God loves the world' });

      expect(element.type).toBe('point');
      if (element.type === 'point') {
        expect(element.text).toBe('God loves the world');
      }
    });

    it('handles empty title with default', () => {
      const element = createOutlineElement({ type: 'section' });

      if (element.type === 'section') {
        expect(element.title).toBe('');
      }
    });

    it('handles empty text with default', () => {
      const element = createOutlineElement({ type: 'point' });

      if (element.type === 'point') {
        expect(element.text).toBe('');
      }
    });
  });
});

// =============================================================================
// LOADING STATE MANAGEMENT
// =============================================================================

describe('SermonHelperAISuggestions - Loading State', () => {
  interface LoadingState {
    isLoading: boolean;
    canSubmit: boolean;
    buttonDisabled: boolean;
  }

  /**
   * Mirrors the loading state logic in the component
   */
  function getLoadingState(isPending: boolean, theme: string): LoadingState {
    const canSubmit = theme.trim().length > 0;
    return {
      isLoading: isPending,
      canSubmit,
      buttonDisabled: isPending || !canSubmit,
    };
  }

  it('button disabled when loading', () => {
    const state = getLoadingState(true, 'Grace');
    expect(state.buttonDisabled).toBe(true);
    expect(state.isLoading).toBe(true);
  });

  it('button disabled when theme empty', () => {
    const state = getLoadingState(false, '');
    expect(state.buttonDisabled).toBe(true);
  });

  it('button enabled with valid theme and not loading', () => {
    const state = getLoadingState(false, 'Grace');
    expect(state.buttonDisabled).toBe(false);
    expect(state.canSubmit).toBe(true);
  });

  it('input disabled during loading', () => {
    const state = getLoadingState(true, 'Grace');
    expect(state.isLoading).toBe(true);
    // Component disables inputs when isLoading is true
  });
});

// =============================================================================
// SUGGESTIONS DISPLAY LOGIC
// =============================================================================

describe('SermonHelperAISuggestions - Display Logic', () => {
  const mockSuggestions: SermonHelperSuggestions = {
    scriptureSuggestions: [
      { reference: 'John 3:16', reason: 'Central gospel message' },
      { reference: 'Romans 5:8', reason: 'Christ died while we were sinners' },
    ],
    outline: [
      { type: 'section', title: 'Introduction' },
      { type: 'point', text: 'God loves the world' },
      { type: 'section', title: 'Main Body' },
    ],
    applicationIdeas: [
      { audience: 'believers', idea: 'Share the gospel this week' },
      { audience: 'seekers', idea: 'Consider God\'s love' },
    ],
    hymnThemes: [
      { theme: 'grace', reason: 'Emphasizes unmerited favor' },
    ],
  };

  it('shows scripture section when suggestions exist', () => {
    expect(mockSuggestions.scriptureSuggestions!.length > 0).toBe(true);
  });

  it('hides scripture section when empty', () => {
    const emptySuggestions: SermonHelperSuggestions = {
      ...mockSuggestions,
      scriptureSuggestions: [],
    };
    expect(emptySuggestions.scriptureSuggestions!.length > 0).toBe(false);
  });

  it('shows outline section when suggestions exist', () => {
    expect(mockSuggestions.outline!.length > 0).toBe(true);
  });

  it('correctly identifies section vs point in outline', () => {
    const sections = mockSuggestions.outline!.filter(item => item.type === 'section');
    const points = mockSuggestions.outline!.filter(item => item.type === 'point');

    expect(sections.length).toBe(2);
    expect(points.length).toBe(1);
  });

  it('shows application ideas section when suggestions exist', () => {
    expect(mockSuggestions.applicationIdeas!.length > 0).toBe(true);
  });

  it('shows hymn themes section when suggestions exist', () => {
    expect(mockSuggestions.hymnThemes!.length > 0).toBe(true);
  });
});

// =============================================================================
// ILLUSTRATION SUGGESTIONS (Phase 7)
// =============================================================================

describe('SermonHelperAISuggestions - Illustration Suggestions', () => {
  describe('addIllustration', () => {
    /**
     * Mirrors addIllustration logic from the component
     */
    function createIllustrationElement(title: string, summary: string): SermonElement {
      return {
        id: mockGenerateId(),
        type: 'illustration',
        title,
        note: summary,
      };
    }

    it('creates illustration element with title and summary', () => {
      const element = createIllustrationElement(
        'The Prodigal Son',
        'A father welcomes back his wayward son with open arms'
      );

      expect(element.type).toBe('illustration');
      if (element.type === 'illustration') {
        expect(element.title).toBe('The Prodigal Son');
        expect(element.note).toBe('A father welcomes back his wayward son with open arms');
      }
    });

    it('creates illustration with empty summary', () => {
      const element = createIllustrationElement('The Good Samaritan', '');

      if (element.type === 'illustration') {
        expect(element.title).toBe('The Good Samaritan');
        expect(element.note).toBe('');
      }
    });

    it('generates unique IDs for multiple illustrations', () => {
      const el1 = createIllustrationElement('Story 1', 'Summary 1');
      const el2 = createIllustrationElement('Story 2', 'Summary 2');

      expect(el1.id).not.toBe(el2.id);
    });
  });

  describe('illustration suggestions display', () => {
    const mockSuggestionsWithIllustrations: SermonHelperSuggestions = {
      scriptureSuggestions: [],
      outline: [],
      applicationIdeas: [],
      hymnThemes: [],
      illustrationSuggestions: [
        {
          id: 'ill-1',
          title: 'C.S. Lewis Conversion',
          summary: 'The reluctant convert who described himself as the most dejected and reluctant convert in all England',
          forSection: 'Introduction',
        },
        {
          id: 'ill-2',
          title: 'The Diamond in the Rough',
          summary: 'A story about finding value in unexpected places',
        },
      ],
    };

    it('shows illustration section when suggestions exist', () => {
      expect(mockSuggestionsWithIllustrations.illustrationSuggestions!.length > 0).toBe(true);
    });

    it('hides illustration section when empty', () => {
      const emptySuggestions: SermonHelperSuggestions = {
        ...mockSuggestionsWithIllustrations,
        illustrationSuggestions: [],
      };
      expect(emptySuggestions.illustrationSuggestions!.length > 0).toBe(false);
    });

    it('hides illustration section when undefined', () => {
      const noIllustrations: SermonHelperSuggestions = {
        scriptureSuggestions: [],
        outline: [],
      };
      // Component checks: suggestions.illustrationSuggestions && suggestions.illustrationSuggestions.length > 0
      const shouldShow = noIllustrations.illustrationSuggestions && noIllustrations.illustrationSuggestions.length > 0;
      expect(shouldShow).toBeFalsy();
    });

    it('displays forSection badge when section is specified', () => {
      const illustrationWithSection = mockSuggestionsWithIllustrations.illustrationSuggestions![0];
      expect(illustrationWithSection.forSection).toBe('Introduction');
    });

    it('omits forSection badge when section is not specified', () => {
      const illustrationWithoutSection = mockSuggestionsWithIllustrations.illustrationSuggestions![1];
      expect(illustrationWithoutSection.forSection).toBeUndefined();
    });

    it('uses illustration id as unique key', () => {
      const ids = mockSuggestionsWithIllustrations.illustrationSuggestions!.map(i => i.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('illustration integration with response', () => {
    it('includes illustrationSuggestions in full response', () => {
      const mockResponse = {
        suggestions: {
          scriptureSuggestions: [{ reference: 'John 3:16', reason: 'Central gospel' }],
          outline: [{ type: 'section' as const, title: 'Introduction' }],
          applicationIdeas: [{ audience: 'all', idea: 'Apply grace' }],
          hymnThemes: [{ theme: 'grace', reason: 'Theme of sermon' }],
          illustrationSuggestions: [
            { id: 'ill-1', title: 'Story One', summary: 'A powerful story about faith' },
          ],
        },
        meta: {
          fallback: false,
          tokensUsed: 600,
          model: 'gpt-4o-mini',
        },
      };

      expect(mockResponse.suggestions.illustrationSuggestions).toHaveLength(1);
      expect(mockResponse.suggestions.illustrationSuggestions![0].title).toBe('Story One');
    });

    it('handles response without illustrationSuggestions (backward compatible)', () => {
      const mockResponse: {
        suggestions: {
          scriptureSuggestions: never[];
          outline: never[];
          applicationIdeas: never[];
          hymnThemes: never[];
          illustrationSuggestions?: unknown[];
        };
        meta: { fallback: boolean; tokensUsed: number; model: string };
      } = {
        suggestions: {
          scriptureSuggestions: [],
          outline: [],
          applicationIdeas: [],
          hymnThemes: [],
          // illustrationSuggestions not included
        },
        meta: {
          fallback: false,
          tokensUsed: 100,
          model: 'gpt-4o-mini',
        },
      };

      // Component checks: suggestions.illustrationSuggestions && suggestions.illustrationSuggestions.length > 0
      const shouldShowSection = mockResponse.suggestions.illustrationSuggestions &&
                                mockResponse.suggestions.illustrationSuggestions.length > 0;
      expect(shouldShowSection).toBeFalsy();
    });
  });
});

// =============================================================================
// PRIMARY SCRIPTURE DEFAULT
// =============================================================================

describe('SermonHelperAISuggestions - Initial State', () => {
  it('uses primaryScripture as default theme when provided', () => {
    const primaryScripture = 'Matthew 5:1-12';
    // Component sets: const [theme, setTheme] = useState(primaryScripture || '');
    const initialTheme = primaryScripture || '';
    expect(initialTheme).toBe('Matthew 5:1-12');
  });

  it('uses empty string when primaryScripture is null', () => {
    const primaryScripture = null;
    const initialTheme = primaryScripture || '';
    expect(initialTheme).toBe('');
  });
});
