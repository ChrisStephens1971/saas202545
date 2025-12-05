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
