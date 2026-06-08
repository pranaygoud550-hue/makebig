'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useReducedMotion } from '@/lib/useReducedMotion';

type CardSize = 'large' | 'medium' | 'small';

interface BentoCard {
  icon: string;
  title: string;
  description: string;
  size: CardSize;
  glow?: 'blue' | 'purple' | 'none';
  pattern?: string;
}

const CARDS: BentoCard[] = [
  {
    icon: '🤖',
    title: 'AI Co-founder Validator',
    description:
      'Paste your idea. Get a startup mentor\'s honest take in seconds. Market size, competition, MVP suggestions — all instant.',
    size: 'large',
    glow: 'blue',
    pattern: 'neural',
  },
  {
    icon: '💬',
    title: 'Real-time Team Chat',
    description:
      'No WhatsApp groups. No Discord servers. Built-in chat lives inside your project workspace.',
    size: 'large',
    glow: 'purple',
    pattern: 'chat',
  },
  { icon: '📋', title: 'Kanban Task Board', description: 'Sprint like a YC startup', size: 'medium' },
  { icon: '📊', title: 'Daily Standups', description: '5-minute async check-ins that actually work', size: 'medium' },
  { icon: '🔔', title: 'Smart Notifications', description: 'Never miss a teammate update', size: 'medium' },
  { icon: '🎯', title: 'Project Wizard', description: '7-step setup that forces clarity', size: 'medium' },
  { icon: '👥', title: 'Co-founder Matching', description: '', size: 'small' },
  { icon: '🏷', title: 'Skill Tags', description: '', size: 'small' },
  { icon: '📁', title: 'File Sharing', description: '', size: 'small' },
  { icon: '🌐', title: 'Public Project Feed', description: '', size: 'small' },
  { icon: '✉', title: 'Team Invites', description: '', size: 'small' },
  { icon: '🔒', title: 'Private Workspaces', description: '', size: 'small' },
];

function sizeClasses(size: CardSize) {
  if (size === 'large') return 'sm:col-span-2 min-h-[220px]';
  if (size === 'medium') return 'min-h-[140px]';
  return 'min-h-[100px]';
}

function glowClass(glow?: string) {
  if (glow === 'blue') return 'hover:shadow-[0_0_40px_rgba(59,130,246,0.15)] hover:border-blue-500/40';
  if (glow === 'purple') return 'hover:shadow-[0_0_40px_rgba(139,92,246,0.15)] hover:border-purple-500/40';
  return 'hover:shadow-[0_0_30px_rgba(99,102,241,0.12)] hover:border-indigo-500/30';
}

export function FeatureBento() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduced = useReducedMotion();

  return (
    <section ref={ref} className="bg-[#0A0A0F] py-20 sm:py-28 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-black text-white text-center mb-4">
          Everything your startup team needs
        </h2>
        <p className="text-center text-white/50 text-sm mb-12 max-w-xl mx-auto">
          One workspace for validation, matching, tasks, and team momentum.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.45 }}
              className={`group relative rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 ${sizeClasses(card.size)} ${glowClass(card.glow)}`}
            >
              {card.pattern === 'neural' && (
                <div
                  className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 20% 80%, rgba(59,130,246,0.4), transparent 40%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.3), transparent 35%)',
                  }}
                />
              )}
              {card.pattern === 'chat' && (
                <div className="absolute bottom-4 right-4 flex flex-col gap-1 opacity-20 pointer-events-none">
                  <div className="w-16 h-6 rounded-full bg-purple-500/40 ml-auto" />
                  <div className="w-20 h-6 rounded-full bg-indigo-500/30" />
                </div>
              )}
              <span className="text-2xl relative z-10">{card.icon}</span>
              <h3 className={`relative z-10 font-bold text-white mt-3 ${card.size === 'small' ? 'text-sm' : 'text-base sm:text-lg'}`}>
                {card.title}
              </h3>
              {card.description && (
                <p className="relative z-10 text-sm text-white/55 mt-2 leading-relaxed">{card.description}</p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
