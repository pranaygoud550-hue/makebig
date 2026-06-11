'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clientApiUrl } from '@/lib/apiBase';
import { getAuthHeadersAsync } from '@/lib/api';

interface WeeklyTeam {
  projectId: string;
  name: string;
  slug: string;
  city: string;
  score: number;
  tasksDone: number;
  standups: number;
  activities: number;
}

export function WeeklyTeamsLeaderboard() {
  const [teams, setTeams] = useState<WeeklyTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(clientApiUrl('/api/leaderboards/weekly-teams'), {
          headers: await getAuthHeadersAsync(),
        });
        const data = await res.json();
        if (!cancelled && data.success) {
          setTeams(data.data?.teams || []);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-white border-t border-[#e0e0e0] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#0A66C2]">
              This week
            </p>
            <h2 className="text-2xl font-bold text-[#1d2226] mt-1">Most active teams</h2>
            <p className="text-sm text-[#666] mt-1">
              Ranked by standups, tasks completed, and project activity.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-[#f3f2ef] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <p className="text-sm text-[#666] text-center py-8">
            Teams are warming up — ship tasks and standups to climb the board.
          </p>
        ) : (
          <ol className="space-y-2">
            {teams.map((t, i) => (
              <li
                key={t.projectId}
                className="flex items-center gap-4 bg-[#f8f9fa] hover:bg-[#EEF3FB] border border-[#e8e8e8] rounded-xl px-4 py-3 transition-colors"
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                    i === 0
                      ? 'bg-amber-400 text-amber-950'
                      : i === 1
                        ? 'bg-slate-300 text-slate-800'
                        : i === 2
                          ? 'bg-amber-700/80 text-white'
                          : 'bg-white border border-[#d9d9d9] text-[#666]'
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  {t.slug ? (
                    <Link
                      href={`/p/${t.slug}`}
                      className="font-semibold text-[#1d2226] hover:text-[#0A66C2] truncate block"
                    >
                      {t.name}
                    </Link>
                  ) : (
                    <p className="font-semibold text-[#1d2226] truncate">{t.name}</p>
                  )}
                  <p className="text-xs text-[#666] mt-0.5">
                    {t.tasksDone} tasks · {t.standups} standups · {t.activities} updates
                    {t.city ? ` · ${t.city}` : ''}
                  </p>
                </div>
                <span className="text-sm font-bold text-[#0A66C2] shrink-0">{t.score} pts</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
