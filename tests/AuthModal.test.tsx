import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from './test-utils';
import { AuthModal } from '@/components/AuthModal';

const { signInWithPassword, signInWithOtp, signUp } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signInWithOtp: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signInWithPassword,
      signInWithOtp,
      signUp,
      signInWithOAuth: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api', () => ({
  apiSendOTP: vi.fn(),
  apiVerifyOTP: vi.fn(),
  setAuthToken: vi.fn(),
}));

describe('AuthModal', () => {
  const onClose = vi.fn();
  const onSignIn = vi.fn();
  const onSignUp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null,
    });
    signUp.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null,
    });
    signInWithOtp.mockResolvedValue({ error: null });
  });

  it('does not render when closed', () => {
    render(
      <AuthModal isOpen={false} onClose={onClose} onSignIn={onSignIn} onSignUp={onSignUp} />
    );
    expect(screen.queryByText(/Sign in to your Make Big account/i)).not.toBeInTheDocument();
  });

  it('shows sign-in validation for invalid email', async () => {
    const user = userEvent.setup();
    render(<AuthModal isOpen onClose={onClose} onSignIn={onSignIn} onSignUp={onSignUp} />);

    await user.type(screen.getByPlaceholderText(/you@college.edu/i), 'not-valid');
    await user.type(screen.getByPlaceholderText(/Your password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));

    expect(await screen.findByText(/Invalid email address|Enter your phone number/i)).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('shows sign-in validation for short password', async () => {
    const user = userEvent.setup();
    render(<AuthModal isOpen onClose={onClose} onSignIn={onSignIn} onSignUp={onSignUp} />);

    await user.type(screen.getByPlaceholderText(/you@college.edu/i), 'user@example.com');
    await user.type(screen.getByPlaceholderText(/Your password/i), '123');
    await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));

    expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('signs in with valid password credentials', async () => {
    const user = userEvent.setup();
    render(<AuthModal isOpen onClose={onClose} onSignIn={onSignIn} onSignUp={onSignUp} />);

    await user.type(screen.getByPlaceholderText(/you@college.edu/i), 'user@example.com');
    await user.type(screen.getByPlaceholderText(/Your password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret123',
      });
    });
    expect(onSignIn).toHaveBeenCalledWith('user@example.com');
  });

  it('shows signup validation for short name on Continue', async () => {
    const user = userEvent.setup();
    render(<AuthModal isOpen onClose={onClose} onSignIn={onSignIn} onSignUp={onSignUp} />);

    await user.click(screen.getByRole('button', { name: /Join Now/i }));
    await user.type(screen.getByPlaceholderText(/Enter your full name/i), 'A');
    await user.type(screen.getByPlaceholderText(/you@college.edu/i), 'new@example.com');
    await user.type(screen.getByPlaceholderText(/At least 6 characters/i), 'password1');
    await user.click(screen.getByRole('button', { name: 'Continue', exact: true }));

    expect(screen.getByRole('heading', { name: 'Personal details' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Education' })).not.toBeInTheDocument();
  });

  it('shows signup validation for invalid email on Continue', async () => {
    const user = userEvent.setup();
    render(<AuthModal isOpen onClose={onClose} onSignIn={onSignIn} onSignUp={onSignUp} />);

    await user.click(screen.getByRole('button', { name: /Join Now/i }));
    await user.type(screen.getByPlaceholderText(/Enter your full name/i), 'Jane Doe');
    await user.type(screen.getByPlaceholderText(/you@college.edu/i), 'bad-email');
    await user.type(screen.getByPlaceholderText(/At least 6 characters/i), 'password1');
    await user.click(screen.getByRole('button', { name: 'Continue', exact: true }));

    expect(screen.getByRole('heading', { name: 'Personal details' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Education' })).not.toBeInTheDocument();
  });

  it('shows magic link validation when email is missing @', async () => {
    const user = userEvent.setup();
    render(<AuthModal isOpen onClose={onClose} onSignIn={onSignIn} onSignUp={onSignUp} />);

    await user.click(screen.getByRole('button', { name: /Magic link/i }));
    await user.type(screen.getByPlaceholderText(/you@college.edu/i), '5551234567');
    await user.click(screen.getByRole('button', { name: /Send magic link/i }));

    expect(
      await screen.findByText('Magic link requires an email address')
    ).toBeInTheDocument();
    expect(signInWithOtp).not.toHaveBeenCalled();
  });
});
