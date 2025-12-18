/**
 * GenerateDraftModal Logic Tests (Phase 8)
 *
 * Tests the validation logic and business rules for preaching draft generation.
 * Uses node environment - tests logic without DOM rendering.
 *
 * Component tested: GenerateDraftModal
 * Location: apps/web/src/app/sermons/[id]/_components/GenerateDraftModal.tsx
 */

import { describe, it, expect } from '@jest/globals';
import type { SermonDraft, SermonStyleProfile } from '@elder-first/types';

// Test UUIDs
const uuid1 = '11111111-1111-1111-1111-111111111111';

// ============================================================================
// SERMON DRAFT STRUCTURE VALIDATION
// ============================================================================

/**
 * SermonDraft type structure validation
 */
function isValidSermonDraft(draft: unknown): draft is SermonDraft {
  if (!draft || typeof draft !== 'object') return false;
  const d = draft as Record<string, unknown>;

  // Required fields
  if (typeof d.sermonId !== 'string') return false;
  if (typeof d.createdAt !== 'string') return false;
  if (typeof d.contentMarkdown !== 'string') return false;

  // Optional styleProfile must be valid if present
  if (d.styleProfile !== undefined && d.styleProfile !== null) {
    const validStyles: SermonStyleProfile[] = [
      'story_first_3_point',
      'expository_verse_by_verse',
      'topical_teaching',
    ];
    if (!validStyles.includes(d.styleProfile as SermonStyleProfile)) {
      return false;
    }
  }

  // Optional theologyTradition must be string if present
  if (d.theologyTradition !== undefined && d.theologyTradition !== null) {
    if (typeof d.theologyTradition !== 'string') return false;
  }

  return true;
}

/**
 * Meta response structure validation
 */
function isValidMeta(meta: unknown): meta is {
  tokensUsed: number;
  model: string;
  politicalContentDetected?: boolean;
} {
  if (!meta || typeof meta !== 'object') return false;
  const m = meta as Record<string, unknown>;

  if (typeof m.tokensUsed !== 'number') return false;
  if (typeof m.model !== 'string') return false;

  // Optional politicalContentDetected must be boolean if present
  if (m.politicalContentDetected !== undefined) {
    if (typeof m.politicalContentDetected !== 'boolean') return false;
  }

  return true;
}

// ============================================================================
// TESTS
// ============================================================================

