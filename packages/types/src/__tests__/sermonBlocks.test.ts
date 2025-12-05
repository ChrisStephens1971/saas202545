import { describe, it, expect } from '@jest/globals';
import {
  getEffectiveBlockType,
  getBlockDefaults,
  SermonBlockType,
  SermonOutlinePointSchema,
} from '../index';

/**
 * Tests for sermon block type helpers
 *
 * These tests verify:
 * - getEffectiveBlockType handles undefined and defined types
 * - getBlockDefaults returns correct defaults for each block type
 * - SermonOutlinePointSchema validates correctly with new optional fields
 */

describe('getEffectiveBlockType', () => {
  it('returns "POINT" when type is undefined', () => {
    const result = getEffectiveBlockType(undefined);
    expect(result).toBe('POINT');
  });

  it('returns "POINT" when type is explicitly "POINT"', () => {
    const result = getEffectiveBlockType('POINT');
    expect(result).toBe('POINT');
  });

  it('returns "SCRIPTURE" when type is "SCRIPTURE"', () => {
    const result = getEffectiveBlockType('SCRIPTURE');
    expect(result).toBe('SCRIPTURE');
  });

  it('returns "ILLUSTRATION" when type is "ILLUSTRATION"', () => {
    const result = getEffectiveBlockType('ILLUSTRATION');
    expect(result).toBe('ILLUSTRATION');
  });

  it('returns "NOTE" when type is "NOTE"', () => {
    const result = getEffectiveBlockType('NOTE');
    expect(result).toBe('NOTE');
  });
});

describe('getBlockDefaults', () => {
  describe('POINT type', () => {
    it('returns showOnSlides=true for POINT', () => {
      const defaults = getBlockDefaults('POINT');
      expect(defaults.showOnSlides).toBe(true);
    });

    it('returns includeInPrint=true for POINT', () => {
      const defaults = getBlockDefaults('POINT');
      expect(defaults.includeInPrint).toBe(true);
    });
  });

  describe('SCRIPTURE type', () => {
    it('returns showOnSlides=true for SCRIPTURE', () => {
      const defaults = getBlockDefaults('SCRIPTURE');
      expect(defaults.showOnSlides).toBe(true);
    });

    it('returns includeInPrint=true for SCRIPTURE', () => {
      const defaults = getBlockDefaults('SCRIPTURE');
      expect(defaults.includeInPrint).toBe(true);
    });
  });

  describe('ILLUSTRATION type', () => {
    it('returns showOnSlides=false for ILLUSTRATION', () => {
      const defaults = getBlockDefaults('ILLUSTRATION');
      expect(defaults.showOnSlides).toBe(false);
    });

    it('returns includeInPrint=true for ILLUSTRATION', () => {
      const defaults = getBlockDefaults('ILLUSTRATION');
      expect(defaults.includeInPrint).toBe(true);
    });
  });

  describe('NOTE type', () => {
    it('returns showOnSlides=false for NOTE', () => {
      const defaults = getBlockDefaults('NOTE');
      expect(defaults.showOnSlides).toBe(false);
    });

    it('returns includeInPrint=true for NOTE', () => {
      const defaults = getBlockDefaults('NOTE');
      expect(defaults.includeInPrint).toBe(true);
    });
  });

  describe('undefined type (backward compatibility)', () => {
    it('returns POINT defaults when type is undefined', () => {
      const defaults = getBlockDefaults(undefined);
      expect(defaults.showOnSlides).toBe(true);
      expect(defaults.includeInPrint).toBe(true);
    });
  });
});

describe('SermonOutlinePointSchema', () => {
  describe('backward compatibility with legacy data', () => {
    it('validates legacy outline point without new fields', () => {
      const legacyPoint = {
        label: 'We were dead in sin',
        scriptureRef: 'Eph 2:1-3',
        summary: 'Paul describes our condition before Christ',
        notes: 'Emphasize hopelessness without God',
      };

      const result = SermonOutlinePointSchema.safeParse(legacyPoint);
      expect(result.success).toBe(true);
    });

    it('validates minimal outline point with only label', () => {
      const minimalPoint = {
        label: 'Introduction',
      };

      const result = SermonOutlinePointSchema.safeParse(minimalPoint);
      expect(result.success).toBe(true);
    });
  });

  describe('new fields validation', () => {
    it('validates outline point with type field', () => {
      const pointWithType = {
        label: 'Main Point',
        type: 'POINT' as SermonBlockType,
      };

      const result = SermonOutlinePointSchema.safeParse(pointWithType);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('POINT');
      }
    });

    it('validates outline point with all new fields', () => {
      const fullPoint = {
        label: 'Scripture Reading',
        scriptureRef: 'John 3:16',
        summary: 'For God so loved the world...',
        notes: 'Read slowly',
        type: 'SCRIPTURE' as SermonBlockType,
        showOnSlides: true,
        includeInPrint: false,
      };

      const result = SermonOutlinePointSchema.safeParse(fullPoint);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('SCRIPTURE');
        expect(result.data.showOnSlides).toBe(true);
        expect(result.data.includeInPrint).toBe(false);
      }
    });

    it('rejects invalid block type', () => {
      const invalidPoint = {
        label: 'Test',
        type: 'INVALID_TYPE',
      };

      const result = SermonOutlinePointSchema.safeParse(invalidPoint);
      expect(result.success).toBe(false);
    });

    it('validates boolean flags correctly', () => {
      const pointWithFlags = {
        label: 'Note',
        showOnSlides: false,
        includeInPrint: true,
      };

      const result = SermonOutlinePointSchema.safeParse(pointWithFlags);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.showOnSlides).toBe(false);
        expect(result.data.includeInPrint).toBe(true);
      }
    });
  });

  describe('label validation', () => {
    it('rejects empty label', () => {
      const emptyLabel = {
        label: '',
      };

      const result = SermonOutlinePointSchema.safeParse(emptyLabel);
      expect(result.success).toBe(false);
    });

    it('rejects missing label', () => {
      const noLabel = {
        scriptureRef: 'John 3:16',
      };

      const result = SermonOutlinePointSchema.safeParse(noLabel);
      expect(result.success).toBe(false);
    });
  });
});

describe('Integration: getBlockDefaults with getEffectiveBlockType', () => {
  it('correctly chains helpers for undefined type', () => {
    const type = undefined;
    const effectiveType = getEffectiveBlockType(type);
    const defaults = getBlockDefaults(effectiveType);

    expect(effectiveType).toBe('POINT');
    expect(defaults.showOnSlides).toBe(true);
    expect(defaults.includeInPrint).toBe(true);
  });

  it('correctly chains helpers for NOTE type', () => {
    const type: SermonBlockType = 'NOTE';
    const effectiveType = getEffectiveBlockType(type);
    const defaults = getBlockDefaults(effectiveType);

    expect(effectiveType).toBe('NOTE');
    expect(defaults.showOnSlides).toBe(false);
    expect(defaults.includeInPrint).toBe(true);
  });
});
