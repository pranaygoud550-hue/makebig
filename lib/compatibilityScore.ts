export interface CompatibilityInput {
  ownerSkills?: string[];
  ownerCity?: string;
  ownerGraduationYear?: string;
  ownerHobbies?: string[];
  ownerLastActive?: string;
  projectRoles?: string[];
  candidateSkills?: string[];
  candidateCity?: string;
  candidateGraduationYear?: string;
  candidateHobbies?: string[];
  candidateLastActive?: string;
  candidateFilledSkills?: string[];
}

function norm(s: string) {
  return s.toLowerCase().trim();
}

function skillOverlap(a: string[], b: string[]) {
  const setB = new Set(b.map(norm));
  return a.filter((s) => {
    const n = norm(s);
    return [...setB].some((bS) => bS.includes(n) || n.includes(bS));
  });
}

function activityBucket(lastActive?: string): 'daily' | 'weekly' | 'stale' {
  if (!lastActive) return 'stale';
  const days = Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000);
  if (days <= 1) return 'daily';
  if (days <= 7) return 'weekly';
  return 'stale';
}

export function computeCompatibility(input: CompatibilityInput): {
  score: number;
  reasons: string[];
} {
  const ownerSkills = input.ownerSkills || [];
  const candidateSkills = input.candidateSkills || [];
  const projectRoles = input.projectRoles || [];
  const gap = projectRoles.filter(
    (r) => !ownerSkills.some((os) => norm(os).includes(norm(r)) || norm(r).includes(norm(os)))
  );
  const complementary = skillOverlap(
    gap.length ? gap : projectRoles,
    candidateSkills
  );
  const ownerOnly = ownerSkills.filter(
    (os) => !candidateSkills.some((cs) => norm(cs).includes(norm(os)) || norm(os).includes(norm(cs)))
  );

  let score = 0;
  const reasons: string[] = [];

  if (complementary.length > 0) {
    const pts = Math.min(30, Math.round((complementary.length / Math.max(gap.length || projectRoles.length, 1)) * 30));
    score += pts;
    if (ownerOnly.length && complementary.length) {
      reasons.push(
        `Complements your ${ownerOnly.slice(0, 2).join(', ')} skills with ${complementary.slice(0, 2).join(', ')}`
      );
    } else {
      reasons.push(`Brings ${complementary.slice(0, 2).join(', ')} to your team`);
    }
  }

  if (
    input.ownerCity &&
    input.candidateCity &&
    norm(input.ownerCity) === norm(input.candidateCity)
  ) {
    score += 20;
    reasons.push('Same city');
  }

  if (
    input.ownerGraduationYear &&
    input.candidateGraduationYear &&
    input.ownerGraduationYear === input.candidateGraduationYear
  ) {
    score += 10;
    reasons.push('Same graduation year');
  }

  const ownerAct = activityBucket(input.ownerLastActive);
  const candAct = activityBucket(input.candidateLastActive);
  if (ownerAct === candAct && ownerAct !== 'stale') {
    score += 20;
    reasons.push(ownerAct === 'daily' ? 'Both active daily' : 'Similar activity level');
  } else if (ownerAct !== 'stale' && candAct !== 'stale') {
    score += 10;
    reasons.push('Both recently active');
  }

  const commonInterests = skillOverlap(input.ownerHobbies || [], input.candidateHobbies || []);
  if (commonInterests.length > 0) {
    score += Math.min(20, commonInterests.length * 10);
    reasons.push(`Shared interests: ${commonInterests.slice(0, 2).join(', ')}`);
  }

  return { score: Math.min(100, score), reasons: reasons.slice(0, 4) };
}

export function compatibilityLabel(score: number) {
  return `${score}% compatible`;
}