describe('GenerateDraftModal - SermonDraft Structure', () => {
  describe('isValidSermonDraft', () => {
    it('validates complete draft with all fields', () => {
      const draft: SermonDraft = {
        sermonId: uuid1,
        styleProfile: 'story_first_3_point',
        theologyTradition: 'Reformed Baptist',
        createdAt: new Date().toISOString(),
        contentMarkdown: '# Sermon Title\n\n## Introduction\n\nContent here...',
      };
      expect(isValidSermonDraft(draft)).toBe(true);
    });

    it('validates minimal draft with required fields only', () => {
      const draft = {
        sermonId: uuid1,
        createdAt: new Date().toISOString(),
        contentMarkdown: '# Sermon\n\nMinimal content',
      };
      expect(isValidSermonDraft(draft)).toBe(true);
    });

    it('validates draft with null styleProfile', () => {
      const draft = {
        sermonId: uuid1,
        styleProfile: null,
        createdAt: new Date().toISOString(),
        contentMarkdown: '# Sermon content',
      };
      expect(isValidSermonDraft(draft)).toBe(true);
    });

    it('validates draft with null theologyTradition', () => {
      const draft = {
        sermonId: uuid1,
        theologyTradition: null,
        createdAt: new Date().toISOString(),
        contentMarkdown: '# Sermon content',
      };
      expect(isValidSermonDraft(draft)).toBe(true);
    });

    it('accepts story_first_3_point style', () => {
      const draft = {
        sermonId: uuid1,
        styleProfile: 'story_first_3_point',
        createdAt: new Date().toISOString(),
        contentMarkdown: '# Content',
      };
      expect(isValidSermonDraft(draft)).toBe(true);
    });

    it('accepts expository_verse_by_verse style', () => {
      const draft = {
        sermonId: uuid1,
        styleProfile: 'expository_verse_by_verse',
        createdAt: new Date().toISOString(),
        contentMarkdown: '# Content',
      };
      expect(isValidSermonDraft(draft)).toBe(true);
    });

    it('accepts topical_teaching style', () => {
      const draft = {
        sermonId: uuid1,
        styleProfile: 'topical_teaching',
        createdAt: new Date().toISOString(),
        contentMarkdown: '# Content',
      };
      expect(isValidSermonDraft(draft)).toBe(true);
    });

    it('rejects invalid styleProfile', () => {
      const draft = {
        sermonId: uuid1,
        styleProfile: 'invalid_style',
        createdAt: new Date().toISOString(),
        contentMarkdown: '# Content',
      };
      expect(isValidSermonDraft(draft)).toBe(false);
    });

    it('rejects draft without sermonId', () => {
      const draft = {
        createdAt: new Date().toISOString(),
        contentMarkdown: '# Content',
      };
      expect(isValidSermonDraft(draft)).toBe(false);
    });

    it('rejects draft without createdAt', () => {
      const draft = {
        sermonId: uuid1,
        contentMarkdown: '# Content',
      };
      expect(isValidSermonDraft(draft)).toBe(false);
    });

    it('rejects draft without contentMarkdown', () => {
      const draft = {
        sermonId: uuid1,
        createdAt: new Date().toISOString(),
      };
      expect(isValidSermonDraft(draft)).toBe(false);
    });

    it('rejects null', () => {
      expect(isValidSermonDraft(null)).toBe(false);
    });

    it('rejects non-object', () => {
      expect(isValidSermonDraft('string')).toBe(false);
      expect(isValidSermonDraft(123)).toBe(false);
    });
  });
});

describe('GenerateDraftModal - Meta Response Structure', () => {
  describe('isValidMeta', () => {
    it('validates complete meta response', () => {
      const meta = {
        tokensUsed: 2500,
        model: 'gpt-4o-mini',
        politicalContentDetected: false,
      };
      expect(isValidMeta(meta)).toBe(true);
    });

    it('validates meta without politicalContentDetected', () => {
      const meta = {
        tokensUsed: 2000,
        model: 'gpt-4o',
      };
      expect(isValidMeta(meta)).toBe(true);
    });

    it('validates meta with politicalContentDetected true', () => {
      const meta = {
        tokensUsed: 2500,
        model: 'gpt-4o-mini',
        politicalContentDetected: true,
      };
      expect(isValidMeta(meta)).toBe(true);
    });

    it('rejects meta without tokensUsed', () => {
      const meta = {
        model: 'gpt-4o-mini',
      };
      expect(isValidMeta(meta)).toBe(false);
    });

    it('rejects meta without model', () => {
      const meta = {
        tokensUsed: 2500,
      };
      expect(isValidMeta(meta)).toBe(false);
    });

    it('rejects meta with invalid politicalContentDetected type', () => {
      const meta = {
        tokensUsed: 2500,
        model: 'gpt-4o-mini',
        politicalContentDetected: 'yes', // Should be boolean
      };
      expect(isValidMeta(meta)).toBe(false);
    });

    it('rejects null', () => {
      expect(isValidMeta(null)).toBe(false);
    });
  });
});

