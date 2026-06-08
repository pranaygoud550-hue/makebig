'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'makebig_seen';
const TOTAL_STEPS = 5;

export function useOnboarding(enabled: boolean) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY) === '1') return;

    let delayTimer: ReturnType<typeof setTimeout>;
    let pollTimer: ReturnType<typeof setTimeout>;

    const waitForHero = () => {
      if (!document.querySelector('[data-tour="hero"]')) {
        pollTimer = setTimeout(waitForHero, 400);
        return;
      }
      delayTimer = setTimeout(() => setActive(true), 2000);
    };

    waitForHero();

    return () => {
      clearTimeout(delayTimer);
      clearTimeout(pollTimer);
    };
  }, [enabled]);

  const markSeen = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1');
    }
    setActive(false);
  }, []);

  const skip = useCallback(() => {
    markSeen();
  }, [markSeen]);

  const next = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const back = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const complete = useCallback(() => {
    markSeen();
  }, [markSeen]);

  return {
    active,
    step,
    totalSteps: TOTAL_STEPS,
    next,
    back,
    skip,
    complete,
    isLastStep: step === TOTAL_STEPS - 1,
  };
}
