import { describe, it, expect } from 'vitest';
import { labelRange, type RangeLabel } from '../server/services/rangeCheck.js';

describe('labelRange', () => {
  describe('normal range', () => {
    it('returns normal when value is within range', () => {
      expect(labelRange('5.0', 4.0, 6.0)).toBe<RangeLabel>('normal');
    });

    it('returns normal when value equals low bound', () => {
      expect(labelRange('4.0', 4.0, 6.0)).toBe<RangeLabel>('normal');
    });

    it('returns normal when value equals high bound', () => {
      expect(labelRange('6.0', 4.0, 6.0)).toBe<RangeLabel>('normal');
    });
  });

  describe('low range', () => {
    it('returns low when value is below range', () => {
      expect(labelRange('3.0', 4.0, 6.0)).toBe<RangeLabel>('low');
    });

    it('returns low when only low bound is provided and value is below', () => {
      expect(labelRange('3.0', 4.0, null)).toBe<RangeLabel>('low');
    });
  });

  describe('high range', () => {
    it('returns high when value is above range', () => {
      expect(labelRange('7.5', 4.0, 6.0)).toBe<RangeLabel>('high');
    });

    it('returns high when only high bound is provided and value exceeds', () => {
      expect(labelRange('7.5', null, 6.0)).toBe<RangeLabel>('high');
    });
  });

  describe('unknown / edge cases', () => {
    it('returns unknown when no bounds provided', () => {
      expect(labelRange('5.0', null, null)).toBe<RangeLabel>('unknown');
    });

    it('returns unknown when value is null', () => {
      expect(labelRange(null, 4.0, 6.0)).toBe<RangeLabel>('unknown');
    });

    it('returns unknown when value is undefined', () => {
      expect(labelRange(undefined, 4.0, 6.0)).toBe<RangeLabel>('unknown');
    });

    it('returns unknown when value is non-numeric string', () => {
      expect(labelRange('N/A', 4.0, 6.0)).toBe<RangeLabel>('unknown');
    });

    it('returns unknown when value is empty string', () => {
      expect(labelRange('', 4.0, 6.0)).toBe<RangeLabel>('unknown');
    });

    it('handles only high bound — value normal', () => {
      expect(labelRange('5.0', null, 6.0)).toBe<RangeLabel>('normal');
    });

    it('handles only low bound — value normal', () => {
      expect(labelRange('5.0', 4.0, null)).toBe<RangeLabel>('normal');
    });

    it('handles negative values', () => {
      expect(labelRange('-1', -5, 0)).toBe<RangeLabel>('normal');
      expect(labelRange('-6', -5, 0)).toBe<RangeLabel>('low');
    });

    it('handles decimal precision', () => {
      expect(labelRange('6.01', 4.0, 6.0)).toBe<RangeLabel>('high');
      expect(labelRange('5.999', 4.0, 6.0)).toBe<RangeLabel>('normal');
    });
  });
});
