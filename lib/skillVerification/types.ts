export type SkillDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type SkillBadgeLevel =
  | 'expert'
  | 'advanced'
  | 'intermediate'
  | 'beginner'
  | 'not_verified';

export interface SkillQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: SkillDifficulty;
}

export interface PracticalQuestion {
  id: string;
  question: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  mcq: SkillQuestion[];
  practical: PracticalQuestion[];
}

export interface VerifiedSkillRecord {
  skillId: string;
  skillName: string;
  score: number;
  mcqScore: number;
  practicalScore: number;
  badge: SkillBadgeLevel;
  badgeLabel: string;
  badgeIcon: string;
  verifiedAt: string;
}

export type CodingLanguage = 'javascript' | 'python' | 'java' | 'cpp' | 'c';

export interface CodingChallengeClient {
  id: string;
  title: string;
  difficulty: SkillDifficulty;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  sampleInput: string;
  sampleOutput: string;
  languages: CodingLanguage[];
  starterCode: Partial<Record<CodingLanguage, string>>;
}

export interface CodingChallenge extends CodingChallengeClient {
  testCases: { input: string; expectedOutput: string }[];
}

export interface SkillExamClient {
  skillId: string;
  name: string;
  description: string;
  isCodingSkill?: boolean;
  mcq: Array<Omit<SkillQuestion, 'correctIndex'>>;
  practical: Array<Omit<PracticalQuestion, 'correctIndex'>>;
  coding?: CodingChallengeClient[];
}

export interface SkillGradeResult {
  skillId: string;
  skillName: string;
  /** Final score (70% test + 30% integrity) */
  score: number;
  testScore: number;
  integrityScore: number;
  mcqScore: number;
  practicalScore: number;
  badge: SkillBadgeLevel;
  badgeLabel: string;
  badgeIcon: string;
  verified: boolean;
  proctorFlags?: string[];
  suspicious?: boolean;
  sessionId?: string;
}
