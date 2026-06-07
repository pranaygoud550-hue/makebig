import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ComponentProps } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { render } from './test-utils';
import { PostsTab } from '@/components/app/PostsTab';
import { ProfileViewProvider } from '@/lib/context/ProfileViewContext';
import type { ProjectData } from '@/lib/types';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    apiCheckHealth: vi.fn().mockResolvedValue(true),
    getAuthHeadersAsync: vi.fn().mockResolvedValue({ Authorization: 'Bearer test' }),
  };
});

vi.mock('@/lib/realtime', () => ({
  createApiSocket: vi.fn().mockResolvedValue(null),
  connectProjectRoom: vi.fn().mockResolvedValue(null),
}));

const project: ProjectData = {
  id: '6a241d0451d8efbd9d9ae093',
  name: 'Make Big Platform',
  description: 'Test project',
  categoryId: 'web',
  category: 'Web',
  skills: ['Developer'],
  mode: 'create',
  ownerContact: 'founder@example.com',
};

function renderPosts(props: Partial<ComponentProps<typeof PostsTab>> = {}) {
  return render(
    <ProfileViewProvider>
      <PostsTab
        currentProject={null}
        userContact="founder@example.com"
        onOpenDashboard={vi.fn()}
        onProjectSynced={vi.fn()}
        {...props}
      />
    </ProfileViewProvider>
  );
}

describe('PostsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { posts: [], hasMore: false },
      }),
    } as Response);
  });

  it('renders empty state when no project', () => {
    renderPosts();
    expect(screen.getByText('Share your progress')).toBeInTheDocument();
  });

  it('renders feed when project is linked', async () => {
    renderPosts({ currentProject: project });
    await waitFor(() => {
      expect(screen.getByText(/Make Big Platform — posts/i)).toBeInTheDocument();
    });
  });

  it('survives API success without posts array', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { hasMore: false } }),
    } as Response);
    renderPosts({ currentProject: project });
    await waitFor(() => {
      expect(screen.getByText(/No posts yet/i)).toBeInTheDocument();
    });
  });
});
