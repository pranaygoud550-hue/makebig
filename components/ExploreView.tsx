'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { WIZARD_CATEGORIES } from '@/lib/constants';
import { INDIAN_CITIES } from '@/lib/indianCities';
import { inferProjectPurpose, showsSalaryForPurpose } from '@/lib/projectPurpose';
import { BrowseProject } from '@/lib/api';

const EXPLORE_API = '/api/public/explore';

export interface ExploreProject {
  id: string;
  name: string;
  desc: string;
  categoryId: string;
  roles: string[];
  city: string;
  state: string;
  slug: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  ownerContact?: string;
  createdAt?: string;
  joinedCount?: number;
  projectPurpose?: string;
}

const CAT_ICONS: Record<string, string> = {
  tech: '💻',
  design: '🎨',
  marketing: '📢',
  content: '✍️',
  finance: '💰',
  education: '📚',
  health: '🏥',
  social: '🤝',
  other: '🚀',
};

function formatSalary(max?: number, currency = 'INR') {
  if (!max) return null;
  const sym: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
  const s = sym[currency] || currency;
  if (max >= 100000) return `${s}${(max / 100000).toFixed(1)}L/mo`;
  if (max >= 1000) return `${s}${Math.round(max / 1000)}K/mo`;
  return `${s}${max}/mo`;
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

interface ExploreViewProps {
  embedded?: boolean;
  onJoinProject?: (project: BrowseProject) => void;
}

export function ExploreView({ embedded = false, onJoinProject }: ExploreViewProps) {
  const [projects, setProjects] = useState<ExploreProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchProjects = useCallback(
    async (reset = false) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (city) params.set('city', city);
      if (category) params.set('categoryId', category);
      if (search) params.set('skills', search);
      params.set('page', String(reset ? 1 : page));
      params.set('limit', '12');

      try {
        const res = await fetch(`${EXPLORE_API}?${params}`);
        const data = await res.json();
        if (data.success) {
          setProjects((prev) =>
            reset ? data.data.projects : [...prev, ...data.data.projects]
          );
          setHasMore(data.data.hasMore);
          setTotal(data.data.total);
          if (reset) setPage(1);
        }
      } finally {
        setLoading(false);
      }
    },
    [city, category, search, page]
  );

  useEffect(() => {
    fetchProjects(true);
  }, [city, category]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchInput = (
    <input
      type="text"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && fetchProjects(true)}
      placeholder="Search by skill (e.g. React, Video Editing)…"
      className={
        embedded
          ? 'w-full px-4 py-2.5 bg-white border border-[#d9d9d9] rounded-full text-sm text-[#1d2226] placeholder-[#999] focus:outline-none focus:border-[#0A66C2]'
          : 'w-full px-4 py-2 bg-[#f3f2ef] border border-[#d9d9d9] rounded-full text-sm text-[#1d2226] placeholder-[#999] focus:outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20'
      }
    />
  );

  return (
    <div className={embedded ? '' : 'min-h-screen bg-[#f3f2ef]'}>
      {!embedded && (
        <header className="sticky top-0 z-40 bg-white border-b border-[#d9d9d9] shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <Link href="/" className="text-xl font-black text-[#0A66C2] tracking-tight">
              Make Big
            </Link>
            <div className="flex-1 max-w-md">{searchInput}</div>
            <Link
              href="/"
              className="hidden sm:block px-4 py-1.5 border border-[#0A66C2] text-[#0A66C2] text-sm font-semibold rounded-full hover:bg-[#EEF3FB] transition-colors"
            >
              Sign In →
            </Link>
          </div>
        </header>
      )}

      <main className={embedded ? 'px-0 py-2' : 'max-w-6xl mx-auto px-4 sm:px-6 py-8'}>
        {embedded && <div className="mb-4">{searchInput}</div>}

        <div className="mb-4">
          <h1 className="text-xl font-bold text-[#1d2226]">Explore Projects</h1>
          <p className="text-sm text-[#666] mt-1">
            {loading
              ? 'Loading…'
              : `${total} open project${total !== 1 ? 's' : ''} matching your filters`}
          </p>
        </div>

        <div className="flex gap-6 flex-col lg:flex-row">
          <aside className="lg:w-52 shrink-0 space-y-4">
            <div className="bg-white rounded-2xl border border-[#e0e0e0] p-4">
              <p className="text-xs font-bold text-[#1d2226] uppercase tracking-wide mb-2">City</p>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-[#f3f2ef] border border-[#d9d9d9] rounded-lg text-sm focus:outline-none focus:border-[#0A66C2]"
              >
                <option value="">All cities</option>
                {INDIAN_CITIES.map((c) => (
                  <option key={c.city} value={c.city}>
                    {c.city}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-2xl border border-[#e0e0e0] p-4">
              <p className="text-xs font-bold text-[#1d2226] uppercase tracking-wide mb-2">
                Category
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setCategory('')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${!category ? 'bg-[#EEF3FB] text-[#0A66C2] font-semibold' : 'text-[#666] hover:bg-[#f3f2ef]'}`}
                >
                  All
                </button>
                {WIZARD_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${category === cat.id ? 'bg-[#EEF3FB] text-[#0A66C2] font-semibold' : 'text-[#666] hover:bg-[#f3f2ef]'}`}
                  >
                    <span>{CAT_ICONS[cat.id] || '🚀'}</span>
                    <span className="truncate">{cat.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {loading && projects.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-[#e0e0e0] p-5 animate-pulse h-36"
                  />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-[#d9d9d9]">
                <p className="font-bold text-[#1d2226]">No projects found</p>
                <p className="text-sm text-[#666] mt-1">Try different filters</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {projects.map((p) => {
                    const salaryLabel = showsSalaryForPurpose(
                      inferProjectPurpose(p.projectPurpose, p.salaryMax, p.salaryMin)
                    )
                      ? formatSalary(p.salaryMax, p.currency)
                      : null;
                    return (
                      <div
                        key={p.id}
                        className="bg-white rounded-2xl border border-[#e0e0e0] hover:border-[#0A66C2]/40 p-5 transition-all"
                      >
                        <Link
                          href={p.slug ? `/p/${p.slug}` : '/explore'}
                          className="block"
                        >
                          <div className="flex justify-between gap-2 mb-2">
                            <span className="text-lg">{CAT_ICONS[p.categoryId] || '🚀'}</span>
                            {salaryLabel && (
                              <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                {salaryLabel}
                              </span>
                            )}
                          </div>
                          <h2 className="font-bold text-[#1d2226] line-clamp-2">{p.name}</h2>
                          {p.desc && (
                            <p className="text-sm text-[#666] mt-1 line-clamp-2">{p.desc}</p>
                          )}
                          <p className="text-xs text-[#999] mt-2">
                            {p.city && `📍 ${p.city} · `}
                            {timeAgo(p.createdAt)}
                          </p>
                        </Link>
                        {embedded && onJoinProject && (
                          <button
                            type="button"
                            onClick={() =>
                              onJoinProject({
                                id: p.id,
                                name: p.name,
                                desc: p.desc,
                                categoryId: p.categoryId,
                                roles: p.roles,
                                slug: p.slug,
                                ownerContact: p.ownerContact,
                                salaryMin: p.salaryMin,
                                salaryMax: p.salaryMax,
                                currency: p.currency,
                              } as BrowseProject)
                            }
                            className="mt-4 w-full py-2.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182]"
                          >
                            Join now
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setPage((pg) => pg + 1);
                        fetchProjects();
                      }}
                      disabled={loading}
                      className="px-6 py-2.5 border border-[#0A66C2] text-[#0A66C2] font-semibold rounded-full text-sm disabled:opacity-50"
                    >
                      {loading ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
