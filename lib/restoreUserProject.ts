import { apiCheckHealth } from '@/lib/api';
import { apiProjectToProjectData } from '@/lib/projectMappers';
import { loadActiveProject, saveActiveProject } from '@/lib/activeProjectStorage';
import { hasActiveWorkspace } from '@/lib/projectWorkspace';
import { ProjectData } from '@/lib/types';
import { normalizeContact } from '@/lib/utils';

import { getApiOrigin } from '@/lib/apiBase';

const API = getApiOrigin();

export interface WorkspaceRow {
  id: string;
  name: string;
  desc?: string;
  categoryId?: string;
  roles?: string[];
  slug?: string;
  ownerContact?: string;
  city?: string;
  state?: string;
  status?: string;
  relation: 'owner' | 'member';
}

async function fetchWorkspacesFromServer(contact: string): Promise<WorkspaceRow[]> {
  try {
    const res = await fetch(
      `${API}/api/users/${encodeURIComponent(normalizeContact(contact))}/workspaces`
    );
    const data = await res.json();
    if (!data.success) return [];
    return data.data?.workspaces || [];
  } catch {
    return [];
  }
}

function workspaceToProjectData(row: WorkspaceRow, contact: string): ProjectData {
  const isOwner = normalizeContact(row.ownerContact || '') === normalizeContact(contact);
  return apiProjectToProjectData(
    {
      id: row.id,
      name: row.name,
      desc: row.desc || '',
      categoryId: row.categoryId || 'other',
      roles: row.roles || [],
      slug: row.slug,
      city: row.city,
      state: row.state,
      salaryMin: 0,
      salaryMax: 0,
      currency: 'INR',
    } as import('@/lib/types').Project,
    isOwner || row.relation === 'owner' ? 'create' : 'member'
  );
}

function pickBestWorkspace(rows: WorkspaceRow[], contact: string): ProjectData | null {
  if (!rows.length) return null;
  const norm = normalizeContact(contact);
  const score = (r: WorkspaceRow) => {
    let s = 0;
    if (normalizeContact(r.ownerContact || '') === norm) s += 10;
    if (r.status === 'published' || r.status === 'in-progress') s += 5;
    if (r.relation === 'owner') s += 3;
    return s;
  };
  const best = [...rows].sort((a, b) => score(b) - score(a))[0];
  return workspaceToProjectData(best, contact);
}

/** Restore saved project from device or server after sign-in. */
export async function restoreUserProject(contact: string): Promise<ProjectData | null> {
  if (!contact) return null;

  const local = loadActiveProject(contact);
  if (local && hasActiveWorkspace(local)) {
    return local;
  }

  const apiUp = await apiCheckHealth();
  if (!apiUp) return local;

  const rows = await fetchWorkspacesFromServer(contact);
  const picked = pickBestWorkspace(rows, contact);
  if (picked) {
    saveActiveProject(contact, picked);
    return picked;
  }

  return local;
}
