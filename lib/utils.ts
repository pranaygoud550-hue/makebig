export function formatSalaryBand(
  min: number,
  max: number,
  currency: string
): string {
  return `${currency} ${Number(min).toLocaleString()} – ${Number(
    max
  ).toLocaleString()} / month`;
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function normalizeContact(contact: string): string {
  const v = String(contact || '').trim().toLowerCase();
  if (!v) return '';
  if (v.includes('@')) return v;
  const digits = v.replace(/\D/g, '');
  if (digits.length >= 10) {
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    return digits.length > 15 ? digits.slice(-15) : digits;
  }
  return digits || v;
}

export function normalizeSkillLabel(skill: string): string {
  return String(skill || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function budgetBandOverlapScore(
  projMin: number,
  projMax: number,
  rateMin: number,
  rateMax: number
): number {
  if (!Number.isFinite(projMin) || !Number.isFinite(projMax) || projMax < projMin) {
    return 50;
  }

  const lo = Math.max(projMin, rateMin);
  const hi = Math.min(projMax, rateMax);

  if (hi >= lo) {
    const overlap = hi - lo + 1;
    const pSpan = Math.max(projMax - projMin + 1, 1);
    const cSpan = Math.max(rateMax - rateMin + 1, 1);
    return Math.min(100, Math.round(55 + (overlap / Math.min(pSpan, cSpan)) * 45));
  }

  const gap = Math.min(
    Math.abs(rateMax - projMin),
    Math.abs(projMax - rateMin)
  );
  const scale = Math.max(projMax, rateMax, 1);
  return Math.max(8, Math.round(45 - (gap / scale) * 80));
}

export function skillAlignmentForInvite(
  selectedSkills: string[],
  personSkills: string[],
  personTagline: string
): { exact: number; partial: number; skillScore: number } {
  const pNorm = personSkills.map(normalizeSkillLabel);
  const hay = `${personTagline} ${pNorm.join(' ')}`.toLowerCase();

  let exact = 0;
  let partial = 0;

  (selectedSkills || []).forEach((sel) => {
    const n = normalizeSkillLabel(sel);
    if (!n) return;

    // Check for exact match (case-insensitive)
    const exactHit = pNorm.some(
      (ps) => ps === n || ps.includes(n) || n.includes(ps)
    );

    if (exactHit) {
      exact += 1;
    } else {
      // Check for partial matches with fuzzy matching
      const parts = n.split(/[\s/]+/).filter((p) => p.length > 2);
      const fuzzyMatch = parts.some((part) => {
        // Check direct substring match
        if (hay.includes(part)) return true;
        // Check for common variations (e.g., "game developer" vs "gamedevloper")
        const noSpace = part.replace(/\s/g, '');
        if (hay.includes(noSpace)) return true;
        // Check if part appears in any normalized skill
        return pNorm.some((ps) => 
          ps.includes(part) || part.includes(ps) || 
          ps.replace(/\s/g, '') === noSpace
        );
      });

      if (fuzzyMatch) {
        partial += 1;
      }
    }
  });

  const exactScore = Math.min(48, exact * 16);
  const partialScore = Math.min(22, partial * 9);

  return {
    exact,
    partial,
    skillScore: exactScore + partialScore,
  };
}

export function extractInviteKeywords(
  projectName: string,
  shortDesc: string,
  vision: string
): string[] {
  const chunks = `${projectName} ${shortDesc} ${vision}`.toLowerCase();
  const raw = chunks.match(/[a-z0-9][a-z0-9+#.]{2,}/g) || [];
  const stop = new Set([
    'the',
    'and',
    'for',
    'with',
    'this',
    'that',
    'from',
    'your',
    'our',
    'are',
    'you',
    'want',
    'will',
    'can',
    'has',
    'have',
    'was',
    'were',
    'into',
    'about',
    'team',
    'project',
    'build',
    'make',
    'need',
    'looking',
  ]);

  return raw.filter((w) => !stop.has(w)).slice(0, 40);
}

export function keywordBoostForInvite(
  keywords: string[],
  personTagline: string,
  personSkills: string[]
): number {
  if (!keywords.length) return 0;

  const hay = `${personTagline} ${personSkills.join(' ')}`.toLowerCase();
  let hits = 0;

  keywords.forEach((k) => {
    if (hay.includes(k)) hits += 1;
  });

  return Math.min(28, hits * 5);
}

export function salaryExpectationFit(expect: number | null, salaryMin: number, salaryMax: number): number {
  if (!expect || Number.isNaN(expect)) return 74;
  if (expect >= salaryMin && expect <= salaryMax) return 100;

  const mid = (salaryMin + salaryMax) / 2;
  const drift = Math.abs(expect - mid) / Math.max(expect, mid);

  return Math.max(40, Math.round(100 - drift * 110));
}

export function countSkillSignals(
  skills: string[],
  roleBlob: string | string[]
): number {
  if (!skills || !skills.length) return 2;

  const blob = Array.isArray(roleBlob)
    ? roleBlob.join(' ').toLowerCase()
    : String(roleBlob).toLowerCase();

  let hits = 0;

  skills.forEach((skill) => {
    skill
      .toLowerCase()
      .split(/[^a-z0-9+.#]+/)
      .forEach((tok) => {
        if (tok.length > 2 && blob.includes(tok)) hits += 1;
      });
  });

  return Math.min(hits, 8);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';
}

export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes
    .filter((c) => typeof c === 'string')
    .join(' ');
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getSkillMatchCount(userSkills: string[], projectSkills: string[]): number {
  if (!userSkills.length || !projectSkills.length) return 0;
  const norm = (s: string) => s.toLowerCase().trim();
  const uNorm = userSkills.map(norm);
  return projectSkills.filter(ps => {
    const p = norm(ps);
    return uNorm.some(u => u === p || u.includes(p) || p.includes(u));
  }).length;
}
