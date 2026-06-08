import { describe, expect, it } from 'vitest';
import {
  getViewerProjectRelation,
  shouldHideFromExploreFeed,
} from '@/lib/projectMembership';

describe('projectMembership', () => {
  const project = {
    ownerContact: 'owner@test.com',
    teamMembers: [
      { contact: 'joined@test.com', status: 'joined' },
      { contact: 'pending@test.com', status: 'pending' },
    ],
  };

  it('detects owner, joined, pending, and none', () => {
    expect(getViewerProjectRelation('owner@test.com', project)).toBe('owner');
    expect(getViewerProjectRelation('joined@test.com', project)).toBe('joined');
    expect(getViewerProjectRelation('pending@test.com', project)).toBe('pending');
    expect(getViewerProjectRelation('stranger@test.com', project)).toBe('none');
  });

  it('hides owner and joined from explore feeds', () => {
    expect(shouldHideFromExploreFeed('owner')).toBe(true);
    expect(shouldHideFromExploreFeed('joined')).toBe(true);
    expect(shouldHideFromExploreFeed('pending')).toBe(false);
    expect(shouldHideFromExploreFeed('none')).toBe(false);
  });
});
