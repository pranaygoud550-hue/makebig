'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/lib/context/ToastContext';

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

const PERIODS = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'all', label: 'All time' },
] as const;

interface VerifiedSkillsLeaderboardProps {
  viewerContact?: string;
}

export function VerifiedSkillsLeaderboard({ viewerContact }: VerifiedSkillsLeaderboardProps) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [tab, setTab] = useState<keyof LeaderboardData>('developers');
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['id']>('all');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetch('/api/leaderboards/verified-skills')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const allEntries = data?.[tab] || [];
  const entries = allEntries.slice(0, period === 'weekly' ? 5 : period === 'monthly' ? 8 : 10);
  const viewerEntry = viewerContact
    ? allEntries.find((e) => e.contact.toLowerCase() === viewerContact.toLowerCase())
    : undefined;
  const viewerRank = viewerEntry ? allEntries.indexOf(viewerEntry) + 1 : null;

  const shareRank = (entry: LeaderEntry, rank: number) => {
    const text = encodeURIComponent(
      `I ranked #${rank} in ${entry.skillName} on Make Big 🏆`
    );
    const url = encodeURIComponent('https://makebig.vercel.app');
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <section className="py-12 bg-[#fafcff] dark:bg-gray-900 border-y border-[#e0e0e0] dark:border-gray-700">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-widest mb-1">
            🏆 Verified talent
          </p>
          <h2 className="text-2xl font-bold text-[#1d2226] dark:text-white">Skill leaderboard</h2>
          <p className="text-sm text-[#666] dark:text-gray-400 mt-1">
            Top verified members per category — proctored scores
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                period === p.id
                  ? 'bg-[#1d2226] dark:bg-white text-white dark:text-[#1d2226] border-transparent'
                  : 'bg-white dark:bg-gray-800 text-[#666] border-[#d9d9d9] dark:border-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
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
                  : 'bg-white dark:bg-gray-800 text-[#666] border-[#d9d9d9] dark:border-gray-600 hover:border-[#0A66C2]'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-white dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-[#999]">No verified professionals yet — be the first!</p>
        ) : (
          <ol className="space-y-2">
            {entries.map((e, i) => (
              <li
                key={`${e.contact}-${e.skillName}`}
                className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-[#e0e0e0] dark:border-gray-700 px-4 py-3 hover:scale-[1.01] transition-transform"
              >
                <span className="w-8 h-8 rounded-full bg-[#0A66C2] text-white flex items-center justify-center text-sm font-black shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <Link href={`/u/${encodeURIComponent(e.contact)}`} className="text-sm font-bold text-[#1d2226] dark:text-white truncate hover:text-[#0A66C2]">
                    {e.name}
                  </Link>
                  <p className="text-xs text-[#666] truncate">
                    {e.skillName}
                    {e.college ? ` · ${e.college}` : ''}
                  </p>
                </div>
                <span className="text-sm font-semibold whitespace-nowrap hidden sm:inline">
                  {e.badgeIcon} {e.score}
                </span>
                <button
                  type="button"
                  onClick={() => showToast(`Challenge sent to ${e.name.split(' ')[0]}! (demo)`, 'info')}
                  className="text-[10px] px-2 py-1 rounded-full border border-[#d9d9d9] text-[#666] hover:border-[#0A66C2] shrink-0"
                >
                  Challenge
                </button>
                <button
                  type="button"
                  onClick={() => shareRank(e, i + 1)}
                  className="text-[10px] px-2 py-1 rounded-full bg-[#EEF3FB] text-[#0A66C2] font-semibold shrink-0"
                >
                  Share
                </button>
              </li>
            ))}
          </ol>
        )}

        {viewerEntry && viewerRank && viewerRank > 10 && (
          <div className="mt-4 pt-4 border-t border-[#e0e0e0] dark:border-gray-700 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-[#666]">Your rank</p>
              <p className="font-bold text-[#1d2226] dark:text-white">
                #{viewerRank} — {viewerEntry.skillName} ({viewerEntry.score})
              </p>
            </div>
            <button
              type="button"
              onClick={() => shareRank(viewerEntry, viewerRank)}
              className="text-xs px-3 py-1.5 rounded-full bg-[#0A66C2] text-white font-semibold"
            >
              Share rank
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
