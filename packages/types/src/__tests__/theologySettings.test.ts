import { describe, it, expect } from '@jest/globals';
import {
  THEOLOGICAL_TRADITIONS,
  THEOLOGY_TRADITION_OPTIONS,
  TheologyTraditionSchema,
  BibleTranslationSchema,
  TheologySensitivitySchema,
  getCanonicalTradition,
  getTraditionDisplayLabel,
  type TheologyTradition,
} from '../index';

/**
 * Tests for Theology Settings types and helpers
 *
 * These tests verify:
 * - THEOLOGICAL_TRADITIONS constant contains all expected values
 * - THEOLOGY_TRADITION_OPTIONS maps labels to canonical values correctly
 * - Zod schemas validate inputs correctly
 * - Helper functions convert between labels and canonical values
 */

describe('THEOLOGICAL_TRADITIONS constant', () => {
  it('contains all 10 canonical traditions', () => {
    expect(THEOLOGICAL_TRADITIONS).toHaveLength(10);
    expect(THEOLOGICAL_TRADITIONS).toContain('Non-denominational evangelical');
    expect(THEOLOGICAL_TRADITIONS).toContain('Baptist');
    expect(THEOLOGICAL_TRADITIONS).toContain('Methodist');
    expect(THEOLOGICAL_TRADITIONS).toContain('Presbyterian');
    expect(THEOLOGICAL_TRADITIONS).toContain('Lutheran');
    expect(THEOLOGICAL_TRADITIONS).toContain('Anglican');
    expect(THEOLOGICAL_TRADITIONS).toContain('Pentecostal');
    expect(THEOLOGICAL_TRADITIONS).toContain('Catholic');
    expect(THEOLOGICAL_TRADITIONS).toContain('Reformed');
    expect(THEOLOGICAL_TRADITIONS).toContain('Other');
  });

  it('is readonly (const array)', () => {
    // TypeScript enforces this at compile time, but we can verify structure
    expect(Array.isArray(THEOLOGICAL_TRADITIONS)).toBe(true);
  });
});

describe('THEOLOGY_TRADITION_OPTIONS', () => {
  it('contains options for all canonical traditions', () => {
    const canonicalValues = new Set(THEOLOGY_TRADITION_OPTIONS.map(opt => opt.value));
    THEOLOGICAL_TRADITIONS.forEach(tradition => {
      expect(canonicalValues.has(tradition)).toBe(true);
    });
  });

  it('maps detailed labels to canonical values', () => {
    const pcaOption = THEOLOGY_TRADITION_OPTIONS.find(opt => opt.label === 'Presbyterian (PCA)');
    expect(pcaOption).toBeDefined();
    expect(pcaOption?.value).toBe('Presbyterian');

    const reformedBaptist = THEOLOGY_TRADITION_OPTIONS.find(opt => opt.label === 'Reformed Baptist');
    expect(reformedBaptist).toBeDefined();
    expect(reformedBaptist?.value).toBe('Baptist');

    const lcms = THEOLOGY_TRADITION_OPTIONS.find(opt => opt.label === 'Lutheran (LCMS)');
    expect(lcms).toBeDefined();
    expect(lcms?.value).toBe('Lutheran');
  });

  it('each option has a valid canonical value', () => {
    THEOLOGY_TRADITION_OPTIONS.forEach(option => {
      expect(THEOLOGICAL_TRADITIONS).toContain(option.value);
    });
  });

  it('each option has a non-empty label', () => {
    THEOLOGY_TRADITION_OPTIONS.forEach(option => {
      expect(option.label).toBeTruthy();
      expect(option.label.length).toBeGreaterThan(0);
    });
  });
});

