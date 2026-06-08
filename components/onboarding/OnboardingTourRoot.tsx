'use client';

import { OnboardingTour } from '@/components/onboarding/OnboardingTour';

/** Global onboarding shell — listens for homepage + dispatches signup intent. */
export function OnboardingTourRoot() {
  const handleComplete = () => {
    window.dispatchEvent(new CustomEvent('makebig:open-signup'));
  };

  return <OnboardingTour onCompleteSignup={handleComplete} />;
}
