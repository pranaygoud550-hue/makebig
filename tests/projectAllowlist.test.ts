import { describe, expect, it } from 'vitest';
import { filterAllowedProjects, isAllowedPublicProject } from '@/lib/projectAllowlist';

describe('projectAllowlist', () => {
  it('shows real user projects like issue reporting systems', () => {
    expect(isAllowedPublicProject({ name: 'Issue Reporting System' })).toBe(true);
    expect(
      isAllowedPublicProject({
        name: 'Campus Food Delivery',
        ownerContact: 'manideep@gmail.com',
      })
    ).toBe(true);
  });

  it('allows showcase demo projects in browse', () => {
    expect(
      isAllowedPublicProject({
        name: 'StudySync Web Portal',
        slug: 'studysync-web-portal-hyderabad',
        ownerContact: 'priya@demo.makebig.in',
      })
    ).toBe(true);
  });

  it('blocks junk test names', () => {
    expect(isAllowedPublicProject({ name: 'test project' })).toBe(false);
    expect(isAllowedPublicProject({ name: 'asdf' })).toBe(false);
  });

  it('filterAllowedProjects keeps valid projects', () => {
    const list = filterAllowedProjects([
      { name: 'Issue Reporting System' },
      { name: 'test project' },
      { name: 'Blood Bank App' },
      {
        name: 'StudySync Web Portal',
        slug: 'studysync-web-portal-hyderabad',
        ownerContact: 'priya@demo.makebig.in',
      },
    ]);
    expect(list.map((p) => p.name)).toEqual([
      'Issue Reporting System',
      'Blood Bank App',
      'StudySync Web Portal',
    ]);
  });
});
