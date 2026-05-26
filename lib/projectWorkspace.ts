import { ProjectData } from '@/lib/types';
import { isValidMongoId } from '@/lib/projectMappers';

/** User has a saved workspace (local or server). */
export function hasActiveWorkspace(project: ProjectData | null | undefined): boolean {
  if (project == null || !project.name) return false;
  return project.mode === 'create' || project.mode === 'member';
}

/** Valid MongoDB id — feed, AI, posts API work. */
export function hasProjectId(project: ProjectData | null | undefined): boolean {
  return isValidMongoId(project?.id);
}

/** Saved locally but not connected to server yet. */
export function projectNeedsSync(project: ProjectData | null | undefined): boolean {
  return hasActiveWorkspace(project) && !hasProjectId(project);
}

export function workspaceLabel(project: ProjectData | null | undefined): string {
  if (!project?.name) return 'Your project';
  return project.name;
}
