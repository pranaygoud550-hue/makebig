import { describe, expect, it } from 'vitest';
import { computeCompatibility, compatibilityLabel } from '@/lib/compatibilityScore';

describe('computeCompatibility', () => {
  it('scores complementary skills and same city', () => {
    const r = computeCompatibility({
      ownerSkills: ['react'],
      ownerCity: 'Hyderabad',
      projectRoles: ['react', 'ui/ux'],
      candidateSkills: ['ui/ux', 'figma'],
      candidateCity: 'Hyderabad',
      candidateLastActive: new Date().toISOString(),
      ownerLastActive: new Date().toISOString(),
    });
    expect(r.score).toBeGreaterThanOrEqual(50);
    expect(r.reasons.some((x) => x.includes('Same city'))).toBe(true);
  });

  it('formats compatibility label', () => {
    expect(compatibilityLabel(87)).toBe('87% compatible');
  });
});
