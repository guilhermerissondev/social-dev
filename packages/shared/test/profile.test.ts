import { describe, expect, it } from 'vitest';

import { updateProfileSchema } from '../src/index.ts';

const valid = {
  displayName: ' Ada Lovelace ',
  bio: 'Writes the first programs.',
  location: 'London',
  links: [{ label: 'Site', url: 'https://ada.dev' }],
  technologies: ['TypeScript', '#rust'],
};

describe('updateProfileSchema', () => {
  it('accepts a complete profile and trims text', () => {
    const result = updateProfileSchema.parse(valid);
    expect(result.displayName).toBe('Ada Lovelace');
  });

  it('only accepts http and https links', () => {
    const links = [{ label: 'x', url: 'javascript:alert(1)' }];
    expect(updateProfileSchema.safeParse({ ...valid, links }).success).toBe(false);
  });

  it('limits the number of technologies', () => {
    const technologies = Array.from({ length: 16 }, (_, index) => `tech${index}`);
    expect(updateProfileSchema.safeParse({ ...valid, technologies }).success).toBe(false);
  });

  it('requires a display name', () => {
    expect(updateProfileSchema.safeParse({ ...valid, displayName: '   ' }).success).toBe(false);
  });
});
