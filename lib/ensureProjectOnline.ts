import { apiCheckHealth, apiCreateProject, apiPublishProject, getAuthToken } from '@/lib/api';
import { getErrorMessage } from '@/lib/userErrors';
import { ProjectData } from '@/lib/types';
import {
  apiProjectToProjectData,
  isValidMongoId,
  projectDataToApiPayload,
} from '@/lib/projectMappers';

import { getClientApiRoot } from '@/lib/apiBase';

const API = getClientApiRoot();

export type EnsureProjectReason =
  | 'linked'
  | 'created'
  | 'api_offline'
  | 'no_auth'
  | 'plan_limit'
  | 'not_found';

export interface EnsureProjectResult {
  ok: boolean;
  project?: ProjectData;
  reason: EnsureProjectReason;
  message: string;
}

function saveLocal(project: ProjectData) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('makeBigActiveProject', JSON.stringify(project));
  }
}

async function fetchOwnerProjects(ownerContact: string) {
  const res = await fetch(
    `${API}/projects?ownerContact=${encodeURIComponent(ownerContact.trim().toLowerCase())}`
  );
  const data = await res.json();
  if (!data.success) return [];
  return (data.data?.projects || []) as { id?: string; name?: string; slug?: string; desc?: string }[];
}

function findByName(
  projects: { id?: string; name?: string; slug?: string }[],
  name: string
) {
  const n = name.toLowerCase().trim();
  return projects.find((p) => p.name?.toLowerCase().trim() === n);
}

/** Find existing server project or create it — fixes “link” failures for local-only projects. */
export async function ensureProjectOnline(
  project: ProjectData,
  ownerContact: string
): Promise<EnsureProjectResult> {
  if (!project?.name || !ownerContact) {
    return {
      ok: false,
      reason: 'not_found',
      message: 'Missing project name or sign-in.',
    };
  }

  const apiUp = await apiCheckHealth();
  if (!apiUp) {
    return {
      ok: false,
      reason: 'api_offline',
      message:
        'API is not running. In a second terminal run: npm run api:dev (or use npm run dev:all to start both).',
    };
  }

  if (!getAuthToken()) {
    return {
      ok: false,
      reason: 'no_auth',
      message: 'Sign out and sign in again so tasks and posts can reach the server.',
    };
  }

  if (isValidMongoId(project.id)) {
    try {
      const res = await fetch(`${API}/projects/${project.id}`);
      const data = await res.json();
      if (data.success && data.data?.project) {
        const updated = apiProjectToProjectData(data.data.project, project.mode);
        saveLocal(updated);
        return { ok: true, project: updated, reason: 'linked', message: 'Project connected.' };
      }
    } catch {
      /* fall through to re-link */
    }
  }

  try {
    const list = await fetchOwnerProjects(ownerContact);
    let match = findByName(list, project.name);

    if (match?.id) {
      const updated: ProjectData = {
        ...project,
        id: match.id,
        slug: match.slug || project.slug,
      };
      saveLocal(updated);
      return {
        ok: true,
        project: updated,
        reason: 'linked',
        message: 'Project linked to your account.',
      };
    }

    const created = await apiCreateProject({
      ...projectDataToApiPayload(project, ownerContact),
      name: project.name,
      desc: project.description,
      categoryId: project.categoryId,
      roles: project.skills,
      salaryMin: project.salaryMin,
      salaryMax: project.salaryMax,
      currency: project.salaryCurrency,
      ownerContact: ownerContact.trim().toLowerCase(),
      city: project.city,
      state: project.state,
      projectPurpose: project.projectPurpose,
    } as import('@/lib/types').Project);

    if (!created.id) {
      return {
        ok: false,
        reason: 'not_found',
        message: 'Project creation failed — no project returned from server',
      };
    }

    const published = await apiPublishProject(created.id);
    const final = apiProjectToProjectData(published || created, project.mode);
    saveLocal(final);

    return {
      ok: true,
      project: final,
      reason: 'created',
      message: 'Project saved online. You can post and add tasks now.',
    };
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err?.code === 'PLAN_LIMIT') {
      return {
        ok: false,
        reason: 'plan_limit',
        message: err.message || 'Free plan project limit reached.',
      };
    }
    return {
      ok: false,
      reason: 'not_found',
      message: getErrorMessage(e, 'project'),
    };
  }
}

/** @deprecated Use ensureProjectOnline */
export async function syncActiveProjectId(
  project: ProjectData,
  ownerContact: string
): Promise<ProjectData | null> {
  const result = await ensureProjectOnline(project, ownerContact);
  return result.ok && result.project ? result.project : null;
}
