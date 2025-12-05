import { describe, it, expect } from '@jest/globals';
import { getEffectiveBlockType, getBlockDefaults } from '@elder-first/types';
import type { SermonOutlinePoint, SermonBlockType } from '@elder-first/types';

/**
 * Smoke tests for /sermons/[id]/print page logic
 *
 * These tests verify the core logic used in the print page without
 * requiring React Testing Library (which is not installed).
 *
 * Tested logic:
 * - Block filtering for print (includeInPrint flag)
 * - Block styling selection
 * - Block label generation
 * - Point numbering logic
 */

// Mirror the filtering logic from the print page
function filterPrintableBlocks(mainPoints: SermonOutlinePoint[]): SermonOutlinePoint[] {
  return mainPoints.filter((point) => {
    const effectiveType = getEffectiveBlockType(point.type);
    const defaults = getBlockDefaults(effectiveType);
    const includeInPrint = point.includeInPrint ?? defaults.includeInPrint;
    return includeInPrint !== false;
  });
}

// Mirror the style selection logic from the print page
function getBlockPrintStyle(type: SermonBlockType): string {
  switch (type) {
    case 'POINT':
      return 'font-bold text-lg';
    case 'SCRIPTURE':
      return 'font-semibold italic text-base border-l-4 border-amber-500 pl-4';
    case 'ILLUSTRATION':
      return 'font-medium text-base text-gray-700';
    case 'NOTE':
      return 'font-normal text-sm text-gray-600';
    default:
      return 'font-normal';
  }
}

// Mirror the label logic from the print page
function getBlockLabel(type: SermonBlockType): string | null {
  switch (type) {
    case 'POINT':
      return null; // Points don't need a label
    case 'SCRIPTURE':
      return 'Scripture';
    case 'ILLUSTRATION':
      return 'Illustration';
    case 'NOTE':
      return 'Note';
    default:
      return null;
  }
}

// Mirror the point numbering logic from the print page
function calculatePointNumber(
  printableBlocks: SermonOutlinePoint[],
  index: number
): number | null {
  const effectiveType = getEffectiveBlockType(printableBlocks[index].type);
  if (effectiveType !== 'POINT') {
    return null;
  }
  return printableBlocks
    .slice(0, index + 1)
    .filter((p) => getEffectiveBlockType(p.type) === 'POINT').length;
}

describe('Print Page: Block Filtering', () => {
  it('includes blocks with includeInPrint=true', () => {
    const blocks: SermonOutlinePoint[] = [
      { label: 'Point 1', type: 'POINT', includeInPrint: true },
      { label: 'Point 2', type: 'POINT', includeInPrint: true },
    ];

    const result = filterPrintableBlocks(blocks);

    expect(result.length).toBe(2);
  });

  it('excludes blocks with includeInPrint=false', () => {
    const blocks: SermonOutlinePoint[] = [
      { label: 'Point 1', type: 'POINT', includeInPrint: true },
      { label: 'Private Note', type: 'NOTE', includeInPrint: false },
      { label: 'Point 2', type: 'POINT', includeInPrint: true },
    ];

    const result = filterPrintableBlocks(blocks);

    expect(result.length).toBe(2);
    expect(result.find((b) => b.label === 'Private Note')).toBeUndefined();
  });

  it('uses type-based defaults when includeInPrint is undefined', () => {
    const blocks: SermonOutlinePoint[] = [
      { label: 'Point', type: 'POINT' }, // default true
      { label: 'Scripture', type: 'SCRIPTURE' }, // default true
      { label: 'Illustration', type: 'ILLUSTRATION' }, // default true
      { label: 'Note', type: 'NOTE' }, // default true
    ];

    const result = filterPrintableBlocks(blocks);

    // All block types default to includeInPrint=true
    expect(result.length).toBe(4);
  });

  it('handles legacy blocks without type (defaults to POINT)', () => {
    const blocks: SermonOutlinePoint[] = [
      { label: 'Legacy Point' }, // no type = defaults to POINT = includeInPrint true
    ];

    const result = filterPrintableBlocks(blocks);

    expect(result.length).toBe(1);
  });

  it('respects explicit false override even when default is true', () => {
    const blocks: SermonOutlinePoint[] = [
      { label: 'Public Point', type: 'POINT', includeInPrint: true },
      { label: 'Hidden Point', type: 'POINT', includeInPrint: false },
    ];

    const result = filterPrintableBlocks(blocks);

    expect(result.length).toBe(1);
    expect(result[0].label).toBe('Public Point');
  });

  it('returns empty array when all blocks are excluded', () => {
    const blocks: SermonOutlinePoint[] = [
      { label: 'Hidden 1', type: 'POINT', includeInPrint: false },
      { label: 'Hidden 2', type: 'NOTE', includeInPrint: false },
    ];

    const result = filterPrintableBlocks(blocks);

    expect(result.length).toBe(0);
  });

  it('handles empty mainPoints array', () => {
    const blocks: SermonOutlinePoint[] = [];

    const result = filterPrintableBlocks(blocks);

    expect(result.length).toBe(0);
  });
});

