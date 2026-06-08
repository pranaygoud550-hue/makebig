'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/useReducedMotion';

interface FinalCTAProps {
  onCreateAccount: () => void;
}

export function FinalCTA({ onCreateAccount }: FinalCTAProps) {
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[#0A0A0F] py-24 sm:py-32 px-4">
      <motion.div
        className="absolute inset-0 opacity-60"
        animate={
          reduced
            ? {}
            : {
                background: [
                  'radial-gradient(ellipse at 30% 50%, rgba(59,130,246,0.2), transparent 60%)',
                  'radial-gradient(ellipse at 70% 50%, rgba(139,92,246,0.25), transparent 60%)',
                  'radial-gradient(ellipse at 30% 50%, rgba(59,130,246,0.2), transparent 60%)',
                ],
              }
        }
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        aria-hidden
      />

      <div className="relative max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Your startup starts today.
        </h2>
        <p className="mt-4 text-base sm:text-lg text-white/60 max-w-xl mx-auto">
          500+ students are already building on Make Big. Don&apos;t wait for the perfect idea —
          post what you have.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            type="button"
            data-tour="signup"
            onClick={onCreateAccount}
            className="px-10 py-4 rounded-full font-bold text-base bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] transition-all"
          >
            Create Free Account →
          </button>
          <Link
            href="/explore"
            className="px-10 py-4 rounded-full font-bold text-base border border-white/25 text-white/90 hover:bg-white/5 transition-all text-center"
          >
            Explore Projects
          </Link>
        </div>
      </div>
    </section>
  );
}
