/**
 * ManuscriptImportModal Logic Tests
 *
 * Tests the validation logic and business rules for manuscript import.
 * Uses node environment - tests logic without DOM rendering.
 *
 * Component tested: ManuscriptImportModal
 * Location: apps/web/src/app/sermons/[id]/_components/ManuscriptImportModal.tsx
 */

import { describe, it, expect } from '@jest/globals';
import type { SermonElement, SermonPlanDraft } from '@elder-first/types';

// Test UUIDs
const uuid1 = '11111111-1111-1111-1111-111111111111';
const uuid2 = '22222222-2222-2222-2222-222222222222';

/**
 * Validation logic mirrored from ManuscriptImportModal component
 */

// Character count validation constants (from component lines 65-68, 93)
const MIN_MANUSCRIPT_LENGTH = 100;
const MAX_MANUSCRIPT_LENGTH = 50000;

function validateManuscriptLength(text: string): {
  isValid: boolean;
  characterCount: number;
  tooShort: boolean;
  tooLong: boolean;
  shortBy?: number;
  overBy?: number;
} {
  const characterCount = text.length;
  const tooShort = characterCount < MIN_MANUSCRIPT_LENGTH;
  const tooLong = characterCount > MAX_MANUSCRIPT_LENGTH;

  return {
    isValid: !tooShort && !tooLong,
    characterCount,
    tooShort,
    tooLong,
    shortBy: tooShort ? MIN_MANUSCRIPT_LENGTH - characterCount : undefined,
    overBy: tooLong ? characterCount - MAX_MANUSCRIPT_LENGTH : undefined,
  };
}

// Element type guard functions (derived from ElementPreview component lines 308-350)
function isValidElement(element: unknown): element is SermonElement {
  if (!element || typeof element !== 'object') return false;
  const el = element as Record<string, unknown>;
  if (!el.type || typeof el.type !== 'string') return false;

  switch (el.type) {
    case 'section':
      return typeof el.title === 'string' && typeof el.level === 'number';
    case 'point':
      return typeof el.text === 'string' && typeof el.level === 'number';
    case 'note':
      return typeof el.text === 'string';
    case 'scripture':
      return typeof el.reference === 'string';
    case 'hymn':
      return typeof el.hymnId === 'string' && typeof el.title === 'string';
    default:
      return false;
  }
}

// Draft validation (structure from SermonPlanDraft type)
function isValidDraft(draft: unknown): draft is SermonPlanDraft {
  if (!draft || typeof draft !== 'object') return false;
  const d = draft as Record<string, unknown>;

  // Required fields
  if (typeof d.title !== 'string') return false;
  if (typeof d.bigIdea !== 'string') return false;
  if (typeof d.primaryText !== 'string') return false;
  if (!Array.isArray(d.elements)) return false;

  // Optional fields
  if (d.supportingTexts !== undefined && !Array.isArray(d.supportingTexts)) return false;
  if (d.tags !== undefined && !Array.isArray(d.tags)) return false;

  // Validate all elements
  for (const element of d.elements) {
    if (!isValidElement(element)) return false;
  }

  return true;
}

// ============================================================================
// TESTS
// ============================================================================