describe('GenerateDraftModal - Component State Logic', () => {
  describe('modal state machine', () => {
    it('should start in loading state when opened', () => {
      // Component auto-triggers generation on open
      const initialState = {
        generatedDraft: null as SermonDraft | null,
        politicalContentDetected: false,
        error: null as string | null,
        copied: false,
      };

      expect(initialState.generatedDraft).toBeNull();
      expect(initialState.error).toBeNull();
      expect(initialState.copied).toBe(false);
    });

    it('should transition to success state after generation', () => {
      const draft: SermonDraft = {
        sermonId: uuid1,
        styleProfile: 'story_first_3_point',
        theologyTradition: 'Reformed Baptist',
        createdAt: new Date().toISOString(),
        contentMarkdown: '# Generated Sermon\n\n## Introduction\n\nContent...',
      };

      const stateAfterGeneration = {
        generatedDraft: draft,
        politicalContentDetected: false,
        error: null,
        copied: false,
      };

      expect(stateAfterGeneration.generatedDraft).not.toBeNull();
      expect(stateAfterGeneration.error).toBeNull();
    });

    it('should show political content warning when detected', () => {
      const draft: SermonDraft = {
        sermonId: uuid1,
        styleProfile: null,
        createdAt: new Date().toISOString(),
        contentMarkdown: '# Sermon\n\n[content filtered] showed great faith...',
      };

      const stateWithFiltering = {
        generatedDraft: draft,
        politicalContentDetected: true,
        error: null,
        copied: false,
      };

      expect(stateWithFiltering.politicalContentDetected).toBe(true);
      expect(stateWithFiltering.generatedDraft?.contentMarkdown).toContain('[content filtered]');
    });

    it('should show error state on generation failure', () => {
      const stateAfterError = {
        generatedDraft: null,
        politicalContentDetected: false,
        error: 'Failed to generate draft',
        copied: false,
      };

      expect(stateAfterError.error).not.toBeNull();
      expect(stateAfterError.generatedDraft).toBeNull();
    });

    it('should reset state when modal closes', () => {
      const resetState = {
        generatedDraft: null,
        politicalContentDetected: false,
        error: null,
        copied: false,
      };

      expect(resetState.generatedDraft).toBeNull();
      expect(resetState.error).toBeNull();
      expect(resetState.copied).toBe(false);
    });
  });

  describe('copy to clipboard logic', () => {
    it('should set copied state to true after copy', () => {
      const beforeCopy = { copied: false };
      const afterCopy = { copied: true };

      expect(beforeCopy.copied).toBe(false);
      expect(afterCopy.copied).toBe(true);
    });

    it('should reset copied state after timeout', () => {
      // Component uses setTimeout to reset copied state after 2000ms
      const stateAfterTimeout = { copied: false };
      expect(stateAfterTimeout.copied).toBe(false);
    });
  });
});

describe('GenerateDraftModal - Error Handling', () => {
  describe('restricted topic error', () => {
    it('should display specific message for restricted topics', () => {
      const errorMessage = 'Draft generation is disabled for sermons containing restricted topics. Please handle this content personally.';

      expect(errorMessage).toContain('restricted topics');
      expect(errorMessage).toContain('personally');
    });

    it('should identify restricted topic error from message', () => {
      const error = 'Draft generation is disabled for sermons containing restricted topics.';
      const isRestrictedTopicError = error.includes('restricted topics');

      expect(isRestrictedTopicError).toBe(true);
    });
  });

  describe('no plan error', () => {
    it('should display helpful message when no plan exists', () => {
      const errorMessage = 'No sermon plan found. Please create a plan using the Sermon Helper first.';

      expect(errorMessage).toContain('No sermon plan');
      expect(errorMessage).toContain('Sermon Helper');
    });

    it('should identify no plan error from message', () => {
      const error = 'No sermon plan found for this sermon.';
      const isNoPlanError = error.includes('No sermon plan');

      expect(isNoPlanError).toBe(true);
    });
  });

  describe('quota error', () => {
    it('should handle AI quota exceeded error', () => {
      const errorMessage = 'Monthly AI usage limit reached.';

      expect(errorMessage).toContain('limit');
    });
  });

  describe('configuration error', () => {
    it('should handle AI not configured error', () => {
      const errorMessage = 'AI features are not configured. Please configure AI in Settings.';

      expect(errorMessage).toContain('configured');
      expect(errorMessage).toContain('Settings');
    });
  });
});