describe('Print Page: Block Styling', () => {
  it('returns bold style for POINT', () => {
    const style = getBlockPrintStyle('POINT');

    expect(style).toContain('font-bold');
    expect(style).toContain('text-lg');
  });

  it('returns italic style for SCRIPTURE', () => {
    const style = getBlockPrintStyle('SCRIPTURE');

    expect(style).toContain('italic');
    expect(style).toContain('border-l-4');
  });

  it('returns medium style for ILLUSTRATION', () => {
    const style = getBlockPrintStyle('ILLUSTRATION');

    expect(style).toContain('font-medium');
    expect(style).toContain('text-gray-700');
  });

  it('returns muted style for NOTE', () => {
    const style = getBlockPrintStyle('NOTE');

    expect(style).toContain('text-sm');
    expect(style).toContain('text-gray-600');
  });
});

describe('Print Page: Block Labels', () => {
  it('returns null for POINT (no label needed)', () => {
    const label = getBlockLabel('POINT');

    expect(label).toBeNull();
  });

  it('returns "Scripture" for SCRIPTURE', () => {
    const label = getBlockLabel('SCRIPTURE');

    expect(label).toBe('Scripture');
  });

  it('returns "Illustration" for ILLUSTRATION', () => {
    const label = getBlockLabel('ILLUSTRATION');

    expect(label).toBe('Illustration');
  });

  it('returns "Note" for NOTE', () => {
    const label = getBlockLabel('NOTE');

    expect(label).toBe('Note');
  });
});

describe('Print Page: Point Numbering', () => {
  it('numbers POINT blocks sequentially', () => {
    const blocks: SermonOutlinePoint[] = [
      { label: 'Point 1', type: 'POINT' },
      { label: 'Point 2', type: 'POINT' },
      { label: 'Point 3', type: 'POINT' },
    ];

    expect(calculatePointNumber(blocks, 0)).toBe(1);
    expect(calculatePointNumber(blocks, 1)).toBe(2);
    expect(calculatePointNumber(blocks, 2)).toBe(3);
  });

  it('returns null for non-POINT blocks', () => {
    const blocks: SermonOutlinePoint[] = [
      { label: 'Scripture', type: 'SCRIPTURE' },
      { label: 'Note', type: 'NOTE' },
      { label: 'Illustration', type: 'ILLUSTRATION' },
    ];

    expect(calculatePointNumber(blocks, 0)).toBeNull();
    expect(calculatePointNumber(blocks, 1)).toBeNull();
    expect(calculatePointNumber(blocks, 2)).toBeNull();
  });

  it('numbers correctly with mixed block types', () => {
    const blocks: SermonOutlinePoint[] = [
      { label: 'Introduction', type: 'NOTE' },
      { label: 'Point 1', type: 'POINT' },
      { label: 'Scripture', type: 'SCRIPTURE' },
      { label: 'Point 2', type: 'POINT' },
      { label: 'Illustration', type: 'ILLUSTRATION' },
      { label: 'Point 3', type: 'POINT' },
    ];

    expect(calculatePointNumber(blocks, 0)).toBeNull(); // NOTE
    expect(calculatePointNumber(blocks, 1)).toBe(1); // Point 1
    expect(calculatePointNumber(blocks, 2)).toBeNull(); // SCRIPTURE
    expect(calculatePointNumber(blocks, 3)).toBe(2); // Point 2
    expect(calculatePointNumber(blocks, 4)).toBeNull(); // ILLUSTRATION
    expect(calculatePointNumber(blocks, 5)).toBe(3); // Point 3
  });

  it('handles legacy blocks without type (treated as POINT)', () => {
    const blocks: SermonOutlinePoint[] = [
      { label: 'Legacy 1' }, // defaults to POINT
      { label: 'Legacy 2' }, // defaults to POINT
    ];

    expect(calculatePointNumber(blocks, 0)).toBe(1);
    expect(calculatePointNumber(blocks, 1)).toBe(2);
  });
});

