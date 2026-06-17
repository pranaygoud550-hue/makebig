'use client';

interface ExamTopBarProps {
  skillName: string;
  skillIndex: number;
  skillTotal: number;
  sectionLabel: string;
  fullscreenActive: boolean;
  webcamActive: boolean;
  violationCount: number;
  integrityHint: number;
}

export function ExamTopBar({
  skillName,
  skillIndex,
  skillTotal,
  sectionLabel,
  fullscreenActive,
  webcamActive,
  violationCount,
  integrityHint,
}: ExamTopBarProps) {
  return (
    <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] bg-[#161b22] px-4 py-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#58a6ff]">
          Make Big · Proctored skill exam
        </p>
        <h1 className="text-sm sm:text-base font-bold text-[#e6edf3] truncate">
          {skillName}
          <span className="text-[#8b949e] font-medium">
            {' '}
            · Skill {skillIndex + 1}/{skillTotal}
          </span>
        </h1>
        <p className="text-xs text-[#8b949e] mt-0.5">{sectionLabel}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs font-semibold">
        <span className={`px-2 py-1 rounded-md border ${fullscreenActive ? 'border-[#238636] text-[#7ee787] bg-[#238636]/10' : 'border-[#f85149] text-[#ffa198] bg-[#f85149]/10'}`}>
          {fullscreenActive ? 'Fullscreen' : 'Exit fullscreen'}
        </span>
        <span className={`px-2 py-1 rounded-md border ${webcamActive ? 'border-[#238636] text-[#7ee787] bg-[#238636]/10' : 'border-[#d29922] text-[#e3b341] bg-[#d29922]/10'}`}>
          {webcamActive ? 'Webcam on' : 'Webcam off'}
        </span>
        <span className="px-2 py-1 rounded-md border border-[#30363d] text-[#8b949e]">
          Integrity ~{integrityHint}%
        </span>
        {violationCount > 0 && (
          <span className="px-2 py-1 rounded-md border border-[#f85149] text-[#ffa198] bg-[#f85149]/10">
            Violations {violationCount}/3
          </span>
        )}
      </div>
    </header>
  );
}
