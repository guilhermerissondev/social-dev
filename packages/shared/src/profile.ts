import { z } from 'zod';

import { tagSchema } from './tags.ts';

export const PROFILE_LIMITS = {
  displayName: 50,
  bio: 300,
  location: 60,
  links: 4,
  linkLabel: 30,
  linkUrl: 200,
  technologies: 15,
} as const;

/** Main area of work. Labels live in the web app's translations. */
export const AREAS = [
  'frontend',
  'backend',
  'fullstack',
  'mobile',
  'data',
  'ai',
  'devops',
  'security',
  'qa',
  'games',
  'embedded',
  'other',
] as const;
export type Area = (typeof AREAS)[number];

/** Career stage, from student to staff and beyond. */
export const SENIORITIES = ['student', 'junior', 'mid', 'senior', 'staff'] as const;
export type Seniority = (typeof SENIORITIES)[number];

export const profileLinkSchema = z.object({
  label: z.string().trim().min(1).max(PROFILE_LIMITS.linkLabel),
  url: z.url({ protocol: /^https?$/ }).max(PROFILE_LIMITS.linkUrl),
});

export type ProfileLink = z.infer<typeof profileLinkSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(PROFILE_LIMITS.displayName),
  bio: z.string().trim().max(PROFILE_LIMITS.bio),
  location: z.string().trim().max(PROFILE_LIMITS.location),
  area: z.enum(AREAS).nullable().default(null),
  seniority: z.enum(SENIORITIES).nullable().default(null),
  links: z.array(profileLinkSchema).max(PROFILE_LIMITS.links),
  technologies: z.array(tagSchema).max(PROFILE_LIMITS.technologies),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
