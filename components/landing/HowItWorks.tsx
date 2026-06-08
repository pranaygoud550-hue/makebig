'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useReducedMotion } from '@/lib/useReducedMotion';

const STEPS = [
  {
    icon: '💡',
    title: 'Post Your Idea',
    description:
      'Describe your startup idea in 2 minutes. Our AI instantly validates it and gives you honest feedback on market fit, competition, and what to build first.',
    preview: (
      <div className="mt-4 rounded-lg border border-white/10 bg-[#0A0A0F] p-3 text-left">
        <p className="text-[10px] text-indigo-400 font-bold uppercase mb-2">AI Validator</p>
        <div className="space-y-1.5">
          <div className="h-2 w-full bg-white/10 rounded" />
          <div className="h-2 w-4/5 bg-white/10 rounded" />
          <div className="flex gap-2 mt-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-400">Market ✓</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">Gap found</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: '👥',
    title: 'Match With Co-founders',
    description:
      'Browse students by skill (frontend, design, marketing, finance) and commitment level. Send an invite. Build together.',
    preview: (
      <div className="mt-4 flex gap-2">
        {['React', 'UI/UX', 'Growth'].map((skill) => (
          <div key={skill} className="flex-1 rounded-lg border border-white/10 bg-[#0A0A0F] p-2 text-center">
            <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 mb-1" />
            <p className="text-[10px] text-white/80">{skill}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: '🚀',
    title: 'Ship Like a Real Startup',
    description:
      'Task boards, daily standups, real-time team chat, file sharing — everything to keep your team moving from idea to demo day.',
    preview: (
      <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-lg border border-white/10 bg-[#0A0A0F] p-2">
        {['Todo', 'Doing', 'Done'].map((col, i) => (
          <div key={col} className="rounded bg-white/5 p-1.5">
            <p className="text-[9px] text-white/50 mb-1">{col}</p>
            {i < 2 && <div className="h-6 rounded bg-indigo-500/20 border border-indigo-500/30" />}
          </div>
        ))}
      </div>
    ),
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();

  return (
    <section id="how-it-works" ref={ref} className="relative bg-[#0F0F1A] py-20 sm:py-28 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-indigo-400 mb-3">
          How it works
        </p>
        <h2 className="text-center text-3xl sm:text-4xl font-black text-white mb-16">
          From idea to team in three steps
        </h2>

        <div className="hidden lg:block absolute top-[52%] left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-6 relative">
          {STEPS.map((step, i) => (
            <motion.article
              key={step.title}
              initial={reduced ? false : { opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8 hover:border-indigo-500/30 hover:bg-white/[0.05] transition-colors"
            >
              <div className="lg:hidden absolute -left-3 top-8 bottom-8 w-px bg-indigo-500/30 hidden sm:block" />
              <span className="text-4xl block mb-4 drop-shadow-[0_0_20px_rgba(99,102,241,0.5)]" aria-hidden>
                {step.icon}
              </span>
              <p className="text-xs font-bold text-indigo-400 mb-1">Step {i + 1}</p>
              <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{step.description}</p>
              {step.preview}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
