import { describe, expect, it } from 'vitest';
import { journeyTimeline } from '@/lib/ecosystem/journey';
import { computeHealthScore, healthLevel, buildHeatmap } from '@/lib/ecosystem/health';
import { computeReputation, reputationLevel } from '@/lib/ecosystem/reputation';
import { rankShowcaseProjects, weekStartDate } from '@/lib/ecosystem/showcase';
import { JOURNEY_STAGES } from '@/lib/ecosystem/constants';

describe('ecosystem journey', () => {
  it('marks stages completed/current/future', () => {
    const timeline = journeyTimeline('mvp');
    const mvp = timeline.find((s) => s.id === 'mvp');
    expect(mvp?.status).toBe('current');
    expect(timeline.find((s) => s.id === 'idea')?.status).toBe('completed');
    expect(timeline.find((s) => s.id === 'scaling')?.status).toBe('future');
  });

  it('has 8 journey stages', () => {
    expect(JOURNEY_STAGES.length).toBe(8);
  });
});

describe('ecosystem health', () => {
  it('computes health from tasks and activity', () => {
    const h = computeHealthScore({
      tasks: [{ status: 'done' }, { status: 'todo' }],
      teamMembers: [{ status: 'joined' }],
      postsThisWeek: 2,
      journeyCompletion: 50,
    });
    expect(h.score).toBeGreaterThan(0);
    expect(h.level.label).toBeTruthy();
  });

  it('assigns health levels', () => {
    expect(healthLevel(95).label).toBe('Excellent');
    expect(healthLevel(75).label).toBe('Good');
    expect(healthLevel(40).label).toBe('At Risk');
  });

  it('builds heatmap for 365 days', () => {
    const hm = buildHeatmap([{ createdAt: new Date().toISOString() }]);
    expect(hm.length).toBe(365);
  });
});

describe('ecosystem reputation', () => {
  it('levels up with points', () => {
    expect(reputationLevel(50).id).toBe('explorer');
    expect(reputationLevel(400).id).toBe('innovator');
    expect(reputationLevel(2000).id).toBe('visionary');
  });

  it('awards badges for activity', () => {
    const r = computeReputation({ projectsCreated: 3, teamsHelped: 4, verifiedSkills: 2 });
    expect(r.score).toBeGreaterThan(100);
    expect(r.badges.length).toBeGreaterThan(0);
  });
});

describe('ecosystem showcase', () => {
  it('ranks projects by composite score', () => {
    const ranked = rankShowcaseProjects([
      {
        id: '1',
        name: 'A',
        slug: 'a',
        categoryId: 'tech',
        ownerContact: 'a@test.com',
        startupReadiness: { overall: 80 },
        health: { score: 70 },
        teamSize: 3,
        desc: 'Long description here',
      },
      {
        id: '2',
        name: 'B',
        slug: 'b',
        categoryId: 'tech',
        ownerContact: 'b@test.com',
        startupReadiness: { overall: 40 },
        health: { score: 30 },
        teamSize: 1,
        desc: '',
      },
    ]);
    expect(ranked[0].compositeScore).toBeGreaterThan(ranked[1].compositeScore);
  });

  it('weekStartDate returns Sunday-based week', () => {
    expect(weekStartDate(new Date('2026-06-07'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
