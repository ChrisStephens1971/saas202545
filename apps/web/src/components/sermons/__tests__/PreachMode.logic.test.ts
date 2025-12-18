import { describe, it, expect } from '@jest/globals';
import { getEffectiveBlockType } from '@elder-first/types';
import type { SermonOutlinePoint, SermonBlockType, SermonPlan, SermonElement } from '@elder-first/types';
import { buildPreachModeBlocks } from '@/lib/sermonPlanRenderer';

/**
 * Logic tests for PreachMode behavior
 *
 * These tests verify the business logic used in PreachMode without requiring
 * React Testing Library (which is not installed in this project).
 *
 * For full component rendering tests, install @testing-library/react and
 * create PreachMode.test.tsx with render/interaction tests.
 *
 * Tested logic:
 * - Block array construction from sermon data
 * - Overtime calculation
 * - Block type styling lookups
 * - Fallback detection
 */

// Mock the BLOCK_STYLES configuration from PreachMode
const BLOCK_STYLES: Record<
  SermonBlockType,
  { labelClass: string; contentClass: string; dividerClass: string }
> = {
  POINT: {
    labelClass: 'font-bold text-[1.2em]',
    contentClass: '',
    dividerClass: 'border-t-2 border-current opacity-20 mt-4 mb-2',
  },
  SCRIPTURE: {
    labelClass: 'font-semibold italic text-[1.1em]',
    contentClass: 'italic',
    dividerClass: 'border-t border-current opacity-10 mt-2 mb-2',
  },
  ILLUSTRATION: {
    labelClass: 'font-medium text-[1em]',
    contentClass: 'text-[0.95em]',
    dividerClass: 'border-t border-dashed border-current opacity-10 mt-2 mb-2',
  },
  NOTE: {
    labelClass: 'font-normal text-[0.9em] opacity-80',
    contentClass: 'text-[0.85em] opacity-80',
    dividerClass: '',
  },
};

// Helper to simulate block array construction (mirrors PreachMode logic)
function buildBlocks(sermon: {
  title: string;
  primary_scripture?: string | null;
  manuscript?: string | null;
  outline?: {
    mainPoints?: SermonOutlinePoint[];
    bigIdea?: string;
    callToAction?: string;
    application?: string;
  } | null;
}) {
  const hasMainPoints =
    sermon.outline?.mainPoints && sermon.outline.mainPoints.length > 0;

  if (hasMainPoints) {
    return [
      {
        type: 'header' as const,
        content: { title: sermon.title, scripture: sermon.primary_scripture },
      },
      ...(sermon.outline?.mainPoints?.map((p: SermonOutlinePoint) => ({
        type: 'point' as const,
        content: p,
        blockType: getEffectiveBlockType(p.type),
      })) || []),
      {
        type: 'conclusion' as const,
        content: { text: sermon.outline?.callToAction || 'Conclusion' },
      },
    ];
  }

  // Fallback mode
  return [
    {
      type: 'fallback' as const,
      content: {
        title: sermon.title,
        scripture: sermon.primary_scripture,
        manuscript: sermon.manuscript,
        bigIdea: sermon.outline?.bigIdea,
        application: sermon.outline?.application,
        callToAction: sermon.outline?.callToAction,
      },
    },
  ];
}

// Helper to calculate overtime (mirrors PreachMode logic)
function calculateOvertime(
  elapsedSeconds: number,
  targetMinutes: number | null
): { isOvertime: boolean; overtimeSeconds: number } {
  const targetSeconds = targetMinutes ? targetMinutes * 60 : null;
  const isOvertime = targetSeconds !== null && elapsedSeconds > targetSeconds;
  const overtimeSeconds = isOvertime ? elapsedSeconds - targetSeconds! : 0;
  return { isOvertime, overtimeSeconds };
}

