'use client';

interface ProgressBarProps {
  current: number;
  total: number;
  showLabel?: boolean;
}

export function ProgressBar({ current, total, showLabel = true }: ProgressBarProps) {
  const percentage = (current / total) * 100;

  return (
    <div className="space-y-2">
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
        <div
          className="h-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-slate-400">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={i < current ? 'text-sky-400' : ''}>
              Step {i + 1}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
