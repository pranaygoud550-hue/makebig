import { ProjectData } from '@/lib/types';
import { normalizeContact } from '@/lib/utils';
import { hasActiveWorkspace } from '@/lib/projectWorkspace';

const LEGACY_KEY = 'makeBigActiveProject';
const BY_CONTACT_KEY = 'makeBigProjectsByContact';
const LAST_CONTACT_KEY = 'makeBigLastContact';

function loadMap(): Record<string, ProjectData> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(BY_CONTACT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ProjectData>) : {};
  } catch {
    return {};
  }
}

/** Persist active project for this account (survives sign-out / sign-in). */
export function saveActiveProject(contact: string, project: ProjectData) {
  if (typeof window === 'undefined') return;
  const norm = normalizeContact(contact);
  localStorage.setItem(LEGACY_KEY, JSON.stringify(project));
  localStorage.setItem(LAST_CONTACT_KEY, norm);
  const map = loadMap();
  map[norm] = project;
  localStorage.setItem(BY_CONTACT_KEY, JSON.stringify(map));
}

export function loadActiveProject(contact: string): ProjectData | null {
  if (typeof window === 'undefined') return null;
  const norm = normalizeContact(contact);
  const map = loadMap();
  const fromMap = map[norm];
  if (fromMap && hasActiveWorkspace(fromMap)) {
    return fromMap;
  }

  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return null;
    const parsed = JSON.parse(legacy) as ProjectData;
    if (!parsed?.name) return null;
    const last = localStorage.getItem(LAST_CONTACT_KEY);
    if (last && last !== norm) return null;
    if (parsed.mode !== 'create' && parsed.mode !== 'member') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Clear session pointer only — per-contact project map is kept for next login. */
export function clearSessionActiveProject() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LEGACY_KEY);
  localStorage.removeItem(LAST_CONTACT_KEY);
}
