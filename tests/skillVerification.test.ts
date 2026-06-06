import { describe, expect, it } from 'vitest';
import { badgeFromScore, calculateSkillScore, scoreAnswers } from '@/lib/skillVerification/scoring';
import { gradeSkillExam, getSkillById } from '@/lib/skillVerification/exam';

describe('skillVerification scoring', () => {
  it('weights MCQ 40% and practical 60%', () => {
    expect(calculateSkillScore(100, 0)).toBe(40);
    expect(calculateSkillScore(0, 100)).toBe(60);
    expect(calculateSkillScore(80, 90)).toBe(86);
  });

  it('assigns badge tiers', () => {
    expect(badgeFromScore(96).badge).toBe('expert');
    expect(badgeFromScore(85).badge).toBe('advanced');
    expect(badgeFromScore(70).badge).toBe('intermediate');
    expect(badgeFromScore(55).badge).toBe('beginner');
    expect(badgeFromScore(40).badge).toBe('not_verified');
  });

  it('grades a full skill exam', () => {
    const def = getSkillById('frontend_developer')!;
    const skill = gradeSkillExam(
      'frontend_developer',
      def.mcq.map((q) => q.correctIndex),
      def.practical.map((q) => q.correctIndex)
    );
    expect(skill?.testScore).toBe(100);
    expect(skill?.score).toBe(100);
    expect(skill?.verified).toBe(true);
  });

  it('scoreAnswers handles empty total', () => {
    expect(scoreAnswers(0, 0)).toBe(0);
    expect(scoreAnswers(3, 10)).toBe(30);
  });
});
