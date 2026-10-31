import { describe, expect, it } from 'vitest';

import { characterCount, POST_LIMITS, postInputSchema } from '../src/index.ts';

describe('characterCount', () => {
  it('counts emoji and accented letters once', () => {
    expect(characterCount('olá 👋')).toBe(5);
    expect(characterCount('👨‍👩‍👧')).toBe(1);
  });
});

describe('postInputSchema', () => {
  it('accepts a post at the limit and rejects one past it', () => {
    const atLimit = '👋'.repeat(POST_LIMITS.content);
    expect(postInputSchema.safeParse({ content: atLimit }).success).toBe(true);
    expect(postInputSchema.safeParse({ content: `${atLimit}!` }).success).toBe(false);
  });

  it('rejects blank posts', () => {
    expect(postInputSchema.safeParse({ content: '  \n ' }).success).toBe(false);
  });

  it('makes the title optional', () => {
    expect(postInputSchema.parse({ content: 'hi', title: null })).toEqual({
      content: 'hi',
      title: null,
    });
  });
});
