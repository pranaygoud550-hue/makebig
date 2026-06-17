'use client';

import { useState, useRef, useEffect } from 'react';
import { apiSendOTP, apiVerifyOTP, apiAuthLogin } from '@/lib/api';
import { validateContact, validateName, getErrorMessage } from '@/lib/userErrors';
import { BrandLogo } from '@/components/BrandLogo';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { searchColleges } from '@/lib/telanganaColleges';
import { SkillVerificationFlow } from '@/components/skillVerification/SkillVerificationFlow';
import { useSkillCatalog } from '@/lib/skillVerification/useSkillCatalog';
import { SkillBadgeChip } from '@/components/skillVerification/SkillBadgeChip';
import type { SkillGradeResult } from '@/lib/skillVerification/types';
import { toVerifiedSkillRecord } from '@/lib/skillVerification/exam';
import type { VerifiedSkill } from '@/lib/types';
import { useToast } from '@/lib/context/ToastContext';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signin' | 'signup';
  onClose: () => void;
  onSignIn: (contact: string) => void | Promise<void>;
  onSignUp: (
    name: string,
    contact: string,
    skills: string[],
    hobbies: string[],
    college: string,
    graduationYear: string,
    verifiedSkills?: VerifiedSkill[],
    password?: string,
    signupMeta?: { pendingSkillIds?: string[]; skillTestSkipped?: boolean }
  ) => void | Promise<void>;
}

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 12 }, (_, i) => String(CURRENT_YEAR + 4 - i));

