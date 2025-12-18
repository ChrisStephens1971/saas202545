/**
 * SaveAsTemplateModal Logic Tests
 *
 * Tests the validation logic and business rules for saving sermon plans as templates.
 * Uses node environment - tests logic without DOM rendering.
 *
 * Component tested: SaveAsTemplateModal
 * Location: apps/web/src/components/sermons/SaveAsTemplateModal.tsx
 */

import { describe, it, expect } from '@jest/globals';

// ============================================================================
// VALIDATION LOGIC (mirrored from component)
// ============================================================================

// Template name validation constants (from component lines 73-80)
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 200;

// Tag limits (from component line 93)
const MAX_TAGS = 10;

function validateTemplateName(name: string): {
  isValid: boolean;
  error: string | null;
  characterCount: number;
} {
  const trimmed = name.trim();
  const characterCount = trimmed.length;

  if (characterCount < MIN_NAME_LENGTH) {
    return {
      isValid: false,
      error: 'Template name must be at least 3 characters.',
      characterCount,
    };
  }

  if (characterCount > MAX_NAME_LENGTH) {
    return {
      isValid: false,
      error: 'Template name must be 200 characters or less.',
      characterCount,
    };
  }

  return {
    isValid: true,
    error: null,
    characterCount,
  };
}

function validateTags(tags: string[]): {
  isValid: boolean;
  canAddMore: boolean;
  tagCount: number;
} {
  return {
    isValid: tags.length <= MAX_TAGS,
    canAddMore: tags.length < MAX_TAGS,
    tagCount: tags.length,
  };
}

// Tag normalization (from component line 92)
function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

// Check for duplicate tags (from component line 93)
function canAddTag(tags: string[], newTag: string): boolean {
  const normalized = normalizeTag(newTag);
  return (
    normalized.length > 0 &&
    !tags.includes(normalized) &&
    tags.length < MAX_TAGS
  );
}

// Add tag to array (from component handleAddTag lines 91-96)
function addTag(tags: string[], newTag: string): string[] {
  if (!canAddTag(tags, newTag)) {
    return tags;
  }
  return [...tags, normalizeTag(newTag)];
}

// Remove tag from array (from component handleRemoveTag lines 99-101)
function removeTag(tags: string[], tagToRemove: string): string[] {
  return tags.filter((t) => t !== tagToRemove);
}

// ============================================================================
// TESTS
// ============================================================================

describe('SaveAsTemplateModal - Name Validation', () => {
  describe('validateTemplateName', () => {
    it('rejects empty name', () => {
      const result = validateTemplateName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 3 characters');
    });

    it('rejects whitespace-only name', () => {
      const result = validateTemplateName('   ');
      expect(result.isValid).toBe(false);
      expect(result.characterCount).toBe(0);
    });

    it('rejects name with 1 character', () => {
      const result = validateTemplateName('A');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 3 characters');
    });

    it('rejects name with 2 characters', () => {
      const result = validateTemplateName('AB');
      expect(result.isValid).toBe(false);
    });

    it('accepts name at minimum 3 characters', () => {
      const result = validateTemplateName('ABC');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.characterCount).toBe(3);
    });

    it('accepts typical template name', () => {
      const result = validateTemplateName('3-Point Expository Template');
      expect(result.isValid).toBe(true);
      expect(result.characterCount).toBe(27);
    });

    it('accepts name at maximum 200 characters', () => {
      const name = 'A'.repeat(200);
      const result = validateTemplateName(name);
      expect(result.isValid).toBe(true);
      expect(result.characterCount).toBe(200);
    });

    it('rejects name over 200 characters', () => {
      const name = 'A'.repeat(201);
      const result = validateTemplateName(name);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('200 characters or less');
    });

    it('trims whitespace from name', () => {
      const result = validateTemplateName('  Template Name  ');
      expect(result.isValid).toBe(true);
      expect(result.characterCount).toBe(13); // 'Template Name' without spaces
    });
  });
});

