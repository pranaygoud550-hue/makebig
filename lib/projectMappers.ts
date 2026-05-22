import { Project } from '@/lib/types';
import type { ProjectData } from '@/lib/types';

export function isValidMongoId(id: string | undefined): boolean {
  return Boolean(id && /^[a-f0-9]{24}$/i.test(id));
}

export function apiProjectToProjectData(
  api: Project & { desc?: string },
  mode: ProjectData['mode'] = 'create'
): ProjectData {
  return {
    id: api.id,
    name: api.name,
    description: api.desc || (api as { description?: string }).description || '',
    categoryId: api.categoryId || 'other',
    category: '',
    projectPurpose: api.projectPurpose,
    skills: api.roles || [],
    deadline: '',
    vision: '',
    salaryMin: api.salaryMin,
    salaryMax: api.salaryMax,
    salaryCurrency: api.currency || 'INR',
    city: api.city,
    state: api.state,
    slug: api.slug,
    mode,
  };
}

export function projectDataToApiPayload(
  project: ProjectData,
  ownerContact: string
): Record<string, unknown> {
  return {
    name: project.name,
    desc: project.description,
    description: project.description,
    categoryId: project.categoryId || 'other',
    projectPurpose: project.projectPurpose || 'college',
    roles: project.skills || [],
    salaryMin: project.salaryMin ?? 0,
    salaryMax: project.salaryMax ?? 0,
    currency: project.salaryCurrency || 'INR',
    city: project.city || '',
    state: project.state || '',
    ownerContact: ownerContact.trim().toLowerCase(),
  };
}
