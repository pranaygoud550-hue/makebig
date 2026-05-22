'use client';

import { useState, useRef, useEffect } from 'react';
import { apiSendOTP, apiVerifyOTP } from '@/lib/api';
import { validateContact, validateName, getErrorMessage } from '@/lib/userErrors';
import { BrandLogo } from '@/components/BrandLogo';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { searchColleges } from '@/lib/telanganaColleges';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (contact: string) => void | Promise<void>;
  onSignUp: (
    name: string,
    contact: string,
    skills: string[],
    hobbies: string[],
    college: string,
    graduationYear: string
  ) => void | Promise<void>;
}

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 12 }, (_, i) => String(CURRENT_YEAR + 4 - i));

const SKILL_SUGGESTIONS = [
  'Frontend Development', 'Backend Development', 'Full Stack Development',
  'UI/UX Design', 'Graphic Design', 'Mobile Development', 'DevOps',
  'Data Science', 'Machine Learning', 'AI Engineering', 'Cybersecurity',
  'Blockchain', 'Cloud Computing', 'Product Management', 'Business Analysis',
  'Content Writing', 'Digital Marketing', 'SEO', 'Video Editing', 'Photography',
];

export function AuthModal({ isOpen, onClose, onSignIn, onSignUp }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Multi-step signup: 1=personal, 2=education, 3=skills, 4=otp
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
  const [siDevCode, setSiDevCode] = useState<string | null>(null);
  const [signUpDevCode, setSignUpDevCode] = useState<string | null>(null);
  const [siOtpSentMsg, setSiOtpSentMsg] = useState('');
  const [signUpOtpSentMsg, setSignUpOtpSentMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Sign Up fields
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [college, setCollege] = useState('');
  const [collegeSuggestions, setCollegeSuggestions] = useState<string[]>([]);
  const [showCollegeDrop, setShowCollegeDrop] = useState(false);
  const [gradYear, setGradYear] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
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
    setSiOtpSentMsg('');
    setSignUpOtpSentMsg('');
    setResendCooldown(0);
    setName(''); setContact(''); setCollege(''); setGradYear('');
    setSkills([]); setSkillInput(''); setHobbies([]); setHobbyInput('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleOAuth = async (provider: 'google' | 'github') => {
    if (!isSupabaseConfigured) {
      alert('Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env to enable OAuth.');
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
  };

  // ——— College typeahead ———
  const handleCollegeChange = (val: string) => {
    setCollege(val);
    const suggestions = searchColleges(val);
    setCollegeSuggestions(suggestions);
    setShowCollegeDrop(suggestions.length > 0);
  };

  // ——— Skills / Hobbies chip management ———
  const addSkill = (s: string) => {
    const trimmed = s.trim();
    if (trimmed && !skills.includes(trimmed)) setSkills([...skills, trimmed]);
    setSkillInput('');
  };
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
    try {
      const res = await apiSendOTP(siContact.trim());
      setSiDevCode(res.devCode || null);
      setSiOtpSentMsg(res.message || 'OTP sent. Check your email or the code below.');
      setSiStep('otp');
      setSiOtpValues(['', '', '', '', '', '']);
      startResendCooldown();
      setTimeout(() => siOtpRefs.current[0]?.focus(), 100);
    } catch (e) {
      setSiDevCode(null);
      setSiOtpSentMsg('');
      setSiOtpError(getErrorMessage(e, 'otp'));
    } finally {
      setSiOtpSending(false);
    }
  };

  const verifySiOtp = async (code: string) => {
    setSiOtpVerifying(true);
    setSiOtpError('');
    try {
      const ok = await apiVerifyOTP(siContact.trim(), code);
      if (!ok) {
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
    try {
      const res = await apiSendOTP(contact.trim());
      setSignUpDevCode(res.devCode || null);
      setSignUpOtpSentMsg(res.message || 'OTP sent.');
      setOtpValues(['', '', '', '', '', '']);
      if (step === 3) setStep(4);
      startResendCooldown();
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (e) {
      setSignUpDevCode(null);
      setSignUpOtpSentMsg('');
      setOtpError(getErrorMessage(e, 'otp'));
    } finally {
      setOtpSending(false);
    }
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
      setOtpError('');
    }
    if (step === 3) {
      await handleSignUpSendOtp();
    } else if (step < 3) {
      setStep(step + 1);
    }
  };

  const verifyOtp = async (code: string) => {
    setOtpVerifying(true);
    setOtpError('');
    try {
      const ok = await apiVerifyOTP(contact.trim(), code);
      if (!ok) {
        setOtpError('Incorrect OTP code');
        setOtpValues(['', '', '', '', '', '']);
        return;
      }
      await onSignUp(name.trim(), contact.trim().toLowerCase(), skills, hobbies, college.trim(), gradYear);
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

  const totalSteps = 4;
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

      <div className="w-full max-w-lg mx-auto px-6">
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
            {isSupabaseConfigured && (
              <>
                <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleOAuth('google')}
                className="py-2.5 border border-[#d9d9d9] rounded-xl text-sm font-semibold text-[#1d2226] hover:border-[#0A66C2] hover:bg-[#EEF3FB] transition-all"
              >
                Google
              </button>
              <button
                onClick={() => handleOAuth('github')}
                className="py-2.5 border border-[#d9d9d9] rounded-xl text-sm font-semibold text-[#1d2226] hover:border-[#0A66C2] hover:bg-[#EEF3FB] transition-all"
              >
                GitHub
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-[#e0e0e0]" />
              <span className="text-xs text-[#999]">or continue with OTP</span>
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

                {siStep === 'contact' ? (
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
                    <LiButton onClick={handleSiSend} disabled={!siContact.trim() || siOtpSending || resendCooldown > 0}>
                      {siOtpSending ? 'Sending…' : resendCooldown > 0 ? `Wait ${resendCooldown}s` : 'Send OTP'}
                    </LiButton>
                  </>
                ) : (
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
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <p className="font-semibold">Your verification code</p>
                        <p className="mt-1 font-mono text-2xl tracking-widest">{siDevCode}</p>
                        <p className="mt-1 text-xs text-amber-800">
                          Enter this code below (email/SMS not configured yet).
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
                )}
              </>
            )}

            {/* ========= SIGN UP ========= */}
            {mode === 'signup' && (
              <>
                {/* Step labels */}
                <div className="flex items-center gap-2 mb-1">
                  {['Personal', 'Education', 'Skills', 'Verify'].map((label, i) => (
                    <div key={label} className="flex items-center gap-1">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        step > i + 1 ? 'bg-[#0A66C2] text-white' :
                        step === i + 1 ? 'bg-[#0A66C2] text-white' :
                        'bg-[#e0e0e0] text-[#666]'
                      }`}>{step > i + 1 ? '✓' : i + 1}</span>
                      <span className={`text-xs hidden sm:block ${step === i + 1 ? 'text-[#0A66C2] font-semibold' : 'text-[#999]'}`}>{label}</span>
                      {i < 3 && <span className="text-[#ccc] text-xs">›</span>}
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
                    <Field label="Email or Phone *">
                      <input type="text" placeholder="Enter email or phone" value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        autoComplete="username" className={inputCls} />
                    </Field>
                    <LiButton onClick={handleSignUpNext} disabled={!name.trim() || !contact.trim()}>
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

                {/* Step 3: Skills & Hobbies */}
                {step === 3 && (
                  <>
                    <div>
                      <h2 className="text-xl font-bold text-[#1d2226]">Skills & Interests</h2>
                      <p className="text-[#666] text-sm mt-1">Help us match you with the right projects</p>
                    </div>

                    <Field label="Your Skills">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 min-h-[36px]">
                          {skills.map((s) => (
                            <Chip key={s} label={s} onRemove={() => setSkills(skills.filter((x) => x !== s))} />
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. React, UI Design, Python…  (press Enter)"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && skillInput) { e.preventDefault(); addSkill(skillInput); } }}
                          autoComplete="off"
                          className={inputCls}
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s)).slice(0, 8).map((s) => (
                            <button key={s} type="button" onClick={() => addSkill(s)}
                              className="px-2.5 py-1 text-xs border border-[#0A66C2] text-[#0A66C2] rounded-full hover:bg-[#EEF3FB] transition-colors">
                              + {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </Field>

                    <Field label="Hobbies & Interests">
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

                    <div className="flex gap-3">
                      <BackButton onClick={() => setStep(2)} />
                      <LiButton onClick={handleSignUpSendOtp} flex1 disabled={otpSending || resendCooldown > 0}>
                        {otpSending ? 'Sending OTP…' : resendCooldown > 0 ? `Wait ${resendCooldown}s` : 'Send OTP & Verify'}
                      </LiButton>
                    </div>
                  </>
                )}

                {/* Step 4: OTP */}
                {step === 4 && (
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
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <p className="font-semibold">Your verification code</p>
                        <p className="mt-1 font-mono text-2xl tracking-widest">{signUpDevCode}</p>
                        <p className="mt-1 text-xs text-amber-800">
                          Enter this code below (email/SMS not configured yet).
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
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => { setStep(3); setOtpValues(['','','','','','']); setOtpError(''); }}
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
