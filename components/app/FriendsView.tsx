'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGetTalent, apiRateProfile } from '@/lib/api';
import { ProjectData } from '@/lib/types';
import { StarRating } from '@/components/StarRating';
import { useProfileView } from '@/lib/context/ProfileViewContext';

interface TalentCard {
  id?: string;
  contact?: string;
  name?: string;
  tagline?: string;
  skills?: string[];
  college?: string;
  role?: string;
  availableForInvites?: boolean;
  workRatingAvg?: number;
  workRatingCount?: number;
}

type FriendsFilter = 'all' | 'available' | 'creators' | 'top-rated';

interface FriendsViewProps {
  currentProject: ProjectData | null;
  userContact?: string;
  onInvite?: () => void;
}

const FILTERS: { id: FriendsFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Available' },
  { id: 'creators', label: 'Creators' },
  { id: 'top-rated', label: 'Top rated' },
];

export function FriendsView({ currentProject, userContact, onInvite }: FriendsViewProps) {
  const [talent, setTalent] = useState<TalentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState<FriendsFilter>('all');
  const [ratingBusy, setRatingBusy] = useState<string | null>(null);
  const { openProfile } = useProfileView();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const loadTalent = useCallback(async (q: string) => {
    setLoading(true);
    const list = await apiGetTalent(q || undefined);
    setTalent(Array.isArray(list) ? list : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTalent(debounced);
  }, [debounced, loadTalent]);

  const skillTabs = useMemo(() => {
    const counts = new Map<string, number>();
    talent.forEach((t) => {
      (t.skills || []).slice(0, 3).forEach((s) => {
        counts.set(s, (counts.get(s) || 0) + 1);
      });
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([skill]) => skill);
  }, [talent]);

  const [skillFilter, setSkillFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = talent.filter((t) => t.contact !== userContact);
    if (filter === 'available') {
      list = list.filter((t) => t.availableForInvites);
    } else if (filter === 'creators') {
      list = list.filter((t) => t.role === 'creator' || t.role === 'both');
    } else if (filter === 'top-rated') {
      list = list.filter((t) => (t.workRatingAvg || 0) >= 4);
    }
    if (skillFilter) {
      list = list.filter((t) =>
        (t.skills || []).some((s) => s.toLowerCase() === skillFilter.toLowerCase())
      );
    }
    return list;
  }, [talent, filter, skillFilter, userContact]);

  const handleRate = async (contact: string, stars: number) => {
    if (!contact || ratingBusy) return;
    setRatingBusy(contact);
    const ok = await apiRateProfile(contact, stars);
    if (ok) await loadTalent(debounced);
    setRatingBusy(null);
  };

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <div>
          <h1 className="text-xl font-bold text-[#1d2226]">Friends</h1>
          <p className="text-sm text-[#666] mt-0.5">
            Find creators, rate their work, and build your team.
          </p>
        </div>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666] text-sm">🔍</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, skill, or college…"
            className="w-full pl-9 pr-4 py-3 rounded-full border border-[#d9d9d9] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30 focus:border-[#0A66C2]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFilter(f.id);
                setSkillFilter(null);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filter === f.id && !skillFilter
                  ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                  : 'bg-white text-[#666] border-[#d9d9d9] hover:border-[#0A66C2]'
              }`}
            >
              {f.label}
            </button>
          ))}
          {skillTabs.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => setSkillFilter(skillFilter === skill ? null : skill)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                skillFilter === skill
                  ? 'bg-[#EEF3FB] text-[#0A66C2] border-[#0A66C2]'
                  : 'bg-white text-[#666] border-[#d9d9d9] hover:border-[#0A66C2]'
              }`}
            >
              {skill}
            </button>
          ))}
        </div>
      </header>

      {currentProject?.id && onInvite && (
        <div className="bg-[#EEF3FB] border border-[#0A66C2]/20 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-[#1d2226]">Have a project? Invite creators from your dashboard.</p>
          <button
            type="button"
            onClick={onInvite}
            className="shrink-0 px-3 py-1.5 bg-[#0A66C2] text-white text-xs font-semibold rounded-full"
          >
            Open project
          </button>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#e0e0e0] p-4 h-24 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-[#d9d9d9] p-10 text-center">
          <p className="text-2xl mb-2">👋</p>
          <p className="font-semibold text-[#1d2226]">No people match this filter</p>
          <p className="text-sm text-[#666] mt-1">Try All or a different search term.</p>
        </div>
      )}

      {!loading &&
        filtered.map((t, idx) => (
          <article
            key={t.contact || String(idx)}
            role="button"
            tabIndex={0}
            onClick={() => t.contact && openProfile(t.contact, t.name || t.contact)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && t.contact) {
                e.preventDefault();
                openProfile(t.contact, t.name || t.contact);
              }
            }}
            className="bg-white rounded-2xl border border-[#e0e0e0] p-4 space-y-2 cursor-pointer hover:border-[#0A66C2]/40 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[#1d2226]">{t.name || t.contact || 'Creator'}</p>
                {t.college && <p className="text-xs text-[#0A66C2] mt-0.5">🎓 {t.college}</p>}
                {t.tagline && (
                  <p className="text-sm text-[#666] mt-1 line-clamp-2">{t.tagline}</p>
                )}
              </div>
              {t.availableForInvites && (
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  Open
                </span>
              )}
            </div>

            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <StarRating
              value={t.workRatingAvg || 0}
              count={t.workRatingCount}
              interactive={Boolean(t.contact && t.contact !== userContact)}
              onRate={(stars) => t.contact && handleRate(t.contact, stars)}
            />
            </div>

            <p className="text-xs text-[#0A66C2] font-semibold">Tap to view full profile →</p>

            {t.skills && t.skills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {t.skills.slice(0, 6).map((s) => (
                  <span
                    key={s}
                    className="text-[10px] px-2 py-0.5 bg-[#f3f2ef] text-[#666] rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
    </div>
  );
}
