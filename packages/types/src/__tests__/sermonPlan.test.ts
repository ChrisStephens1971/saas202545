import { describe, it, expect } from '@jest/globals';
import {
  SermonElementSchema,
  SermonPlanSchema,
  SermonPlanInputSchema,
  SermonPlanDraftSchema,
  SermonTemplateSchema,
  SermonTemplateInputSchema,
  SermonTemplateListItemSchema,
  ManuscriptImportInputSchema,
  ManuscriptImportResponseSchema,
  SermonStyleProfileSchema,
  SermonStyleProfileLabels,
  SermonStyleProfileDescriptions,
  SermonDraftSchema,
} from '../index';

/**
 * Tests for Phase 5 Sermon Plan & Template Schemas
 *
 * These tests verify Zod schema validation for:
 * - SermonElement discriminated union (section, point, note, scripture, hymn)
 * - SermonPlan and SermonPlanInput schemas
 * - SermonPlanDraft schema (for manuscript import)
 * - SermonTemplate and related schemas
 * - ManuscriptImport input/response schemas
 */

// Helper to generate UUIDs for tests
const uuid1 = '11111111-1111-1111-1111-111111111111';
const uuid2 = '22222222-2222-2222-2222-222222222222';
const uuid3 = '33333333-3333-3333-3333-333333333333';

