import { ProjectData } from '@/lib/types';

const API =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:5001';

/** Attach MongoDB id to a locally saved project by matching owner + name. */
export async function syncActiveProjectId(
  project: ProjectData,
  ownerContact: string
): Promise<ProjectData | null> {
  if (project.id || !project.name || !ownerContact) return project.id ? project : null;

  try {
    const res = await fetch(
      `${API}/api/projects?ownerContact=${encodeURIComponent(ownerContact.trim().toLowerCase())}`
    );
    const data = await res.json();
    if (!data.success) return null;

    const projects: { id?: string; name?: string; slug?: string }[] = data.data?.projects || [];
    const match = projects.find(
      (p) => p.name?.toLowerCase().trim() === project.name.toLowerCase().trim()
    );
    if (!match?.id) return null;

    const updated: ProjectData = {
      ...project,
      id: match.id,
      slug: match.slug || project.slug,
    };
    localStorage.setItem('makeBigActiveProject', JSON.stringify(updated));
    return updated;
  } catch {
    return null;
  }
}
