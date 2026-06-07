export interface ProfileStrengthInput {
  name?: string;
  bio?: string;
  skills?: string[];
  college?: string;
  profileImage?: string;
}

export interface ProfileStrengthResult {
  score: number;
  label: string;
  color: 'red' | 'orange' | 'blue' | 'green';
  missingField: string | null;
  missingHint: string | null;
  anchor: 'name' | 'bio' | 'skills' | 'college' | 'photo' | null;
}

export function computeProfileStrength(input: ProfileStrengthInput): ProfileStrengthResult {
  let score = 0;
  const checks: { key: ProfileStrengthResult['anchor']; points: number; filled: boolean; label: string; hint: string }[] = [
    {
      key: 'name',
      points: 20,
      filled: Boolean(String(input.name || '').trim()),
      label: 'name',
      hint: 'Add your name',
    },
    {
      key: 'bio',
      points: 20,
      filled: Boolean(String(input.bio || '').trim()),
      label: 'bio',
      hint: 'Add a short bio',
    },
    {
      key: 'skills',
      points: 20,
      filled: (input.skills || []).length >= 2,
      label: 'skills (at least 2)',
      hint: 'Add at least 2 skills',
    },
    {
      key: 'college',
      points: 20,
      filled: Boolean(String(input.college || '').trim()),
      label: 'college',
      hint: 'Add your college',
    },
    {
      key: 'photo',
      points: 20,
      filled: Boolean(String(input.profileImage || '').trim()),
      label: 'profile photo',
      hint: 'Upload a profile photo',
    },
  ];

  for (const c of checks) {
    if (c.filled) score += c.points;
  }

  const firstMissing = checks.find((c) => !c.filled);

  let label = 'Basic profile';
  let color: ProfileStrengthResult['color'] = 'red';
  if (score >= 100) {
    label = 'Complete profile ✓';
    color = 'green';
  } else if (score >= 71) {
    label = 'Almost complete';
    color = 'blue';
  } else if (score >= 41) {
    label = 'Getting there';
    color = 'orange';
  }

  return {
    score,
    label,
    color,
    missingField: firstMissing?.label || null,
    missingHint: firstMissing ? `Add your ${firstMissing.label} to strengthen your profile` : null,
    anchor: firstMissing?.key || null,
  };
}
