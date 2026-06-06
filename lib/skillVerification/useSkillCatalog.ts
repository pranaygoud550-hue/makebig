'use client';

import { listVerifiableSkills } from '@/lib/skillVerification/exam';

/** Static skill catalog — same data served by GET /api/skills/catalog */
export function useSkillCatalog() {
  return { skills: listVerifiableSkills(), loading: false };
}
