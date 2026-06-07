import { describe, expect, it } from 'vitest';
import { computeProfileStrength } from '@/lib/profileStrength';

describe('computeProfileStrength', () => {
  it('scores empty profile at 0%', () => {
    const r = computeProfileStrength({});
    expect(r.score).toBe(0);
    expect(r.label).toBe('Basic profile');
    expect(r.color).toBe('red');
  });

  it('scores complete profile at 100%', () => {
    const r = computeProfileStrength({
      name: 'Alex',
      bio: 'Builder',
      skills: ['react', 'node'],
      college: 'IIT',
      profileImage: 'data:image/png;base64,x',
    });
    expect(r.score).toBe(100);
    expect(r.label).toBe('Complete profile ✓');
    expect(r.color).toBe('green');
  });

  it('requires at least 2 skills for skills points', () => {
    const r = computeProfileStrength({ name: 'A', bio: 'B', skills: ['one'], college: 'C' });
    expect(r.score).toBe(60);
    expect(r.anchor).toBe('skills');
  });
});
