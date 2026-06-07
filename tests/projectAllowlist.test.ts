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

  it('blocks seeded demo projects and junk test names', () => {
    expect(
      isAllowedPublicProject({
        name: 'Campus Food Delivery',
        slug: 'campus-food-delivery-hyderabad',
        ownerContact: 'priya@demo.makebig.in',
      })
    ).toBe(false);
    expect(isAllowedPublicProject({ name: 'test project' })).toBe(false);
    expect(isAllowedPublicProject({ name: 'asdf' })).toBe(false);
  });

  it('filterAllowedProjects keeps valid projects', () => {
    const list = filterAllowedProjects([
      { name: 'Issue Reporting System' },
      { name: 'test project' },
      { name: 'Blood Bank App' },
      {
        name: 'Campus Food Delivery',
        slug: 'campus-food-delivery-hyderabad',
        ownerContact: 'priya@demo.makebig.in',
      },
    ]);
    expect(list.map((p) => p.name)).toEqual(['Issue Reporting System', 'Blood Bank App']);
  });
});
