'use client';

import {
  PUBLIC_PROGRESS_STAGES,
  resolvePublicProgressStage,
  publicStageIndex,
  type PublicProgressStageId,
} from '@/lib/projectProgressStages';

interface ProjectProgressTrackerProps {
  currentStage?: string | null;
  compact?: boolean;
}

export function ProjectProgressTracker({ currentStage, compact }: ProjectProgressTrackerProps) {
  const active = resolvePublicProgressStage(currentStage);
  const activeIdx = publicStageIndex(active);

  return (
    <section className={compact ? '' : 'bg-white rounded-2xl border border-[#e0e0e0] p-5'}>
      {!compact && (
        <h2 className="text-xs font-bold text-[#666] uppercase tracking-wide mb-4">
          Project progress
        </h2>
      )}
      <ol className="flex items-start justify-between gap-1 relative">
        <span
          className="absolute top-4 left-0 right-0 h-0.5 bg-[#e8e8e8] -z-0"
          aria-hidden
        />
        <span
          className="absolute top-4 left-0 h-0.5 bg-[#0A66C2] -z-0 transition-all"
          style={{ width: `${(activeIdx / (PUBLIC_PROGRESS_STAGES.length - 1)) * 100}%` }}
          aria-hidden
        />
        {PUBLIC_PROGRESS_STAGES.map((stage, i) => {
          const done = i <= activeIdx;
          const current = stage.id === active;
          return (
            <li key={stage.id} className="flex flex-col items-center flex-1 min-w-0 z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-colors ${
                  current
                    ? 'bg-[#0A66C2] border-[#0A66C2] text-white shadow-md shadow-[#0A66C2]/30'
                    : done
                      ? 'bg-[#EEF3FB] border-[#0A66C2] text-[#0A66C2]'
                      : 'bg-white border-[#d9d9d9] text-[#999]'
                }`}
              >
                {stage.icon}
              </div>
              <p
                className={`text-[10px] sm:text-xs font-semibold mt-2 text-center leading-tight ${
                  current ? 'text-[#0A66C2]' : done ? 'text-[#1d2226]' : 'text-[#999]'
                }`}
              >
                {stage.label}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function DemoDayBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold uppercase tracking-wide shadow-sm">
      🎤 Demo Day Ready
    </span>
  );
}