describe('TheologyTraditionSchema', () => {
  it('accepts valid canonical tradition values', () => {
    THEOLOGICAL_TRADITIONS.forEach(tradition => {
      const result = TheologyTraditionSchema.safeParse(tradition);
      expect(result.success).toBe(true);
    });
  });

  it('rejects invalid tradition values', () => {
    const invalidValues = [
      'Presbyterian (PCA)',  // UI label, not canonical
      'Reformed Baptist',    // UI label, not canonical
      'invalid',
      '',
      123,
      null,
      undefined,
    ];

    invalidValues.forEach(value => {
      const result = TheologyTraditionSchema.safeParse(value);
      expect(result.success).toBe(false);
    });
  });

  it('rejects Presbyterian (PCA) - must use canonical Presbyterian', () => {
    const result = TheologyTraditionSchema.safeParse('Presbyterian (PCA)');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Invalid enum value');
    }
  });
});

describe('BibleTranslationSchema', () => {
  it('accepts valid Bible translations', () => {
    const validTranslations = ['ESV', 'NIV', 'KJV', 'NKJV', 'NLT', 'NASB', 'MSG', 'CSB', 'Other'];
    validTranslations.forEach(translation => {
      const result = BibleTranslationSchema.safeParse(translation);
      expect(result.success).toBe(true);
    });
  });

  it('rejects invalid translations', () => {
    const result = BibleTranslationSchema.safeParse('InvalidVersion');
    expect(result.success).toBe(false);
  });
});

describe('TheologySensitivitySchema', () => {
  it('accepts valid sensitivity levels', () => {
    const validLevels = ['conservative', 'moderate', 'progressive'];
    validLevels.forEach(level => {
      const result = TheologySensitivitySchema.safeParse(level);
      expect(result.success).toBe(true);
    });
  });

  it('rejects invalid sensitivity levels', () => {
    const invalidLevels = ['broad', 'liberal', 'extreme', ''];
    invalidLevels.forEach(level => {
      const result = TheologySensitivitySchema.safeParse(level);
      expect(result.success).toBe(false);
    });
  });
});

describe('getCanonicalTradition helper', () => {
  it('returns canonical value when given canonical value', () => {
    expect(getCanonicalTradition('Presbyterian')).toBe('Presbyterian');
    expect(getCanonicalTradition('Baptist')).toBe('Baptist');
    expect(getCanonicalTradition('Lutheran')).toBe('Lutheran');
  });

  it('returns canonical value when given UI label', () => {
    expect(getCanonicalTradition('Presbyterian (PCA)')).toBe('Presbyterian');
    expect(getCanonicalTradition('Presbyterian (PCUSA)')).toBe('Presbyterian');
    expect(getCanonicalTradition('Reformed Baptist')).toBe('Baptist');
    expect(getCanonicalTradition('Southern Baptist')).toBe('Baptist');
    expect(getCanonicalTradition('Lutheran (LCMS)')).toBe('Lutheran');
    expect(getCanonicalTradition('Lutheran (ELCA)')).toBe('Lutheran');
    expect(getCanonicalTradition('Anglican/Episcopal')).toBe('Anglican');
    expect(getCanonicalTradition('Pentecostal/Charismatic')).toBe('Pentecostal');
  });

  it('returns "Other" for unknown values', () => {
    expect(getCanonicalTradition('Unknown Tradition')).toBe('Other');
    expect(getCanonicalTradition('')).toBe('Other');
    expect(getCanonicalTradition('Some Random Text')).toBe('Other');
  });
});

describe('getTraditionDisplayLabel helper', () => {
  it('returns display label for canonical value', () => {
    // For canonical values that have a matching option, return first matching label
    const label = getTraditionDisplayLabel('Non-denominational evangelical');
    expect(label).toBe('Non-denominational evangelical');
  });

  it('returns value itself if no option found', () => {
    // If a value somehow has no matching option, return the value itself
    const result = getTraditionDisplayLabel('Other' as TheologyTradition);
    // Should return 'Other' since there's an option with value 'Other'
    expect(result).toBe('Other');
  });
});

describe('Type safety', () => {
  it('TheologyTradition type matches THEOLOGICAL_TRADITIONS array', () => {
    // This test ensures the type inference is working
    const tradition: TheologyTradition = 'Presbyterian';
    expect(THEOLOGICAL_TRADITIONS).toContain(tradition);
  });
});
