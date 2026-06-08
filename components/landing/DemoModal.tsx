'use client';

import { motion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';

interface DemoModalProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  { t: '0:00', title: 'Post your idea', desc: 'Describe your startup in 2 minutes.' },
  { t: '0:15', title: 'AI validates it', desc: 'Get market fit, competition, and MVP tips instantly.' },
  { t: '0:30', title: 'Find co-founders', desc: 'Browse students by skill and send invites.' },
  { t: '0:45', title: 'Ship together', desc: 'Tasks, standups, chat — all in one workspace.' },
];

export function DemoModal({ open, onClose }: DemoModalProps) {
  return (
    <Modal isOpen={open} onClose={onClose} size="lg" closeButton={false}>
      <div className="p-6 sm:p-8 bg-[#0F0F1A] text-white rounded-2xl -m-4 sm:-m-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">
              60-second tour
            </p>
            <h2 className="text-xl sm:text-2xl font-bold">See how Make Big works</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/50 hover:text-white text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-[#1a1a2e] to-[#0A0A0F] border border-white/10 mb-6">
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <span className="text-2xl ml-1">▶</span>
            </motion.div>
          </div>
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-sm text-white/80">
              Student founders use Make Big to find teams, validate ideas, and ship — without
              scattered WhatsApp groups.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-lg border border-white/10 bg-white/5 p-3"
            >
              <span className="text-[10px] font-mono text-indigo-400">{s.t}</span>
              <p className="font-semibold text-sm mt-1">{s.title}</p>
              <p className="text-xs text-white/60 mt-0.5">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
