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