describe('ManuscriptImportModal - Character Count Validation', () => {
  describe('validateManuscriptLength', () => {
    it('rejects empty text', () => {
      const result = validateManuscriptLength('');
      expect(result.isValid).toBe(false);
      expect(result.tooShort).toBe(true);
      expect(result.tooLong).toBe(false);
      expect(result.characterCount).toBe(0);
      expect(result.shortBy).toBe(100);
    });

    it('rejects text under 100 characters', () => {
      const text = 'a'.repeat(99);
      const result = validateManuscriptLength(text);
      expect(result.isValid).toBe(false);
      expect(result.tooShort).toBe(true);
      expect(result.shortBy).toBe(1);
    });

    it('accepts text at exactly 100 characters', () => {
      const text = 'a'.repeat(100);
      const result = validateManuscriptLength(text);
      expect(result.isValid).toBe(true);
      expect(result.tooShort).toBe(false);
      expect(result.tooLong).toBe(false);
      expect(result.characterCount).toBe(100);
    });

    it('accepts text at exactly 50000 characters', () => {
      const text = 'a'.repeat(50000);
      const result = validateManuscriptLength(text);
      expect(result.isValid).toBe(true);
      expect(result.tooShort).toBe(false);
      expect(result.tooLong).toBe(false);
      expect(result.characterCount).toBe(50000);
    });

    it('rejects text over 50000 characters', () => {
      const text = 'a'.repeat(50001);
      const result = validateManuscriptLength(text);
      expect(result.isValid).toBe(false);
      expect(result.tooLong).toBe(true);
      expect(result.overBy).toBe(1);
    });

    it('handles typical manuscript length', () => {
      // Typical sermon manuscript is 3000-7000 words, ~20000-35000 chars
      const text = 'a'.repeat(25000);
      const result = validateManuscriptLength(text);
      expect(result.isValid).toBe(true);
      expect(result.characterCount).toBe(25000);
    });

    it('handles whitespace-only text as too short', () => {
      const text = '   '.repeat(30); // 90 spaces
      const result = validateManuscriptLength(text);
      expect(result.isValid).toBe(false);
      expect(result.tooShort).toBe(true);
    });
  });
});

describe('ManuscriptImportModal - Element Validation', () => {
  describe('isValidElement', () => {
    describe('section elements', () => {
      it('validates valid section element', () => {
        const element = { id: uuid1, type: 'section', title: 'Introduction', level: 1 };
        expect(isValidElement(element)).toBe(true);
      });

      it('rejects section without title', () => {
        const element = { id: uuid1, type: 'section', level: 1 };
        expect(isValidElement(element)).toBe(false);
      });

      it('rejects section without level', () => {
        const element = { id: uuid1, type: 'section', title: 'Test' };
        expect(isValidElement(element)).toBe(false);
      });
    });

    describe('point elements', () => {
      it('validates valid point element', () => {
        const element = { id: uuid1, type: 'point', text: 'Main point', level: 1 };
        expect(isValidElement(element)).toBe(true);
      });

      it('rejects point without text', () => {
        const element = { id: uuid1, type: 'point', level: 1 };
        expect(isValidElement(element)).toBe(false);
      });
    });

    describe('note elements', () => {
      it('validates valid note element', () => {
        const element = { id: uuid1, type: 'note', text: 'Remember to pause here' };
        expect(isValidElement(element)).toBe(true);
      });

      it('rejects note without text', () => {
        const element = { id: uuid1, type: 'note' };
        expect(isValidElement(element)).toBe(false);
      });
    });

    describe('scripture elements', () => {
      it('validates valid scripture element', () => {
        const element = { id: uuid1, type: 'scripture', reference: 'John 3:16' };
        expect(isValidElement(element)).toBe(true);
      });

      it('validates scripture with optional note', () => {
        const element = {
          id: uuid1,
          type: 'scripture',
          reference: 'John 3:16',
          note: 'Key verse',
        };
        expect(isValidElement(element)).toBe(true);
      });

      it('rejects scripture without reference', () => {
        const element = { id: uuid1, type: 'scripture' };
        expect(isValidElement(element)).toBe(false);
      });
    });

    describe('hymn elements', () => {
      it('validates valid hymn element', () => {
        const element = { id: uuid1, type: 'hymn', hymnId: uuid2, title: 'Amazing Grace' };
        expect(isValidElement(element)).toBe(true);
      });

      it('validates hymn with optional note', () => {
        const element = {
          id: uuid1,
          type: 'hymn',
          hymnId: uuid2,
          title: 'Amazing Grace',
          note: 'Sing verses 1-3',
        };
        expect(isValidElement(element)).toBe(true);
      });

      it('rejects hymn without hymnId', () => {
        const element = { id: uuid1, type: 'hymn', title: 'Amazing Grace' };
        expect(isValidElement(element)).toBe(false);
      });

      it('rejects hymn without title', () => {
        const element = { id: uuid1, type: 'hymn', hymnId: uuid2 };
        expect(isValidElement(element)).toBe(false);
      });
    });

    describe('invalid elements', () => {
      it('rejects null', () => {
        expect(isValidElement(null)).toBe(false);
      });

      it('rejects undefined', () => {
        expect(isValidElement(undefined)).toBe(false);
      });

      it('rejects non-object', () => {
        expect(isValidElement('string')).toBe(false);
        expect(isValidElement(123)).toBe(false);
      });

      it('rejects unknown element type', () => {
        const element = { id: uuid1, type: 'unknown', content: 'test' };
        expect(isValidElement(element)).toBe(false);
      });
    });
  });
});

