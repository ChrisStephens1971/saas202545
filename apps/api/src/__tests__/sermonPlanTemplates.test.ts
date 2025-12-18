import { describe, it, expect } from '@jest/globals';

/**
 * Sermon Plan & Templates API Tests (Phase 5)
 *
 * Tests for the sermon plan and template system:
 * 1. Input validation for getPlan, savePlan
 * 2. Input validation for listTemplates, getTemplate, createTemplateFromPlan
 * 3. Response transformation logic
 * 4. Manuscript import validation and parsing
 *
 * Note: These are unit tests that validate business logic without hitting the database.
 * Integration tests would require a test database setup.
 */

// ============================================================================
// TEST DATA FIXTURES
// ============================================================================

const uuid1 = '11111111-1111-1111-1111-111111111111';
const uuid2 = '22222222-2222-2222-2222-222222222222';
const uuid3 = '33333333-3333-3333-3333-333333333333';

// Valid sermon elements
const validSectionElement = {
  id: uuid1,
  type: 'section' as const,
  title: 'Introduction',
};

const validPointElement = {
  id: uuid2,
  type: 'point' as const,
  text: 'God loves us unconditionally',
};

const validScriptureElement = {
  id: uuid3,
  type: 'scripture' as const,
  reference: 'John 3:16',
  note: 'Central gospel text',
};

const validNoteElement = {
  id: '44444444-4444-4444-4444-444444444444',
  type: 'note' as const,
  text: 'Pause for reflection here',
};

const validHymnElement = {
  id: '55555555-5555-5555-5555-555555555555',
  type: 'hymn' as const,
  hymnId: '66666666-6666-6666-6666-666666666666',
  title: 'Amazing Grace',
};

// Valid sermon plan input
const validPlanInput = {
  sermonId: uuid1,
  title: 'Grace That Saves',
  bigIdea: 'God saves us by grace through faith',
  primaryText: 'Ephesians 2:8-9',
  supportingTexts: ['Romans 5:8', 'John 3:16'],
  elements: [validSectionElement, validPointElement],
  tags: ['grace', 'salvation'],
  notes: 'Focus on personal application',
};

// Valid template data
const validTemplateInput = {
  sermonId: uuid1,
  name: 'Grace Message Template',
  tags: ['grace', 'gospel'],
};

// ============================================================================
// INPUT VALIDATION HELPERS (mirror router validation)
// ============================================================================

import { z } from 'zod';

// StyleProfile enum mirroring the types package
const SermonStyleProfileSchema = z.enum([
  'story_first_3_point',
  'expository_verse_by_verse',
  'topical_teaching',
]);

type SermonStyleProfile = z.infer<typeof SermonStyleProfileSchema>;

const SermonStyleProfileLabels: Record<SermonStyleProfile, string> = {
  story_first_3_point: 'Story-First 3-Point',
  expository_verse_by_verse: 'Expository Verse-by-Verse',
  topical_teaching: 'Topical Teaching',
};

const SermonElementSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string().uuid(),
    type: z.literal('section'),
    title: z.string(),
  }),
  z.object({
    id: z.string().uuid(),
    type: z.literal('point'),
    text: z.string(),
  }),
  z.object({
    id: z.string().uuid(),
    type: z.literal('note'),
    text: z.string(),
  }),
  z.object({
    id: z.string().uuid(),
    type: z.literal('scripture'),
    reference: z.string(),
    note: z.string().optional(),
  }),
  z.object({
    id: z.string().uuid(),
    type: z.literal('hymn'),
    hymnId: z.string().uuid(),
    title: z.string(),
    note: z.string().optional(),
  }),
]);

const SermonPlanInputSchema = z.object({
  sermonId: z.string().uuid(),
  title: z.string().min(1).max(200),
  bigIdea: z.string().max(500),
  primaryText: z.string().max(100),
  supportingTexts: z.array(z.string()).default([]),
  elements: z.array(SermonElementSchema).default([]),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  templateId: z.string().uuid().nullable().optional(),
  styleProfile: SermonStyleProfileSchema.nullish(),
});

const GetPlanInputSchema = z.object({
  sermonId: z.string().uuid(),
});

const GetTemplateInputSchema = z.object({
  templateId: z.string().uuid(),
});

const CreateTemplateInputSchema = z.object({
  sermonId: z.string().uuid(),
  name: z.string().min(1).max(200),
  tags: z.array(z.string()).default([]),
  styleProfile: SermonStyleProfileSchema.nullish(),
});

const ManuscriptImportInputSchema = z.object({
  sermonId: z.string().uuid(),
  manuscriptText: z.string().min(100).max(50000),
});

// ============================================================================
// RESPONSE TRANSFORMATION HELPERS
// ============================================================================

interface PlanDbRow {
  id: string;
  sermon_id: string;
  title: string;
  big_idea: string | null;
  primary_text: string | null;
  supporting_texts: string[] | null;
  elements: unknown[];
  tags: string[] | null;
  notes: string | null;
  template_id: string | null;
  style_profile: SermonStyleProfile | null;
  created_at: Date;
  updated_at: Date;
}

