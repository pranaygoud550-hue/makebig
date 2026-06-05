import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from './test-utils';
import { AICofounder } from '@/components/AICofounder';
import type { ProjectData, User } from '@/lib/types';

const streamAICofounder = vi.fn();

vi.mock('@/lib/aiCofounderStream', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/aiCofounderStream')>();
  return {
    ...actual,
    streamAICofounder: (...args: unknown[]) => streamAICofounder(...args),
  };
});

vi.mock('@/lib/api', () => ({
  getAuthHeadersAsync: vi.fn().mockResolvedValue({ Authorization: 'Bearer test' }),
}));

const baseProject: ProjectData = {
  id: 'proj-ai-1',
  name: 'Campus Food App',
  description: 'Delivery for students',
  categoryId: 'web',
  category: 'Web Development',
  skills: ['Frontend Developer'],
  mode: 'create',
};

const testUser: User = {
  contact: 'founder@example.com',
  name: 'Founder',
};

describe('AICofounder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { provider: 'anthropic' } }),
    } as Response);

    streamAICofounder.mockImplementation(async ({ onDelta, onDone }) => {
      onDelta('Hello ');
      onDelta('from Claude.');
      onDone({ provider: 'anthropic', devMode: false, usage: { totalUsed: 120, percent: 1 } });
    });
  });

  it('shows unlock message when project has no id', () => {
    render(
      <AICofounder project={{ ...baseProject, id: undefined }} user={testUser} />
    );
    expect(screen.getByText(/Publish your project to unlock AI/i)).toBeInTheDocument();
  });

  it('renders quick prompts and provider after status fetch', async () => {
    render(<AICofounder project={baseProject} user={testUser} />);

    expect(await screen.findByText('Validate my idea')).toBeInTheDocument();
    expect(screen.getByText('Who is my target user?')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('✓ Claude')).toBeInTheDocument();
    });
  });

  it('streams assistant message when a quick prompt is clicked', async () => {
    const user = userEvent.setup();
    render(<AICofounder project={baseProject} user={testUser} />);

    await screen.findByText('Validate my idea');
    await user.click(screen.getByRole('button', { name: /Validate my idea/i }));

    await waitFor(() => {
      expect(streamAICofounder).toHaveBeenCalled();
    });

    expect(
      await screen.findByText(/Hello from Claude/i, {}, { timeout: 3000 })
    ).toBeInTheDocument();
  });

  it('renders custom user message and streamed reply', async () => {
    const user = userEvent.setup();
    render(<AICofounder project={baseProject} user={testUser} />);

    const input = await screen.findByPlaceholderText(/Ask anything about your project/i);
    await user.type(input, 'What is our MVP?{Enter}');

    await waitFor(() => {
      expect(screen.getByText('What is our MVP?')).toBeInTheDocument();
    });

    expect(await screen.findByText(/Hello from Claude/i)).toBeInTheDocument();
  });

  it('shows error message when stream fails', async () => {
    streamAICofounder.mockImplementation(async ({ onError }) => {
      onError('Anthropic API rate limited');
    });

    const user = userEvent.setup();
    render(<AICofounder project={baseProject} user={testUser} />);

    await screen.findByText('Validate my idea');
    await user.click(screen.getByRole('button', { name: /Validate my idea/i }));

    expect(
      await screen.findByText('Anthropic API rate limited')
    ).toBeInTheDocument();
  });
});
