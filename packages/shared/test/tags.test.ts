import { describe, expect, it } from 'vitest';

import { normalizeTag, tagSchema } from '../src/index.ts';

describe('normalizeTag', () => {
  it('lowercases and strips the leading hash', () => {
    expect(normalizeTag('#TypeScript')).toBe('typescript');
    expect(normalizeTag('  rust ')).toBe('rust');
    expect(normalizeTag('machine_learning')).toBe('machine_learning');
  });

  it('accepts letters outside ASCII', () => {
    expect(normalizeTag('Programação')).toBe('programação');
  });

  it('rejects punctuation, spaces and empty names', () => {
    expect(normalizeTag('c++')).toBeNull();
    expect(normalizeTag('node.js')).toBeNull();
    expect(normalizeTag('two words')).toBeNull();
    expect(normalizeTag('#')).toBeNull();
    expect(normalizeTag('a'.repeat(51))).toBeNull();
  });

  it('is enforced by the schema', () => {
    expect(tagSchema.safeParse('#Go').success).toBe(true);
    expect(tagSchema.safeParse('c#').success).toBe(false);
  });
});