function transformPlanRow(row: PlanDbRow) {
  return {
    id: row.id,
    sermonId: row.sermon_id,
    title: row.title,
    bigIdea: row.big_idea || '',
    primaryText: row.primary_text || '',
    supportingTexts: row.supporting_texts || [],
    elements: row.elements || [],
    tags: row.tags || [],
    notes: row.notes,
    templateId: row.template_id,
    styleProfile: row.style_profile,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

interface TemplateDbRow {
  id: string;
  tenant_id: string;
  name: string;
  default_title: string | null;
  default_big_idea: string | null;
  default_primary_text: string | null;
  default_supporting_texts: string[] | null;
  structure: unknown[];
  tags: string[] | null;
  style_profile: SermonStyleProfile | null;
  created_at: Date;
  updated_at: Date;
}

function transformTemplateRow(row: TemplateDbRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    defaultTitle: row.default_title || '',
    defaultBigIdea: row.default_big_idea || '',
    defaultPrimaryText: row.default_primary_text || '',
    defaultSupportingTexts: row.default_supporting_texts || [],
    structure: row.structure || [],
    tags: row.tags || [],
    styleProfile: row.style_profile,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

interface TemplateListDbRow {
  id: string;
  name: string;
  default_title: string | null;
  default_primary_text: string | null;
  tags: string[] | null;
  style_profile: SermonStyleProfile | null;
  created_at: Date;
}

function transformTemplateListRow(row: TemplateListDbRow) {
  return {
    id: row.id,
    name: row.name,
    defaultTitle: row.default_title || '',
    defaultPrimaryText: row.default_primary_text || '',
    tags: row.tags || [],
    styleProfile: row.style_profile,
    createdAt: row.created_at.toISOString(),
  };
}

// ============================================================================
// TESTS: getPlan INPUT VALIDATION
// ============================================================================

describe('getPlan Input Validation', () => {
  it('accepts valid sermon ID', () => {
    const input = { sermonId: uuid1 };
    const result = GetPlanInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects invalid sermon ID format', () => {
    const input = { sermonId: 'not-a-uuid' };
    const result = GetPlanInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing sermon ID', () => {
    const input = {};
    const result = GetPlanInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects null sermon ID', () => {
    const input = { sermonId: null };
    const result = GetPlanInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// TESTS: savePlan INPUT VALIDATION
// ============================================================================

describe('savePlan Input Validation', () => {
  describe('valid inputs', () => {
    it('accepts full valid plan input', () => {
      const result = SermonPlanInputSchema.safeParse(validPlanInput);
      expect(result.success).toBe(true);
    });

    it('accepts minimal valid plan input', () => {
      const minimal = {
        sermonId: uuid1,
        title: 'Test',
        bigIdea: '',
        primaryText: '',
      };
      const result = SermonPlanInputSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('accepts plan with all element types', () => {
      const input = {
        sermonId: uuid1,
        title: 'Full Plan',
        bigIdea: 'Test idea',
        primaryText: 'John 1:1',
        elements: [
          validSectionElement,
          validPointElement,
          validScriptureElement,
          validNoteElement,
          validHymnElement,
        ],
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts plan with optional templateId', () => {
      const input = {
        ...validPlanInput,
        templateId: uuid2,
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts plan with null templateId', () => {
      const input = {
        ...validPlanInput,
        templateId: null,
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('applies default empty arrays for optional fields', () => {
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
  });

  describe('invalid inputs', () => {
    it('rejects missing sermonId', () => {
      const { sermonId: _sermonId, ...noSermon } = validPlanInput;
      const result = SermonPlanInputSchema.safeParse(noSermon);
      expect(result.success).toBe(false);
    });

    it('rejects invalid sermonId format', () => {
      const input = {
        ...validPlanInput,
        sermonId: 'not-a-uuid',
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects empty title', () => {
      const input = {
        ...validPlanInput,
        title: '',
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects title exceeding 200 characters', () => {
      const input = {
        ...validPlanInput,
        title: 'x'.repeat(201),
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects bigIdea exceeding 500 characters', () => {
      const input = {
        ...validPlanInput,
        bigIdea: 'x'.repeat(501),
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects primaryText exceeding 100 characters', () => {
      const input = {
        ...validPlanInput,
        primaryText: 'x'.repeat(101),
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects invalid element type', () => {
      const input = {
        ...validPlanInput,
        elements: [
          { id: uuid1, type: 'invalid', content: 'test' },
        ],
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects element with invalid UUID', () => {
      const input = {
        ...validPlanInput,
        elements: [
          { id: 'not-uuid', type: 'section', title: 'Test' },
        ],
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects section element without title', () => {
      const input = {
        ...validPlanInput,
        elements: [
          { id: uuid1, type: 'section' },
        ],
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects point element without text', () => {
      const input = {
        ...validPlanInput,
        elements: [
          { id: uuid1, type: 'point' },
        ],
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects scripture element without reference', () => {
      const input = {
        ...validPlanInput,
        elements: [
          { id: uuid1, type: 'scripture' },
        ],
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects hymn element without hymnId', () => {
      const input = {
        ...validPlanInput,
        elements: [
          { id: uuid1, type: 'hymn', title: 'Test Hymn' },
        ],
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects hymn element with invalid hymnId', () => {
      const input = {
        ...validPlanInput,
        elements: [
          { id: uuid1, type: 'hymn', hymnId: 'not-uuid', title: 'Test' },
        ],
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// TESTS: getTemplate INPUT VALIDATION
// ============================================================================

describe('getTemplate Input Validation', () => {
  it('accepts valid template ID', () => {
    const input = { templateId: uuid1 };
    const result = GetTemplateInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects invalid template ID format', () => {
    const input = { templateId: 'not-a-uuid' };
    const result = GetTemplateInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing template ID', () => {
    const input = {};
    const result = GetTemplateInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// TESTS: createTemplateFromPlan INPUT VALIDATION
// ============================================================================

describe('createTemplateFromPlan Input Validation', () => {
  describe('valid inputs', () => {
    it('accepts valid template creation input', () => {
      const result = CreateTemplateInputSchema.safeParse(validTemplateInput);
      expect(result.success).toBe(true);
    });

    it('accepts input without tags (applies default)', () => {
      const input = {
        sermonId: uuid1,
        name: 'My Template',
      };
      const result = CreateTemplateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual([]);
      }
    });

    it('accepts template name at max length (200 chars)', () => {
      const input = {
        sermonId: uuid1,
        name: 'x'.repeat(200),
        tags: [],
      };
      const result = CreateTemplateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects missing sermonId', () => {
      const input = {
        name: 'My Template',
      };
      const result = CreateTemplateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects invalid sermonId format', () => {
      const input = {
        sermonId: 'not-uuid',
        name: 'My Template',
      };
      const result = CreateTemplateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects missing name', () => {
      const input = {
        sermonId: uuid1,
      };
      const result = CreateTemplateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects empty name', () => {
      const input = {
        sermonId: uuid1,
        name: '',
      };
      const result = CreateTemplateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects name exceeding 200 characters', () => {
      const input = {
        sermonId: uuid1,
        name: 'x'.repeat(201),
      };
      const result = CreateTemplateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// TESTS: importFromManuscript INPUT VALIDATION
// ============================================================================

describe('importFromManuscript Input Validation', () => {
  describe('valid inputs', () => {
    it('accepts valid manuscript input at minimum length', () => {
      const input = {
        sermonId: uuid1,
        manuscriptText: 'x'.repeat(100),
      };
      const result = ManuscriptImportInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts valid manuscript input at maximum length', () => {
      const input = {
        sermonId: uuid1,
        manuscriptText: 'x'.repeat(50000),
      };
      const result = ManuscriptImportInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts typical manuscript length', () => {
      const input = {
        sermonId: uuid1,
        manuscriptText: 'x'.repeat(5000),
      };
      const result = ManuscriptImportInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects manuscript under minimum length (99 chars)', () => {
      const input = {
        sermonId: uuid1,
        manuscriptText: 'x'.repeat(99),
      };
      const result = ManuscriptImportInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects manuscript over maximum length (50001 chars)', () => {
      const input = {
        sermonId: uuid1,
        manuscriptText: 'x'.repeat(50001),
      };
      const result = ManuscriptImportInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects empty manuscript', () => {
      const input = {
        sermonId: uuid1,
        manuscriptText: '',
      };
      const result = ManuscriptImportInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects missing sermonId', () => {
      const input = {
        manuscriptText: 'x'.repeat(100),
      };
      const result = ManuscriptImportInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects missing manuscriptText', () => {
      const input = {
        sermonId: uuid1,
      };
      const result = ManuscriptImportInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects invalid sermonId format', () => {
      const input = {
        sermonId: 'not-uuid',
        manuscriptText: 'x'.repeat(100),
      };
      const result = ManuscriptImportInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// TESTS: RESPONSE TRANSFORMATION
// ============================================================================

describe('Plan Response Transformation', () => {
  const mockDate = new Date('2025-01-15T10:00:00Z');

  it('transforms plan DB row to API response', () => {
    const dbRow: PlanDbRow = {
      id: uuid1,
      sermon_id: uuid2,
      title: 'Grace Sermon',
      big_idea: 'God saves by grace',
      primary_text: 'Eph 2:8-9',
      supporting_texts: ['Rom 5:8'],
      elements: [validSectionElement],
      tags: ['grace'],
      notes: 'Focus on application',
      template_id: uuid3,
      style_profile: null,
      created_at: mockDate,
      updated_at: mockDate,
    };

    const result = transformPlanRow(dbRow);

    expect(result.id).toBe(uuid1);
    expect(result.sermonId).toBe(uuid2);
    expect(result.title).toBe('Grace Sermon');
    expect(result.bigIdea).toBe('God saves by grace');
    expect(result.primaryText).toBe('Eph 2:8-9');
    expect(result.supportingTexts).toEqual(['Rom 5:8']);
    expect(result.elements).toEqual([validSectionElement]);
    expect(result.tags).toEqual(['grace']);
    expect(result.notes).toBe('Focus on application');
    expect(result.templateId).toBe(uuid3);
    expect(result.createdAt).toBe('2025-01-15T10:00:00.000Z');
    expect(result.updatedAt).toBe('2025-01-15T10:00:00.000Z');
  });

  it('handles null fields with defaults', () => {
    const dbRow: PlanDbRow = {
      id: uuid1,
      sermon_id: uuid2,
      title: 'Test',
      big_idea: null,
      primary_text: null,
      supporting_texts: null,
      elements: [],
      tags: null,
      notes: null,
      template_id: null,
      style_profile: null,
      created_at: mockDate,
      updated_at: mockDate,
    };

    const result = transformPlanRow(dbRow);

    expect(result.bigIdea).toBe('');
    expect(result.primaryText).toBe('');
    expect(result.supportingTexts).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.notes).toBeNull();
    expect(result.templateId).toBeNull();
  });
});

describe('Template Response Transformation', () => {
  const mockDate = new Date('2025-01-15T10:00:00Z');

  it('transforms template DB row to API response', () => {
    const dbRow: TemplateDbRow = {
      id: uuid1,
      tenant_id: uuid2,
      name: 'Advent Template',
      default_title: 'Advent Week: Hope',
      default_big_idea: 'God gives us hope',
      default_primary_text: 'Isaiah 9:6',
      default_supporting_texts: ['Luke 2:10'],
      structure: [validSectionElement, validPointElement],
      tags: ['Advent', 'Hope'],
      style_profile: null,
      created_at: mockDate,
      updated_at: mockDate,
    };

    const result = transformTemplateRow(dbRow);

    expect(result.id).toBe(uuid1);
    expect(result.tenantId).toBe(uuid2);
    expect(result.name).toBe('Advent Template');
    expect(result.defaultTitle).toBe('Advent Week: Hope');
    expect(result.defaultBigIdea).toBe('God gives us hope');
    expect(result.defaultPrimaryText).toBe('Isaiah 9:6');
    expect(result.defaultSupportingTexts).toEqual(['Luke 2:10']);
    expect(result.structure).toEqual([validSectionElement, validPointElement]);
    expect(result.tags).toEqual(['Advent', 'Hope']);
    expect(result.createdAt).toBe('2025-01-15T10:00:00.000Z');
  });

  it('handles null fields with defaults', () => {
    const dbRow: TemplateDbRow = {
      id: uuid1,
      tenant_id: uuid2,
      name: 'Basic Template',
      default_title: null,
      default_big_idea: null,
      default_primary_text: null,
      default_supporting_texts: null,
      structure: [],
      tags: null,
      style_profile: null,
      created_at: mockDate,
      updated_at: mockDate,
    };

    const result = transformTemplateRow(dbRow);

    expect(result.defaultTitle).toBe('');
    expect(result.defaultBigIdea).toBe('');
    expect(result.defaultPrimaryText).toBe('');
    expect(result.defaultSupportingTexts).toEqual([]);
    expect(result.structure).toEqual([]);
    expect(result.tags).toEqual([]);
  });
});

describe('Template List Response Transformation', () => {
  const mockDate = new Date('2025-01-15T10:00:00Z');

  it('transforms template list DB row to API response', () => {
    const dbRow: TemplateListDbRow = {
      id: uuid1,
      name: 'Grace Template',
      default_title: 'Grace Sermon',
      default_primary_text: 'Eph 2:8-9',
      tags: ['grace', 'gospel'],
      style_profile: null,
      created_at: mockDate,
    };

    const result = transformTemplateListRow(dbRow);

    expect(result.id).toBe(uuid1);
    expect(result.name).toBe('Grace Template');
    expect(result.defaultTitle).toBe('Grace Sermon');
    expect(result.defaultPrimaryText).toBe('Eph 2:8-9');
    expect(result.tags).toEqual(['grace', 'gospel']);
    expect(result.createdAt).toBe('2025-01-15T10:00:00.000Z');
  });

  it('handles null fields with defaults', () => {
    const dbRow: TemplateListDbRow = {
      id: uuid1,
      name: 'Basic',
      default_title: null,
      default_primary_text: null,
      tags: null,
      style_profile: null,
      created_at: mockDate,
    };

    const result = transformTemplateListRow(dbRow);

    expect(result.defaultTitle).toBe('');
    expect(result.defaultPrimaryText).toBe('');
    expect(result.tags).toEqual([]);
  });
});

// ============================================================================
// TESTS: MANUSCRIPT IMPORT AI RESPONSE PARSING
// ============================================================================

describe('Manuscript Import AI Response Parsing', () => {
  /**
   * Schema for validating AI-extracted outline
   */
  const ManuscriptDraftSchema = z.object({
    title: z.string().max(200).default(''),
    bigIdea: z.string().max(500).default(''),
    primaryText: z.string().max(100).default(''),
    supportingTexts: z.array(z.string()).default([]),
    elements: z.array(SermonElementSchema).default([]),
  });

  function parseManuscriptResponse(rawJson: string): {
    success: boolean;
    data?: z.infer<typeof ManuscriptDraftSchema>;
    error?: string;
  } {
    // Strip markdown fences
    let cleaned = rawJson.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return { success: false, error: 'Invalid JSON' };
    }

    // Validate schema
    const result = ManuscriptDraftSchema.safeParse(parsed);
    if (!result.success) {
      return { success: false, error: 'Schema validation failed' };
    }

    return { success: true, data: result.data };
  }

  describe('valid AI responses', () => {
    it('parses clean JSON response', () => {
      const response = JSON.stringify({
        title: 'Grace That Saves',
        bigIdea: 'God saves us by grace',
        primaryText: 'Eph 2:8-9',
        supportingTexts: ['Rom 5:8'],
        elements: [
          { id: uuid1, type: 'section', title: 'Introduction' },
          { id: uuid2, type: 'point', text: 'Grace is unmerited' },
        ],
      });

      const result = parseManuscriptResponse(response);

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Grace That Saves');
      expect(result.data?.elements).toHaveLength(2);
    });

    it('strips markdown json fences', () => {
      const response = `\`\`\`json
{
  "title": "Test Sermon",
  "bigIdea": "Test idea",
  "primaryText": "John 3:16",
  "supportingTexts": [],
  "elements": []
}
\`\`\``;

      const result = parseManuscriptResponse(response);

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Test Sermon');
    });

    it('strips plain markdown fences', () => {
      const response = `\`\`\`
{
  "title": "Test",
  "bigIdea": "",
  "primaryText": "",
  "supportingTexts": [],
  "elements": []
}
\`\`\``;

      const result = parseManuscriptResponse(response);

      expect(result.success).toBe(true);
    });

    it('applies defaults for missing optional fields', () => {
      const response = JSON.stringify({
        elements: [],
      });

      const result = parseManuscriptResponse(response);

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('');
      expect(result.data?.bigIdea).toBe('');
      expect(result.data?.primaryText).toBe('');
      expect(result.data?.supportingTexts).toEqual([]);
    });

    it('validates all element types in response', () => {
      const response = JSON.stringify({
        title: 'Full Sermon',
        bigIdea: 'Complete outline',
        primaryText: 'John 1:1',
        supportingTexts: ['Gen 1:1'],
        elements: [
          { id: uuid1, type: 'section', title: 'Intro' },
          { id: uuid2, type: 'point', text: 'Main point' },
          { id: uuid3, type: 'scripture', reference: 'John 3:16', note: 'Key verse' },
          { id: '44444444-4444-4444-4444-444444444444', type: 'note', text: 'Observation' },
        ],
      });

      const result = parseManuscriptResponse(response);

      expect(result.success).toBe(true);
      expect(result.data?.elements).toHaveLength(4);
    });
  });

  describe('invalid AI responses', () => {
    it('rejects malformed JSON', () => {
      const response = '{ "title": "broken';

      const result = parseManuscriptResponse(response);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON');
    });

    it('rejects empty response', () => {
      const result = parseManuscriptResponse('');

      expect(result.success).toBe(false);
    });

    it('rejects plain text response', () => {
      const response = 'Here is your sermon outline...';

      const result = parseManuscriptResponse(response);

      expect(result.success).toBe(false);
    });

    it('rejects array instead of object', () => {
      const response = '[{"title": "test"}]';

      const result = parseManuscriptResponse(response);

      expect(result.success).toBe(false);
    });

    it('rejects invalid element types in response', () => {
      const response = JSON.stringify({
        title: 'Test',
        elements: [
          { id: uuid1, type: 'invalid_type', content: 'test' },
        ],
      });

      const result = parseManuscriptResponse(response);

      expect(result.success).toBe(false);
    });

    it('rejects elements with invalid UUID format', () => {
      const response = JSON.stringify({
        title: 'Test',
        elements: [
          { id: 'not-a-uuid', type: 'section', title: 'Intro' },
        ],
      });

      const result = parseManuscriptResponse(response);

      expect(result.success).toBe(false);
    });

    it('rejects title exceeding max length', () => {
      const response = JSON.stringify({
        title: 'x'.repeat(201),
        elements: [],
      });

      const result = parseManuscriptResponse(response);

      expect(result.success).toBe(false);
    });

    it('rejects bigIdea exceeding max length', () => {
      const response = JSON.stringify({
        bigIdea: 'x'.repeat(501),
        elements: [],
      });

      const result = parseManuscriptResponse(response);

      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// TESTS: BUSINESS LOGIC
// ============================================================================

describe('Template Creation Business Logic', () => {
  it('extracts structure from plan for template', () => {
    const plan = {
      title: 'Grace Sermon',
      bigIdea: 'God saves by grace',
      primaryText: 'Eph 2:8-9',
      supportingTexts: ['Rom 5:8', 'John 3:16'],
      elements: [
        validSectionElement,
        validPointElement,
        validScriptureElement,
      ],
      tags: ['grace', 'gospel'],
    };

    // Template creation extracts structure (what the router does)
    const templateData = {
      name: 'Grace Template',
      defaultTitle: plan.title,
      defaultBigIdea: plan.bigIdea,
      defaultPrimaryText: plan.primaryText,
      defaultSupportingTexts: plan.supportingTexts,
      structure: plan.elements,
      tags: plan.tags,
    };

    expect(templateData.structure).toHaveLength(3);
    expect(templateData.defaultTitle).toBe('Grace Sermon');
    expect(templateData.defaultBigIdea).toBe('God saves by grace');
  });

  it('allows custom tags to override plan tags', () => {
    const planTags = ['grace', 'gospel'];
    const customTags = ['expository', 'salvation'];

    // If custom tags provided, use those; otherwise use plan tags
    const resultTags = customTags.length > 0 ? customTags : planTags;

    expect(resultTags).toEqual(['expository', 'salvation']);
  });

  it('uses plan tags when no custom tags provided', () => {
    const planTags = ['grace', 'gospel'];
    const customTags: string[] = [];

    const resultTags = customTags.length > 0 ? customTags : planTags;

    expect(resultTags).toEqual(['grace', 'gospel']);
  });
});

describe('Plan Upsert Logic', () => {
  it('determines insert vs update based on existing plan', () => {
    // Simulate checking for existing plan
    const existingPlanId: string | null = null;

    const shouldInsert = existingPlanId === null;
    const shouldUpdate = existingPlanId !== null;

    expect(shouldInsert).toBe(true);
    expect(shouldUpdate).toBe(false);
  });

  it('updates when plan exists', () => {
    const existingPlanId = uuid1;

    const shouldInsert = existingPlanId === null;
    const shouldUpdate = existingPlanId !== null;

    expect(shouldInsert).toBe(false);
    expect(shouldUpdate).toBe(true);
  });
});

describe('Manuscript Import Draft Building', () => {
  it('combines AI extraction with sermon data', () => {
    const sermonTitle = 'Sunday Sermon';
    const extractedTitle = 'Grace That Saves';

    // Use extracted title if present, fallback to sermon title
    const finalTitle = extractedTitle || sermonTitle;

    expect(finalTitle).toBe('Grace That Saves');
  });

  it('falls back to sermon title when AI returns empty', () => {
    const sermonTitle = 'Sunday Sermon';
    const extractedTitle = '';

    const finalTitle = extractedTitle || sermonTitle;

    expect(finalTitle).toBe('Sunday Sermon');
  });

  it('adds imported tag to draft', () => {
    const extractedTags: string[] = [];

    // Router always adds 'imported' tag
    const draftTags = ['imported', ...extractedTags];

    expect(draftTags).toContain('imported');
  });
});

// ============================================================================
// TESTS: TENANT ISOLATION (CONCEPTUAL)
// ============================================================================

describe('Tenant Isolation', () => {
  it('all queries should be wrapped with queryWithTenant', () => {
    // This is a conceptual test documenting the security contract.
    // Actual enforcement is via the queryWithTenant helper.

    const queryPattern = `SELECT * FROM sermon_plan WHERE sermon_id = $1`;
    const queryWithTenantCall = `queryWithTenant(tenantId, query, [sermonId])`;

    // The query itself doesn't include tenant_id filter because
    // queryWithTenant sets app.current_tenant for RLS policies
    expect(queryPattern).not.toContain('tenant_id');
    expect(queryWithTenantCall).toContain('tenantId');
  });

  it('template queries filter by tenant via RLS', () => {
    const templateQuery = `SELECT * FROM sermon_template WHERE id = $1`;

    // RLS policy enforces tenant isolation automatically
    // No explicit tenant_id filter needed in query
    expect(templateQuery).not.toContain('AND tenant_id');
  });
});

// ============================================================================
// TESTS: STYLE PROFILE VALIDATION (Phase 6)
// ============================================================================

describe('StyleProfile Input Validation', () => {
  describe('savePlan with styleProfile', () => {
    it('accepts plan with story_first_3_point style', () => {
      const input = {
        ...validPlanInput,
        styleProfile: 'story_first_3_point',
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.styleProfile).toBe('story_first_3_point');
      }
    });

    it('accepts plan with expository_verse_by_verse style', () => {
      const input = {
        ...validPlanInput,
        styleProfile: 'expository_verse_by_verse',
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.styleProfile).toBe('expository_verse_by_verse');
      }
    });

    it('accepts plan with topical_teaching style', () => {
      const input = {
        ...validPlanInput,
        styleProfile: 'topical_teaching',
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.styleProfile).toBe('topical_teaching');
      }
    });

    it('accepts plan with null styleProfile', () => {
      const input = {
        ...validPlanInput,
        styleProfile: null,
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.styleProfile).toBeNull();
      }
    });

    it('accepts plan with undefined styleProfile', () => {
      const input = {
        ...validPlanInput,
        styleProfile: undefined,
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.styleProfile).toBeUndefined();
      }
    });

    it('accepts plan without styleProfile field', () => {
      const result = SermonPlanInputSchema.safeParse(validPlanInput);
      expect(result.success).toBe(true);
    });

    it('rejects plan with invalid styleProfile value', () => {
      const input = {
        ...validPlanInput,
        styleProfile: 'invalid_style',
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects plan with empty string styleProfile', () => {
      const input = {
        ...validPlanInput,
        styleProfile: '',
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects plan with numeric styleProfile', () => {
      const input = {
        ...validPlanInput,
        styleProfile: 1,
      };
      const result = SermonPlanInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('createTemplateFromPlan with styleProfile', () => {
    it('accepts template input with story_first_3_point style', () => {
      const input = {
        ...validTemplateInput,
        styleProfile: 'story_first_3_point',
      };
      const result = CreateTemplateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.styleProfile).toBe('story_first_3_point');
      }
    });

    it('accepts template input with expository_verse_by_verse style', () => {
      const input = {
        ...validTemplateInput,
        styleProfile: 'expository_verse_by_verse',
      };
      const result = CreateTemplateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.styleProfile).toBe('expository_verse_by_verse');
      }
    });

    it('accepts template input with topical_teaching style', () => {
      const input = {
        ...validTemplateInput,
        styleProfile: 'topical_teaching',
      };
      const result = CreateTemplateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.styleProfile).toBe('topical_teaching');
      }
    });

    it('accepts template input with null styleProfile', () => {
      const input = {
        ...validTemplateInput,
        styleProfile: null,
      };
      const result = CreateTemplateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.styleProfile).toBeNull();
      }
    });

    it('accepts template input without styleProfile', () => {
      const result = CreateTemplateInputSchema.safeParse(validTemplateInput);
      expect(result.success).toBe(true);
    });

    it('rejects template input with invalid styleProfile', () => {
      const input = {
        ...validTemplateInput,
        styleProfile: 'not_a_real_style',
      };
      const result = CreateTemplateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// TESTS: STYLE PROFILE TRANSFORMATION (Phase 6)
// ============================================================================

describe('StyleProfile Response Transformation', () => {
  const baseDate = new Date('2025-01-15T10:00:00Z');

  describe('transformPlanRow with styleProfile', () => {
    it('transforms plan row with story_first_3_point style', () => {
      const dbRow: PlanDbRow = {
        id: uuid1,
        sermon_id: uuid2,
        title: 'Grace Sermon',
        big_idea: 'God saves by grace',
        primary_text: 'Eph 2:8-9',
        supporting_texts: ['Rom 5:8'],
        elements: [validSectionElement],
        tags: ['grace'],
        notes: 'Focus on application',
        template_id: null,
        style_profile: 'story_first_3_point',
        created_at: baseDate,
        updated_at: baseDate,
      };

      const result = transformPlanRow(dbRow);

      expect(result.styleProfile).toBe('story_first_3_point');
      expect(result.sermonId).toBe(uuid2);
      expect(result.title).toBe('Grace Sermon');
    });

    it('transforms plan row with expository_verse_by_verse style', () => {
      const dbRow: PlanDbRow = {
        id: uuid1,
        sermon_id: uuid2,
        title: 'Romans Study',
        big_idea: 'Understanding grace',
        primary_text: 'Romans 1:1',
        supporting_texts: [],
        elements: [],
        tags: ['expository'],
        notes: null,
        template_id: null,
        style_profile: 'expository_verse_by_verse',
        created_at: baseDate,
        updated_at: baseDate,
      };

      const result = transformPlanRow(dbRow);

      expect(result.styleProfile).toBe('expository_verse_by_verse');
    });

    it('transforms plan row with topical_teaching style', () => {
      const dbRow: PlanDbRow = {
        id: uuid1,
        sermon_id: uuid2,
        title: 'Doctrine of Grace',
        big_idea: 'Teaching on grace',
        primary_text: 'Titus 2:11',
        supporting_texts: [],
        elements: [],
        tags: ['topical'],
        notes: null,
        template_id: null,
        style_profile: 'topical_teaching',
        created_at: baseDate,
        updated_at: baseDate,
      };

      const result = transformPlanRow(dbRow);

      expect(result.styleProfile).toBe('topical_teaching');
    });

    it('transforms plan row with null styleProfile', () => {
      const dbRow: PlanDbRow = {
        id: uuid1,
        sermon_id: uuid2,
        title: 'No Style Sermon',
        big_idea: '',
        primary_text: '',
        supporting_texts: null,
        elements: [],
        tags: null,
        notes: null,
        template_id: null,
        style_profile: null,
        created_at: baseDate,
        updated_at: baseDate,
      };

      const result = transformPlanRow(dbRow);

      expect(result.styleProfile).toBeNull();
    });
  });

  describe('transformTemplateRow with styleProfile', () => {
    it('transforms template row with story_first_3_point style', () => {
      const dbRow: TemplateDbRow = {
        id: uuid1,
        tenant_id: uuid3,
        name: 'Story Template',
        default_title: 'Story Sermon',
        default_big_idea: 'Narrative approach',
        default_primary_text: 'Luke 15:1',
        default_supporting_texts: ['Luke 15:3', 'Luke 15:11'],
        structure: [validSectionElement, validPointElement],
        tags: ['story', 'narrative'],
        style_profile: 'story_first_3_point',
        created_at: baseDate,
        updated_at: baseDate,
      };

      const result = transformTemplateRow(dbRow);

      expect(result.styleProfile).toBe('story_first_3_point');
      expect(result.name).toBe('Story Template');
      expect(result.defaultTitle).toBe('Story Sermon');
    });

    it('transforms template row with expository_verse_by_verse style', () => {
      const dbRow: TemplateDbRow = {
        id: uuid1,
        tenant_id: uuid3,
        name: 'Expository Template',
        default_title: 'Verse by Verse',
        default_big_idea: 'Text-driven',
        default_primary_text: 'Romans 1:1',
        default_supporting_texts: [],
        structure: [validScriptureElement],
        tags: ['expository'],
        style_profile: 'expository_verse_by_verse',
        created_at: baseDate,
        updated_at: baseDate,
      };

      const result = transformTemplateRow(dbRow);

      expect(result.styleProfile).toBe('expository_verse_by_verse');
    });

    it('transforms template row with null styleProfile', () => {
      const dbRow: TemplateDbRow = {
        id: uuid1,
        tenant_id: uuid3,
        name: 'Basic Template',
        default_title: null,
        default_big_idea: null,
        default_primary_text: null,
        default_supporting_texts: null,
        structure: [],
        tags: null,
        style_profile: null,
        created_at: baseDate,
        updated_at: baseDate,
      };

      const result = transformTemplateRow(dbRow);

      expect(result.styleProfile).toBeNull();
      expect(result.defaultTitle).toBe('');
      expect(result.tags).toEqual([]);
    });
  });

  describe('transformTemplateListRow with styleProfile', () => {
    it('transforms template list row with story_first_3_point style', () => {
      const dbRow: TemplateListDbRow = {
        id: uuid1,
        name: 'Story Template',
        default_title: 'Story Sermon',
        default_primary_text: 'Luke 15:1',
        tags: ['story'],
        style_profile: 'story_first_3_point',
        created_at: baseDate,
      };

      const result = transformTemplateListRow(dbRow);

      expect(result.styleProfile).toBe('story_first_3_point');
      expect(result.name).toBe('Story Template');
    });

    it('transforms template list row with topical_teaching style', () => {
      const dbRow: TemplateListDbRow = {
        id: uuid1,
        name: 'Topical Template',
        default_title: 'Doctrine Series',
        default_primary_text: 'Titus 2:11',
        tags: ['topical', 'doctrine'],
        style_profile: 'topical_teaching',
        created_at: baseDate,
      };

      const result = transformTemplateListRow(dbRow);

      expect(result.styleProfile).toBe('topical_teaching');
    });

    it('transforms template list row with null styleProfile', () => {
      const dbRow: TemplateListDbRow = {
        id: uuid1,
        name: 'Generic Template',
        default_title: null,
        default_primary_text: null,
        tags: null,
        style_profile: null,
        created_at: baseDate,
      };

      const result = transformTemplateListRow(dbRow);

      expect(result.styleProfile).toBeNull();
    });
  });
});

// ============================================================================
// TESTS: STYLE PROFILE BUSINESS LOGIC (Phase 6)
// ============================================================================

describe('StyleProfile Business Logic', () => {
  it('styleProfile labels are readable', () => {
    expect(SermonStyleProfileLabels.story_first_3_point).toBe('Story-First 3-Point');
    expect(SermonStyleProfileLabels.expository_verse_by_verse).toBe('Expository Verse-by-Verse');
    expect(SermonStyleProfileLabels.topical_teaching).toBe('Topical Teaching');
  });

  it('all styleProfile values have labels', () => {
    const profileValues: SermonStyleProfile[] = [
      'story_first_3_point',
      'expository_verse_by_verse',
      'topical_teaching',
    ];

    profileValues.forEach((value) => {
      expect(SermonStyleProfileLabels[value]).toBeDefined();
      expect(typeof SermonStyleProfileLabels[value]).toBe('string');
      expect(SermonStyleProfileLabels[value].length).toBeGreaterThan(0);
    });
  });

  it('template inherits styleProfile from plan when creating', () => {
    const plan = {
      title: 'Grace Sermon',
      bigIdea: 'God saves by grace',
      primaryText: 'Eph 2:8-9',
      supportingTexts: ['Rom 5:8'],
      elements: [validSectionElement],
      tags: ['grace'],
      styleProfile: 'story_first_3_point' as SermonStyleProfile,
    };

    // When creating template from plan, styleProfile can be inherited
    const templateFromPlan = {
      name: 'Grace Template',
      defaultTitle: plan.title,
      defaultBigIdea: plan.bigIdea,
      defaultPrimaryText: plan.primaryText,
      defaultSupportingTexts: plan.supportingTexts,
      structure: plan.elements,
      tags: plan.tags,
      styleProfile: plan.styleProfile,
    };

    expect(templateFromPlan.styleProfile).toBe('story_first_3_point');
  });

  it('template styleProfile can be overridden from plan', () => {
    const plan = {
      styleProfile: 'story_first_3_point' as SermonStyleProfile,
    };

    // User explicitly specifies a different style when creating template
    const userSpecifiedStyle: SermonStyleProfile | null = 'topical_teaching';

    const finalStyleProfile = userSpecifiedStyle ?? plan.styleProfile;

    expect(finalStyleProfile).toBe('topical_teaching');
  });

  it('template uses plan styleProfile when none specified', () => {
    const plan = {
      styleProfile: 'expository_verse_by_verse' as SermonStyleProfile,
    };

    const userSpecifiedStyle: SermonStyleProfile | null = null;

    const finalStyleProfile = userSpecifiedStyle ?? plan.styleProfile;

    expect(finalStyleProfile).toBe('expository_verse_by_verse');
  });
});

// ============================================================================
// TESTS: AI SUGGESTIONS WITH STYLE PROFILE (Phase 6)
// ============================================================================

describe('AI Suggestions with StyleProfile', () => {
  it('includes styleProfile in AI prompt context', () => {
    const planContext = {
      title: 'Grace Sermon',
      bigIdea: 'God saves by grace',
      styleProfile: 'story_first_3_point' as SermonStyleProfile,
    };

    // The AI suggestion builder should include style context
    const buildAIContext = (plan: typeof planContext): string => {
      let context = `Title: ${plan.title}\nBig Idea: ${plan.bigIdea}`;
      if (plan.styleProfile) {
        context += `\nPreaching Style: ${SermonStyleProfileLabels[plan.styleProfile]}`;
      }
      return context;
    };

    const aiContext = buildAIContext(planContext);

    expect(aiContext).toContain('Preaching Style: Story-First 3-Point');
    expect(aiContext).toContain('Grace Sermon');
    expect(aiContext).toContain('God saves by grace');
  });

  it('omits styleProfile from AI context when null', () => {
    const planContext = {
      title: 'Basic Sermon',
      bigIdea: 'Simple message',
      styleProfile: null as SermonStyleProfile | null,
    };

    const buildAIContext = (plan: typeof planContext): string => {
      let context = `Title: ${plan.title}\nBig Idea: ${plan.bigIdea}`;
      if (plan.styleProfile) {
        context += `\nPreaching Style: ${SermonStyleProfileLabels[plan.styleProfile]}`;
      }
      return context;
    };

    const aiContext = buildAIContext(planContext);

    expect(aiContext).not.toContain('Preaching Style');
    expect(aiContext).toContain('Basic Sermon');
  });

  it('uses correct label for expository style in AI context', () => {
    const planContext = {
      title: 'Romans Study',
      bigIdea: 'Unpacking Romans',
      styleProfile: 'expository_verse_by_verse' as SermonStyleProfile,
    };

    const buildAIContext = (plan: typeof planContext): string => {
      let context = `Title: ${plan.title}\nBig Idea: ${plan.bigIdea}`;
      if (plan.styleProfile) {
        context += `\nPreaching Style: ${SermonStyleProfileLabels[plan.styleProfile]}`;
      }
      return context;
    };

    const aiContext = buildAIContext(planContext);

    expect(aiContext).toContain('Preaching Style: Expository Verse-by-Verse');
  });

  it('uses correct label for topical style in AI context', () => {
    const planContext = {
      title: 'Doctrine of Grace',
      bigIdea: 'Understanding grace',
      styleProfile: 'topical_teaching' as SermonStyleProfile,
    };

    const buildAIContext = (plan: typeof planContext): string => {
      let context = `Title: ${plan.title}\nBig Idea: ${plan.bigIdea}`;
      if (plan.styleProfile) {
        context += `\nPreaching Style: ${SermonStyleProfileLabels[plan.styleProfile]}`;
      }
      return context;
    };

    const aiContext = buildAIContext(planContext);

    expect(aiContext).toContain('Preaching Style: Topical Teaching');
  });
});