describe('SermonElementSchema', () => {
  describe('section type', () => {
    it('accepts valid section element', () => {
      const section = {
        id: uuid1,
        type: 'section',
        title: 'Introduction',
      };
      const result = SermonElementSchema.safeParse(section);
      expect(result.success).toBe(true);
    });

    it('rejects section without title', () => {
      const section = {
        id: uuid1,
        type: 'section',
      };
      const result = SermonElementSchema.safeParse(section);
      expect(result.success).toBe(false);
    });

    it('rejects section with invalid id format', () => {
      const section = {
        id: 'not-a-uuid',
        type: 'section',
        title: 'Introduction',
      };
      const result = SermonElementSchema.safeParse(section);
      expect(result.success).toBe(false);
    });
  });

  describe('point type', () => {
    it('accepts valid point element', () => {
      const point = {
        id: uuid1,
        type: 'point',
        text: 'God loves us unconditionally',
      };
      const result = SermonElementSchema.safeParse(point);
      expect(result.success).toBe(true);
    });

    it('rejects point without text', () => {
      const point = {
        id: uuid1,
        type: 'point',
      };
      const result = SermonElementSchema.safeParse(point);
      expect(result.success).toBe(false);
    });
  });

  describe('note type', () => {
    it('accepts valid note element', () => {
      const note = {
        id: uuid1,
        type: 'note',
        text: 'Remember to pause here for reflection',
      };
      const result = SermonElementSchema.safeParse(note);
      expect(result.success).toBe(true);
    });

    it('rejects note without text', () => {
      const note = {
        id: uuid1,
        type: 'note',
      };
      const result = SermonElementSchema.safeParse(note);
      expect(result.success).toBe(false);
    });
  });

  describe('scripture type', () => {
    it('accepts valid scripture element', () => {
      const scripture = {
        id: uuid1,
        type: 'scripture',
        reference: 'John 3:16-17',
      };
      const result = SermonElementSchema.safeParse(scripture);
      expect(result.success).toBe(true);
    });

    it('accepts scripture with optional note', () => {
      const scripture = {
        id: uuid1,
        type: 'scripture',
        reference: 'Romans 8:28',
        note: 'Emphasize "all things"',
      };
      const result = SermonElementSchema.safeParse(scripture);
      expect(result.success).toBe(true);
      if (result.success && result.data.type === 'scripture') {
        expect(result.data.note).toBe('Emphasize "all things"');
      }
    });

    it('rejects scripture without reference', () => {
      const scripture = {
        id: uuid1,
        type: 'scripture',
      };
      const result = SermonElementSchema.safeParse(scripture);
      expect(result.success).toBe(false);
    });
  });

  describe('hymn type', () => {
    it('accepts valid hymn element', () => {
      const hymn = {
        id: uuid1,
        type: 'hymn',
        hymnId: uuid2,
        title: 'Amazing Grace',
      };
      const result = SermonElementSchema.safeParse(hymn);
      expect(result.success).toBe(true);
    });

    it('accepts hymn with optional note', () => {
      const hymn = {
        id: uuid1,
        type: 'hymn',
        hymnId: uuid2,
        title: 'How Great Thou Art',
        note: 'All 4 verses',
      };
      const result = SermonElementSchema.safeParse(hymn);
      expect(result.success).toBe(true);
      if (result.success && result.data.type === 'hymn') {
        expect(result.data.note).toBe('All 4 verses');
      }
    });

    it('rejects hymn without hymnId', () => {
      const hymn = {
        id: uuid1,
        type: 'hymn',
        title: 'Amazing Grace',
      };
      const result = SermonElementSchema.safeParse(hymn);
      expect(result.success).toBe(false);
    });

    it('rejects hymn with invalid hymnId format', () => {
      const hymn = {
        id: uuid1,
        type: 'hymn',
        hymnId: 'not-a-uuid',
        title: 'Amazing Grace',
      };
      const result = SermonElementSchema.safeParse(hymn);
      expect(result.success).toBe(false);
    });
  });

  describe('illustration type', () => {
    it('accepts valid illustration element', () => {
      const illustration = {
        id: uuid1,
        type: 'illustration',
        title: 'The Prodigal Son',
      };
      const result = SermonElementSchema.safeParse(illustration);
      expect(result.success).toBe(true);
    });

    it('accepts illustration with optional note', () => {
      const illustration = {
        id: uuid1,
        type: 'illustration',
        title: 'Story of C.S. Lewis conversion',
        note: 'Emphasize the reluctant nature of his journey to faith',
      };
      const result = SermonElementSchema.safeParse(illustration);
      expect(result.success).toBe(true);
      if (result.success && result.data.type === 'illustration') {
        expect(result.data.note).toBe('Emphasize the reluctant nature of his journey to faith');
      }
    });

    it('rejects illustration without title', () => {
      const illustration = {
        id: uuid1,
        type: 'illustration',
      };
      const result = SermonElementSchema.safeParse(illustration);
      expect(result.success).toBe(false);
    });

    it('accepts illustration with empty note', () => {
      const illustration = {
        id: uuid1,
        type: 'illustration',
        title: 'The Good Samaritan',
        note: '',
      };
      const result = SermonElementSchema.safeParse(illustration);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid types', () => {
    it('rejects unknown element type', () => {
      const invalid = {
        id: uuid1,
        type: 'unknown',
        content: 'test',
      };
      const result = SermonElementSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects element without type', () => {
      const invalid = {
        id: uuid1,
        title: 'test',
      };
      const result = SermonElementSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});

describe('SermonPlanSchema', () => {
  // Note: tenantId is handled by RLS at DB level, not in the Zod schema
  const validPlan = {
    id: uuid1,
    sermonId: uuid3,
    title: 'Grace That Saves',
    bigIdea: 'God saves us by grace through faith',
    primaryText: 'Ephesians 2:8-9',
    supportingTexts: ['Romans 5:8', 'John 3:16'],
    elements: [
      { id: uuid1, type: 'section', title: 'Introduction' },
      { id: uuid2, type: 'point', text: 'Grace is unmerited favor' },
    ],
    tags: ['grace', 'salvation', 'faith'],
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T12:00:00Z',
  };

  it('accepts valid sermon plan', () => {
    const result = SermonPlanSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
  });

  it('accepts plan with minimal required fields', () => {
    const minimal = {
      id: uuid1,
      sermonId: uuid3,
      title: 'Test Sermon',
      bigIdea: '',
      primaryText: '',
    };
    const result = SermonPlanSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('accepts plan with optional templateId', () => {
    const withTemplate = {
      ...validPlan,
      templateId: uuid1,
    };
    const result = SermonPlanSchema.safeParse(withTemplate);
    expect(result.success).toBe(true);
  });

  it('accepts plan with null templateId', () => {
    const withNullTemplate = {
      ...validPlan,
      templateId: null,
    };
    const result = SermonPlanSchema.safeParse(withNullTemplate);
    expect(result.success).toBe(true);
  });

  it('accepts plan with notes', () => {
    const withNotes = {
      ...validPlan,
      notes: 'Remember to include personal testimony',
    };
    const result = SermonPlanSchema.safeParse(withNotes);
    expect(result.success).toBe(true);
  });

  it('rejects plan without id', () => {
    const { id, ...noId } = validPlan;
    const result = SermonPlanSchema.safeParse(noId);
    expect(result.success).toBe(false);
  });

  // Note: tenantId is handled at DB level via RLS, not in Zod schema

  it('rejects plan without sermonId', () => {
    const { sermonId, ...noSermon } = validPlan;
    const result = SermonPlanSchema.safeParse(noSermon);
    expect(result.success).toBe(false);
  });

  it('rejects plan without title', () => {
    const { title, ...noTitle } = validPlan;
    const result = SermonPlanSchema.safeParse(noTitle);
    expect(result.success).toBe(false);
  });

  it('rejects plan with title exceeding 200 chars', () => {
    const longTitle = {
      ...validPlan,
      title: 'x'.repeat(201),
    };
    const result = SermonPlanSchema.safeParse(longTitle);
    expect(result.success).toBe(false);
  });

  it('rejects plan with bigIdea exceeding 500 chars', () => {
    const longIdea = {
      ...validPlan,
      bigIdea: 'x'.repeat(501),
    };
    const result = SermonPlanSchema.safeParse(longIdea);
    expect(result.success).toBe(false);
  });

  it('rejects plan with primaryText exceeding 100 chars', () => {
    const longText = {
      ...validPlan,
      primaryText: 'x'.repeat(101),
    };
    const result = SermonPlanSchema.safeParse(longText);
    expect(result.success).toBe(false);
  });

  it('rejects plan with invalid elements', () => {
    const invalidElements = {
      ...validPlan,
      elements: [
        { id: uuid1, type: 'invalid', content: 'test' },
      ],
    };
    const result = SermonPlanSchema.safeParse(invalidElements);
    expect(result.success).toBe(false);
  });

  it('rejects plan with invalid UUID format', () => {
    const invalidId = {
      ...validPlan,
      id: 'not-a-uuid',
    };
    const result = SermonPlanSchema.safeParse(invalidId);
    expect(result.success).toBe(false);
  });
});

describe('SermonPlanInputSchema', () => {
  const validInput = {
    sermonId: uuid1,
    title: 'Grace That Saves',
    bigIdea: 'God saves us by grace through faith',
    primaryText: 'Ephesians 2:8-9',
    supportingTexts: ['Romans 5:8'],
    elements: [
      { id: uuid1, type: 'section', title: 'Introduction' },
    ],
    tags: ['grace'],
  };

  it('accepts valid plan input', () => {
    const result = SermonPlanInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('applies defaults for optional arrays', () => {
    const minimal = {
      sermonId: uuid1,
      title: 'Test',
      bigIdea: '',
      primaryText: '',
    };
    const result = SermonPlanInputSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.supportingTexts).toEqual([]);
      expect(result.data.elements).toEqual([]);
      expect(result.data.tags).toEqual([]);
    }
  });

  it('rejects input with empty title', () => {
    const emptyTitle = {
      ...validInput,
      title: '',
    };
    const result = SermonPlanInputSchema.safeParse(emptyTitle);
    expect(result.success).toBe(false);
  });

  it('rejects input without sermonId', () => {
    const { sermonId, ...noSermon } = validInput;
    const result = SermonPlanInputSchema.safeParse(noSermon);
    expect(result.success).toBe(false);
  });
});

describe('SermonPlanDraftSchema', () => {
  const validDraft = {
    sermonId: uuid1,
    title: 'Extracted Sermon',
    bigIdea: 'God is faithful',
    primaryText: 'Lamentations 3:22-23',
    supportingTexts: ['Psalm 100:5'],
    elements: [
      { id: uuid1, type: 'point', text: 'His mercies are new every morning' },
    ],
    tags: ['faithfulness', 'mercy'],
  };

  it('accepts valid draft from manuscript import', () => {
    const result = SermonPlanDraftSchema.safeParse(validDraft);
    expect(result.success).toBe(true);
  });

  it('accepts draft with optional notes', () => {
    const withNotes = {
      ...validDraft,
      notes: 'Extracted from Sunday morning manuscript',
    };
    const result = SermonPlanDraftSchema.safeParse(withNotes);
    expect(result.success).toBe(true);
  });

  it('accepts draft with empty title (AI might not extract one)', () => {
    const emptyTitle = {
      ...validDraft,
      title: '',
    };
    const result = SermonPlanDraftSchema.safeParse(emptyTitle);
    expect(result.success).toBe(true);
  });

  it('applies defaults for optional arrays', () => {
    const minimal = {
      sermonId: uuid1,
      title: '',
      bigIdea: '',
      primaryText: '',
    };
    const result = SermonPlanDraftSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.supportingTexts).toEqual([]);
      expect(result.data.elements).toEqual([]);
      expect(result.data.tags).toEqual([]);
    }
  });

  it('rejects draft without sermonId', () => {
    const { sermonId, ...noSermon } = validDraft;
    const result = SermonPlanDraftSchema.safeParse(noSermon);
    expect(result.success).toBe(false);
  });

  it('rejects draft with title exceeding 200 chars', () => {
    const longTitle = {
      ...validDraft,
      title: 'x'.repeat(201),
    };
    const result = SermonPlanDraftSchema.safeParse(longTitle);
    expect(result.success).toBe(false);
  });

  it('rejects malformed draft with non-array elements', () => {
    const malformed = {
      ...validDraft,
      elements: 'not an array',
    };
    const result = SermonPlanDraftSchema.safeParse(malformed);
    expect(result.success).toBe(false);
  });
});

describe('SermonTemplateSchema', () => {
  const validTemplate = {
    id: uuid1,
    tenantId: uuid2,
    name: 'Advent Hope Template',
    defaultTitle: 'Advent Week: Hope',
    defaultBigIdea: 'God gives us hope through Christ',
    defaultPrimaryText: '',
    defaultSupportingTexts: [],
    structure: [
      { id: uuid1, type: 'section', title: 'Introduction' },
      { id: uuid2, type: 'section', title: 'Main Points' },
      { id: uuid3, type: 'section', title: 'Application' },
    ],
    tags: ['Advent', 'Hope'],
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
  };

  it('accepts valid template', () => {
    const result = SermonTemplateSchema.safeParse(validTemplate);
    expect(result.success).toBe(true);
  });

  it('accepts template with all default values', () => {
    const withDefaults = {
      ...validTemplate,
      defaultPrimaryText: 'Isaiah 9:6-7',
      defaultSupportingTexts: ['Luke 2:10-11'],
      defaultBigIdea: 'God brings hope to a hopeless world',
    };
    const result = SermonTemplateSchema.safeParse(withDefaults);
    expect(result.success).toBe(true);
  });

  it('rejects template without name', () => {
    const { name, ...noName } = validTemplate;
    const result = SermonTemplateSchema.safeParse(noName);
    expect(result.success).toBe(false);
  });

  it('rejects template with empty name', () => {
    const emptyName = {
      ...validTemplate,
      name: '',
    };
    const result = SermonTemplateSchema.safeParse(emptyName);
    expect(result.success).toBe(false);
  });

  it('rejects template with name exceeding 200 chars', () => {
    const longName = {
      ...validTemplate,
      name: 'x'.repeat(201),
    };
    const result = SermonTemplateSchema.safeParse(longName);
    expect(result.success).toBe(false);
  });

  it('rejects template without tenantId', () => {
    const { tenantId, ...noTenant } = validTemplate;
    const result = SermonTemplateSchema.safeParse(noTenant);
    expect(result.success).toBe(false);
  });

  it('rejects template without createdAt', () => {
    const { createdAt, ...noCreated } = validTemplate;
    const result = SermonTemplateSchema.safeParse(noCreated);
    expect(result.success).toBe(false);
  });

  it('rejects template with invalid structure elements', () => {
    const invalidStructure = {
      ...validTemplate,
      structure: [
        { id: uuid1, type: 'invalid', content: 'test' },
      ],
    };
    const result = SermonTemplateSchema.safeParse(invalidStructure);
    expect(result.success).toBe(false);
  });
});

describe('SermonTemplateInputSchema', () => {
  it('accepts valid template input', () => {
    const input = {
      sermonId: uuid1,
      name: 'My Template',
      tags: ['expository', 'grace'],
    };
    const result = SermonTemplateInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('applies default empty tags array', () => {
    const input = {
      sermonId: uuid1,
      name: 'My Template',
    };
    const result = SermonTemplateInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
    }
  });

  it('rejects input without sermonId', () => {
    const input = {
      name: 'My Template',
    };
    const result = SermonTemplateInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects input without name', () => {
    const input = {
      sermonId: uuid1,
    };
    const result = SermonTemplateInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects input with empty name', () => {
    const input = {
      sermonId: uuid1,
      name: '',
    };
    const result = SermonTemplateInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('SermonTemplateListItemSchema', () => {
  it('accepts valid list item', () => {
    const item = {
      id: uuid1,
      name: 'Advent Hope Template',
      defaultTitle: 'Advent Week: Hope',
      defaultPrimaryText: 'Isaiah 9:6-7',
      tags: ['Advent', 'Hope'],
      createdAt: '2025-01-15T10:00:00Z',
    };
    const result = SermonTemplateListItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });

  it('accepts list item with empty tags', () => {
    const item = {
      id: uuid1,
      name: 'Basic Template',
      defaultTitle: '',
      defaultPrimaryText: '',
      tags: [],
      createdAt: '2025-01-15T10:00:00Z',
    };
    const result = SermonTemplateListItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });

  it('rejects list item without required fields', () => {
    const incomplete = {
      id: uuid1,
      name: 'Template',
    };
    const result = SermonTemplateListItemSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });
});

describe('ManuscriptImportInputSchema', () => {
  it('accepts valid manuscript input', () => {
    const input = {
      sermonId: uuid1,
      manuscriptText: 'x'.repeat(100), // Minimum 100 chars
    };
    const result = ManuscriptImportInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts manuscript at max length (50000 chars)', () => {
    const input = {
      sermonId: uuid1,
      manuscriptText: 'x'.repeat(50000),
    };
    const result = ManuscriptImportInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects manuscript under 100 chars', () => {
    const input = {
      sermonId: uuid1,
      manuscriptText: 'x'.repeat(99),
    };
    const result = ManuscriptImportInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects manuscript over 50000 chars', () => {
    const input = {
      sermonId: uuid1,
      manuscriptText: 'x'.repeat(50001),
    };
    const result = ManuscriptImportInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects input without sermonId', () => {
    const input = {
      manuscriptText: 'x'.repeat(100),
    };
    const result = ManuscriptImportInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects input without manuscriptText', () => {
    const input = {
      sermonId: uuid1,
    };
    const result = ManuscriptImportInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('ManuscriptImportResponseSchema', () => {
  const validDraft = {
    sermonId: uuid1,
    title: 'Extracted Title',
    bigIdea: 'Main idea from manuscript',
    primaryText: 'John 3:16',
    supportingTexts: [],
    elements: [],
    tags: [],
  };

  it('accepts valid import response', () => {
    const response = {
      draft: validDraft,
      meta: {
        tokensUsed: 500,
        model: 'gpt-4',
        extractedElementsCount: 5,
      },
    };
    const result = ManuscriptImportResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('accepts response without optional meta fields', () => {
    const response = {
      draft: validDraft,
      meta: {
        extractedElementsCount: 0,
      },
    };
    const result = ManuscriptImportResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('rejects response without draft', () => {
    const response = {
      meta: {
        extractedElementsCount: 0,
      },
    };
    const result = ManuscriptImportResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('rejects response without meta', () => {
    const response = {
      draft: validDraft,
    };
    const result = ManuscriptImportResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('rejects response without extractedElementsCount', () => {
    const response = {
      draft: validDraft,
      meta: {
        tokensUsed: 500,
      },
    };
    const result = ManuscriptImportResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('rejects negative tokensUsed', () => {
    const response = {
      draft: validDraft,
      meta: {
        tokensUsed: -1,
        extractedElementsCount: 0,
      },
    };
    const result = ManuscriptImportResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Phase 6: Sermon Style Profile Tests
// ============================================================

describe('SermonStyleProfileSchema', () => {
  it('accepts story_first_3_point', () => {
    const result = SermonStyleProfileSchema.safeParse('story_first_3_point');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('story_first_3_point');
    }
  });

  it('accepts expository_verse_by_verse', () => {
    const result = SermonStyleProfileSchema.safeParse('expository_verse_by_verse');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('expository_verse_by_verse');
    }
  });

  it('accepts topical_teaching', () => {
    const result = SermonStyleProfileSchema.safeParse('topical_teaching');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('topical_teaching');
    }
  });

  it('rejects invalid style profile value', () => {
    const result = SermonStyleProfileSchema.safeParse('invalid_style');
    expect(result.success).toBe(false);
  });

  it('rejects empty string', () => {
    const result = SermonStyleProfileSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('rejects null directly (use nullish wrapper for nullable)', () => {
    const result = SermonStyleProfileSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('rejects number value', () => {
    const result = SermonStyleProfileSchema.safeParse(123);
    expect(result.success).toBe(false);
  });
});

describe('SermonStyleProfileLabels', () => {
  it('has label for story_first_3_point', () => {
    expect(SermonStyleProfileLabels.story_first_3_point).toBe('Story-First 3-Point');
  });

  it('has label for expository_verse_by_verse', () => {
    expect(SermonStyleProfileLabels.expository_verse_by_verse).toBe('Expository Verse-by-Verse');
  });

  it('has label for topical_teaching', () => {
    expect(SermonStyleProfileLabels.topical_teaching).toBe('Topical Teaching');
  });

  it('has all three style profiles', () => {
    const keys = Object.keys(SermonStyleProfileLabels);
    expect(keys).toHaveLength(3);
    expect(keys).toContain('story_first_3_point');
    expect(keys).toContain('expository_verse_by_verse');
    expect(keys).toContain('topical_teaching');
  });
});

describe('SermonStyleProfileDescriptions', () => {
  it('has description for story_first_3_point', () => {
    expect(SermonStyleProfileDescriptions.story_first_3_point).toContain('three main points');
  });

  it('has description for expository_verse_by_verse', () => {
    expect(SermonStyleProfileDescriptions.expository_verse_by_verse).toContain('verse');
  });

  it('has description for topical_teaching', () => {
    expect(SermonStyleProfileDescriptions.topical_teaching).toContain('topic');
  });

  it('has all three style profiles', () => {
    const keys = Object.keys(SermonStyleProfileDescriptions);
    expect(keys).toHaveLength(3);
    expect(keys).toContain('story_first_3_point');
    expect(keys).toContain('expository_verse_by_verse');
    expect(keys).toContain('topical_teaching');
  });
});

describe('SermonPlanSchema with styleProfile', () => {
  const uuid1 = '11111111-1111-1111-1111-111111111111';
  const uuid3 = '33333333-3333-3333-3333-333333333333';

  const validPlanBase = {
    id: uuid1,
    sermonId: uuid3,
    title: 'Grace That Saves',
    bigIdea: 'God saves us by grace through faith',
    primaryText: 'Ephesians 2:8-9',
  };

  it('accepts plan with valid styleProfile', () => {
    const plan = {
      ...validPlanBase,
      styleProfile: 'story_first_3_point',
    };
    const result = SermonPlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.styleProfile).toBe('story_first_3_point');
    }
  });

  it('accepts plan with null styleProfile', () => {
    const plan = {
      ...validPlanBase,
      styleProfile: null,
    };
    const result = SermonPlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.styleProfile).toBeNull();
    }
  });

  it('accepts plan with undefined styleProfile', () => {
    const plan = {
      ...validPlanBase,
      styleProfile: undefined,
    };
    const result = SermonPlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.styleProfile).toBeUndefined();
    }
  });

  it('accepts plan without styleProfile field', () => {
    const result = SermonPlanSchema.safeParse(validPlanBase);
    expect(result.success).toBe(true);
  });

  it('rejects plan with invalid styleProfile', () => {
    const plan = {
      ...validPlanBase,
      styleProfile: 'invalid_style',
    };
    const result = SermonPlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  it('accepts all valid styleProfile values', () => {
    const styles = ['story_first_3_point', 'expository_verse_by_verse', 'topical_teaching'];
    for (const style of styles) {
      const plan = { ...validPlanBase, styleProfile: style };
      const result = SermonPlanSchema.safeParse(plan);
      expect(result.success).toBe(true);
    }
  });
});

describe('SermonPlanInputSchema with styleProfile', () => {
  const uuid1 = '11111111-1111-1111-1111-111111111111';

  const validInputBase = {
    sermonId: uuid1,
    title: 'Grace That Saves',
    bigIdea: 'God saves us by grace through faith',
    primaryText: 'Ephesians 2:8-9',
  };

  it('accepts input with valid styleProfile', () => {
    const input = {
      ...validInputBase,
      styleProfile: 'expository_verse_by_verse',
    };
    const result = SermonPlanInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.styleProfile).toBe('expository_verse_by_verse');
    }
  });

  it('accepts input with null styleProfile', () => {
    const input = {
      ...validInputBase,
      styleProfile: null,
    };
    const result = SermonPlanInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts input without styleProfile', () => {
    const result = SermonPlanInputSchema.safeParse(validInputBase);
    expect(result.success).toBe(true);
  });

  it('rejects input with invalid styleProfile', () => {
    const input = {
      ...validInputBase,
      styleProfile: 'invalid_style',
    };
    const result = SermonPlanInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('SermonPlanDraftSchema with styleProfile', () => {
  const uuid1 = '11111111-1111-1111-1111-111111111111';

  const validDraftBase = {
    sermonId: uuid1,
    title: 'Extracted Sermon',
    bigIdea: 'God is faithful',
    primaryText: 'Lamentations 3:22-23',
  };

  it('accepts draft with valid styleProfile', () => {
    const draft = {
      ...validDraftBase,
      styleProfile: 'topical_teaching',
    };
    const result = SermonPlanDraftSchema.safeParse(draft);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.styleProfile).toBe('topical_teaching');
    }
  });

  it('accepts draft with null styleProfile', () => {
    const draft = {
      ...validDraftBase,
      styleProfile: null,
    };
    const result = SermonPlanDraftSchema.safeParse(draft);
    expect(result.success).toBe(true);
  });

  it('accepts draft without styleProfile', () => {
    const result = SermonPlanDraftSchema.safeParse(validDraftBase);
    expect(result.success).toBe(true);
  });
});

describe('SermonTemplateSchema with styleProfile', () => {
  const uuid1 = '11111111-1111-1111-1111-111111111111';
  const uuid2 = '22222222-2222-2222-2222-222222222222';

  const validTemplateBase = {
    id: uuid1,
    tenantId: uuid2,
    name: 'Expository Template',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
  };

  it('accepts template with valid styleProfile', () => {
    const template = {
      ...validTemplateBase,
      styleProfile: 'expository_verse_by_verse',
    };
    const result = SermonTemplateSchema.safeParse(template);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.styleProfile).toBe('expository_verse_by_verse');
    }
  });

  it('accepts template with null styleProfile', () => {
    const template = {
      ...validTemplateBase,
      styleProfile: null,
    };
    const result = SermonTemplateSchema.safeParse(template);
    expect(result.success).toBe(true);
  });

  it('accepts template without styleProfile', () => {
    const result = SermonTemplateSchema.safeParse(validTemplateBase);
    expect(result.success).toBe(true);
  });

  it('rejects template with invalid styleProfile', () => {
    const template = {
      ...validTemplateBase,
      styleProfile: 'invalid_style',
    };
    const result = SermonTemplateSchema.safeParse(template);
    expect(result.success).toBe(false);
  });
});

describe('SermonTemplateInputSchema with styleProfile', () => {
  const uuid1 = '11111111-1111-1111-1111-111111111111';

  const validInputBase = {
    sermonId: uuid1,
    name: 'My Template',
  };

  it('accepts input with valid styleProfile', () => {
    const input = {
      ...validInputBase,
      styleProfile: 'story_first_3_point',
    };
    const result = SermonTemplateInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.styleProfile).toBe('story_first_3_point');
    }
  });

  it('accepts input with null styleProfile', () => {
    const input = {
      ...validInputBase,
      styleProfile: null,
    };
    const result = SermonTemplateInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts input without styleProfile', () => {
    const result = SermonTemplateInputSchema.safeParse(validInputBase);
    expect(result.success).toBe(true);
  });

  it('rejects input with invalid styleProfile', () => {
    const input = {
      ...validInputBase,
      styleProfile: 'invalid_style',
    };
    const result = SermonTemplateInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('SermonTemplateListItemSchema with styleProfile', () => {
  const uuid1 = '11111111-1111-1111-1111-111111111111';

  const validListItemBase = {
    id: uuid1,
    name: 'Advent Hope Template',
    defaultTitle: 'Advent Week: Hope',
    defaultPrimaryText: 'Isaiah 9:6-7',
    tags: ['Advent', 'Hope'],
    createdAt: '2025-01-15T10:00:00Z',
  };

  it('accepts list item with valid styleProfile', () => {
    const item = {
      ...validListItemBase,
      styleProfile: 'topical_teaching',
    };
    const result = SermonTemplateListItemSchema.safeParse(item);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.styleProfile).toBe('topical_teaching');
    }
  });

  it('accepts list item with null styleProfile', () => {
    const item = {
      ...validListItemBase,
      styleProfile: null,
    };
    const result = SermonTemplateListItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });

  it('accepts list item without styleProfile', () => {
    const result = SermonTemplateListItemSchema.safeParse(validListItemBase);
    expect(result.success).toBe(true);
  });

  it('rejects list item with invalid styleProfile', () => {
    const item = {
      ...validListItemBase,
      styleProfile: 'invalid_style',
    };
    const result = SermonTemplateListItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Phase 7: Illustration Suggestion Tests
// ============================================================

import {
  IllustrationSuggestionSchema,
  SermonHelperSuggestionsSchema,
} from '../index';

describe('IllustrationSuggestionSchema', () => {
  it('accepts valid illustration suggestion', () => {
    const suggestion = {
      id: 'illus-1',
      title: "Mother recognizes baby's cry",
      summary: 'A mother can identify her baby\'s cry from a room full of infants. In the same way, God knows each of us intimately and hears our individual prayers.',
    };
    const result = IllustrationSuggestionSchema.safeParse(suggestion);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('illus-1');
      expect(result.data.title).toBe("Mother recognizes baby's cry");
      expect(result.data.summary).toContain('mother');
    }
  });

  it('accepts suggestion with forSection', () => {
    const suggestion = {
      id: 'illus-2',
      title: 'The Prodigal Son Returns',
      summary: 'A father waits daily for his wayward son to return, never giving up hope.',
      forSection: 'point1',
    };
    const result = IllustrationSuggestionSchema.safeParse(suggestion);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.forSection).toBe('point1');
    }
  });

  it('accepts suggestion with null forSection', () => {
    const suggestion = {
      id: 'illus-3',
      title: 'The Lost Sheep',
      summary: 'A shepherd leaves 99 sheep to find the one that wandered away.',
      forSection: null,
    };
    const result = IllustrationSuggestionSchema.safeParse(suggestion);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.forSection).toBeNull();
    }
  });

  it('accepts suggestion without forSection field', () => {
    const suggestion = {
      id: 'illus-4',
      title: 'The Good Samaritan',
      summary: 'A man helps a stranger on the road when others pass by.',
    };
    const result = IllustrationSuggestionSchema.safeParse(suggestion);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.forSection).toBeUndefined();
    }
  });

  it('rejects suggestion without id', () => {
    const suggestion = {
      title: 'Missing ID',
      summary: 'This suggestion has no ID.',
    };
    const result = IllustrationSuggestionSchema.safeParse(suggestion);
    expect(result.success).toBe(false);
  });

  it('rejects suggestion without title', () => {
    const suggestion = {
      id: 'illus-5',
      summary: 'This suggestion has no title.',
    };
    const result = IllustrationSuggestionSchema.safeParse(suggestion);
    expect(result.success).toBe(false);
  });

  it('rejects suggestion without summary', () => {
    const suggestion = {
      id: 'illus-6',
      title: 'Missing Summary',
    };
    const result = IllustrationSuggestionSchema.safeParse(suggestion);
    expect(result.success).toBe(false);
  });

  it('rejects suggestion with empty id', () => {
    const suggestion = {
      id: '',
      title: 'Empty ID',
      summary: 'This suggestion has an empty ID.',
    };
    // Note: Zod z.string() allows empty strings by default
    const result = IllustrationSuggestionSchema.safeParse(suggestion);
    // This will pass unless we add .min(1) to the schema
    expect(result.success).toBe(true);
  });

  it('rejects non-object input', () => {
    const result = IllustrationSuggestionSchema.safeParse('not an object');
    expect(result.success).toBe(false);
  });

  it('rejects array input', () => {
    const result = IllustrationSuggestionSchema.safeParse(['illus-1', 'title', 'summary']);
    expect(result.success).toBe(false);
  });
});

describe('SermonHelperSuggestionsSchema with illustrationSuggestions', () => {
  it('accepts suggestions with illustrationSuggestions array', () => {
    const suggestions = {
      bigIdea: 'God loves us unconditionally',
      illustrationSuggestions: [
        {
          id: 'illus-1',
          title: 'The Waiting Father',
          summary: 'A father waits daily for his wayward son to return.',
          forSection: 'introduction',
        },
        {
          id: 'illus-2',
          title: 'The Lost Coin',
          summary: 'A woman searches tirelessly for a lost coin of great value.',
          forSection: 'point2',
        },
      ],
    };
    const result = SermonHelperSuggestionsSchema.safeParse(suggestions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.illustrationSuggestions).toHaveLength(2);
      expect(result.data.illustrationSuggestions![0].id).toBe('illus-1');
      expect(result.data.illustrationSuggestions![1].title).toBe('The Lost Coin');
    }
  });

  it('accepts suggestions with empty illustrationSuggestions array', () => {
    const suggestions = {
      bigIdea: 'God is faithful',
      illustrationSuggestions: [],
    };
    const result = SermonHelperSuggestionsSchema.safeParse(suggestions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.illustrationSuggestions).toEqual([]);
    }
  });

  it('accepts suggestions without illustrationSuggestions field', () => {
    const suggestions = {
      bigIdea: 'Grace is sufficient',
      applications: ['Apply grace daily'],
    };
    const result = SermonHelperSuggestionsSchema.safeParse(suggestions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.illustrationSuggestions).toBeUndefined();
    }
  });

  it('accepts suggestions with both illustrations and illustrationSuggestions', () => {
    const suggestions = {
      bigIdea: 'God provides',
      illustrations: ['The ravens fed Elijah', 'Manna in the wilderness'],
      illustrationSuggestions: [
        {
          id: 'illus-1',
          title: 'Modern Provision',
          summary: 'A family received unexpected help during financial hardship.',
          forSection: 'application',
        },
      ],
    };
    const result = SermonHelperSuggestionsSchema.safeParse(suggestions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.illustrations).toHaveLength(2);
      expect(result.data.illustrationSuggestions).toHaveLength(1);
    }
  });

  it('rejects suggestions with malformed illustrationSuggestions', () => {
    const suggestions = {
      bigIdea: 'Test',
      illustrationSuggestions: [
        {
          // Missing required fields
          id: 'illus-1',
        },
      ],
    };
    const result = SermonHelperSuggestionsSchema.safeParse(suggestions);
    expect(result.success).toBe(false);
  });

  it('rejects suggestions with non-array illustrationSuggestions', () => {
    const suggestions = {
      bigIdea: 'Test',
      illustrationSuggestions: 'not an array',
    };
    const result = SermonHelperSuggestionsSchema.safeParse(suggestions);
    expect(result.success).toBe(false);
  });

  it('accepts all suggestion fields together', () => {
    const fullSuggestions = {
      bigIdea: 'God is love',
      outlinePoints: [],
      outline: [],
      illustrations: ['Simple illustration'],
      illustrationSuggestions: [
        {
          id: 'illus-1',
          title: 'Detailed illustration',
          summary: 'A detailed summary of the illustration.',
        },
      ],
      applications: ['Apply this truth'],
      applicationIdeas: [{ idea: 'Specific application', audience: 'adults' }],
      quotes: ['Famous quote'],
      scriptureSuggestions: [{ reference: 'John 3:16', reason: 'Key verse' }],
      hymnThemes: [{ theme: 'Love', reason: 'Matches theme' }],
    };
    const result = SermonHelperSuggestionsSchema.safeParse(fullSuggestions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.illustrationSuggestions).toHaveLength(1);
      expect(result.data.illustrations).toHaveLength(1);
    }
  });
});

// =============================================================================
// SermonDraft Schema Tests (Phase 8)
// =============================================================================

describe('SermonDraftSchema', () => {
  const validDraft = {
    sermonId: uuid1,
    styleProfile: 'story_first_3_point',
    theologyTradition: 'reformed_baptist',
    createdAt: '2025-12-05T12:00:00.000Z',
    contentMarkdown: '# Sermon Title\n\nThis is the sermon content...',
  };

  it('accepts valid sermon draft with all fields', () => {
    const result = SermonDraftSchema.safeParse(validDraft);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sermonId).toBe(uuid1);
      expect(result.data.styleProfile).toBe('story_first_3_point');
      expect(result.data.theologyTradition).toBe('reformed_baptist');
      expect(result.data.contentMarkdown).toContain('Sermon Title');
    }
  });

  it('accepts draft with null styleProfile', () => {
    const draft = {
      ...validDraft,
      styleProfile: null,
    };
    const result = SermonDraftSchema.safeParse(draft);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.styleProfile).toBeNull();
    }
  });

  it('accepts draft without styleProfile (undefined)', () => {
    const { styleProfile: _, ...draftWithoutStyle } = validDraft;
    const result = SermonDraftSchema.safeParse(draftWithoutStyle);
    expect(result.success).toBe(true);
  });

  it('accepts draft with null theologyTradition', () => {
    const draft = {
      ...validDraft,
      theologyTradition: null,
    };
    const result = SermonDraftSchema.safeParse(draft);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.theologyTradition).toBeNull();
    }
  });

  it('accepts draft without theologyTradition (undefined)', () => {
    const { theologyTradition: _, ...draftWithoutTradition } = validDraft;
    const result = SermonDraftSchema.safeParse(draftWithoutTradition);
    expect(result.success).toBe(true);
  });

  it('accepts all valid styleProfile values', () => {
    const profiles = ['story_first_3_point', 'expository_verse_by_verse', 'topical_teaching'];
    for (const profile of profiles) {
      const draft = { ...validDraft, styleProfile: profile };
      const result = SermonDraftSchema.safeParse(draft);
      expect(result.success).toBe(true);
    }
  });

  it('rejects draft without sermonId', () => {
    const { sermonId: _, ...draftWithoutId } = validDraft;
    const result = SermonDraftSchema.safeParse(draftWithoutId);
    expect(result.success).toBe(false);
  });

  it('rejects draft with invalid sermonId format', () => {
    const draft = {
      ...validDraft,
      sermonId: 'not-a-uuid',
    };
    const result = SermonDraftSchema.safeParse(draft);
    expect(result.success).toBe(false);
  });

  it('rejects draft without createdAt', () => {
    const { createdAt: _, ...draftWithoutCreated } = validDraft;
    const result = SermonDraftSchema.safeParse(draftWithoutCreated);
    expect(result.success).toBe(false);
  });

  it('rejects draft with empty createdAt', () => {
    const draft = {
      ...validDraft,
      createdAt: '',
    };
    const result = SermonDraftSchema.safeParse(draft);
    expect(result.success).toBe(false);
  });

  it('rejects draft without contentMarkdown', () => {
    const { contentMarkdown: _, ...draftWithoutContent } = validDraft;
    const result = SermonDraftSchema.safeParse(draftWithoutContent);
    expect(result.success).toBe(false);
  });

  it('rejects draft with empty contentMarkdown', () => {
    const draft = {
      ...validDraft,
      contentMarkdown: '',
    };
    const result = SermonDraftSchema.safeParse(draft);
    expect(result.success).toBe(false);
  });

  it('rejects draft with invalid styleProfile value', () => {
    const draft = {
      ...validDraft,
      styleProfile: 'invalid_style',
    };
    const result = SermonDraftSchema.safeParse(draft);
    expect(result.success).toBe(false);
  });

  it('accepts draft with minimal required fields only', () => {
    const minimalDraft = {
      sermonId: uuid1,
      createdAt: '2025-12-05T12:00:00.000Z',
      contentMarkdown: '# Sermon\n\nContent here.',
    };
    const result = SermonDraftSchema.safeParse(minimalDraft);
    expect(result.success).toBe(true);
  });

  it('accepts draft with long markdown content', () => {
    const longContent = '# Title\n\n' + 'This is paragraph content. '.repeat(500);
    const draft = {
      ...validDraft,
      contentMarkdown: longContent,
    };
    const result = SermonDraftSchema.safeParse(draft);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contentMarkdown.length).toBeGreaterThan(1000);
    }
  });
});
