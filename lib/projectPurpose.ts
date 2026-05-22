/** How the project is positioned — controls salary/budget UI. */
export type ProjectPurpose = 'employment' | 'college' | 'creative' | 'community';

export const PROJECT_PURPOSE_OPTIONS: {
  id: ProjectPurpose;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    id: 'college',
    title: 'College / campus project',
    description: 'Coursework, hackathons, clubs — usually unpaid collaboration.',
    icon: '🎓',
  },
  {
    id: 'employment',
    title: 'Employment / internship',
    description: 'Paid role with a monthly salary or stipend.',
    icon: '💼',
  },
  {
    id: 'creative',
    title: 'Creative collaboration',
    description: 'Film, music, design, content — portfolio-first, not a job posting.',
    icon: '🎨',
  },
  {
    id: 'community',
    title: 'Community / social impact',
    description: 'NGO, volunteer, or civic project — no salary expected.',
    icon: '🤝',
  },
];

export function showsSalaryForPurpose(purpose?: ProjectPurpose | string | null): boolean {
  return purpose === 'employment';
}

/** Infer purpose for older projects without the field. */
export function inferProjectPurpose(
  purpose?: ProjectPurpose | string | null,
  salaryMax?: number,
  salaryMin?: number
): ProjectPurpose {
  if (purpose && PROJECT_PURPOSE_OPTIONS.some((p) => p.id === purpose)) {
    return purpose as ProjectPurpose;
  }
  if ((salaryMax || 0) > 0 || (salaryMin || 0) > 0) return 'employment';
  return 'college';
}
