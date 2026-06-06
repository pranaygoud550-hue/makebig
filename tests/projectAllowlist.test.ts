import { describe, expect, it } from 'vitest';
import { filterAllowedProjects, isAllowedPublicProject } from '@/lib/projectAllowlist';

describe('projectAllowlist', () => {
  it('shows real user projects like issue reporting systems', () => {
    expect(isAllowedPublicProject({ name: 'Issue Reporting System' })).toBe(true);
    expect(isAllowedPublicProject({ name: 'Campus Food Delivery' })).toBe(true);
  });

  it('blocks obvious junk test names only', () => {
    expect(isAllowedPublicProject({ name: 'test project' })).toBe(false);
    expect(isAllowedPublicProject({ name: 'asdf' })).toBe(false);
  });

  it('filterAllowedProjects keeps valid projects', () => {
    const list = filterAllowedProjects([
      { name: 'Issue Reporting System' },
      { name: 'test project' },
      { name: 'Blood Bank App' },
    ]);
    expect(list.map((p) => p.name)).toEqual(['Issue Reporting System', 'Blood Bank App']);
  });
});
