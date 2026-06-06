'use client';

import { useEffect, useState } from 'react';

interface LeaderEntry {
  name: string;
  contact: string;
  college: string;
  skillName: string;
  score: number;
  badge: string;
  badgeIcon: string;
}

interface LeaderboardData {
  developers: LeaderEntry[];
  designers: LeaderEntry[];
  ai_engineers: LeaderEntry[];
  marketers: LeaderEntry[];
}

const TABS = [
  { id: 'developers' as const, label: 'Developers', icon: '💻' },
  { id: 'designers' as const, label: 'Designers', icon: '🎨' },
  { id: 'ai_engineers' as const, label: 'AI Engineers', icon: '🤖' },
  { id: 'marketers' as const, label: 'Marketers', icon: '📢' },
];

export function VerifiedSkillsLeaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [tab, setTab] = useState<keyof LeaderboardData>('developers');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboards/verified-skills')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const entries = data?.[tab] || [];

  return (
    <section className="py-12 bg-[#fafcff] border-y border-[#e0e0e0]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-widest mb-1">
            🏆 Verified talent
          </p>
          <h2 className="text-2xl font-bold text-[#1d2226]">Top verified professionals</h2>
          <p className="text-sm text-[#666] mt-1">
            Ranked by proctored skill verification scores — updated automatically
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                tab === t.id
                  ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                  : 'bg-white text-[#666] border-[#d9d9d9] hover:border-[#0A66C2]'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-[#999]">No verified professionals yet — be the first!</p>
        ) : (
          <ol className="space-y-2">
            {entries.map((e, i) => (
              <li
                key={`${e.contact}-${e.skillName}`}
                className="flex items-center gap-3 bg-white rounded-xl border border-[#e0e0e0] px-4 py-3"
              >
                <span className="text-lg font-black text-[#0A66C2] w-6">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1d2226] truncate">{e.name}</p>
                  <p className="text-xs text-[#666] truncate">
                    {e.skillName}
                    {e.college ? ` · ${e.college}` : ''}
                  </p>
                </div>
                <span className="text-sm font-semibold whitespace-nowrap">
                  {e.badgeIcon} {e.badge} · {e.score}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
