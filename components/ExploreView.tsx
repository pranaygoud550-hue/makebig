'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { WIZARD_CATEGORIES } from '@/lib/constants';
import { INDIAN_CITIES } from '@/lib/indianCities';
import { BrowseProject } from '@/lib/api';
import { dedupeProjectsForDisplay } from '@/lib/dedupeProjects';
import { ProjectExploreCard } from '@/components/app/ProjectExploreCard';
import type { DashboardNavTab } from '@/components/DashboardNew';

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

interface ExploreViewProps {
  embedded?: boolean;
  userContact?: string;
  onJoinProject?: (project: BrowseProject) => void;
  onOpenDashboard?: (section?: DashboardNavTab) => void;
}

export function ExploreView({
  embedded = false,
  userContact,
  onJoinProject,
  onOpenDashboard,
}: ExploreViewProps) {
  const [projects, setProjects] = useState<ExploreProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState(() => {
    if (typeof window === 'undefined') return '';
    const preset = sessionStorage.getItem('makeBigExploreCategory');
    if (preset) {
      sessionStorage.removeItem('makeBigExploreCategory');
      return preset;
    }
    return '';
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [city, category, search]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (city) params.set('city', city);
      if (category) params.set('categoryId', category);
      if (search) params.set('q', search);
      params.set('page', String(page));
      params.set('limit', '12');

      try {
        const res = await fetch(`${EXPLORE_API}?${params}`);
        const data = await res.json();
        if (cancelled || !data.success) return;

        const incoming = dedupeProjectsForDisplay(
          (data.data.projects || []) as ExploreProject[]
        );

        setProjects((prev) =>
          page === 1 ? incoming : dedupeProjectsForDisplay([...prev, ...incoming])
        );
        setHasMore(Boolean(data.data.hasMore));
        setTotal(data.data.total ?? incoming.length);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [city, category, search, page]);

  const searchInput = (
    <input
      type="text"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search by project name, skill, or description…"
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
            {loading && projects.length === 0
              ? 'Loading…'
              : `${total} open project${total !== 1 ? 's' : ''} matching your filters`}
          </p>
        </div>

        <div className="flex gap-6 flex-col lg:flex-row">
          <aside className="lg:w-64 xl:w-72 shrink-0 space-y-4">
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
              <div className="space-y-1 max-h-64 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setCategory('')}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                    !category
                      ? 'bg-[#EEF3FB] text-[#0A66C2] font-semibold'
                      : 'text-[#666] hover:bg-[#f3f2ef]'
                  }`}
                >
                  All categories
                </button>
                {WIZARD_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-start gap-2 ${
                      category === cat.id
                        ? 'bg-[#EEF3FB] text-[#0A66C2] font-semibold'
                        : 'text-[#666] hover:bg-[#f3f2ef]'
                    }`}
                  >
                    <span className="shrink-0 mt-0.5">{CAT_ICONS[cat.id] || '🚀'}</span>
                    <span className="leading-snug break-words">{cat.title}</span>
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
                    className="bg-white rounded-2xl border border-[#e0e0e0] p-5 animate-pulse h-52"
                  />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-[#d9d9d9]">
                <p className="font-bold text-[#1d2226]">No projects found</p>
                <p className="text-sm text-[#666] mt-1">Try different filters or search terms</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {projects.map((p) => (
                    <ProjectExploreCard
                      key={p.id}
                      project={p}
                      userContact={userContact}
                      showJoin={embedded && Boolean(onJoinProject || onOpenDashboard)}
                      onJoinProject={onJoinProject}
                      onOpenDashboard={
                        onOpenDashboard ? () => onOpenDashboard('dashboard') : undefined
                      }
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      onClick={() => setPage((pg) => pg + 1)}
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
