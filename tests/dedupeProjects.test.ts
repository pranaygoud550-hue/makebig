import { describe, expect, it } from 'vitest';
import { dedupeProjectsById, dedupeProjectsForDisplay } from '@/lib/dedupeProjects';

describe('dedupeProjects', () => {
  it('removes duplicate ids', () => {
    const list = dedupeProjectsById([
      { id: 'a', name: 'One' },
      { id: 'a', name: 'One again' },
      { id: 'b', name: 'Two' },
    ]);
    expect(list).toHaveLength(2);
    expect(list.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('removes same owner + name with different ids', () => {
    const list = dedupeProjectsForDisplay([
      { id: '1', name: 'Issue Reporting System', ownerContact: 'a@test.com' },
      { id: '2', name: 'Issue Reporting System', ownerContact: 'a@test.com' },
      { id: '3', name: 'Other Project', ownerContact: 'b@test.com' },
    ]);
    expect(list).toHaveLength(2);
    expect(list.map((p) => p.id)).toEqual(['1', '3']);
  });
});
