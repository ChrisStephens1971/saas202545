/**
 * Tests for Database Numeric Helpers
 *
 * These tests ensure that PostgreSQL aggregate values (COUNT, SUM, AVG)
 * are safely converted to JavaScript numbers for tRPC responses.
 */

import { describe, it, expect, jest } from '@jest/globals';
import { pgCountToNumber, pgDecimalToNumber, isNumericValue } from '../dbNumeric';

describe('dbNumeric helpers', () => {
  describe('pgCountToNumber', () => {
    describe('string inputs (most common from pg driver)', () => {
      it('should convert string numbers to integers', () => {
        expect(pgCountToNumber('42')).toBe(42);
        expect(pgCountToNumber('0')).toBe(0);
        expect(pgCountToNumber('1000000')).toBe(1000000);
      });

      it('should handle string with whitespace', () => {
        expect(pgCountToNumber('  42  ')).toBe(42);
        expect(pgCountToNumber('\t100\n')).toBe(100);
      });

      it('should return 0 for empty strings', () => {
        expect(pgCountToNumber('')).toBe(0);
        expect(pgCountToNumber('   ')).toBe(0);
        expect(pgCountToNumber('\t\n')).toBe(0);
      });

      it('should return 0 for non-numeric strings', () => {
        expect(pgCountToNumber('abc')).toBe(0);
        expect(pgCountToNumber('not-a-number')).toBe(0);
        expect(pgCountToNumber('NaN')).toBe(0);
      });

      it('should truncate decimal strings to integers', () => {
        expect(pgCountToNumber('42.7')).toBe(42);
        expect(pgCountToNumber('99.99')).toBe(99);
      });

      it('should handle negative string numbers', () => {
        expect(pgCountToNumber('-5')).toBe(-5);
        expect(pgCountToNumber('-100')).toBe(-100);
      });

      it('should handle large string numbers within safe integer range', () => {
        expect(pgCountToNumber('9007199254740991')).toBe(Number.MAX_SAFE_INTEGER);
      });
    });

    describe('number inputs', () => {
      it('should return the number as-is', () => {
        expect(pgCountToNumber(42)).toBe(42);
        expect(pgCountToNumber(0)).toBe(0);
        expect(pgCountToNumber(-10)).toBe(-10);
      });

      it('should return 0 for NaN', () => {
        expect(pgCountToNumber(NaN)).toBe(0);
      });

      it('should handle Infinity', () => {
        expect(pgCountToNumber(Infinity)).toBe(Infinity);
        expect(pgCountToNumber(-Infinity)).toBe(-Infinity);
      });

      it('should handle floating point numbers', () => {
        expect(pgCountToNumber(42.5)).toBe(42.5);
      });
    });

    describe('BigInt inputs', () => {
      it('should convert small BigInt to number', () => {
        expect(pgCountToNumber(BigInt(42))).toBe(42);
        expect(pgCountToNumber(BigInt(0))).toBe(0);
        expect(pgCountToNumber(BigInt(-100))).toBe(-100);
      });

      it('should warn and convert large BigInt', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        // Value larger than MAX_SAFE_INTEGER
        const largeBigInt = BigInt('9007199254740992');
        const result = pgCountToNumber(largeBigInt);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('exceeds safe integer range')
        );
        expect(typeof result).toBe('number');

        consoleSpy.mockRestore();
      });
    });

    describe('null/undefined inputs', () => {
      it('should return 0 for null', () => {
        expect(pgCountToNumber(null)).toBe(0);
      });

      it('should return 0 for undefined', () => {
        expect(pgCountToNumber(undefined)).toBe(0);
      });
    });

    describe('other types', () => {
      it('should return 0 for objects', () => {
        expect(pgCountToNumber({})).toBe(0);
        expect(pgCountToNumber({ value: 42 })).toBe(0);
      });

      it('should return 0 for arrays', () => {
        expect(pgCountToNumber([])).toBe(0);
        expect(pgCountToNumber([42])).toBe(0);
      });

      it('should return 0 for booleans', () => {
        expect(pgCountToNumber(true)).toBe(0);
        expect(pgCountToNumber(false)).toBe(0);
      });
    });
  });

  describe('pgDecimalToNumber', () => {
    describe('string inputs', () => {
      it('should convert string decimals to floats', () => {
        expect(pgDecimalToNumber('42.5')).toBe(42.5);
        expect(pgDecimalToNumber('3.14159')).toBe(3.14159);
        expect(pgDecimalToNumber('0.001')).toBe(0.001);
      });

      it('should convert string integers to numbers', () => {
        expect(pgDecimalToNumber('42')).toBe(42);
        expect(pgDecimalToNumber('0')).toBe(0);
      });

      it('should return 0 for empty strings', () => {
        expect(pgDecimalToNumber('')).toBe(0);
        expect(pgDecimalToNumber('   ')).toBe(0);
      });

      it('should return 0 for non-numeric strings', () => {
        expect(pgDecimalToNumber('abc')).toBe(0);
        expect(pgDecimalToNumber('not-a-number')).toBe(0);
      });

      it('should handle scientific notation strings', () => {
        expect(pgDecimalToNumber('1e10')).toBe(1e10);
        expect(pgDecimalToNumber('1.5e-3')).toBe(0.0015);
      });

      it('should handle negative decimal strings', () => {
        expect(pgDecimalToNumber('-42.5')).toBe(-42.5);
        expect(pgDecimalToNumber('-0.001')).toBe(-0.001);
      });
    });

    describe('number inputs', () => {
      it('should return the number as-is', () => {
        expect(pgDecimalToNumber(42.5)).toBe(42.5);
        expect(pgDecimalToNumber(0)).toBe(0);
        expect(pgDecimalToNumber(-3.14)).toBe(-3.14);
      });

      it('should return 0 for NaN', () => {
        expect(pgDecimalToNumber(NaN)).toBe(0);
      });
    });

    describe('BigInt inputs', () => {
      it('should convert BigInt to number', () => {
        expect(pgDecimalToNumber(BigInt(42))).toBe(42);
        expect(pgDecimalToNumber(BigInt(-100))).toBe(-100);
      });
    });

    describe('null/undefined inputs', () => {
      it('should return 0 for null', () => {
        expect(pgDecimalToNumber(null)).toBe(0);
      });

      it('should return 0 for undefined', () => {
        expect(pgDecimalToNumber(undefined)).toBe(0);
      });
    });
  });

  describe('isNumericValue', () => {
    it('should return true for valid numbers', () => {
      expect(isNumericValue(42)).toBe(true);
      expect(isNumericValue(0)).toBe(true);
      expect(isNumericValue(-100)).toBe(true);
      expect(isNumericValue(3.14)).toBe(true);
    });

    it('should return false for NaN', () => {
      expect(isNumericValue(NaN)).toBe(false);
    });

    it('should return true for BigInt', () => {
      expect(isNumericValue(BigInt(42))).toBe(true);
      expect(isNumericValue(BigInt(0))).toBe(true);
    });

    it('should return true for numeric strings', () => {
      expect(isNumericValue('42')).toBe(true);
      expect(isNumericValue('3.14')).toBe(true);
      expect(isNumericValue('-100')).toBe(true);
      expect(isNumericValue('  42  ')).toBe(true);
    });

    it('should return false for non-numeric strings', () => {
      expect(isNumericValue('abc')).toBe(false);
      expect(isNumericValue('')).toBe(false);
      expect(isNumericValue('   ')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isNumericValue(null)).toBe(false);
      expect(isNumericValue(undefined)).toBe(false);
    });

    it('should return false for objects and arrays', () => {
      expect(isNumericValue({})).toBe(false);
      expect(isNumericValue([])).toBe(false);
      expect(isNumericValue({ value: 42 })).toBe(false);
    });
  });

  describe('real PostgreSQL value scenarios', () => {
    it('should handle typical COUNT(*) result from pg driver', () => {
      // pg driver returns COUNT as string
      const mockPgCountResult = { total: '157' };
      expect(pgCountToNumber(mockPgCountResult.total)).toBe(157);
    });

    it('should handle SUM result from pg driver', () => {
      // pg driver returns SUM as string for numeric types
      const mockPgSumResult = { total_amount: '12345.67' };
      expect(pgDecimalToNumber(mockPgSumResult.total_amount)).toBe(12345.67);
    });

    it('should handle AVG result from pg driver', () => {
      const mockPgAvgResult = { avg_score: '85.5' };
      expect(pgDecimalToNumber(mockPgAvgResult.avg_score)).toBe(85.5);
    });

    it('should handle COUNT returning 0 rows', () => {
      // When no rows match, COUNT returns '0'
      expect(pgCountToNumber('0')).toBe(0);
    });

    it('should handle SUM with null (no rows)', () => {
      // SUM over no rows returns null in PostgreSQL
      expect(pgDecimalToNumber(null)).toBe(0);
    });

    it('should handle COALESCE result', () => {
      // COALESCE(SUM(...), 0) returns '0' as string
      expect(pgDecimalToNumber('0')).toBe(0);
      expect(pgCountToNumber('0')).toBe(0);
    });

    it('should handle optional chaining with undefined', () => {
      // Simulating: result.rows[0]?.total when rows is empty
      const emptyResult = { rows: [] as Array<{ total: string }> };
      expect(pgCountToNumber(emptyResult.rows[0]?.total)).toBe(0);
    });
  });
});