describe('PreachMode Block Construction', () => {
  describe('with mainPoints', () => {
    it('builds header, point blocks, and conclusion', () => {
      const sermon = {
        title: 'Test Sermon',
        primary_scripture: 'John 3:16',
        outline: {
          mainPoints: [
            { label: 'Point 1', type: 'POINT' as SermonBlockType },
            { label: 'Point 2', type: 'SCRIPTURE' as SermonBlockType },
          ],
          callToAction: 'Take action!',
        },
      };

      const blocks = buildBlocks(sermon);

      expect(blocks.length).toBe(4); // header + 2 points + conclusion
      expect(blocks[0].type).toBe('header');
      expect(blocks[1].type).toBe('point');
      expect(blocks[2].type).toBe('point');
      expect(blocks[3].type).toBe('conclusion');
    });

    it('preserves block type from outline point', () => {
      const sermon = {
        title: 'Test',
        outline: {
          mainPoints: [
            { label: 'Scripture', type: 'SCRIPTURE' as SermonBlockType },
            { label: 'Illustration', type: 'ILLUSTRATION' as SermonBlockType },
            { label: 'Note', type: 'NOTE' as SermonBlockType },
          ],
        },
      };

      const blocks = buildBlocks(sermon);
      const pointBlocks = blocks.filter((b) => b.type === 'point');

      expect((pointBlocks[0] as any).blockType).toBe('SCRIPTURE');
      expect((pointBlocks[1] as any).blockType).toBe('ILLUSTRATION');
      expect((pointBlocks[2] as any).blockType).toBe('NOTE');
    });

    it('defaults undefined type to POINT', () => {
      const sermon = {
        title: 'Test',
        outline: {
          mainPoints: [
            { label: 'Legacy Point' }, // no type field
          ],
        },
      };

      const blocks = buildBlocks(sermon);
      const pointBlock = blocks.find((b) => b.type === 'point');

      expect((pointBlock as any).blockType).toBe('POINT');
    });

    it('includes scripture in header', () => {
      const sermon = {
        title: 'Test',
        primary_scripture: 'Romans 8:28',
        outline: {
          mainPoints: [{ label: 'Point' }],
        },
      };

      const blocks = buildBlocks(sermon);
      const header = blocks[0];

      expect((header.content as any).scripture).toBe('Romans 8:28');
    });
  });

  describe('fallback mode (no mainPoints)', () => {
    it('returns single fallback block when mainPoints is empty', () => {
      const sermon = {
        title: 'Simple Sermon',
        primary_scripture: 'Psalm 23',
        manuscript: 'Full sermon text here...',
        outline: {
          mainPoints: [],
          bigIdea: 'God is our shepherd',
        },
      };

      const blocks = buildBlocks(sermon);

      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe('fallback');
    });

    it('returns fallback when outline is null', () => {
      const sermon = {
        title: 'No Outline Sermon',
        outline: null,
      };

      const blocks = buildBlocks(sermon);

      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe('fallback');
    });

    it('includes manuscript in fallback content', () => {
      const sermon = {
        title: 'Test',
        manuscript: 'My manuscript text',
        outline: null,
      };

      const blocks = buildBlocks(sermon);

      expect((blocks[0].content as any).manuscript).toBe('My manuscript text');
    });
  });
});

describe('PreachMode Overtime Calculation', () => {
  it('returns not overtime when elapsed < target', () => {
    const result = calculateOvertime(90, 2); // 90 seconds, 2 min target

    expect(result.isOvertime).toBe(false);
    expect(result.overtimeSeconds).toBe(0);
  });

  it('returns not overtime when elapsed equals target', () => {
    const result = calculateOvertime(120, 2); // exactly 2 minutes

    expect(result.isOvertime).toBe(false);
    expect(result.overtimeSeconds).toBe(0);
  });

  it('returns overtime when elapsed > target', () => {
    const result = calculateOvertime(150, 2); // 2:30, target 2:00

    expect(result.isOvertime).toBe(true);
    expect(result.overtimeSeconds).toBe(30);
  });

  it('returns not overtime when target is null', () => {
    const result = calculateOvertime(9999, null);

    expect(result.isOvertime).toBe(false);
    expect(result.overtimeSeconds).toBe(0);
  });

  it('calculates correct overtime for longer sermons', () => {
    const result = calculateOvertime(35 * 60, 30); // 35 min elapsed, 30 min target

    expect(result.isOvertime).toBe(true);
    expect(result.overtimeSeconds).toBe(5 * 60); // 5 minutes over
  });
});

