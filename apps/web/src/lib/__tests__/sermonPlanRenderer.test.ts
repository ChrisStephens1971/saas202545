/**
 * SermonPlan Renderer Tests - Phase 9
 *
 * Tests for the shared rendering logic used by Preach Mode and Print views
 * when displaying SermonPlan elements.
 *
 * Tested functionality:
 * - Element display text extraction
 * - Element note extraction
 * - Block construction from SermonPlan
 * - Print filtering
 * - Point numbering within sections
 * - Style definitions for all element types
 */

import { describe, it, expect } from '@jest/globals';
import type { SermonElement, SermonPlan } from '@elder-first/types';
import {
  PREACH_MODE_STYLES,
  PRINT_STYLES,
  ELEMENT_COLORS,
  getElementDisplayText,
  getElementNote,
  getElementTypeLabel,
  buildPreachModeBlocks,
  filterPrintableElements,
  countSectionsUpTo,
  getPointNumberInSection,
  hasPlanContent,
  formatSupportingTexts,
} from '../sermonPlanRenderer';

// Test UUIDs
const uuid1 = '11111111-1111-1111-1111-111111111111';
const uuid2 = '22222222-2222-2222-2222-222222222222';
const uuid3 = '33333333-3333-3333-3333-333333333333';
const uuid4 = '44444444-4444-4444-4444-444444444444';
const uuid5 = '55555555-5555-5555-5555-555555555555';
const uuid6 = '66666666-6666-6666-6666-666666666666';

