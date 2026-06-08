import type { ProjectData, User } from '@/lib/types';

/** Virtual project id for AI assistant before user creates/joins a team project. */
export const ADVISOR_PROJECT_ID = 'advisor';

export function buildAdvisorProject(user: User): ProjectData {
  const skillLine = user.skills?.length ? user.skills.join(', ') : 'not specified yet';
  return {
    id: ADVISOR_PROJECT_ID,
    name: 'AI Startup Advisor',
    description: `Pre-project coaching — validate ideas, plan next steps, and prepare to join or create a team. Your skills: ${skillLine}.`,
    category: 'Other',
    categoryId: 'other',
    skills: user.skills || [],
    vision: 'Explore ideas and find teammates before launching a project.',
    mode: 'create',
    city: user.city || '',
    state: user.state || '',
    ownerContact: user.contact,
  };
}

export function isAdvisorProject(project: ProjectData | null | undefined): boolean {
  return project?.id === ADVISOR_PROJECT_ID;
}