export function AuthModal({ isOpen, initialMode = 'signin', onClose, onSignIn, onSignUp }: AuthModalProps) {
  const { skills: catalogSkills, loading: catalogLoading } = useSkillCatalog();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

  // Multi-step signup: 1=personal, 2=education, 3=skills, 4=verify tests, 5=otp
  const [step, setStep] = useState(1);
  const [otpError, setOtpError] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sign In fields
  const [siContact, setSiContact] = useState('');
  const [siStep, setSiStep] = useState<'contact' | 'otp'>('contact');
  const [siOtpValues, setSiOtpValues] = useState(['', '', '', '', '', '']);
  const siOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [siOtpError, setSiOtpError] = useState('');
  const [siOtpSending, setSiOtpSending] = useState(false);
  const [siOtpVerifying, setSiOtpVerifying] = useState(false);
  const [siOtpRetryStatus, setSiOtpRetryStatus] = useState('');
  const [signUpOtpRetryStatus, setSignUpOtpRetryStatus] = useState('');
  const [siDevCode, setSiDevCode] = useState<string | null>(null);
  const [signUpDevCode, setSignUpDevCode] = useState<string | null>(null);
  const [siOtpSentMsg, setSiOtpSentMsg] = useState('');
  const [signUpOtpSentMsg, setSignUpOtpSentMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [signInMethod, setSignInMethod] = useState<'password' | 'magic' | 'otp'>('password');
  const [siPassword, setSiPassword] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Sign Up fields
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [college, setCollege] = useState('');
  const [collegeSuggestions, setCollegeSuggestions] = useState<string[]>([]);
  const [showCollegeDrop, setShowCollegeDrop] = useState(false);
  const [gradYear, setGradYear] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [verificationResults, setVerificationResults] = useState<SkillGradeResult[]>([]);
  const [verificationDone, setVerificationDone] = useState(false);
  const [skippedVerification, setSkippedVerification] = useState(false);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [hobbyInput, setHobbyInput] = useState('');

  const collegeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (collegeRef.current && !collegeRef.current.contains(e.target as Node)) {
        setShowCollegeDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setStep(1);
    setSiStep('contact');
    setOtpError('');
    setSiOtpError('');
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const reset = () => {
    setMode('signin');
    setStep(1);
    setOtpValues(['', '', '', '', '', '']);
    setOtpError('');
    setSiContact('');
    setSiStep('contact');
    setSiOtpValues(['', '', '', '', '', '']);
    setSiOtpError('');
    setSiDevCode(null);
    setSignUpDevCode(null);
    setSiOtpRetryStatus('');
    setSignUpOtpRetryStatus('');
    setSiOtpSentMsg('');
    setSignUpOtpSentMsg('');
    setResendCooldown(0);
    setSignInMethod('password');
    setSiPassword('');
    setSignUpPassword('');
    setAuthLoading(false);
    setName(''); setContact(''); setCollege(''); setGradYear('');
    setSkills([]); setSelectedSkillIds([]); setVerificationResults([]); setVerificationDone(false);
    setSkippedVerification(false);
    setHobbies([]); setHobbyInput('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleOAuth = async (provider: 'google' | 'github') => {
    if (!isSupabaseConfigured) {
      showToast('Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env to enable OAuth.', 'warning');
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });
  };

  const googleButton = isSupabaseConfigured ? (
    <button
      type="button"
      onClick={() => void handleOAuth('google')}
      className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white border border-[#d9d9d9] rounded-xl text-sm font-semibold text-[#1d2226] hover:border-[#4285F4] hover:bg-[#fafafa] transition-all"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.56 2.95-2.23 5.45-4.78 7.13l7.73 6.01c4.51-4.16 7.11-10.28 7.11-17.64z" />
        <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19A23.97 23.97 0 0 0 0 24c0 3.93.94 7.65 2.56 10.94l7.97-6.35z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6.01c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      Continue with Google
    </button>
  ) : null;

  const handleSignInPassword = async () => {
    const contactErr = validateContact(siContact);
    if (contactErr) {
      setSiOtpError(contactErr);
      return;
    }
    if (!siPassword || siPassword.length < 6) {
      setSiOtpError('Password must be at least 6 characters');
      return;
    }
    setAuthLoading(true);
    setSiOtpError('');
    try {
      const normalized = siContact.trim().toLowerCase();
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalized,
          password: siPassword,
        });
        if (error) throw error;
        if (data.session?.access_token) {
          const { setAuthToken } = await import('@/lib/api');
          setAuthToken(data.session.access_token);
        }
      } else {
        await apiAuthLogin({ contact: normalized, password: siPassword });
      }
      await onSignIn(normalized);
      reset();
      onClose();
    } catch (e) {
      setSiOtpError(getErrorMessage(e, 'auth'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignInMagicLink = async () => {
    const contactErr = validateContact(siContact);
    if (contactErr) {
      setSiOtpError(contactErr);
      return;
    }
    if (!siContact.includes('@')) {
      setSiOtpError('Magic link requires an email address');
      return;
    }
    if (!isSupabaseConfigured) {
      setSiOtpError('Supabase is not configured');
      return;
    }
    setAuthLoading(true);
    setSiOtpError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: siContact.trim().toLowerCase(),
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
      setSiOtpSentMsg('Check your email for the magic link to sign in.');
    } catch (e) {
      setSiOtpError(getErrorMessage(e, 'otp'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUpWithPassword = async () => {
    const nameErr = validateName(name);
    if (nameErr) {
      setOtpError(nameErr);
      return;
    }
    const contactErr = validateContact(contact);
    if (contactErr) {
      setOtpError(contactErr);
      return;
    }
    if (!contact.includes('@')) {
      setOtpError('Sign up with email and password (phone OTP available separately)');
      return;
    }
    if (!signUpPassword || signUpPassword.length < 6) {
      setOtpError('Password must be at least 6 characters');
      return;
    }
    if (!isSupabaseConfigured) {
      setOtpError('Supabase is not configured');
      return;
    }
    setAuthLoading(true);
    setOtpError('');
    try {
      const email = contact.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: signUpPassword,
        options: {
          data: { name: name.trim(), skills, hobbies, college, graduationYear: gradYear },
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
      if (data.session?.access_token) {
        const { setAuthToken } = await import('@/lib/api');
        setAuthToken(data.session.access_token);
        await onSignUp(name.trim(), email, skills, hobbies, college.trim(), gradYear);
        reset();
        onClose();
      } else {
        setOtpError('Account created — confirm your email, then sign in with password.');
      }
    } catch (e) {
      setOtpError(getErrorMessage(e, 'auth'));
    } finally {
      setAuthLoading(false);
    }
  };

  // ——— College typeahead ———
  const handleCollegeChange = (val: string) => {
    setCollege(val);
    const suggestions = searchColleges(val);
    setCollegeSuggestions(suggestions);
    setShowCollegeDrop(suggestions.length > 0);
  };

  // ——— Hobbies chip management ———
  const addHobby = (h: string) => {
    const trimmed = h.trim();
    if (trimmed && !hobbies.includes(trimmed)) setHobbies([...hobbies, trimmed]);
    setHobbyInput('');
  };

  // ——— OTP boxes (signup) ———
  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otpValues];
    next[idx] = val.slice(-1);
    setOtpValues(next);
    setOtpError('');
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (next.every(Boolean)) verifyOtp(next.join(''));
  };
  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  // ——— OTP boxes (sign-in) ———
  const handleSiOtpChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...siOtpValues];
    next[idx] = val.slice(-1);
    setSiOtpValues(next);
    setSiOtpError('');
    if (val && idx < 5) siOtpRefs.current[idx + 1]?.focus();
    if (next.every(Boolean)) verifySiOtp(next.join(''));
  };
  const handleSiOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !siOtpValues[idx] && idx > 0) {
      siOtpRefs.current[idx - 1]?.focus();
    }
  };

  const startResendCooldown = () => setResendCooldown(45);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** Retry OTP send on 503 (Render cold start) with user-visible progress. */
  const sendOtpWithRetry = async (
    contactValue: string,
    purpose: 'signin' | 'signup',
    onRetryStatus: (msg: string) => void
  ): Promise<{ sent: boolean; devCode?: string; message: string }> => {
    const maxAttempts = 3;
    const payload = { contact: contactValue.trim().toLowerCase(), purpose };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: {
        success?: boolean;
        data?: { sent: boolean; devCode?: string; message: string };
        error?: string;
      } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (res.status === 503 || (res.status >= 500 && !data.success)) {
        if (attempt < maxAttempts) {
          onRetryStatus(
            `Server is waking up, retrying in 8 seconds… Attempt ${attempt} of ${maxAttempts}`
          );
          await sleep(8000);
          continue;
        }
        throw new Error('Please try again in 1 minute');
      }

      if (data.success && data.data) return data.data;

      throw new Error(data.error || 'Could not send OTP');
    }

    throw new Error('Please try again in 1 minute');
  };

  // ——— Sign In: send OTP ———
  const handleSiSend = async () => {
    const contactErr = validateContact(siContact);
    if (contactErr) {
      setSiOtpError(contactErr);
      return;
    }
    if (siOtpSending || resendCooldown > 0) return;
    setSiOtpSending(true);
    setSiOtpError('');
    setSiOtpRetryStatus('');
    try {
      let res: { sent: boolean; devCode?: string; message: string };
      if (isSupabaseConfigured) {
        res = await apiSendOTP(siContact.trim(), 'signin');
      } else {
        res = await sendOtpWithRetry(siContact.trim(), 'signin', setSiOtpRetryStatus);
      }
      setSiDevCode(res.devCode || null);
      setSiOtpSentMsg(res.message || 'OTP sent. Check your email or the code below.');
      setSiStep('otp');
      setSiOtpValues(['', '', '', '', '', '']);
      startResendCooldown();
      setTimeout(() => siOtpRefs.current[0]?.focus(), 100);
    } catch (e) {
      setSiDevCode(null);
      setSiOtpSentMsg('');
      const msg = getErrorMessage(e, 'otp');
      setSiOtpError(msg);
      if (msg.toLowerCase().includes('sign up first')) {
        setMode('signup');
        setStep(1);
        setContact(siContact.trim().toLowerCase());
      }
    } finally {
      setSiOtpSending(false);
      setSiOtpRetryStatus('');
    }
  };

  const verifySiOtp = async (code: string) => {
    setSiOtpVerifying(true);
    setSiOtpError('');
    try {
      const result = await apiVerifyOTP(siContact.trim(), code, 'signin');
      if (!result.ok) {
        setSiOtpError('Incorrect OTP code');
        setSiOtpValues(['', '', '', '', '', '']);
        return;
      }
      await onSignIn(siContact.trim().toLowerCase());
      reset();
      onClose();
    } catch (e) {
      setSiOtpError(getErrorMessage(e, 'otp'));
      setSiOtpValues(['', '', '', '', '', '']);
    } finally {
      setSiOtpVerifying(false);
    }
  };

  const handleSignUpSendOtp = async () => {
    const nameErr = validateName(name);
    if (nameErr) {
      setOtpError(nameErr);
      return;
    }
    const contactErr = validateContact(contact);
    if (contactErr) {
      setOtpError(contactErr);
      return;
    }
    if (otpSending || resendCooldown > 0) return;
    setOtpSending(true);
    setOtpError('');
    setSignUpOtpRetryStatus('');
    try {
      let res: { sent: boolean; devCode?: string; message: string };
      if (isSupabaseConfigured) {
        res = await apiSendOTP(contact.trim(), 'signup');
      } else {
        res = await sendOtpWithRetry(contact.trim(), 'signup', setSignUpOtpRetryStatus);
      }
      setSignUpDevCode(res.devCode || null);
      setSignUpOtpSentMsg(res.message || 'OTP sent.');
      setOtpValues(['', '', '', '', '', '']);
      if (step === 3 || step === 4) setStep(5);
      startResendCooldown();
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (e) {
      setSignUpDevCode(null);
      setSignUpOtpSentMsg('');
      const msg = getErrorMessage(e, 'otp');
      setOtpError(msg);
      if (msg.toLowerCase().includes('sign in instead')) {
        setSiContact(contact.trim().toLowerCase());
        setMode('signin');
        setSiStep('contact');
      }
    } finally {
      setOtpSending(false);
      setSignUpOtpRetryStatus('');
    }
  };

  const handleTakeTestLater = async () => {
    setOtpError('');
    const skillNames = selectedSkillIds
      .map((id) => catalogSkills.find((s) => s.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    if (skillNames.length) setSkills(skillNames);
    setSkippedVerification(true);
    setVerificationDone(false);
    setVerificationResults([]);
    await handleSignUpSendOtp();
  };

  const handleSignUpNext = async () => {
    if (step === 1) {
      const nameErr = validateName(name);
      if (nameErr) {
        setOtpError(nameErr);
        return;
      }
      const contactErr = validateContact(contact);
      if (contactErr) {
        setOtpError(contactErr);
        return;
      }
      if (!signUpPassword || signUpPassword.length < 6) {
        setOtpError('Password must be at least 6 characters');
        return;
      }
      setOtpError('');
    }
    if (step === 3) {
      if (selectedSkillIds.length === 0) {
        setOtpError('Select at least one skill to verify');
        return;
      }
      setOtpError('');
      setVerificationDone(false);
      setVerificationResults([]);
      setStep(4);
      return;
    }
    if (step === 4) {
      if (!verificationDone) {
        setOtpError('Complete skill verification tests first');
        return;
      }
      await handleSignUpSendOtp();
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const toggleSkillId = (id: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleVerificationComplete = (results: SkillGradeResult[]) => {
    setVerificationResults(results);
    setVerificationDone(true);
    const verifiedNames = results.filter((r) => r.score >= 50).map((r) => r.skillName);
    setSkills(verifiedNames);
  };

  const buildVerifiedSkillsPayload = (): VerifiedSkill[] =>
    verificationResults.map((r) => toVerifiedSkillRecord(r));

  const verifyOtp = async (code: string) => {
    setOtpVerifying(true);
    setOtpError('');
    try {
      const result = await apiVerifyOTP(contact.trim(), code, 'signup');
      if (!result.ok) {
        setOtpError('Incorrect OTP code');
        setOtpValues(['', '', '', '', '', '']);
        return;
      }
      await onSignUp(
        name.trim(),
        contact.trim().toLowerCase(),
        skills,
        hobbies,
        college.trim(),
        gradYear,
        verificationDone ? buildVerifiedSkillsPayload() : [],
        signUpPassword,
        skippedVerification
          ? { pendingSkillIds: selectedSkillIds, skillTestSkipped: true }
          : undefined
      );
      reset();
      onClose();
    } catch (e) {
      setOtpError(getErrorMessage(e, 'otp'));
      setOtpValues(['', '', '', '', '', '']);
    } finally {
      setOtpVerifying(false);
    }
  };

  if (!isOpen) return null;

  const totalSteps = 5;
  const progress = mode === 'signup' ? Math.round((step / totalSteps) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f3f2ef]">
      {/* Close */}
      <button
        onClick={handleClose}
        className="absolute top-5 right-6 text-[#666] hover:text-[#1d2226] text-2xl font-light transition-colors"
        aria-label="Close"
      >
        ✕
      </button>

      <div className={`w-full mx-auto px-6 ${step >= 4 && mode === 'signup' ? 'max-w-2xl' : 'max-w-lg'}`}>
        {/* Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <BrandLogo size="lg" href={null} className="mx-auto" />
          <p className="text-[#666] text-sm mt-3">Connect. Collaborate. Create.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#e0e0e0] overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-[#e0e0e0]">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setStep(1); setOtpValues(['','','','','','']); setSiStep('contact'); }}
                className={`flex-1 py-4 text-sm font-semibold transition-all ${
                  mode === m
                    ? 'text-[#0A66C2] border-b-2 border-[#0A66C2]'
                    : 'text-[#666] hover:text-[#1d2226]'
                }`}
              >
                {m === 'signin' ? 'Sign In' : 'Join Now'}
              </button>
            ))}
          </div>

          {/* Progress bar (signup only) */}
          {mode === 'signup' && (
            <div className="h-1 bg-[#f0f0f0]">
              <div
                className="h-full bg-[#0A66C2] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="p-8 space-y-5">
            {mode === 'signin' && googleButton}

            {mode === 'signin' && isSupabaseConfigured && (
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-[#e0e0e0]" />
                <span className="text-xs text-[#999]">or email</span>
                <span className="h-px flex-1 bg-[#e0e0e0]" />
              </div>
            )}

            {mode === 'signup' && isSupabaseConfigured && (
              <>
                {googleButton}
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-[#e0e0e0]" />
                  <span className="text-xs text-[#999]">or email</span>
                  <span className="h-px flex-1 bg-[#e0e0e0]" />
                </div>
              </>
            )}

            {/* ========= SIGN IN ========= */}
            {mode === 'signin' && (
              <>
                <div>
                  <h2 className="text-2xl font-bold text-[#1d2226]">Welcome back</h2>
                  <p className="text-[#666] text-sm mt-1">Sign in to your Make Big account</p>
                </div>

                <div className="flex gap-2">
                  {(isSupabaseConfigured
                    ? (['password', 'magic', 'otp'] as const)
                    : (['password', 'otp'] as const)
                  ).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setSignInMethod(m); setSiOtpError(''); setSiStep('contact'); }}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border ${
                        signInMethod === m
                          ? 'border-[#0A66C2] bg-[#EEF3FB] text-[#0A66C2]'
                          : 'border-[#d9d9d9] text-[#666]'
                      }`}
                    >
                      {m === 'password' ? 'Password' : m === 'magic' ? 'Magic link' : 'OTP'}
                    </button>
                  ))}
                </div>

                {signInMethod !== 'otp' && siStep === 'contact' ? (
                  <>
                    <Field label="Email or phone">
                      <input
                        type="text"
                        placeholder="you@college.edu or 10-digit mobile"
                        value={siContact}
                        onChange={(e) => setSiContact(e.target.value)}
                        autoComplete="username"
                        className={inputCls}
                      />
                    </Field>
                    {signInMethod === 'password' && (
                      <Field label="Password">
                        <input
                          type="password"
                          placeholder="Your password"
                          value={siPassword}
                          onChange={(e) => setSiPassword(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSignInPassword()}
                          autoComplete="current-password"
                          className={inputCls}
                        />
                      </Field>
                    )}
                    {siOtpSentMsg && signInMethod === 'magic' && (
                      <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        {siOtpSentMsg}
                      </p>
                    )}
                    {siOtpError && <p className="text-red-500 text-sm">{siOtpError}</p>}
                    <LiButton
                      onClick={signInMethod === 'password' ? handleSignInPassword : handleSignInMagicLink}
                      disabled={!siContact.trim() || authLoading || (signInMethod === 'password' && !siPassword)}
                    >
                      {authLoading
                        ? 'Please wait…'
                        : signInMethod === 'password'
                          ? 'Sign in'
                          : 'Send magic link'}
                    </LiButton>
                  </>
                ) : signInMethod === 'otp' && siStep === 'contact' ? (
                  <>
                    <Field label="Email or Phone">
                      <input
                        type="text"
                        placeholder="Enter your email or phone"
                        value={siContact}
                        onChange={(e) => setSiContact(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && siContact && handleSiSend()}
                        autoComplete="username"
                        className={inputCls}
                      />
                    </Field>
                    {siOtpError && <p className="text-red-500 text-sm">{siOtpError}</p>}
                    {siOtpRetryStatus && (
                      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        {siOtpRetryStatus}
                      </p>
                    )}
                    <LiButton onClick={handleSiSend} disabled={!siContact.trim() || siOtpSending || resendCooldown > 0}>
                      {siOtpSending ? 'Sending…' : resendCooldown > 0 ? `Wait ${resendCooldown}s` : 'Send OTP'}
                    </LiButton>
                  </>
                ) : signInMethod === 'otp' ? (
                  <>
                    <p className="text-sm text-[#666]">
                      Enter the 6-digit code sent to <strong className="text-[#1d2226]">{siContact}</strong>
                    </p>
                    {siOtpSentMsg && (
                      <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        {siOtpSentMsg}
                      </p>
                    )}
                    {siDevCode && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                        <p className="font-semibold">Dev mode — your OTP: {siDevCode}</p>
                        <p className="mt-1 text-xs text-blue-800">
                          Enter this code in the boxes below.
                        </p>
                      </div>
                    )}
                    <OtpBoxes
                      values={siOtpValues}
                      refs={siOtpRefs}
                      onChange={handleSiOtpChange}
                      onKeyDown={handleSiOtpKeyDown}
                      disabled={siOtpVerifying}
                    />
                    {siOtpVerifying && <p className="text-[#0A66C2] text-sm text-center">Verifying…</p>}
                    {siOtpError && <p className="text-red-500 text-sm">{siOtpError}</p>}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => { setSiStep('contact'); setSiOtpValues(['','','','','','']); setSiOtpError(''); }}
                        className="text-sm text-[#0A66C2] hover:underline"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={handleSiSend}
                        disabled={siOtpSending || resendCooldown > 0}
                        className="text-sm text-[#666] hover:text-[#0A66C2] hover:underline disabled:opacity-40"
                      >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                      </button>
                    </div>
                  </>
                ) : null}
              </>
            )}

            {/* ========= SIGN UP ========= */}
            {mode === 'signup' && (
              <>
                {/* Step labels */}
                <div className="flex items-center gap-2 mb-1">
                  {['Personal', 'Education', 'Skills', 'Verify', 'Account'].map((label, i) => (
                    <div key={label} className="flex items-center gap-1">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        step > i + 1 ? 'bg-[#0A66C2] text-white' :
                        step === i + 1 ? 'bg-[#0A66C2] text-white' :
                        'bg-[#e0e0e0] text-[#666]'
                      }`}>{step > i + 1 ? '✓' : i + 1}</span>
                      <span className={`text-xs hidden sm:block ${step === i + 1 ? 'text-[#0A66C2] font-semibold' : 'text-[#999]'}`}>{label}</span>
                      {i < 4 && <span className="text-[#ccc] text-xs">›</span>}
                    </div>
                  ))}
                </div>

                {/* Step 1: Personal */}
                {step === 1 && (
                  <>
                    <div>
                      <h2 className="text-xl font-bold text-[#1d2226]">Personal details</h2>
                      <p className="text-[#666] text-sm mt-1">Tell us who you are</p>
                    </div>
                    <Field label="Full Name *">
                      <input type="text" placeholder="Enter your full name" value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name" className={inputCls} />
                    </Field>
                    <Field label="Email or phone *">
                      <input type="text" placeholder="you@college.edu or 10-digit mobile" value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        autoComplete="username" className={inputCls} />
                    </Field>
                    <Field label="Password *">
                      <input type="password" placeholder="At least 6 characters" value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        autoComplete="new-password" className={inputCls} />
                    </Field>
                    <p className="text-xs text-[#999] -mt-2">
                      Use this password to sign in again after you log out.
                    </p>
                    <LiButton
                      onClick={handleSignUpNext}
                      disabled={
                        !name.trim() ||
                        !contact.trim() ||
                        !signUpPassword ||
                        signUpPassword.length < 6
                      }
                    >
                      Continue
                    </LiButton>
                  </>
                )}

                {/* Step 2: Education */}
                {step === 2 && (
                  <>
                    <div>
                      <h2 className="text-xl font-bold text-[#1d2226]">Education</h2>
                      <p className="text-[#666] text-sm mt-1">Where did you study?</p>
                    </div>

                    {/* College typeahead */}
                    <Field label="College / University *">
                      <div ref={collegeRef} className="relative">
                        <input
                          type="text"
                          placeholder="Start typing your college name..."
                          value={college}
                          onChange={(e) => handleCollegeChange(e.target.value)}
                          onFocus={() => college.length >= 2 && setShowCollegeDrop(true)}
                          autoComplete="off"
                          className={inputCls}
                        />
                        {showCollegeDrop && collegeSuggestions.length > 0 && (
                          <ul className="absolute z-50 w-full mt-1 bg-white border border-[#d9d9d9] rounded-lg shadow-lg max-h-52 overflow-y-auto">
                            {collegeSuggestions.map((c) => (
                              <li
                                key={c}
                                onMouseDown={() => { setCollege(c); setShowCollegeDrop(false); }}
                                className="px-4 py-2.5 text-sm text-[#1d2226] hover:bg-[#EEF3FB] cursor-pointer border-b border-[#f5f5f5] last:border-0"
                              >
                                {c}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </Field>

                    <Field label="Graduation Year *">
                      <select value={gradYear} onChange={(e) => setGradYear(e.target.value)}
                        className={inputCls}>
                        <option value="">Select year</option>
                        {GRAD_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </Field>

                    <div className="flex gap-3">
                      <BackButton onClick={() => setStep(1)} />
                      <LiButton onClick={handleSignUpNext} disabled={!college.trim() || !gradYear} flex1>
                        Continue
                      </LiButton>
                    </div>
                  </>
                )}

                {/* Step 3: Choose skills to verify */}
                {step === 3 && (
                  <>
                    <div>
                      <h2 className="text-xl font-bold text-[#1d2226]">Choose your skills</h2>
                      <p className="text-[#666] text-sm mt-1">
                        Select roles to verify with a short test — badges appear on your profile
                      </p>
                    </div>

                    <Field label="Skills to verify *">
                      {catalogLoading ? (
                        <p className="text-sm text-[#999]">Loading skill catalog…</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {catalogSkills.map((s) => {
                            const checked = selectedSkillIds.includes(s.id);
                            return (
                              <label
                                key={s.id}
                                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                                  checked
                                    ? 'border-[#0A66C2] bg-[#EEF3FB]'
                                    : 'border-[#e0e0e0] hover:bg-[#fafafa]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleSkillId(s.id)}
                                  className="mt-1"
                                />
                                <span>
                                  <span className="text-sm font-semibold text-[#1d2226] block">{s.name}</span>
                                  <span className="text-xs text-[#666]">{s.description}</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-xs text-[#999] mt-2">
                        Next: fullscreen proctored exam — 10 MCQ, then 2 coding problems (Frontend/Backend) in competitive exam layout
                      </p>
                    </Field>

                    <Field label="Hobbies & Interests (optional)">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 min-h-[36px]">
                          {hobbies.map((h) => (
                            <Chip key={h} label={h} onRemove={() => setHobbies(hobbies.filter((x) => x !== h))} color="green" />
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. Photography, Gaming…  (press Enter)"
                          value={hobbyInput}
                          onChange={(e) => setHobbyInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && hobbyInput) { e.preventDefault(); addHobby(hobbyInput); } }}
                          autoComplete="off"
                          className={inputCls}
                        />
                      </div>
                    </Field>

                    {otpError && <p className="text-red-500 text-sm">{otpError}</p>}

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-3">
                        <BackButton onClick={() => setStep(2)} />
                        <LiButton
                          onClick={handleSignUpNext}
                          flex1
                          disabled={catalogLoading || selectedSkillIds.length === 0}
                        >
                          Start verification →
                        </LiButton>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleTakeTestLater()}
                        disabled={otpSending}
                        className="w-full py-2.5 text-sm font-semibold text-[#666] hover:text-[#1d2226] hover:bg-[#f8f9fa] rounded-xl transition-colors"
                      >
                        Take test later — finish signup first
                      </button>
                    </div>
                  </>
                )}

                {/* Step 4: Skill verification tests */}
                {step === 4 && (
                  <>
                    {!verificationDone ? (
                      <SkillVerificationFlow
                        skillIds={selectedSkillIds}
                        contact={contact}
                        onComplete={handleVerificationComplete}
                        onBack={() => setStep(3)}
                        onSkip={() => void handleTakeTestLater()}
                      />
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-xl font-bold text-[#1d2226]">Verification complete</h2>
                          <p className="text-sm text-[#666] mt-1">Review your scores, then verify your account</p>
                        </div>
                        <ul className="space-y-2 max-h-40 overflow-y-auto">
                          {verificationResults.map((r) => (
                            <li
                              key={r.skillId}
                              className="flex items-center justify-between gap-2 rounded-xl border border-[#e0e0e0] px-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-semibold text-[#1d2226]">{r.skillName}</p>
                                <p className="text-xs text-[#666]">
                                  Final {r.score} · Test {r.testScore}% · Integrity {r.integrityScore}%
                                </p>
                              </div>
                              <SkillBadgeChip
                                badge={r.badge}
                                label={r.badgeLabel}
                                icon={r.badgeIcon}
                                score={r.score}
                              />
                            </li>
                          ))}
                        </ul>
                        {otpError && <p className="text-red-500 text-sm">{otpError}</p>}
                        <div className="flex gap-3">
                          <BackButton onClick={() => { setVerificationDone(false); setVerificationResults([]); }} />
                          <LiButton onClick={handleSignUpNext} flex1 disabled={otpSending}>
                            {otpSending ? 'Sending OTP…' : 'Continue to verify account →'}
                          </LiButton>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Step 5: OTP */}
                {step === 5 && (
                  <>
                    <div>
                      <h2 className="text-xl font-bold text-[#1d2226]">Verify your contact</h2>
                      <p className="text-[#666] text-sm mt-1">
                        Enter the 6-digit code sent to <strong className="text-[#1d2226]">{contact}</strong>
                      </p>
                    </div>
                    {signUpOtpSentMsg && (
                      <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        {signUpOtpSentMsg}
                      </p>
                    )}
                    {signUpDevCode && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                        <p className="font-semibold">Dev mode — your OTP: {signUpDevCode}</p>
                        <p className="mt-1 text-xs text-blue-800">
                          Enter this code in the boxes below.
                        </p>
                      </div>
                    )}
                    <OtpBoxes
                      values={otpValues}
                      refs={otpRefs}
                      onChange={handleOtpChange}
                      onKeyDown={handleOtpKeyDown}
                      disabled={otpVerifying}
                    />
                    {otpVerifying && <p className="text-[#0A66C2] text-sm text-center">Verifying…</p>}
                    {otpError && <p className="text-red-500 text-sm">{otpError}</p>}
                    {signUpOtpRetryStatus && (
                      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        {signUpOtpRetryStatus}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => { setStep(4); setOtpValues(['','','','','','']); setOtpError(''); }}
                        className="text-sm text-[#0A66C2] hover:underline"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={handleSignUpSendOtp}
                        disabled={otpSending || resendCooldown > 0}
                        className="text-sm text-[#666] hover:text-[#0A66C2] hover:underline disabled:opacity-40"
                      >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[#999] mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

/* ── Shared sub-components ── */

const inputCls =
  'w-full px-4 py-2.5 bg-white border border-[#d9d9d9] rounded-lg text-[#1d2226] placeholder-[#aaa] focus:outline-none focus:border-[#0A66C2] focus:ring-2 focus:ring-[#0A66C2]/20 transition-all text-sm';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-[#1d2226]">{label}</label>
      {children}
    </div>
  );
}

function LiButton({
  children,
  onClick,
  disabled = false,
  flex1,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  flex1?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${flex1 ? 'flex-1' : 'w-full'} py-2.5 px-6 bg-[#0A66C2] text-white font-semibold rounded-full hover:bg-[#004182] disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm`}
    >
      {children}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-5 py-2.5 border border-[#0A66C2] text-[#0A66C2] font-semibold rounded-full hover:bg-[#EEF3FB] transition-all text-sm"
    >
      Back
    </button>
  );
}

function Chip({ label, onRemove, color = 'blue' }: { label: string; onRemove: () => void; color?: 'blue' | 'green' }) {
  const colorCls = color === 'green'
    ? 'bg-green-50 border-green-300 text-green-700'
    : 'bg-[#EEF3FB] border-[#0A66C2]/30 text-[#0A66C2]';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${colorCls}`}>
      {label}
      <button onClick={onRemove} className="opacity-60 hover:opacity-100 text-base leading-none">×</button>
    </span>
  );
}

function OtpBoxes({
  values,
  refs,
  onChange,
  onKeyDown,
  disabled,
}: {
  values: string[];
  refs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  onChange: (idx: number, val: string) => void;
  onKeyDown: (idx: number, e: React.KeyboardEvent) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-3 justify-center py-2">
      {values.map((v, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={v}
          disabled={disabled}
          autoComplete="one-time-code"
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          className="w-11 h-12 text-center text-xl font-bold border-2 border-[#d9d9d9] rounded-lg text-[#1d2226] focus:border-[#0A66C2] focus:ring-2 focus:ring-[#0A66C2]/20 focus:outline-none transition-all bg-white disabled:opacity-50"
        />
      ))}
    </div>
  );
}