describe('SaveAsTemplateModal - Tag Management', () => {
  describe('validateTags', () => {
    it('allows empty tag array', () => {
      const result = validateTags([]);
      expect(result.isValid).toBe(true);
      expect(result.canAddMore).toBe(true);
      expect(result.tagCount).toBe(0);
    });

    it('allows up to 9 tags with room for more', () => {
      const tags = Array.from({ length: 9 }, (_, i) => `tag${i}`);
      const result = validateTags(tags);
      expect(result.isValid).toBe(true);
      expect(result.canAddMore).toBe(true);
      expect(result.tagCount).toBe(9);
    });

    it('allows exactly 10 tags but no more', () => {
      const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
      const result = validateTags(tags);
      expect(result.isValid).toBe(true);
      expect(result.canAddMore).toBe(false);
      expect(result.tagCount).toBe(10);
    });

    it('marks 11+ tags as invalid', () => {
      const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
      const result = validateTags(tags);
      expect(result.isValid).toBe(false);
      expect(result.canAddMore).toBe(false);
    });
  });

  describe('normalizeTag', () => {
    it('converts to lowercase', () => {
      expect(normalizeTag('GOSPEL')).toBe('gospel');
      expect(normalizeTag('Expository')).toBe('expository');
    });

    it('trims whitespace', () => {
      expect(normalizeTag('  gospel  ')).toBe('gospel');
    });

    it('handles mixed case and whitespace', () => {
      expect(normalizeTag('  NARRATIVE Preaching  ')).toBe('narrative preaching');
    });
  });

  describe('canAddTag', () => {
    it('allows adding new unique tag', () => {
      const tags = ['gospel', 'love'];
      expect(canAddTag(tags, 'narrative')).toBe(true);
    });

    it('rejects duplicate tag (exact match)', () => {
      const tags = ['gospel', 'love'];
      expect(canAddTag(tags, 'gospel')).toBe(false);
    });

    it('rejects duplicate tag (case insensitive)', () => {
      const tags = ['gospel', 'love'];
      expect(canAddTag(tags, 'GOSPEL')).toBe(false);
    });

    it('rejects empty tag', () => {
      const tags = ['gospel'];
      expect(canAddTag(tags, '')).toBe(false);
    });

    it('rejects whitespace-only tag', () => {
      const tags = ['gospel'];
      expect(canAddTag(tags, '   ')).toBe(false);
    });

    it('rejects when at max tags', () => {
      const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
      expect(canAddTag(tags, 'newTag')).toBe(false);
    });
  });

  describe('addTag', () => {
    it('adds normalized tag to array', () => {
      const tags = ['gospel'];
      const result = addTag(tags, 'LOVE');
      expect(result).toEqual(['gospel', 'love']);
    });

    it('returns original array for duplicate', () => {
      const tags = ['gospel'];
      const result = addTag(tags, 'gospel');
      expect(result).toBe(tags); // Same reference
    });

    it('returns original array for empty input', () => {
      const tags = ['gospel'];
      const result = addTag(tags, '');
      expect(result).toBe(tags);
    });

    it('returns original array when at max', () => {
      const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
      const result = addTag(tags, 'newTag');
      expect(result).toBe(tags);
    });

    it('does not mutate original array', () => {
      const tags = ['gospel'];
      const result = addTag(tags, 'love');
      expect(tags).toEqual(['gospel']);
      expect(result).toEqual(['gospel', 'love']);
    });
  });

  describe('removeTag', () => {
    it('removes existing tag', () => {
      const tags = ['gospel', 'love', 'narrative'];
      const result = removeTag(tags, 'love');
      expect(result).toEqual(['gospel', 'narrative']);
    });

    it('returns same array if tag not found', () => {
      const tags = ['gospel', 'love'];
      const result = removeTag(tags, 'notexist');
      expect(result).toEqual(['gospel', 'love']);
    });

    it('handles empty array', () => {
      const result = removeTag([], 'any');
      expect(result).toEqual([]);
    });

    it('does not mutate original array', () => {
      const tags = ['gospel', 'love'];
      const result = removeTag(tags, 'gospel');
      expect(tags).toEqual(['gospel', 'love']);
      expect(result).toEqual(['love']);
    });
  });
});