describe('PreachMode Block Styling', () => {
  it('returns correct styles for POINT', () => {
    const style = BLOCK_STYLES['POINT'];

    expect(style.labelClass).toContain('font-bold');
    expect(style.dividerClass).toContain('border-t-2');
  });

  it('returns correct styles for SCRIPTURE', () => {
    const style = BLOCK_STYLES['SCRIPTURE'];

    expect(style.labelClass).toContain('italic');
    expect(style.contentClass).toContain('italic');
  });

  it('returns correct styles for ILLUSTRATION', () => {
    const style = BLOCK_STYLES['ILLUSTRATION'];

    expect(style.labelClass).toContain('font-medium');
    expect(style.dividerClass).toContain('border-dashed');
  });

  it('returns correct styles for NOTE', () => {
    const style = BLOCK_STYLES['NOTE'];

    expect(style.labelClass).toContain('opacity-80');
    expect(style.dividerClass).toBe(''); // No divider for notes
  });

  it('all block types have defined styles', () => {
    const types: SermonBlockType[] = ['POINT', 'SCRIPTURE', 'ILLUSTRATION', 'NOTE'];

    types.forEach((type) => {
      expect(BLOCK_STYLES[type]).toBeDefined();
      expect(BLOCK_STYLES[type].labelClass).toBeDefined();
      expect(BLOCK_STYLES[type].contentClass).toBeDefined();
      expect(BLOCK_STYLES[type].dividerClass).toBeDefined();
    });
  });
});

describe('PreachMode Navigation Logic', () => {
  it('cannot go previous from first block', () => {
    const currentIndex = 0;
    const canGoPrev = currentIndex > 0;

    expect(canGoPrev).toBe(false);
  });

  it('can go previous from middle block', () => {
    const currentIndex = 2;
    const canGoPrev = currentIndex > 0;

    expect(canGoPrev).toBe(true);
  });

  it('cannot go next from last block', () => {
    const currentIndex = 4;
    const blocksLength = 5;
    const canGoNext = currentIndex < blocksLength - 1;

    expect(canGoNext).toBe(false);
  });

  it('can go next from middle block', () => {
    const currentIndex = 2;
    const blocksLength = 5;
    const canGoNext = currentIndex < blocksLength - 1;

    expect(canGoNext).toBe(true);
  });
});

/**
 * Phase 9: Tests for SermonPlan-based block construction
 * These tests verify that buildPreachModeBlocks correctly handles SermonPlan data.
 */