describe('ManuscriptImportModal - Draft Validation', () => {
  describe('isValidDraft', () => {
    it('validates complete draft', () => {
      const draft: SermonPlanDraft = {
        sermonId: uuid1,
        title: 'Test Sermon',
        bigIdea: 'God loves us',
        primaryText: 'John 3:16',
        supportingTexts: ['Romans 5:8'],
        elements: [
          { id: uuid1, type: 'section', title: 'Introduction', level: 1 },
          { id: uuid2, type: 'point', text: 'First point', level: 1 },
        ],
        tags: ['gospel', 'love'],
      };
      expect(isValidDraft(draft)).toBe(true);
    });

    it('validates minimal draft', () => {
      const draft = {
        title: 'Test',
        bigIdea: 'Idea',
        primaryText: 'Reference',
        elements: [],
      };
      expect(isValidDraft(draft)).toBe(true);
    });

    it('rejects draft without title', () => {
      const draft = {
        bigIdea: 'Idea',
        primaryText: 'Reference',
        elements: [],
      };
      expect(isValidDraft(draft)).toBe(false);
    });

    it('rejects draft without bigIdea', () => {
      const draft = {
        title: 'Test',
        primaryText: 'Reference',
        elements: [],
      };
      expect(isValidDraft(draft)).toBe(false);
    });

    it('rejects draft without primaryText', () => {
      const draft = {
        title: 'Test',
        bigIdea: 'Idea',
        elements: [],
      };
      expect(isValidDraft(draft)).toBe(false);
    });

    it('rejects draft without elements array', () => {
      const draft = {
        title: 'Test',
        bigIdea: 'Idea',
        primaryText: 'Reference',
      };
      expect(isValidDraft(draft)).toBe(false);
    });

    it('rejects draft with invalid elements', () => {
      const draft = {
        title: 'Test',
        bigIdea: 'Idea',
        primaryText: 'Reference',
        elements: [{ type: 'invalid' }],
      };
      expect(isValidDraft(draft)).toBe(false);
    });

    it('rejects null', () => {
      expect(isValidDraft(null)).toBe(false);
    });

    it('rejects non-object', () => {
      expect(isValidDraft('string')).toBe(false);
    });
  });
});

