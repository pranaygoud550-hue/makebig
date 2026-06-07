import { describe, expect, it } from 'vitest';
import { dedupeById, dedupeProjectsById, dedupeProjectsForDisplay } from '@/lib/dedupeProjects';

describe('dedupeProjects', () => {
  it('removes duplicate ids', () => {
    const list = dedupeById([
      { id: 'a', name: 'One' },
      { id: 'a', name: 'One again' },
      { id: 'b', name: 'Two' },
    ]);
    expect(list).toHaveLength(2);
    expect(list.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('dedupeProjectsById alias works', () => {
    const list = dedupeProjectsById([{ id: 'x' }, { id: 'x' }]);
    expect(list).toHaveLength(1);
  });

  it('removes duplicate slugs when ids differ', () => {
    const list = dedupeById([
      { id: '1', slug: 'my-startup', name: 'A' },
      { id: '2', slug: 'my-startup', name: 'B' },
      { id: '3', slug: 'other', name: 'C' },
    ]);
    expect(list).toHaveLength(2);
    expect(list.map((p) => p.id)).toEqual(['1', '3']);
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