describe('PreachMode SermonPlan Block Construction', () => {
  // Helper to create minimal sermon object
  const createSermon = (overrides?: Record<string, unknown>) => ({
    title: 'Test Sermon',
    primary_scripture: 'John 3:16',
    ...overrides,
  });

  // Helper to create SermonPlan
  const createPlan = (elements: SermonElement[], overrides?: Partial<SermonPlan>): SermonPlan => ({
    id: 'plan-1',
    sermonId: 'sermon-1',
    title: 'Test Plan',
    bigIdea: 'Test big idea',
    primaryText: 'John 3:16',
    supportingTexts: [],
    elements,
    tags: [],
    notes: undefined,
    styleProfile: undefined,
    ...overrides,
  });

  describe('with SermonPlan elements', () => {
    it('builds header, element blocks, and conclusion from SermonPlan', () => {
      const plan = createPlan([
        { id: 'e1', type: 'point', text: 'First Point' } as SermonElement,
        { id: 'e2', type: 'scripture', reference: 'Romans 8:28' } as SermonElement,
      ]);

      const blocks = buildPreachModeBlocks(createSermon(), plan);

      expect(blocks.length).toBe(4); // header + 2 elements + conclusion
      expect(blocks[0].type).toBe('header');
      expect(blocks[1].type).toBe('element');
      expect(blocks[2].type).toBe('element');
      expect(blocks[3].type).toBe('conclusion');
    });

    it('includes all SermonElement types as element blocks', () => {
      const plan = createPlan([
        { id: 'e1', type: 'section', title: 'Introduction' } as SermonElement,
        { id: 'e2', type: 'point', text: 'Main Point' } as SermonElement,
        { id: 'e3', type: 'scripture', reference: 'Psalm 23:1' } as SermonElement,
        { id: 'e4', type: 'illustration', title: 'Story' } as SermonElement,
        { id: 'e5', type: 'hymn', title: 'Amazing Grace' } as SermonElement,
        { id: 'e6', type: 'note', text: 'Remember to pause' } as SermonElement,
      ]);

      const blocks = buildPreachModeBlocks(createSermon(), plan);
      const elementBlocks = blocks.filter((b) => b.type === 'element');

      expect(elementBlocks.length).toBe(6);
      expect((elementBlocks[0] as any).element.type).toBe('section');
      expect((elementBlocks[1] as any).element.type).toBe('point');
      expect((elementBlocks[2] as any).element.type).toBe('scripture');
      expect((elementBlocks[3] as any).element.type).toBe('illustration');
      expect((elementBlocks[4] as any).element.type).toBe('hymn');
      expect((elementBlocks[5] as any).element.type).toBe('note');
    });

    it('preserves element order from SermonPlan', () => {
      const plan = createPlan([
        { id: 'e1', type: 'scripture', reference: 'Gen 1:1' } as SermonElement,
        { id: 'e2', type: 'point', text: 'Creation' } as SermonElement,
        { id: 'e3', type: 'illustration', title: 'Big Bang' } as SermonElement,
      ]);

      const blocks = buildPreachModeBlocks(createSermon(), plan);
      const elementBlocks = blocks.filter((b) => b.type === 'element');

      expect((elementBlocks[0] as any).element.id).toBe('e1');
      expect((elementBlocks[1] as any).element.id).toBe('e2');
      expect((elementBlocks[2] as any).element.id).toBe('e3');
    });

    it('uses SermonPlan bigIdea in header if available', () => {
      const plan = createPlan(
        [{ id: 'e1', type: 'point', text: 'Point 1' } as SermonElement],
        { bigIdea: 'God is love' }
      );

      const blocks = buildPreachModeBlocks(createSermon(), plan);
      const header = blocks.find((b) => b.type === 'header');

      expect((header?.content as any).bigIdea).toBe('God is love');
    });

    it('uses plan primaryText for scripture in header', () => {
      const plan = createPlan(
        [{ id: 'e1', type: 'point', text: 'Point 1' } as SermonElement],
        { primaryText: 'Romans 8:28' }
      );

      const blocks = buildPreachModeBlocks(createSermon(), plan);
      const header = blocks.find((b) => b.type === 'header');

      expect((header?.content as any).scripture).toBe('Romans 8:28');
    });
  });

  describe('SermonPlan priority over legacy', () => {
    it('uses SermonPlan when both SermonPlan and mainPoints exist', () => {
      const sermon = createSermon({
        outline: {
          mainPoints: [
            { label: 'Legacy Point 1' },
            { label: 'Legacy Point 2' },
          ],
        },
      });
      const plan = createPlan([
        { id: 'e1', type: 'point', text: 'Plan Point 1' } as SermonElement,
      ]);

      const blocks = buildPreachModeBlocks(sermon, plan);

      // Should have header + 1 element + conclusion (from plan)
      // Not header + 2 points + conclusion (from legacy)
      expect(blocks.length).toBe(3);
      expect(blocks[1].type).toBe('element');
      expect((blocks[1] as any).element.text).toBe('Plan Point 1');
    });
  });

  describe('fallback when no SermonPlan', () => {
    it('returns fallback when plan is null', () => {
      const sermon = createSermon({ outline: null });
      const blocks = buildPreachModeBlocks(sermon, null);

      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe('fallback');
    });

    it('returns fallback when plan has empty elements', () => {
      const plan = createPlan([]);
      const sermon = createSermon({ outline: null });
      const blocks = buildPreachModeBlocks(sermon, plan);

      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe('fallback');
    });

    it('fallback includes sermon title and scripture', () => {
      const sermon = createSermon({
        title: 'My Sermon',
        primary_scripture: 'John 3:16',
        manuscript: 'Full text...',
      });
      const blocks = buildPreachModeBlocks(sermon, null);

      expect(blocks[0].type).toBe('fallback');
      expect((blocks[0] as any).content.title).toBe('My Sermon');
      expect((blocks[0] as any).content.scripture).toBe('John 3:16');
      expect((blocks[0] as any).content.manuscript).toBe('Full text...');
    });
  });

  describe('conclusion block content', () => {
    it('includes notes from SermonPlan in conclusion', () => {
      const plan = createPlan(
        [{ id: 'e1', type: 'point', text: 'Point' } as SermonElement],
        { notes: 'Final thoughts and application' }
      );

      const blocks = buildPreachModeBlocks(createSermon(), plan);
      const conclusion = blocks.find((b) => b.type === 'conclusion');

      expect((conclusion?.content as any).notes).toBe('Final thoughts and application');
    });

    it('conclusion has undefined notes when plan.notes is undefined', () => {
      const plan = createPlan(
        [{ id: 'e1', type: 'point', text: 'Point' } as SermonElement],
        { notes: undefined }
      );

      const blocks = buildPreachModeBlocks(createSermon(), plan);
      const conclusion = blocks.find((b) => b.type === 'conclusion');

      expect((conclusion?.content as any).notes).toBeUndefined();
    });
  });
});