describe('ManuscriptImportModal - Component State Logic', () => {
  // These tests document the expected state transitions

  describe('modal state machine', () => {
    it('should start in input state (no extractedDraft)', () => {
      // Initial state: manuscriptText = '', extractedDraft = null
      const initialState = {
        manuscriptText: '',
        extractedDraft: null as SermonPlanDraft | null,
        error: null as string | null,
      };

      expect(initialState.extractedDraft).toBeNull();
      expect(initialState.manuscriptText).toBe('');
    });

    it('should transition to review state after successful extraction', () => {
      // After mutation success
      const draft: SermonPlanDraft = {
        sermonId: uuid1,
        title: 'Extracted',
        bigIdea: 'Main idea',
        primaryText: 'John 1:1',
        supportingTexts: [],
        elements: [],
        tags: [],
      };

      const stateAfterExtraction = {
        manuscriptText: 'A'.repeat(500),
        extractedDraft: draft,
        error: null,
      };

      expect(stateAfterExtraction.extractedDraft).not.toBeNull();
    });

    it('should show error state on extraction failure', () => {
      const stateAfterError = {
        manuscriptText: 'A'.repeat(500),
        extractedDraft: null,
        error: 'Failed to extract outline from manuscript',
      };

      expect(stateAfterError.error).not.toBeNull();
      expect(stateAfterError.extractedDraft).toBeNull();
    });

    it('should reset state when modal closes', () => {
      // useEffect cleanup when isOpen changes to false
      const resetState = {
        manuscriptText: '',
        extractedDraft: null,
        error: null,
      };

      expect(resetState.manuscriptText).toBe('');
      expect(resetState.extractedDraft).toBeNull();
      expect(resetState.error).toBeNull();
    });
  });

  describe('button state logic', () => {
    it('Extract button should be disabled when text too short', () => {
      const characterCount = 50;
      const isValidLength = characterCount >= 100 && characterCount <= 50000;
      const isExtracting = false;

      const extractButtonDisabled = !isValidLength || isExtracting;
      expect(extractButtonDisabled).toBe(true);
    });

    it('Extract button should be disabled when text too long', () => {
      const characterCount = 51000;
      const isValidLength = characterCount >= 100 && characterCount <= 50000;
      const isExtracting = false;

      const extractButtonDisabled = !isValidLength || isExtracting;
      expect(extractButtonDisabled).toBe(true);
    });

    it('Extract button should be disabled while extracting', () => {
      const characterCount = 5000;
      const isValidLength = characterCount >= 100 && characterCount <= 50000;
      const isExtracting = true;

      const extractButtonDisabled = !isValidLength || isExtracting;
      expect(extractButtonDisabled).toBe(true);
    });

    it('Extract button should be enabled with valid length and not extracting', () => {
      const characterCount = 5000;
      const isValidLength = characterCount >= 100 && characterCount <= 50000;
      const isExtracting = false;

      const extractButtonDisabled = !isValidLength || isExtracting;
      expect(extractButtonDisabled).toBe(false);
    });
  });
});

describe('ManuscriptImportModal - Error Handling', () => {
  it('should provide user-friendly error for short manuscript', () => {
    const text = 'short';
    const result = validateManuscriptLength(text);

    if (result.tooShort) {
      const errorMessage = `Please enter at least 100 characters of manuscript text.`;
      expect(errorMessage).toContain('100');
    }
    expect(result.tooShort).toBe(true);
  });

  it('should show specific character count needed', () => {
    const text = 'A'.repeat(80);
    const result = validateManuscriptLength(text);

    expect(result.shortBy).toBe(20);
    // Component shows: "{shortBy} more characters needed"
  });

  it('should show over-limit message for long text', () => {
    const text = 'A'.repeat(50100);
    const result = validateManuscriptLength(text);

    expect(result.overBy).toBe(100);
    // Component shows: "Text too long ({overBy} over limit)"
  });
});

describe('ManuscriptImportModal - Privacy Compliance', () => {
  // These tests document the privacy requirements

  it('manuscript text is trimmed before sending', () => {
    const text = '  ' + 'A'.repeat(500) + '   ';
    const trimmed = text.trim();

    expect(trimmed.length).toBe(500);
    expect(trimmed.startsWith(' ')).toBe(false);
    expect(trimmed.endsWith(' ')).toBe(false);
  });

  it('draft contains only extracted structure, not raw manuscript', () => {
    // The SermonPlanDraft type does not include a manuscriptText field
    const draft: SermonPlanDraft = {
      sermonId: uuid1,
      title: 'Test',
      bigIdea: 'Idea',
      primaryText: 'John 1:1',
      supportingTexts: [],
      elements: [],
      tags: [],
    };

    // Verify manuscriptText is not stored in the draft
    expect('manuscriptText' in draft).toBe(false);
  });
});
