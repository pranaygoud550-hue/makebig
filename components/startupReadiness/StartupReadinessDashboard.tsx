'use client';

import type { StartupReadinessScores } from '@/lib/startupReadiness/types';

interface StartupReadinessDashboardProps {
  scores: StartupReadinessScores;
  compact?: boolean;
}

function scoreColor(score: number) {
  if (score >= 75) return 'bg-green-500';
  if (score >= 50) return 'bg-[#0A66C2]';
  if (score >= 30) return 'bg-amber-500';
  return 'bg-red-400';
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-semibold text-[#666]">{label}</span>
        <span className="font-bold text-[#1d2226]">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#eef3fb] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${scoreColor(value)}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

export function StartupReadinessDashboard({ scores, compact }: StartupReadinessDashboardProps) {
  const { overall, team, market, validation, progress } = scores;
  const ringColor = scoreColor(overall);

  return (
    <section
      className={
        compact
          ? 'space-y-3'
          : 'bg-white rounded-2xl border border-[#e0e0e0] p-5 space-y-4'
      }
    >
      {!compact && (
        <h2 className="text-xs font-bold text-[#666] uppercase tracking-wide">
          Startup Readiness
        </h2>
      )}

      <div className="flex items-center gap-4">
        <div
          className="relative w-20 h-20 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: `conic-gradient(#0A66C2 ${overall * 3.6}deg, #eef3fb 0deg)`,
          }}
        >
          <div className="absolute inset-2 bg-white rounded-full flex flex-col items-center justify-center">
            <span className="text-lg font-black text-[#1d2226]">{overall}%</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-[#1d2226]">Startup Readiness Score</p>
          <p className="text-xs text-[#666] mt-0.5">
            Average of team, market, validation, and progress
          </p>
          <span
            className={`inline-block mt-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${ringColor}`}
          >
            {overall >= 75 ? 'Strong' : overall >= 50 ? 'Developing' : overall >= 30 ? 'Early' : 'Needs work'}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ScoreBar label="Team Score" value={team} />
        <ScoreBar label="Market Score" value={market} />
        <ScoreBar label="Validation Score" value={validation} />
        <ScoreBar label="Progress Score" value={progress} />
      </div>
    </section>
  );
}
