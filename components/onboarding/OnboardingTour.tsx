'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SpotlightOverlay } from './SpotlightOverlay';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useReducedMotion } from '@/lib/useReducedMotion';

const STEPS = [
  {
    target: '[data-tour="hero"]',
    title: '👋 Welcome to Make Big',
    body: 'This is where student startup teams are born. Let us show you around in 30 seconds.',
  },
  {
    target: '[data-tour="explore"]',
    title: '🌍 Explore Student Projects',
    body: 'Browse real projects posted by students across colleges. Find one to join, or get inspired to post your own.',
  },
  {
    target: '[data-tour="create"]',
    title: '💡 Post Your Idea',
    body: 'Got a startup idea? Post it here. Our AI validates it instantly and helps you describe it in a way that attracts co-founders.',
  },
  {
    target: '[data-tour="profile"]',
    title: '🎯 Set Up Your Skills',
    body: "Tell us what you're good at — frontend, design, marketing, ML. This is how other founders find and invite you.",
  },
  {
    target: '[data-tour="signup"]',
    title: '🚀 Ready to Build Something Big?',
    body: 'Create your free account. It takes 60 seconds. Your first project is waiting.',
  },
];

function ConfettiBurst({ active }: { active: boolean }) {
  const reduced = useReducedMotion();
  if (!active || reduced) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[10002]" aria-hidden>
      {Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          className="absolute w-2 h-2 rounded-sm animate-confetti"
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: '40%',
            backgroundColor: ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b'][i % 4],
            animationDelay: `${Math.random() * 0.4}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

interface OnboardingTourProps {
  onCompleteSignup?: () => void;
}

export function OnboardingTour({ onCompleteSignup }: OnboardingTourProps) {
  const pathname = usePathname();
  const enabled = pathname === '/';
  const { active, step, totalSteps, next, back, skip, complete, isLastStep } = useOnboarding(enabled);
  const [confetti, setConfetti] = useState(false);
  const current = STEPS[step];

  const finish = useCallback(() => {
    setConfetti(true);
    complete();
    window.setTimeout(() => {
      setConfetti(false);
      onCompleteSignup?.();
    }, 1200);
  }, [complete, onCompleteSignup]);

  useEffect(() => {
    if (!active) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [active]);

  if (!active || !current) return (
    <>
      <ConfettiBurst active={confetti} />
    </>
  );

  return (
    <>
      <SpotlightOverlay targetSelector={current.target} visible={active} onBackdropClick={skip}>
        <div className="rounded-2xl border border-white/10 bg-[#14141f] p-5 shadow-2xl text-white">
          <button
            type="button"
            onClick={skip}
            className="absolute top-3 right-3 text-white/40 hover:text-white text-lg leading-none"
            aria-label="Close tour"
          >
            ×
          </button>
          <h3 className="text-lg font-bold pr-6">{current.title}</h3>
          <p className="text-sm text-white/65 mt-2 leading-relaxed">{current.body}</p>

          <div className="flex items-center justify-between mt-6 gap-3">
            {step === 0 ? (
              <button type="button" onClick={skip} className="text-sm text-white/50 hover:text-white/80">
                Skip tour
              </button>
            ) : (
              <button type="button" onClick={back} className="text-sm text-white/50 hover:text-white/80">
                Back
              </button>
            )}

            {isLastStep ? (
              <button
                type="button"
                onClick={finish}
                className="ml-auto px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-600"
              >
                Start Building Free →
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                className="ml-auto px-4 py-2 rounded-full text-sm font-bold bg-white/10 hover:bg-white/15"
              >
                {step === 0 ? "Let's go →" : 'Next →'}
              </button>
            )}
          </div>

          <div className="flex justify-center gap-1.5 mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i === step ? 'bg-indigo-400' : 'bg-white/20'}`}
              />
            ))}
          </div>
          <p className="text-center text-[10px] text-white/35 mt-2">
            Step {step + 1} of {totalSteps}
          </p>
        </div>
      </SpotlightOverlay>
      <ConfettiBurst active={confetti} />
    </>
  );
}
