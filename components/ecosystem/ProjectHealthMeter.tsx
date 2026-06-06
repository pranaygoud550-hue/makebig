'use client';

import type { HealthScore } from '@/lib/ecosystem/health';

interface ProjectHealthMeterProps {
  health: HealthScore;
  compact?: boolean;
}

export function ProjectHealthMeter({ health, compact }: ProjectHealthMeterProps) {
  const { score, level, metrics, activity, engagement, progress, taskCompletion } = health;

  const bars = [
    { label: 'Activity', value: activity },
    { label: 'Engagement', value: engagement },
    { label: 'Progress', value: progress },
    { label: 'Tasks', value: taskCompletion },
  ];

  return (
    <section className={compact ? 'space-y-3' : 'bg-white rounded-2xl border border-[#e0e0e0] p-5 space-y-4'}>
      {!compact && (
        <h2 className="text-xs font-bold text-[#666] uppercase tracking-wide">Project Health</h2>
      )}

      <div className="flex items-center gap-4">
        <div
          className="relative w-16 h-16 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: `conic-gradient(${
              score >= 70 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'
            } ${score * 3.6}deg, #eef3fb 0deg)`,
          }}
        >
          <div className="absolute inset-1.5 bg-white rounded-full flex flex-col items-center justify-center">
            <span className="text-base font-black text-[#1d2226]">{score}</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-[#1d2226]">
            {level.icon} {level.label}
          </p>
          <p className="text-xs text-[#666]">Health score {score}/100</p>
        </div>
      </div>

      <div className="grid gap-2">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-[#666]">{b.label}</span>
              <span className="font-semibold">{b.value}%</span>
            </div>
            <div className="h-1.5 bg-[#eef3fb] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0A66C2] rounded-full"
                style={{ width: `${b.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-[#f0f0f0]">
          {[
            ['Active members', metrics.activeMembers],
            ['Open tasks', metrics.openTasks],
            ['Completed', metrics.completedTasks],
            ['Updates/week', metrics.updatesThisWeek],
            ['Join requests', metrics.joinRequests],
            [
              'Last activity',
              metrics.lastActivityAt
                ? new Date(metrics.lastActivityAt).toLocaleDateString()
                : '—',
            ],
          ].map(([label, val]) => (
            <div key={String(label)} className="text-xs">
              <p className="text-[#999]">{label}</p>
              <p className="font-semibold text-[#1d2226]">{val}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
