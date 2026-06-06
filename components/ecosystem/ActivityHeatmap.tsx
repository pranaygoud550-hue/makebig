'use client';

interface ActivityHeatmapProps {
  heatmap: Array<{ date: string; count: number }>;
}

function level(count: number) {
  if (count >= 4) return 'bg-[#0A66C2]';
  if (count >= 3) return 'bg-[#4A90D9]';
  if (count >= 2) return 'bg-[#93C5FD]';
  if (count >= 1) return 'bg-[#DBEAFE]';
  return 'bg-[#f3f2ef]';
}

export function ActivityHeatmap({ heatmap }: ActivityHeatmapProps) {
  const cells = heatmap.slice(-84);
  const weeks: Array<Array<{ date: string; count: number }>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <section className="bg-white rounded-2xl border border-[#e0e0e0] p-5 space-y-3">
      <h2 className="text-xs font-bold text-[#666] uppercase tracking-wide">
        Activity — last 12 weeks
      </h2>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date}: ${cell.count} contributions`}
                className={`w-3 h-3 rounded-sm ${level(cell.count)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[#999]">
        Updates, tasks, joins, and milestones
      </p>
    </section>
  );
}
