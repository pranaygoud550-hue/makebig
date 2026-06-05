import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from './test-utils';
import { ProjectWizardNew } from '@/components/ProjectWizardNew';
import type { ProjectData } from '@/lib/types';

vi.mock('@/lib/api', () => ({
  apiBrowseProjects: vi.fn().mockResolvedValue([]),
  apiJoinProject: vi.fn().mockResolvedValue(undefined),
}));

describe('ProjectWizardNew', () => {
  const onClose = vi.fn();
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <ProjectWizardNew isOpen={false} onClose={onClose} onComplete={onComplete} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders mode picker when open', () => {
    render(<ProjectWizardNew isOpen onClose={onClose} onComplete={onComplete} />);
    expect(screen.getByText('What would you like to do?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create a project/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Join a project/i })).toBeInTheDocument();
  });

  it('shows validation errors on create step 1 when Next is clicked without required fields', async () => {
    const user = userEvent.setup();
    render(<ProjectWizardNew isOpen onClose={onClose} onComplete={onComplete} />);

    await user.click(screen.getByRole('button', { name: /Create a project/i }));
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Next →/i }));
    expect(screen.getByText('Please enter a project name.')).toBeInTheDocument();
  });

  it('navigates create flow steps with Next and Back', async () => {
    const user = userEvent.setup();
    render(<ProjectWizardNew isOpen onClose={onClose} onComplete={onComplete} />);

    await user.click(screen.getByRole('button', { name: /Create a project/i }));

    await user.type(screen.getByPlaceholderText(/Campus Food/i), 'Test App');
    await user.type(
      screen.getByPlaceholderText(/Connect hostel students/i),
      'A one-line pitch for testing'
    );
    await user.click(screen.getByRole('button', { name: /Web Development/i }));

    await user.click(screen.getByRole('button', { name: /Next →/i }));
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Frontend Developer/i }));
    await user.click(screen.getByRole('button', { name: /Next →/i }));
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    expect(screen.getByText('Review & Publish')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /← Back/i }));
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
  });

  it('requires at least one skill on step 2', async () => {
    const user = userEvent.setup();
    render(<ProjectWizardNew isOpen onClose={onClose} onComplete={onComplete} />);

    await user.click(screen.getByRole('button', { name: /Create a project/i }));
    await user.type(screen.getByPlaceholderText(/Campus Food/i), 'Skill Test');
    await user.type(screen.getByPlaceholderText(/Connect hostel/i), 'Description here');
    await user.click(screen.getByRole('button', { name: /Web Development/i }));
    await user.click(screen.getByRole('button', { name: /Next →/i }));

    await user.click(screen.getByRole('button', { name: /Next →/i }));
    expect(screen.getByText('Choose at least one skill.')).toBeInTheDocument();
  });

  it('submits valid create data via Publish Project', async () => {
    const user = userEvent.setup();
    render(<ProjectWizardNew isOpen onClose={onClose} onComplete={onComplete} />);

    await user.click(screen.getByRole('button', { name: /Create a project/i }));
    await user.type(screen.getByPlaceholderText(/Campus Food/i), 'Campus Delivery');
    await user.type(screen.getByPlaceholderText(/Connect hostel/i), 'Food delivery for students');
    await user.click(screen.getByRole('button', { name: /Web Development/i }));
    await user.click(screen.getByRole('button', { name: /Next →/i }));

    await user.click(screen.getByRole('button', { name: /Frontend Developer/i }));
    await user.click(screen.getByRole('button', { name: /Next →/i }));

    expect(screen.getByText('Campus Delivery')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Publish Project/i }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const payload = onComplete.mock.calls[0][0] as ProjectData;
    expect(payload.name).toBe('Campus Delivery');
    expect(payload.description).toBe('Food delivery for students');
    expect(payload.categoryId).toBe('web');
    expect(payload.skills).toContain('Frontend Developer');
    expect(payload.mode).toBe('create');
  });

  it('renders join flow step 1 and step 2', async () => {
    const user = userEvent.setup();
    render(
      <ProjectWizardNew
        isOpen
        onClose={onClose}
        onComplete={onComplete}
        initialEntry="join"
        initialSkills={['Frontend Developer']}
      />
    );

    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('What can you bring?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Next →/i }));
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Explore & join')).toBeInTheDocument();
  });
});
