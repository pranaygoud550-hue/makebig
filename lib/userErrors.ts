/**
 * User-facing error messages — specific, actionable copy (never "Something went wrong").
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const v = email.trim();
  if (!v) return 'Enter your email address';
  if (!EMAIL_RE.test(v)) return 'Invalid email address';
  return null;
}

export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return 'Enter your phone number';
  if (digits.length < 10 || digits.length > 15) return 'Invalid phone number — use 10 digits';
  return null;
}

export function validateContact(contact: string): string | null {
  const v = contact.trim();
  if (!v) return 'Enter your email or phone number';
  if (v.includes('@')) return validateEmail(v);
  return validatePhone(v);
}

export function validateName(name: string): string | null {
  const v = name.trim();
  if (!v) return 'Enter your full name';
  if (v.length < 2) return 'Name is too short';
  return null;
}

export function validateOtpCode(code: string): string | null {
  const v = code.trim();
  if (!v) return 'Enter the 6-digit OTP code';
  if (!/^\d{6}$/.test(v)) return 'OTP must be 6 digits';
  return null;
}

/** Map raw API / server strings to friendly copy */
export function mapApiError(raw: string | undefined | null, context?: string): string {
  if (!raw?.trim()) return contextFallback(context);

  const msg = raw.trim();
  const lower = msg.toLowerCase();

  const exact: Record<string, string> = {
    'contact required': 'Enter your email or phone number',
    'contact and code required': 'Enter your email and OTP code',
    'contact and otp code are required': 'Enter your email and OTP code',
    'incorrect otp.': 'Incorrect OTP code',
    'incorrect otp': 'Incorrect OTP code',
    'no otp found. please request a new one.': 'No OTP found — tap Send OTP again',
    'no otp found. tap send otp again.': 'No OTP found — tap Send OTP again',
    'otp expired. please request a new one.': 'OTP expired — tap Send OTP again',
    'otp expired. tap send otp again.': 'OTP expired — tap Send OTP again',
    'name and contact required': 'Name and email/phone are required',
    'name and categoryid required': 'Project name and category are required',
    'name and category required': 'Project name and category are required',
    'project name is required': 'Project name is required',
    'please select a project category': 'Please select a project category',
    'title required': 'Task title is required',
    'membercontact required': 'Sign in again to join this project',
    'enter your email or phone number': 'Enter your email or phone number',
    'invalid email address': 'Invalid email address',
    'invalid phone number — use 10 digits': 'Invalid phone number — use 10 digits',
    'incorrect otp code': 'Incorrect OTP code',
    'email or phone is required': 'Enter your email or phone number',
    'project not found': 'Project not found — it may have been removed',
    'task not found': 'Task not found',
    'user not found': 'Account not found — sign up first',
    'account not found — sign up first': 'Account not found — sign up first',
    'account already exists — sign in instead': 'Account already exists — sign in instead',
    'you cannot join your own project': 'You cannot join your own project',
    'you already joined this project': 'You already joined this project',
    'project is not open for joining': 'This project is not open for new members',
    'project team is full': 'This project team is full',
    'profile image too large (max ~1mb)': 'Profile photo is too large — use an image under 1MB',
    'verification failed': 'OTP verification failed — check the code and try again',
    'could not send otp. try again.': 'Could not send OTP — check your email/phone and try again',
    'failed to send otp': 'Could not send OTP — check your email/phone and try again',
    'network error — check your connection': 'Network error — check your internet connection',
  };

  if (exact[lower]) return exact[lower];

  if (lower.includes('plan_limit') || lower.includes('free plan includes')) {
    return msg.includes('Free plan') ? msg : 'Free plan limit reached — upgrade to Pro for more projects';
  }
  if (lower.includes('invalid email') || lower.includes('email address is invalid')) {
    return 'Invalid email address';
  }
  if (lower.includes('password') && lower.includes('short')) return 'Password too short';
  if (lower.includes('unauthorized') || lower.includes('invalid token')) {
    return 'Session expired — sign out and sign in again';
  }
  if (lower.includes('no token provided') || lower.includes('sign in again')) {
    return msg.includes('join') ? 'Sign in again to join this project' : 'Sign in again to continue';
  }
  if (lower.includes('cors')) return 'Server connection error — refresh the page';
  if (lower.includes('econnrefused') || lower.includes('fetch failed')) {
    return 'API is offline — run npm run dev or check your deployment';
  }
  if (lower.includes('create project') || lower.includes('project create')) {
    return msg.startsWith('Project') ? msg : `Project creation failed: ${msg}`;
  }
  if (context === 'project' && !msg.toLowerCase().startsWith('project')) {
    return `Project creation failed: ${msg}`;
  }
  if (context === 'task' && !lower.includes('task')) {
    return `Could not save task: ${msg}`;
  }
  if (context === 'post' && !lower.includes('post')) {
    return `Could not publish post: ${msg}`;
  }
  if (context === 'profile') {
    return msg.includes('profile') ? msg : `Profile save failed: ${msg}`;
  }
  if (context === 'join') {
    return msg.includes('join') ? msg : `Could not join project: ${msg}`;
  }
  if (context === 'otp') {
    return msg.includes('OTP') || msg.includes('otp') ? msg : `OTP error: ${msg}`;
  }

  return msg;
}

function contextFallback(context?: string): string {
  switch (context) {
    case 'otp':
      return 'Could not send OTP — check your email/phone and try again';
    case 'project':
      return 'Project creation failed — check your connection and try again';
    case 'task':
      return 'Could not save task — sign in again and retry';
    case 'post':
      return 'Could not publish post — add text or a smaller image';
    case 'profile':
      return 'Profile save failed — check your connection and try again';
    case 'join':
      return 'Could not join project — try again in a moment';
    case 'ai':
      return 'AI request failed — check that the API is running';
    case 'load':
      return 'Could not load data — refresh the page';
    default:
      return 'Request failed — please try again';
  }
}

export function getErrorMessage(error: unknown, context?: string): string {
  if (error instanceof Error) {
    if (error.name === 'PlanLimitError' || error.message.includes('Free plan')) {
      return mapApiError(error.message, context);
    }
    return mapApiError(error.message, context);
  }
  if (typeof error === 'string') return mapApiError(error, context);
  return contextFallback(context);
}

/** Server-side: normalize project create validation */
export function projectCreateError(field: 'name' | 'category' | 'auth'): string {
  switch (field) {
    case 'name':
      return 'Project name is required';
    case 'category':
      return 'Please select a project category';
    case 'auth':
      return 'Sign in again to create a project';
    default:
      return 'Project creation failed';
  }
}
