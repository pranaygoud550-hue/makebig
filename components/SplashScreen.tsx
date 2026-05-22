'use client';

import { useEffect, useState } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import { SPLASH_DURATION_MS } from '@/lib/constants';

interface SplashScreenProps {
  onComplete?: () => void;
}

/** Opening loader — Make Big logo with minimal loading indicators */
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const done = setTimeout(() => {
      setShow(false);
      onComplete?.();
    }, SPLASH_DURATION_MS);
    return () => clearTimeout(done);
  }, [onComplete]);

  if (!show) return null;

  return (
    <>
      <style>{`
        @keyframes logo-in {
          from { transform: scale(0.88); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes ring-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-[#E8F4FC] via-[#f3f2ef] to-[#EEF3FB]"
        aria-label="Loading Make Big"
        role="status"
      >
        <div className="relative flex flex-col items-center">
          <div
            className="absolute -top-6 w-48 h-48 rounded-full bg-[#0A66C2]/10 blur-2xl pointer-events-none"
            style={{ animation: 'glow-pulse 2.5s ease-in-out infinite' }}
          />

          <div
            className="relative z-10 px-6"
            style={{ animation: 'logo-in 0.7s ease-out forwards' }}
          >
            <BrandLogo
              href={null}
              priority
              className="h-16 sm:h-20 w-auto max-w-[min(320px,85vw)]"
            />
          </div>

          <div
            className="mt-8 w-10 h-10 rounded-full border-2 border-[#0A66C2]/20 border-t-[#0A66C2]"
            style={{ animation: 'ring-spin 0.9s linear infinite' }}
          />

          <div className="flex gap-1.5 mt-4">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-[#0A66C2]"
                style={{ animation: `dot-bounce 1.2s ${i * 0.15}s ease-in-out infinite` }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
