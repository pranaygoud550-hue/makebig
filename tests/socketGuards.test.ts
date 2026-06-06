import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  getSocketUser,
  requireSocketUser,
  requireSocketProjectMember,
  requireSocketProjectOwner,
} from '../backend/events/socketGuards.js';

vi.mock('../backend/models/Project.js', () => ({
  default: {
    findById: vi.fn(),
  },
}));

import Project from '../backend/models/Project.js';

function mockSocket(user = null) {
  const events = [];
  return {
    user,
    emit: vi.fn((event, payload) => events.push({ event, payload })),
    _events: events,
  };
}

describe('socketGuards', () => {
  beforeEach(() => {
    vi.mocked(Project.findById).mockReset();
  });

  it('getSocketUser returns normalized contact and userId', () => {
    const user = getSocketUser({
      user: { userId: 'abc123', contact: 'Test@Example.com' },
    });
    expect(user).toEqual({ contact: 'test@example.com', userId: 'abc123' });
  });

  it('getSocketUser returns null without contact', () => {
    expect(getSocketUser({ user: { userId: 'x' } })).toBeNull();
    expect(getSocketUser({ user: null })).toBeNull();
  });

  it('requireSocketUser emits error when unauthenticated', () => {
    const socket = mockSocket(null);
    expect(requireSocketUser(socket)).toBeNull();
    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Authentication required' });
  });

  it('requireSocketProjectMember rejects non-members', async () => {
    const socket = mockSocket({ userId: 'u1', contact: 'member@test.com' });
    vi.mocked(Project.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        ownerContact: 'owner@test.com',
        teamMembers: [{ contact: 'other@test.com', status: 'joined' }],
      }),
    });

    const result = await requireSocketProjectMember(socket, 'proj1');
    expect(result).toBeNull();
    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'You must join this project first' });
  });

  it('requireSocketProjectMember allows owner', async () => {
    const socket = mockSocket({ userId: 'u1', contact: 'owner@test.com' });
    const project = {
      ownerContact: 'owner@test.com',
      teamMembers: [],
    };
    vi.mocked(Project.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(project),
    });

    const result = await requireSocketProjectMember(socket, 'proj1');
    expect(result?.user.contact).toBe('owner@test.com');
    expect(result?.project).toEqual(project);
  });

  it('requireSocketProjectOwner rejects non-owner members', async () => {
    const socket = mockSocket({ userId: 'u2', contact: 'member@test.com' });
    vi.mocked(Project.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        ownerContact: 'owner@test.com',
        teamMembers: [{ contact: 'member@test.com', status: 'joined' }],
      }),
    });

    const result = await requireSocketProjectOwner(socket, 'proj1');
    expect(result).toBeNull();
    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Only the project owner can do this' });
  });
});