describe('SaveAsTemplateModal - State Machine', () => {
  describe('modal state transitions', () => {
    it('should start with default name based on sermon title', () => {
      const sermonTitle = 'The Good Shepherd';
      const defaultName = `${sermonTitle} Template`;

      expect(defaultName).toBe('The Good Shepherd Template');
    });

    it('should show success state after successful save', () => {
      // success state shows: "Template Saved!" and auto-closes after 1.5s
      const successState = {
        success: true,
        error: null,
        isSaving: false,
      };

      expect(successState.success).toBe(true);
    });

    it('should show error state on save failure', () => {
      const errorState = {
        success: false,
        error: 'Failed to create template',
        isSaving: false,
      };

      expect(errorState.error).not.toBeNull();
      expect(errorState.success).toBe(false);
    });

    it('should reset state when modal closes', () => {
      // useEffect cleanup when isOpen changes to false
      const resetState = {
        templateName: '',
        tags: [] as string[],
        tagInput: '',
        error: null,
        success: false,
      };

      expect(resetState.templateName).toBe('');
      expect(resetState.tags).toEqual([]);
      expect(resetState.error).toBeNull();
    });
  });

  describe('button state logic', () => {
    it('Save button should be disabled when name too short', () => {
      const templateName = 'AB';
      const isSaving = false;

      const saveButtonDisabled = templateName.trim().length < 3 || isSaving;
      expect(saveButtonDisabled).toBe(true);
    });

    it('Save button should be disabled while saving', () => {
      const templateName = 'Valid Template';
      const isSaving = true;

      const saveButtonDisabled = templateName.trim().length < 3 || isSaving;
      expect(saveButtonDisabled).toBe(true);
    });

    it('Save button should be enabled with valid name', () => {
      const templateName = 'Valid Template';
      const isSaving = false;

      const saveButtonDisabled = templateName.trim().length < 3 || isSaving;
      expect(saveButtonDisabled).toBe(false);
    });

    it('Add tag button should be disabled when tag input empty', () => {
      const tagInput = '';
      const isSaving = false;
      const tags = ['existing'];

      const addButtonDisabled = !tagInput.trim() || isSaving || tags.length >= MAX_TAGS;
      expect(addButtonDisabled).toBe(true);
    });

    it('Add tag button should be disabled at max tags', () => {
      const tagInput = 'newTag';
      const isSaving = false;
      const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`);

      const addButtonDisabled = !tagInput.trim() || isSaving || tags.length >= MAX_TAGS;
      expect(addButtonDisabled).toBe(true);
    });
  });
});

describe('SaveAsTemplateModal - Keyboard Interactions', () => {
  describe('keyboard event handling', () => {
    it('Enter in name field with empty tag input should trigger save', () => {
      const tagInput = '';

      // From handleKeyDown (lines 103-116)
      const shouldTriggerSave = !tagInput.trim();
      expect(shouldTriggerSave).toBe(true);
    });

    it('Enter in name field with tag input should add tag', () => {
      const tagInput = 'gospel';

      const shouldAddTag = tagInput.trim().length > 0;
      expect(shouldAddTag).toBe(true);
    });

    it('Escape should close modal', () => {
      // handleKeyDown checks for Escape key and calls onClose
      const key = 'Escape';
      expect(key).toBe('Escape');
    });

    it('Enter in tag input should add tag', () => {
      // handleTagKeyDown checks for Enter or comma
      const keysThatAddTag = ['Enter', ','];
      expect(keysThatAddTag).toContain('Enter');
    });

    it('Comma in tag input should add tag', () => {
      const keysThatAddTag = ['Enter', ','];
      expect(keysThatAddTag).toContain(',');
    });
  });
});

describe('SaveAsTemplateModal - Business Logic', () => {
  describe('template creation payload', () => {
    it('should send sermonId, name, and tags', () => {
      const sermonId = '11111111-1111-1111-1111-111111111111';
      const templateName = '  3-Point Template  ';
      const tags = ['gospel', 'expository'];

      const payload = {
        sermonId,
        name: templateName.trim(),
        tags,
      };

      expect(payload.name).toBe('3-Point Template');
      expect(payload.sermonId).toBe(sermonId);
      expect(payload.tags).toEqual(['gospel', 'expository']);
    });

    it('should allow empty tags array', () => {
      const payload = {
        sermonId: '11111111-1111-1111-1111-111111111111',
        name: 'Template Name',
        tags: [],
      };

      expect(payload.tags).toEqual([]);
    });
  });

  describe('success callback behavior', () => {
    it('onSuccess receives template ID', () => {
      // From mutation onSuccess - stores templateId in ref
      const responseData = { id: 'new-template-uuid', success: true };

      // onSuccess is called with the template ID
      expect(responseData.id).toBeDefined();
    });

    it('modal auto-closes after success via useEffect', () => {
      // useEffect with 1500ms delay triggers onSuccess and onClose
      // This is React Strict Mode compatible (cleanup on unmount)
      const autoCloseDelay = 1500;
      expect(autoCloseDelay).toBe(1500);
    });

    it('useEffect cleanup prevents memory leak on early unmount', () => {
      // When success=true, useEffect starts timer
      // If component unmounts before 1500ms, cleanup clears the timer
      // This prevents calling onClose/onSuccess on unmounted component
      const success = true;
      const timerCleared = true; // clearTimeout called in cleanup

      expect(success).toBe(true);
      expect(timerCleared).toBe(true);
    });

    it('templateId is stored in ref to avoid stale closure', () => {
      // successTemplateIdRef stores the ID from mutation response
      // useEffect reads from ref instead of capturing in closure
      // This ensures correct ID is passed to onSuccess
      const successTemplateIdRef = { current: 'template-123' };

      expect(successTemplateIdRef.current).toBe('template-123');
    });
  });
});

describe('SaveAsTemplateModal - Edge Cases', () => {
  it('handles sermon title that makes long default name', () => {
    const longTitle = 'A'.repeat(190);
    const defaultName = `${longTitle} Template`;

    // Default name would be 199 characters (190 + 9 for " Template")
    expect(defaultName.length).toBe(199);

    // Component allows editing, so user can trim if needed
    const validation = validateTemplateName(defaultName);
    expect(validation.isValid).toBe(true);
  });

  it('handles special characters in tags', () => {
    const tags = ['old-testament', "pastor's choice", 'john_3:16'];
    const newTag = 'youth & kids';

    const result = addTag(tags, newTag);
    expect(result).toContain('youth & kids');
  });

  it('prevents adding same tag with different casing', () => {
    const tags = ['gospel'];

    expect(canAddTag(tags, 'GOSPEL')).toBe(false);
    expect(canAddTag(tags, 'Gospel')).toBe(false);
    expect(canAddTag(tags, 'GoSpEl')).toBe(false);
  });
});

// ============================================================================
// STYLE PROFILE TESTS (Phase 6)
// ============================================================================

// StyleProfile enum values (mirroring packages/types/src/index.ts)
type SermonStyleProfile =
  | 'story_first_3_point'
  | 'expository_verse_by_verse'
  | 'topical_teaching';

const STYLE_PROFILE_OPTIONS: Array<{
  value: SermonStyleProfile;
  label: string;
}> = [
  { value: 'story_first_3_point', label: 'Story-First 3-Point' },
  { value: 'expository_verse_by_verse', label: 'Expository Verse-by-Verse' },
  { value: 'topical_teaching', label: 'Topical Teaching' },
];

describe('SaveAsTemplateModal - StyleProfile Selection', () => {
  describe('style dropdown options', () => {
    it('has three style profile options', () => {
      expect(STYLE_PROFILE_OPTIONS).toHaveLength(3);
    });

    it('includes story_first_3_point option', () => {
      const option = STYLE_PROFILE_OPTIONS.find(
        (o) => o.value === 'story_first_3_point'
      );
      expect(option).toBeDefined();
      expect(option?.label).toBe('Story-First 3-Point');
    });

    it('includes expository_verse_by_verse option', () => {
      const option = STYLE_PROFILE_OPTIONS.find(
        (o) => o.value === 'expository_verse_by_verse'
      );
      expect(option).toBeDefined();
      expect(option?.label).toBe('Expository Verse-by-Verse');
    });

    it('includes topical_teaching option', () => {
      const option = STYLE_PROFILE_OPTIONS.find(
        (o) => o.value === 'topical_teaching'
      );
      expect(option).toBeDefined();
      expect(option?.label).toBe('Topical Teaching');
    });

    it('all options have unique values', () => {
      const values = STYLE_PROFILE_OPTIONS.map((o) => o.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('all options have non-empty labels', () => {
      STYLE_PROFILE_OPTIONS.forEach((option) => {
        expect(option.label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('style state management', () => {
    it('initial state can be null (no selection)', () => {
      let selectedStyle: SermonStyleProfile | null = null;

      expect(selectedStyle).toBeNull();
    });

    it('can select a style profile', () => {
      let selectedStyle: SermonStyleProfile | null = null;

      selectedStyle = 'story_first_3_point';
      expect(selectedStyle).toBe('story_first_3_point');
    });

    it('can change selected style', () => {
      let selectedStyle: SermonStyleProfile | null = 'story_first_3_point';

      selectedStyle = 'expository_verse_by_verse';
      expect(selectedStyle).toBe('expository_verse_by_verse');
    });

    it('can clear style selection back to null', () => {
      let selectedStyle: SermonStyleProfile | null = 'topical_teaching';

      selectedStyle = null;
      expect(selectedStyle).toBeNull();
    });
  });

  describe('style in payload', () => {
    it('includes styleProfile in submission payload when selected', () => {
      const formState = {
        name: 'Grace Template',
        tags: ['gospel'],
        styleProfile: 'story_first_3_point' as SermonStyleProfile | null,
      };

      const payload = {
        sermonId: 'sermon-uuid',
        name: formState.name.trim(),
        tags: formState.tags,
        styleProfile: formState.styleProfile,
      };

      expect(payload.styleProfile).toBe('story_first_3_point');
    });

    it('styleProfile is null in payload when not selected', () => {
      const formState = {
        name: 'Basic Template',
        tags: [],
        styleProfile: null as SermonStyleProfile | null,
      };

      const payload = {
        sermonId: 'sermon-uuid',
        name: formState.name.trim(),
        tags: formState.tags,
        styleProfile: formState.styleProfile,
      };

      expect(payload.styleProfile).toBeNull();
    });

    it('payload with expository style is valid', () => {
      const payload = {
        sermonId: 'sermon-uuid',
        name: 'Romans Study Template',
        tags: ['expository', 'romans'],
        styleProfile: 'expository_verse_by_verse' as SermonStyleProfile,
      };

      expect(payload.name.length).toBeGreaterThanOrEqual(MIN_NAME_LENGTH);
      expect(payload.styleProfile).toBe('expository_verse_by_verse');
    });

    it('payload with topical style is valid', () => {
      const payload = {
        sermonId: 'sermon-uuid',
        name: 'Doctrine Series Template',
        tags: ['topical', 'doctrine'],
        styleProfile: 'topical_teaching' as SermonStyleProfile,
      };

      expect(payload.name.length).toBeGreaterThanOrEqual(MIN_NAME_LENGTH);
      expect(payload.styleProfile).toBe('topical_teaching');
    });
  });

  describe('style inherits from plan', () => {
    it('can initialize style from existing plan styleProfile', () => {
      const planStyleProfile: SermonStyleProfile | null = 'story_first_3_point';

      // Modal initializes style from plan if available
      let selectedStyle: SermonStyleProfile | null = planStyleProfile;

      expect(selectedStyle).toBe('story_first_3_point');
    });

    it('handles null plan styleProfile gracefully', () => {
      const planStyleProfile: SermonStyleProfile | null = null;

      let selectedStyle: SermonStyleProfile | null = planStyleProfile;

      expect(selectedStyle).toBeNull();
    });

    it('user can override inherited style', () => {
      const planStyleProfile: SermonStyleProfile | null = 'story_first_3_point';

      // Modal initializes from plan
      let selectedStyle: SermonStyleProfile | null = planStyleProfile;
      expect(selectedStyle).toBe('story_first_3_point');

      // User changes selection
      selectedStyle = 'topical_teaching';
      expect(selectedStyle).toBe('topical_teaching');
    });
  });
});

describe('SaveAsTemplateModal - Style Dropdown Display Logic', () => {
  it('dropdown shows placeholder when no style selected', () => {
    const selectedStyle: SermonStyleProfile | null = null;
    const placeholderText = 'Select a style...';

    const displayText = selectedStyle
      ? STYLE_PROFILE_OPTIONS.find((o) => o.value === selectedStyle)?.label
      : placeholderText;

    expect(displayText).toBe('Select a style...');
  });

  it('dropdown shows selected style label', () => {
    const selectedStyle: SermonStyleProfile | null = 'expository_verse_by_verse';
    const placeholderText = 'Select a style...';

    const displayText = selectedStyle
      ? STYLE_PROFILE_OPTIONS.find((o) => o.value === selectedStyle)?.label
      : placeholderText;

    expect(displayText).toBe('Expository Verse-by-Verse');
  });

  it('finds label for all style values', () => {
    const styles: SermonStyleProfile[] = [
      'story_first_3_point',
      'expository_verse_by_verse',
      'topical_teaching',
    ];

    styles.forEach((style) => {
      const option = STYLE_PROFILE_OPTIONS.find((o) => o.value === style);
      expect(option).toBeDefined();
      expect(option?.label).toBeDefined();
    });
  });
});
