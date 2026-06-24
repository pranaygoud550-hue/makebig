'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ParticleNetwork } from './ParticleNetwork';
import { DemoModal } from './DemoModal';
import { useCountUp } from './useCountUp';
import { useReducedMotion } from '@/lib/useReducedMotion';

interface HeroSectionProps {
  onStartFree: () => void;
  onExplore?: () => void;
}

const DEFAULT_STATS = [
  { icon: '🧑‍💻', end: 25, suffix: '+', label: 'Students' },
  { icon: '💡', end: 10, suffix: '+', label: 'Projects' },
  { icon: '🏫', end: 8, suffix: '+', label: 'Cities' },
  { icon: '🤖', end: 0, suffix: '', label: 'AI Powered', staticLabel: true },
];

function TypewriterLine({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? text : '');

  useEffect(() => {
    if (reduced) {
      setDisplay(text);
      return;
    }
    let i = 0;
    let interval: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setDisplay(text.slice(0, i));
        if (i >= text.length) clearInterval(interval);
      }, 42);
    }, delay);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [text, delay, reduced]);

  return <span>{display}</span>;
}

function StatCounter({
  end,
  suffix,
  label,
  icon,
  staticLabel,
}: {
  end: number;
  suffix: string;
  label: string;
  icon: string;
  staticLabel?: boolean;
}) {
  const { value, ref } = useCountUp(end);

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
      <span className="text-lg" aria-hidden>
        {icon}
      </span>
      <div>
        <p className="text-sm font-bold text-white tabular-nums">
          {staticLabel ? (
            <span className="font-medium">{label}</span>
          ) : (
            <>
              <span ref={ref}>
                {value}
                {suffix}
              </span>{' '}
              <span className="font-medium text-white/70">{label}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export function HeroSection({ onStartFree, onExplore }: HeroSectionProps) {
  const [demoOpen, setDemoOpen] = useState(false);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const reduced = useReducedMotion();

  useEffect(() => {
    fetch('/api/public/stats')
      .then((r) => r.json())
      .then((data) => {
        if (!data.success || !data.data) return;
        const { totalUsers, totalProjects, totalCities } = data.data;
        setStats([
          { icon: '🧑‍💻', end: Math.max(totalUsers, 1), suffix: '+', label: 'Students' },
          { icon: '💡', end: Math.max(totalProjects, 1), suffix: '+', label: 'Projects' },
          { icon: '🏫', end: Math.max(totalCities, 1), suffix: '+', label: 'Cities' },
          { icon: '🤖', end: 0, suffix: '', label: 'AI Powered', staticLabel: true },
        ]);
      })
      .catch(() => {
        /* keep defaults */
      });
  }, []);

  const scrollToHow = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <section
        data-tour="hero"
        className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden bg-[#0A0A0F] text-white px-4 pt-20 pb-16"
      >
        <ParticleNetwork />

        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(700px,90vw)] h-[400px] rounded-full opacity-40 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse, rgba(59,130,246,0.25) 0%, rgba(139,92,246,0.15) 40%, transparent 70%)',
          }}
          aria-hidden
        />

        <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium text-white/90 border border-indigo-500/40 bg-indigo-500/10 shadow-[0_0_24px_rgba(99,102,241,0.25)] animate-[pulse-glow_3s_ease-in-out_infinite]"
          >
            🚀 Built for student founders · Teams across India
          </motion.div>

          <h1 className="text-[2.375rem] sm:text-5xl lg:text-[4rem] font-black leading-[1.08] tracking-tight">
            <span className="block text-white/95">
              <TypewriterLine text="Your idea deserves" delay={400} />
            </span>
            <span className="block mt-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
              <TypewriterLine text="a real team." delay={1200} />
            </span>
          </h1>

          <motion.p
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2, duration: 0.8 }}
            className="mt-6 text-base sm:text-lg text-white/65 max-w-[600px] leading-relaxed"
          >
            Make Big is where student founders meet, build, and ship together. Find co-founders.
            Validate your idea with AI. Manage your startup like a pro — all in one place.
          </motion.p>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5, duration: 0.6 }}
            className="mt-10 flex flex-wrap justify-center gap-3"
          >
            {stats.map((s) => (
              <StatCounter key={s.label} {...s} />
            ))}
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.7, duration: 0.6 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <button
              type="button"
              data-tour="create"
              onClick={onStartFree}
              className="group relative px-8 py-4 rounded-full font-bold text-base bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] transition-all"
            >
              Start Building Free →
            </button>
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              className="px-8 py-4 rounded-full font-bold text-base border border-white/25 text-white/90 hover:bg-white/5 hover:border-white/40 transition-all"
            >
              Watch how it works ▶
            </button>
          </motion.div>
        </div>

        <motion.button
          type="button"
          onClick={scrollToHow}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40 hover:text-white/70 text-xs transition-colors"
          aria-label="Scroll to how it works"
        >
          <span className="animate-bounce">↓</span>
          <span>See how it works</span>
        </motion.button>
      </section>

      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
