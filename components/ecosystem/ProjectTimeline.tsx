'use client';

import { JOURNEY_STAGES, type JourneyStageId } from '@/lib/ecosystem/constants';

interface ProjectTimelineProps {
  currentStage: JourneyStageId;
  completionPercent: number;
  nextMilestone?: string;
  lastUpdated?: string;
  compact?: boolean;
}

export function ProjectTimeline({
  currentStage,
  completionPercent,
  nextMilestone,
  lastUpdated,
  compact,
}: ProjectTimelineProps) {
  const currentIdx = JOURNEY_STAGES.findIndex((s) => s.id === currentStage);

  return (
    <section className={compact ? 'space-y-3' : 'bg-white rounded-2xl border border-[#e0e0e0] p-5 space-y-4'}>
      {!compact && (
        <div className="flex flex-wrap justify-between gap-2">
          <h2 className="text-xs font-bold text-[#666] uppercase tracking-wide">Startup Journey</h2>
          <span className="text-sm font-bold text-[#0A66C2]">{completionPercent}% complete</span>
        </div>
      )}

      <div className="flex flex-col gap-0">
        {JOURNEY_STAGES.map((stage, i) => {
          const status = i < currentIdx ? 'completed' : i === currentIdx ? 'current' : 'future';
          const dot =
            status === 'completed'
              ? 'bg-green-500 border-green-500 text-white'
              : status === 'current'
                ? 'bg-[#0A66C2] border-[#0A66C2] text-white ring-4 ring-[#0A66C2]/20'
                : 'bg-[#e0e0e0] border-[#d9d9d9] text-[#999]';
          const line = i < currentIdx ? 'bg-green-400' : 'bg-[#e8e8e8]';

          return (
            <div key={stage.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full border-2 shrink-0 ${dot}`}
                  title={stage.label}
                />
                {i < JOURNEY_STAGES.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-[20px] ${line}`} />
                )}
              </div>
              <div className={`pb-3 ${status === 'future' ? 'opacity-50' : ''}`}>
                <p
                  className={`text-sm font-semibold ${
                    status === 'current' ? 'text-[#0A66C2]' : 'text-[#1d2226]'
                  }`}
                >
                  {stage.label}
                </p>
                {status === 'current' && !compact && (
                  <p className="text-xs text-[#666] mt-0.5">Current stage</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!compact && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#f0f0f0] text-xs">
          {nextMilestone && (
            <div>
              <p className="text-[#999] uppercase tracking-wide">Next milestone</p>
              <p className="font-semibold text-[#1d2226] mt-0.5">{nextMilestone}</p>
            </div>
          )}
          {lastUpdated && (
            <div>
              <p className="text-[#999] uppercase tracking-wide">Last updated</p>
              <p className="font-semibold text-[#1d2226] mt-0.5">
                {new Date(lastUpdated).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
