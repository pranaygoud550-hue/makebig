'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo } from '@/components/BrandLogo';
import { useReducedMotion } from '@/lib/useReducedMotion';

const SLIDES = [
  {
    icon: '🚀',
    title: 'Welcome to Make Big',
    subtitle: 'India’s campus collaboration platform — build real projects, not just assignments.',
    gradient: 'from-[#0A0A0F] via-[#0f172a] to-[#0A66C2]/30',
  },
  {
    icon: '🧑‍🎓',
    title: 'Your college crew, one workspace',
    subtitle: 'Tasks, posts, standups, and team chat — everything your project group needs in one place.',
    gradient: 'from-[#0A0A0F] via-[#1e1b4b] to-[#6366f1]/25',
  },
  {
    icon: '🤖',
    title: 'AI that actually helps',
    subtitle: 'Co-founder chat, pitch decks, link analysis, and an agent that sets up your project in minutes.',
    gradient: 'from-[#0A0A0F] via-[#042f2e] to-[#14b8a6]/25',
  },
  {
    icon: '🔍',
    title: 'Explore live student startups',
    subtitle: 'Browse projects by domain, meet teammates, and join teams looking for your skills.',
    gradient: 'from-[#0A0A0F] via-[#1c1917] to-[#f59e0b]/20',
  },
  {
    icon: '🤝',
    title: 'Friends, mentors & verified skills',
    subtitle: 'Connect with builders across campuses. Prove your skills. Get matched with mentors.',
    gradient: 'from-[#0A0A0F] via-[#312e81] to-[#a855f7]/25',
  },
  {
    icon: '🏆',
    title: 'Ship before you graduate',
    subtitle: 'Track milestones from idea to demo day. Compete on leaderboards. Launch something real.',
    gradient: 'from-[#0A0A0F] via-[#0c4a6e] to-[#0A66C2]/40',
  },
];

interface CinematicIntroProps {
  onComplete: () => void;
}

export function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index >= SLIDES.length - 1;

  const finish = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('makeBigIntroSeen', '1');
    }
    onComplete();
  }, [onComplete]);

  const next = () => {
    if (isLast) finish();
    else setIndex((i) => i + 1);
  };

  const skip = () => finish();

  return (
    <div className="fixed inset-0 z-[100] bg-[#0A0A0F] text-white overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.45 }}
          className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`}
        />
      </AnimatePresence>

      <div className="relative z-10 flex flex-col min-h-screen px-6 py-8 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <BrandLogo size="sm" href={null} className="brightness-0 invert opacity-90" />
          <button
            type="button"
            onClick={skip}
            className="text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            Skip
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -16 }}
              transition={{ duration: reduced ? 0 : 0.4 }}
              className="space-y-6"
            >
              <div className="text-6xl" aria-hidden>
                {slide.icon}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                {slide.title}
              </h1>
              <p className="text-base sm:text-lg text-white/75 leading-relaxed max-w-md mx-auto">
                {slide.subtitle}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="space-y-5 pb-4">
          <div className="flex justify-center gap-2">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-8 bg-white' : 'w-2 bg-white/30'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            className="w-full py-4 rounded-full bg-white text-[#0A0A0F] font-bold text-base hover:bg-white/95 transition-colors"
          >
            {isLast ? 'Enter Make Big →' : 'Continue'}
          </button>
          <p className="text-center text-xs text-white/40">
            {index + 1} of {SLIDES.length}
          </p>
        </div>
      </div>
    </div>
  );
}