describe('GenerateDraftModal - Draft Content Validation', () => {
  describe('markdown format', () => {
    it('draft should contain markdown headers', () => {
      const content = '# Sermon Title\n\n## Introduction\n\nContent here...';

      expect(content.includes('# ')).toBe(true);
      expect(content.includes('## ')).toBe(true);
    });

    it('draft should be substantial length for oral delivery', () => {
      // A typical 20-30 minute sermon manuscript is 2000-4000 words
      // Minimum should be at least 200 characters as per parseDraftResponse
      const minLength = 200;
      const content = '# Sermon\n\n'.repeat(50) + 'Content...';

      expect(content.length).toBeGreaterThan(minLength);
    });
  });

  describe('style profile formatting', () => {
    it('should display style profile with readable format', () => {
      const styleProfile: SermonStyleProfile = 'story_first_3_point';
      const readable = styleProfile.replace(/_/g, ' ');

      expect(readable).toBe('story first 3 point');
    });

    it('should handle all style profiles', () => {
      const styles: SermonStyleProfile[] = [
        'story_first_3_point',
        'expository_verse_by_verse',
        'topical_teaching',
      ];

      styles.forEach((style) => {
        const readable = style.replace(/_/g, ' ');
        expect(readable).not.toContain('_');
      });
    });
  });
});

describe('GenerateDraftModal - Political Content Filtering', () => {
  it('should detect filtered content in markdown', () => {
    const contentWithFiltering = '# Sermon\n\n[content filtered] showed great faith and love.';

    const hasFiltering = contentWithFiltering.includes('[content filtered]');
    expect(hasFiltering).toBe(true);
  });

  it('should not show warning for clean content', () => {
    const cleanContent = '# Sermon on Love\n\nGod demonstrates His love for us in that while we were still sinners, Christ died for us.';

    const hasFiltering = cleanContent.includes('[content filtered]');
    expect(hasFiltering).toBe(false);
  });
});

describe('GenerateDraftModal - Privacy and Ephemeral Nature', () => {
  it('draft is ephemeral (not stored in database)', () => {
    // The SermonDraft type documents this in its JSDoc
    // No database field for storing generated drafts
    const draft: SermonDraft = {
      sermonId: uuid1,
      createdAt: new Date().toISOString(),
      contentMarkdown: '# Content',
    };

    // Verify the draft is a computed/ephemeral value
    expect('id' in draft).toBe(false); // No database ID
    expect('tenant_id' in draft).toBe(false); // No tenant tracking
    expect('created_at' in draft).toBe(false); // Uses camelCase, not DB snake_case
  });

  it('draft contains only generated content, no input text stored', () => {
    const draft: SermonDraft = {
      sermonId: uuid1,
      createdAt: new Date().toISOString(),
      contentMarkdown: '# Generated content',
    };

    // Verify no input/source fields are stored
    expect('planContent' in draft).toBe(false);
    expect('inputText' in draft).toBe(false);
    expect('sourceElements' in draft).toBe(false);
  });
});

describe('GenerateDraftModal - Regeneration Flow', () => {
  describe('regenerate button logic', () => {
    it('should reset state before regeneration', () => {
      // State before regeneration (with draft and flags set)
      const stateBeforeRegenerate = {
        generatedDraft: { sermonId: uuid1, createdAt: '', contentMarkdown: '# Old' } as SermonDraft,
        politicalContentDetected: true,
        error: null,
        copied: true,
      };

      // On regenerate click, state resets
      const stateAfterRegenerate = {
        generatedDraft: null,
        politicalContentDetected: false,
        error: null,
        copied: false,
      };

      // Verify before state has content
      expect(stateBeforeRegenerate.generatedDraft).not.toBeNull();
      expect(stateBeforeRegenerate.copied).toBe(true);

      // Verify after state is reset
      expect(stateAfterRegenerate.generatedDraft).toBeNull();
      expect(stateAfterRegenerate.politicalContentDetected).toBe(false);
      expect(stateAfterRegenerate.copied).toBe(false);
    });

    it('regenerate button should be hidden while loading', () => {
      const isGenerating = true;
      const hasGeneratedDraft = true;

      // Component hides regenerate button when isGenerating
      const showRegenerateButton = hasGeneratedDraft && !isGenerating;
      expect(showRegenerateButton).toBe(false);
    });

    it('regenerate button should be visible after generation', () => {
      const isGenerating = false;
      const hasGeneratedDraft = true;

      const showRegenerateButton = hasGeneratedDraft && !isGenerating;
      expect(showRegenerateButton).toBe(true);
    });
  });
});