// Helper to create valid SermonPlan objects with required defaults
const createSermonPlan = (overrides: Partial<SermonPlan> = {}): SermonPlan => ({
  id: uuid1,
  sermonId: uuid2,
  title: 'Test Plan',
  bigIdea: 'Test big idea',
  primaryText: 'John 3:16',
  supportingTexts: [],
  elements: [],
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// =============================================================================
// ELEMENT DISPLAY TEXT EXTRACTION
// =============================================================================

describe('getElementDisplayText', () => {
  it('extracts title from section element', () => {
    const element: SermonElement = {
      id: uuid1,
      type: 'section',
      title: 'Introduction',
    };
    expect(getElementDisplayText(element)).toBe('Introduction');
  });

  it('extracts text from point element', () => {
    const element: SermonElement = {
      id: uuid1,
      type: 'point',
      text: 'God loves the world',
    };
    expect(getElementDisplayText(element)).toBe('God loves the world');
  });

  it('extracts text from note element', () => {
    const element: SermonElement = {
      id: uuid1,
      type: 'note',
      text: 'Remember to pause here',
    };
    expect(getElementDisplayText(element)).toBe('Remember to pause here');
  });

  it('extracts reference from scripture element', () => {
    const element: SermonElement = {
      id: uuid1,
      type: 'scripture',
      reference: 'John 3:16',
    };
    expect(getElementDisplayText(element)).toBe('John 3:16');
  });

  it('extracts title from hymn element', () => {
    const element: SermonElement = {
      id: uuid1,
      type: 'hymn',
      hymnId: 'hymn-123',
      title: 'Amazing Grace',
    };
    expect(getElementDisplayText(element)).toBe('Amazing Grace');
  });

  it('extracts title from illustration element', () => {
    const element: SermonElement = {
      id: uuid1,
      type: 'illustration',
      title: 'The Prodigal Son Story',
    };
    expect(getElementDisplayText(element)).toBe('The Prodigal Son Story');
  });
});

// =============================================================================
// ELEMENT NOTE EXTRACTION
// =============================================================================

describe('getElementNote', () => {
  it('returns note from scripture element', () => {
    const element: SermonElement = {
      id: uuid1,
      type: 'scripture',
      reference: 'John 3:16',
      note: 'Key verse for salvation message',
    };
    expect(getElementNote(element)).toBe('Key verse for salvation message');
  });

  it('returns note from hymn element', () => {
    const element: SermonElement = {
      id: uuid1,
      type: 'hymn',
      hymnId: 'hymn-123',
      title: 'Amazing Grace',
      note: 'All verses',
    };
    expect(getElementNote(element)).toBe('All verses');
  });

  it('returns note from illustration element', () => {
    const element: SermonElement = {
      id: uuid1,
      type: 'illustration',
      title: 'Story Title',
      note: 'Emphasize the father\'s reaction',
    };
    expect(getElementNote(element)).toBe('Emphasize the father\'s reaction');
  });

  it('returns undefined for section element', () => {
    const element: SermonElement = {
      id: uuid1,
      type: 'section',
      title: 'Introduction',
    };
    expect(getElementNote(element)).toBeUndefined();
  });

  it('returns undefined for point element', () => {
    const element: SermonElement = {
      id: uuid1,
      type: 'point',
      text: 'Main point',
    };
    expect(getElementNote(element)).toBeUndefined();
  });

  it('returns undefined for note element', () => {
    const element: SermonElement = {
      id: uuid1,
      type: 'note',
      text: 'Note text',
    };
    expect(getElementNote(element)).toBeUndefined();
  });

  it('returns undefined when note is not present', () => {
    const element: SermonElement = {
      id: uuid1,
      type: 'scripture',
      reference: 'John 3:16',
    };
    expect(getElementNote(element)).toBeUndefined();
  });
});

// =============================================================================
// ELEMENT TYPE LABELS
// =============================================================================

describe('getElementTypeLabel', () => {
  it('returns Section for section type', () => {
    expect(getElementTypeLabel('section')).toBe('Section');
  });

  it('returns Point for point type', () => {
    expect(getElementTypeLabel('point')).toBe('Point');
  });

  it('returns Note for note type', () => {
    expect(getElementTypeLabel('note')).toBe('Note');
  });

  it('returns Scripture for scripture type', () => {
    expect(getElementTypeLabel('scripture')).toBe('Scripture');
  });

  it('returns Hymn for hymn type', () => {
    expect(getElementTypeLabel('hymn')).toBe('Hymn');
  });

  it('returns Illustration for illustration type', () => {
    expect(getElementTypeLabel('illustration')).toBe('Illustration');
  });
});

// =============================================================================
// BUILD PREACH MODE BLOCKS
// =============================================================================

describe('buildPreachModeBlocks', () => {
  const baseSermmon = {
    title: 'Test Sermon',
    primary_scripture: 'John 3:16',
    manuscript: 'Full manuscript text...',
  };

  it('builds blocks from SermonPlan with elements', () => {
    const plan = createSermonPlan({
      title: 'Plan Title',
      bigIdea: 'God loves us',
      primaryText: 'John 3:16-17',
      elements: [
        { id: uuid3, type: 'section', title: 'Introduction' },
        { id: uuid4, type: 'point', text: 'God loves the world' },
      ],
    });

    const blocks = buildPreachModeBlocks(baseSermmon, plan);

    expect(blocks.length).toBe(4); // header + 2 elements + conclusion
    expect(blocks[0].type).toBe('header');
    expect(blocks[1].type).toBe('element');
    expect(blocks[2].type).toBe('element');
    expect(blocks[3].type).toBe('conclusion');
  });

  it('uses plan title in header when available', () => {
    const plan = createSermonPlan({
      title: 'Plan Title Override',
      elements: [{ id: uuid3, type: 'point', text: 'Point 1' }],
    });

    const blocks = buildPreachModeBlocks(baseSermmon, plan);
    const header = blocks[0] as { type: 'header'; content: { title: string } };

    expect(header.content.title).toBe('Plan Title Override');
  });

  it('uses plan primaryText in header when available', () => {
    const plan = createSermonPlan({
      title: 'Plan Title',
      primaryText: 'Romans 8:28',
      elements: [{ id: uuid3, type: 'point', text: 'Point 1' }],
    });

    const blocks = buildPreachModeBlocks(baseSermmon, plan);
    const header = blocks[0] as { type: 'header'; content: { scripture: string } };

    expect(header.content.scripture).toBe('Romans 8:28');
  });

  it('includes bigIdea in header content', () => {
    const plan = createSermonPlan({
      title: 'Plan Title',
      bigIdea: 'The Big Idea',
      elements: [{ id: uuid3, type: 'point', text: 'Point 1' }],
    });

    const blocks = buildPreachModeBlocks(baseSermmon, plan);
    const header = blocks[0] as { type: 'header'; content: { bigIdea: string } };

    expect(header.content.bigIdea).toBe('The Big Idea');
  });

  it('includes notes in conclusion', () => {
    const plan = createSermonPlan({
      title: 'Plan Title',
      notes: 'Closing notes here',
      elements: [{ id: uuid3, type: 'point', text: 'Point 1' }],
    });

    const blocks = buildPreachModeBlocks(baseSermmon, plan);
    const conclusion = blocks[blocks.length - 1] as { type: 'conclusion'; content: { notes: string } };

    expect(conclusion.content.notes).toBe('Closing notes here');
  });

  it('returns fallback block when plan is null', () => {
    const blocks = buildPreachModeBlocks(baseSermmon, null);

    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('fallback');
  });

  it('returns fallback block when plan has no elements', () => {
    const plan = createSermonPlan({
      title: 'Empty Plan',
      elements: [],
    });

    const blocks = buildPreachModeBlocks(baseSermmon, plan);

    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('fallback');
  });

  it('fallback includes sermon manuscript', () => {
    const blocks = buildPreachModeBlocks(baseSermmon, null);
    const fallback = blocks[0] as { type: 'fallback'; content: { manuscript: string } };

    expect(fallback.content.manuscript).toBe('Full manuscript text...');
  });

  it('element blocks include element data and index', () => {
    const plan = createSermonPlan({
      title: 'Plan',
      elements: [
        { id: uuid3, type: 'section', title: 'Intro' },
        { id: uuid4, type: 'point', text: 'Main point' },
      ],
    });

    const blocks = buildPreachModeBlocks(baseSermmon, plan);
    const elementBlock = blocks[1] as { type: 'element'; element: SermonElement; index: number };

    expect(elementBlock.element.type).toBe('section');
    expect(elementBlock.index).toBe(0);
  });
});

// =============================================================================
// PRINT FILTERING
// =============================================================================

describe('filterPrintableElements', () => {
  it('returns all elements (no filtering by default)', () => {
    const elements: SermonElement[] = [
      { id: uuid1, type: 'section', title: 'Intro' },
      { id: uuid2, type: 'point', text: 'Point 1' },
      { id: uuid3, type: 'note', text: 'Note' },
    ];

    const result = filterPrintableElements(elements);

    expect(result.length).toBe(3);
  });

  it('returns empty array for empty input', () => {
    const result = filterPrintableElements([]);
    expect(result.length).toBe(0);
  });
});

// =============================================================================
// SECTION COUNTING
// =============================================================================

describe('countSectionsUpTo', () => {
  const elements: SermonElement[] = [
    { id: uuid1, type: 'section', title: 'Section 1' },
    { id: uuid2, type: 'point', text: 'Point 1' },
    { id: uuid3, type: 'section', title: 'Section 2' },
    { id: uuid4, type: 'point', text: 'Point 2' },
    { id: uuid5, type: 'section', title: 'Section 3' },
  ];

  it('counts one section at first section', () => {
    expect(countSectionsUpTo(elements, 0)).toBe(1);
  });

  it('counts one section at first point', () => {
    expect(countSectionsUpTo(elements, 1)).toBe(1);
  });

  it('counts two sections at second section', () => {
    expect(countSectionsUpTo(elements, 2)).toBe(2);
  });

  it('counts three sections at third section', () => {
    expect(countSectionsUpTo(elements, 4)).toBe(3);
  });
});

// =============================================================================
// POINT NUMBERING WITHIN SECTIONS
// =============================================================================

describe('getPointNumberInSection', () => {
  const elements: SermonElement[] = [
    { id: uuid1, type: 'section', title: 'Section 1' },
    { id: uuid2, type: 'point', text: 'Point 1.1' },
    { id: uuid3, type: 'point', text: 'Point 1.2' },
    { id: uuid4, type: 'section', title: 'Section 2' },
    { id: uuid5, type: 'point', text: 'Point 2.1' },
    { id: uuid6, type: 'note', text: 'Note' },
  ];

  it('returns 1 for first point in first section', () => {
    expect(getPointNumberInSection(elements, 1)).toBe(1);
  });

  it('returns 2 for second point in first section', () => {
    expect(getPointNumberInSection(elements, 2)).toBe(2);
  });

  it('returns 1 for first point in second section', () => {
    expect(getPointNumberInSection(elements, 4)).toBe(1);
  });

  it('handles points before any section', () => {
    const elementsNoInitialSection: SermonElement[] = [
      { id: uuid1, type: 'point', text: 'Intro point' },
      { id: uuid2, type: 'section', title: 'Section 1' },
    ];

    expect(getPointNumberInSection(elementsNoInitialSection, 0)).toBe(1);
  });
});

// =============================================================================
// PLAN CONTENT DETECTION
// =============================================================================

describe('hasPlanContent', () => {
  it('returns false for null plan', () => {
    expect(hasPlanContent(null)).toBe(false);
  });

  it('returns true when plan has elements', () => {
    const plan = createSermonPlan({
      title: 'Plan',
      bigIdea: '', // Must clear these to test elements-only
      primaryText: '',
      elements: [{ id: uuid3, type: 'point', text: 'Point' }],
    });

    expect(hasPlanContent(plan)).toBe(true);
  });

  it('returns true when plan has bigIdea', () => {
    const plan = createSermonPlan({
      title: 'Plan',
      bigIdea: 'Big idea here',
      primaryText: '',
      elements: [],
    });

    expect(hasPlanContent(plan)).toBe(true);
  });

  it('returns true when plan has primaryText', () => {
    const plan = createSermonPlan({
      title: 'Plan',
      bigIdea: '',
      primaryText: 'John 3:16',
      elements: [],
    });

    expect(hasPlanContent(plan)).toBe(true);
  });

  it('returns true when plan has notes', () => {
    const plan = createSermonPlan({
      title: 'Plan',
      bigIdea: '',
      primaryText: '',
      notes: 'Some notes',
      elements: [],
    });

    expect(hasPlanContent(plan)).toBe(true);
  });

  it('returns false when plan has only title', () => {
    const plan = createSermonPlan({
      title: 'Empty Plan',
      bigIdea: '',
      primaryText: '',
      elements: [],
    });

    expect(hasPlanContent(plan)).toBe(false);
  });
});

// =============================================================================
// SUPPORTING TEXTS FORMATTING
// =============================================================================

describe('formatSupportingTexts', () => {
  it('formats multiple texts as comma-separated', () => {
    const plan = createSermonPlan({
      title: 'Plan',
      supportingTexts: ['Romans 8:28', 'Psalm 23', 'John 14:6'],
    });

    expect(formatSupportingTexts(plan)).toBe('Romans 8:28, Psalm 23, John 14:6');
  });

  it('returns single text without comma', () => {
    const plan = createSermonPlan({
      title: 'Plan',
      supportingTexts: ['John 3:16'],
    });

    expect(formatSupportingTexts(plan)).toBe('John 3:16');
  });

  it('returns empty string for empty array', () => {
    const plan = createSermonPlan({
      title: 'Plan',
      supportingTexts: [],
    });

    expect(formatSupportingTexts(plan)).toBe('');
  });

  it('returns empty string when supportingTexts is undefined', () => {
    // Use spread to remove supportingTexts from defaults
    const { supportingTexts: _, ...planWithoutSupportingTexts } = createSermonPlan({
      title: 'Plan',
    });
    // Cast to SermonPlan since we're testing the optional field behavior
    const plan = planWithoutSupportingTexts as unknown as SermonPlan;

    expect(formatSupportingTexts(plan)).toBe('');
  });
});

// =============================================================================
// STYLE DEFINITIONS
// =============================================================================

describe('PREACH_MODE_STYLES', () => {
  const allTypes: SermonElement['type'][] = [
    'section',
    'point',
    'note',
    'scripture',
    'hymn',
    'illustration',
  ];

  it('defines styles for all element types', () => {
    allTypes.forEach((type) => {
      expect(PREACH_MODE_STYLES[type]).toBeDefined();
    });
  });

  it('each style has required properties', () => {
    allTypes.forEach((type) => {
      const style = PREACH_MODE_STYLES[type];
      expect(style.labelClass).toBeDefined();
      expect(style.contentClass).toBeDefined();
      expect(style.containerClass).toBeDefined();
      expect(style.dividerClass).toBeDefined();
      expect(style.icon).toBeDefined();
    });
  });

  it('section has larger font size', () => {
    expect(PREACH_MODE_STYLES.section.labelClass).toContain('1.5em');
  });

  it('note has smaller font and opacity', () => {
    expect(PREACH_MODE_STYLES.note.labelClass).toContain('opacity-80');
    expect(PREACH_MODE_STYLES.note.labelClass).toContain('0.9em');
  });

  it('scripture has italic styling', () => {
    expect(PREACH_MODE_STYLES.scripture.labelClass).toContain('italic');
  });
});

describe('PRINT_STYLES', () => {
  const allTypes: SermonElement['type'][] = [
    'section',
    'point',
    'note',
    'scripture',
    'hymn',
    'illustration',
  ];

  it('defines styles for all element types', () => {
    allTypes.forEach((type) => {
      expect(PRINT_STYLES[type]).toBeDefined();
    });
  });

  it('each style has required properties', () => {
    allTypes.forEach((type) => {
      const style = PRINT_STYLES[type];
      expect(style.labelClass).toBeDefined();
      expect(style.containerClass).toBeDefined();
      expect(typeof style.showLabel).toBe('boolean');
    });
  });

  it('section does not show label', () => {
    expect(PRINT_STYLES.section.showLabel).toBe(false);
  });

  it('scripture shows label', () => {
    expect(PRINT_STYLES.scripture.showLabel).toBe(true);
    expect(PRINT_STYLES.scripture.labelText).toBe('Scripture');
  });

  it('note shows label', () => {
    expect(PRINT_STYLES.note.showLabel).toBe(true);
    expect(PRINT_STYLES.note.labelText).toBe('Note');
  });
});

describe('ELEMENT_COLORS', () => {
  const allTypes: SermonElement['type'][] = [
    'section',
    'point',
    'note',
    'scripture',
    'hymn',
    'illustration',
  ];

  it('defines colors for all element types', () => {
    allTypes.forEach((type) => {
      expect(ELEMENT_COLORS[type]).toBeDefined();
      expect(ELEMENT_COLORS[type].light).toBeDefined();
      expect(ELEMENT_COLORS[type].dark).toBeDefined();
    });
  });

  it('section uses purple colors', () => {
    expect(ELEMENT_COLORS.section.light).toContain('purple');
    expect(ELEMENT_COLORS.section.dark).toContain('purple');
  });

  it('point uses blue colors', () => {
    expect(ELEMENT_COLORS.point.light).toContain('blue');
    expect(ELEMENT_COLORS.point.dark).toContain('blue');
  });

  it('scripture uses amber colors', () => {
    expect(ELEMENT_COLORS.scripture.light).toContain('amber');
    expect(ELEMENT_COLORS.scripture.dark).toContain('amber');
  });

  it('hymn uses teal colors', () => {
    expect(ELEMENT_COLORS.hymn.light).toContain('teal');
    expect(ELEMENT_COLORS.hymn.dark).toContain('teal');
  });

  it('illustration uses green colors', () => {
    expect(ELEMENT_COLORS.illustration.light).toContain('green');
    expect(ELEMENT_COLORS.illustration.dark).toContain('green');
  });
});
