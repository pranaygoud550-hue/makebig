'use client';

import type { ReputationState } from '@/lib/ecosystem/reputation';

interface ReputationSectionProps {
  reputation: ReputationState;
  compact?: boolean;
}

export function ReputationSection({ reputation, compact }: ReputationSectionProps) {
  const { score, level, points, badges } = reputation;

  return (
    <section className={compact ? 'space-y-2' : 'bg-white rounded-2xl border border-[#e0e0e0] p-5 space-y-4'}>
      {!compact && (
        <h2 className="text-xs font-bold text-[#666] uppercase tracking-wide">Founder Reputation</h2>
      )}

      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0A66C2] to-[#004182] text-white flex flex-col items-center justify-center shrink-0">
          <span className="text-lg">{level.icon}</span>
        </div>
        <div>
          <p className="text-lg font-black text-[#1d2226]">{level.label}</p>
          <p className="text-sm text-[#666]">{score} reputation points</p>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <span
              key={b.id}
              className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF3FB] text-[#0A66C2] border border-[#0A66C2]/20"
            >
              {b.icon} {b.label}
            </span>
          ))}
        </div>
      )}

      {!compact && (
        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#f0f0f0]">
          <span>Projects: {points.projectsCreated}</span>
          <span>Tasks done: {points.tasksCompleted}</span>
          <span>Teams helped: {points.teamsHelped}</span>
          <span>Verified skills: {points.verifiedSkills}</span>
          <span>Launches: {points.successfulLaunches}</span>
          <span>Reviews: {points.positiveReviews}</span>
        </div>
      )}
    </section>
  );
}
