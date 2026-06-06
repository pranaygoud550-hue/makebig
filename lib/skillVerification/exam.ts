import type { SkillDefinition, SkillExamClient, SkillGradeResult } from './types';
import { badgeFromScore, calculateSkillScore, scoreAnswers } from './scoring';
import { SKILL_CATALOG } from './catalogData';

export function listVerifiableSkills() {
  return SKILL_CATALOG.map(({ id, name, description }) => ({ id, name, description }));
}

export function getSkillById(skillId: string): SkillDefinition | undefined {
  return SKILL_CATALOG.find((s) => s.id === skillId);
}

export function examForClient(skillId: string): SkillExamClient | null {
  const skill = getSkillById(skillId);
  if (!skill) return null;
  return {
    skillId: skill.id,
    name: skill.name,
    description: skill.description,
    mcq: skill.mcq.map(({ id, question, options, difficulty }) => ({
      id,
      question,
      options,
      difficulty,
    })),
    practical: skill.practical.map(({ id, question, prompt, options }) => ({
      id,
      question,
      prompt,
      options,
    })),
  };
}

export function gradeSkillExam(
  skillId: string,
  mcqAnswers: number[],
  practicalAnswers: number[]
): SkillGradeResult | null {
  const skill = getSkillById(skillId);
  if (!skill) return null;

  if (mcqAnswers.length !== skill.mcq.length || practicalAnswers.length !== skill.practical.length) {
    return null;
  }

  let mcqCorrect = 0;
  skill.mcq.forEach((q, i) => {
    if (mcqAnswers[i] === q.correctIndex) mcqCorrect += 1;
  });

  let practicalCorrect = 0;
  skill.practical.forEach((q, i) => {
    if (practicalAnswers[i] === q.correctIndex) practicalCorrect += 1;
  });

  const mcqScore = scoreAnswers(mcqCorrect, skill.mcq.length);
  const practicalScore = scoreAnswers(practicalCorrect, skill.practical.length);
  const testScore = calculateSkillScore(mcqScore, practicalScore);

  return {
    skillId: skill.id,
    skillName: skill.name,
    score: testScore,
    testScore,
    integrityScore: 100,
    mcqScore,
    practicalScore,
    verified: testScore >= 50,
    ...badgeFromScore(testScore),
  };
}

export function toVerifiedSkillRecord(result: SkillGradeResult) {
  return {
    skillId: result.skillId,
    skillName: result.skillName,
    score: result.score,
    testScore: result.testScore,
    integrityScore: result.integrityScore,
    mcqScore: result.mcqScore,
    practicalScore: result.practicalScore,
    badge: result.badge,
    badgeLabel: result.badgeLabel,
    badgeIcon: result.badgeIcon,
    proctorFlags: result.proctorFlags || [],
    suspicious: Boolean(result.suspicious),
    verifiedAt: new Date().toISOString(),
  };
}
