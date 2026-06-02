import { describe, expect, it } from 'vitest';
import { timingSafeEqualString } from './timing-safe';

describe('timingSafeEqualString', () => {
  it('matches equal strings', () => {
    expect(timingSafeEqualString('abc', 'abc')).toBe(true);
  });

  it('rejects different lengths', () => {
    expect(timingSafeEqualString('abc', 'abcd')).toBe(false);
  });

  it('rejects same length different content', () => {
    expect(timingSafeEqualString('abc', 'abd')).toBe(false);
  });
});
