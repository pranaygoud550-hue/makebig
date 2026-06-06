import { describe, expect, it } from 'vitest';
import { calculateIntegrityScore } from '@/lib/skillVerification/integrity';
import { calculateFinalSkillScore } from '@/lib/skillVerification/finalScore';
import {
  computeStartupReadiness,
  computeTeamScore,
  computeMarketScore,
} from '@/lib/startupReadiness/compute';

describe('integrity scoring', () => {
  it('starts at 100 with no violations', () => {
    const r = calculateIntegrityScore({ violations: [], proctoringLogs: [], webcamConsent: true });
    expect(r.score).toBe(100);
    expect(r.suspicious).toBe(false);
  });

  it('deducts for tab switches and flags multiple issues', () => {
    const r = calculateIntegrityScore({
      violations: [{ type: 'tab_switch' }, { type: 'tab_switch' }, { type: 'tab_switch' }],
      proctoringLogs: [{ type: 'multiple_faces' }],
      webcamConsent: true,
    });
    expect(r.score).toBeLessThan(70);
    expect(r.flags).toContain('multiple_faces');
  });

  it('caps score when webcam consent declined', () => {
    const r = calculateIntegrityScore({ violations: [], proctoringLogs: [], webcamConsent: false });
    expect(r.score).toBeLessThanOrEqual(85);
    expect(r.flags).toContain('no_webcam_consent');
  });
});

describe('final skill score', () => {
  it('weights test 70% and integrity 30%', () => {
    expect(calculateFinalSkillScore(85, 90)).toBe(87);
    expect(calculateFinalSkillScore(100, 100)).toBe(100);
    expect(calculateFinalSkillScore(0, 100)).toBe(30);
  });
});

describe('startup readiness', () => {
  it('computes team score from verified members', () => {
    const team = computeTeamScore({
      name: 'Test',
      desc: 'A startup',
      categoryId: 'tech',
      status: 'published',
      roles: ['dev'],
      ownerContact: 'a@test.com',
      teamMembers: [{ status: 'joined', contact: 'b@test.com' }],
      teamUsers: [
        { verifiedSkills: [{ skillId: 'frontend_developer', score: 90 }], skills: ['react'] },
        { verifiedSkills: [{ skillId: 'backend_developer', score: 80 }], skills: ['node'] },
      ],
    });
    expect(team).toBeGreaterThan(40);
  });

  it('computes market score from problem description', () => {
    const market = computeMarketScore({
      name: 'Food delivery',
      desc: 'Students face a problem finding affordable food. Our solution targets campus users with strong competition from existing apps.',
      categoryId: 'tech',
      status: 'draft',
      roles: [],
    });
    expect(market).toBeGreaterThan(50);
  });

  it('averages four pillars into overall score', () => {
    const r = computeStartupReadiness({
      name: 'P',
      desc: 'Problem and solution for users in the market with competitors',
      categoryId: 'tech',
      status: 'in-progress',
      roles: ['dev', 'design'],
      validation: { usersInterviewed: 5, mvpExists: true },
      tasks: [{ status: 'done' }, { status: 'todo' }],
      postsCount: 2,
      teamUsers: [{ verifiedSkills: [{ score: 80 }], skills: ['a', 'b'] }],
    });
    expect(r.overall).toBe(Math.round((r.team + r.market + r.validation + r.progress) / 4));
  });
});