describe('Print Page: End-to-End Flow', () => {
  it('filters and numbers correctly for realistic sermon outline', () => {
    const sermon = {
      title: 'Grace Alone',
      primary_scripture: 'Ephesians 2:1-10',
      outline: {
        bigIdea: 'We are saved by grace through faith',
        mainPoints: [
          { label: 'Introduction', type: 'NOTE' as SermonBlockType },
          { label: 'We were dead in sin', type: 'POINT' as SermonBlockType, scriptureRef: 'Eph 2:1-3' },
          { label: 'Read Ephesians 2:1-3', type: 'SCRIPTURE' as SermonBlockType },
          { label: 'But God...', type: 'POINT' as SermonBlockType, scriptureRef: 'Eph 2:4-5' },
          { label: 'Personal note - slow down here', type: 'NOTE' as SermonBlockType, includeInPrint: false },
          { label: 'Story of redemption', type: 'ILLUSTRATION' as SermonBlockType },
          { label: 'Saved for good works', type: 'POINT' as SermonBlockType, scriptureRef: 'Eph 2:10' },
          { label: 'Conclusion', type: 'NOTE' as SermonBlockType },
        ],
        callToAction: 'Trust in Christ alone for salvation',
      },
    };

    // Step 1: Filter printable blocks
    const printable = filterPrintableBlocks(sermon.outline.mainPoints);

    // Should exclude the "Personal note" with includeInPrint: false
    expect(printable.length).toBe(7);
    expect(printable.find((b) => b.label === 'Personal note - slow down here')).toBeUndefined();

    // Step 2: Verify point numbering on filtered list
    // After filtering: Introduction(NOTE), Point1(POINT), Scripture(SCRIPTURE), Point2(POINT), Illustration(ILLUSTRATION), Point3(POINT), Conclusion(NOTE)
    const pointIndices = printable
      .map((_, i) => calculatePointNumber(printable, i))
      .filter((n) => n !== null);

    expect(pointIndices).toEqual([1, 2, 3]); // Three points numbered 1, 2, 3

    // Step 3: Verify labels
    expect(getBlockLabel(getEffectiveBlockType(printable[0].type))).toBe('Note'); // Introduction
    expect(getBlockLabel(getEffectiveBlockType(printable[1].type))).toBeNull(); // Point 1
    expect(getBlockLabel(getEffectiveBlockType(printable[2].type))).toBe('Scripture');
  });

  it('handles sermon with no outline gracefully', () => {
    const emptyOutline: SermonOutlinePoint[] = [];

    const printable = filterPrintableBlocks(emptyOutline);

    expect(printable.length).toBe(0);
  });

  it('handles sermon with only hidden blocks', () => {
    const allHiddenBlocks: SermonOutlinePoint[] = [
      { label: 'Hidden 1', type: 'POINT', includeInPrint: false },
      { label: 'Hidden 2', type: 'NOTE', includeInPrint: false },
    ];

    const printable = filterPrintableBlocks(allHiddenBlocks);

    expect(printable.length).toBe(0);
  });
});
