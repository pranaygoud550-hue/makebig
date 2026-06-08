import type { CodingLanguage, SkillDefinition, SkillExamClient, SkillGradeResult } from './types';
import { badgeFromScore, calculateSkillScore, scoreAnswers } from './scoring';
import { SKILL_CATALOG } from './catalogData';
import { getCodingChallenges, isCodingSkill } from './codingCatalog';
import { gradeCodingAnswers } from './codeGrading';

export function listVerifiableSkills() {
  return SKILL_CATALOG.map(({ id, name, description }) => ({ id, name, description }));
}

export function getSkillById(skillId: string): SkillDefinition | undefined {
  return SKILL_CATALOG.find((s) => s.id === skillId);
}

export function examForClient(skillId: string): SkillExamClient | null {
  const skill = getSkillById(skillId);
  if (!skill) return null;
  const coding = getCodingChallenges(skillId);
  return {
    skillId: skill.id,
    name: skill.name,
    description: skill.description,
    isCodingSkill: isCodingSkill(skillId),
    mcq: skill.mcq.map(({ id, question, options, difficulty }) => ({
      id,
      question,
      options,
      difficulty,
    })),
    practical: isCodingSkill(skillId)
      ? []
      : skill.practical.map(({ id, question, prompt, options }) => ({
          id,
          question,
          prompt,
          options,
        })),
    coding: coding
      ? coding.map(({ testCases: _t, ...rest }) => rest)
      : undefined,
  };
}

export function gradeSkillExam(
  skillId: string,
  mcqAnswers: number[],
  practicalAnswers: number[],
  codeSubmissions?: { code: string; language: CodingLanguage }[]
): SkillGradeResult | null {
  const skill = getSkillById(skillId);
  if (!skill) return null;

  if (mcqAnswers.length !== skill.mcq.length) return null;

  const codingChallenges = getCodingChallenges(skillId);
  const codingMode = Boolean(codingChallenges?.length);

  if (codingMode) {
    if (!codeSubmissions || codeSubmissions.length !== codingChallenges!.length) return null;
  } else if (practicalAnswers.length !== skill.practical.length) {
    return null;
  }

  let mcqCorrect = 0;
  skill.mcq.forEach((q, i) => {
    if (mcqAnswers[i] === q.correctIndex) mcqCorrect += 1;
  });

  let practicalScore = 0;
  if (codingMode && codingChallenges) {
    practicalScore = gradeCodingAnswers(skillId, codingChallenges, codeSubmissions!);
  } else {
    let practicalCorrect = 0;
    skill.practical.forEach((q, i) => {
      if (practicalAnswers[i] === q.correctIndex) practicalCorrect += 1;
    });
    practicalScore = scoreAnswers(practicalCorrect, skill.practical.length);
  }

  const mcqScore = scoreAnswers(mcqCorrect, skill.mcq.length);
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
