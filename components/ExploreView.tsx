'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { WIZARD_CATEGORIES } from '@/lib/constants';
import { INDIAN_CITIES } from '@/lib/indianCities';
import { BrowseProject } from '@/lib/api';
import { dedupeById } from '@/lib/dedupeProjects';
import { ProjectExploreCard } from '@/components/app/ProjectExploreCard';
import { ProjectCardSkeleton } from '@/components/ui/Skeleton';
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
  tags?: string[];
  viewerRelation?: 'owner' | 'joined' | 'pending' | 'none';
}

const SKILL_CHIPS = [
  'React', 'Node.js', 'Python', 'UI/UX', 'ML', 'Flutter',
  'Java', 'DevOps', 'Marketing', 'Content',
];

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
  const [debouncedSearch, setDebouncedSearch] = useState('');
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [city, category, debouncedSearch, selectedSkills]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setLoadError(null);
      const params = new URLSearchParams();
      if (city) params.set('city', city);
      if (category) params.set('categoryId', category);
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (selectedSkills.length) params.set('skills', selectedSkills.join(','));
      if (userContact) params.set('viewerContact', userContact);
      params.set('page', String(page));
      params.set('limit', '12');

      try {
        const res = await fetch(`${EXPLORE_API}?${params}`, { signal: controller.signal });
        const data = await res.json();
        if (cancelled) return;
        if (!data.success) {
          if (page === 1) {
            setProjects([]);
            setLoadError('Could not load projects — check your connection and try again.');
          }
          return;
        }

        let incoming = dedupeById((data.data.projects || []) as ExploreProject[]);
        if (selectedSkills.length) {
          incoming = incoming.filter((p) =>
            selectedSkills.some((skill) =>
              (p.roles || []).some((r) => r.toLowerCase().includes(skill.toLowerCase())) ||
              (p.tags || []).some((t) => t.toLowerCase().includes(skill.toLowerCase()))
            )
          );
        }

        setProjects((prev) =>
          page === 1 ? incoming : dedupeById([...prev, ...incoming])
        );
        setHasMore(Boolean(data.data.hasMore));
        setTotal(selectedSkills.length ? incoming.length : (data.data.total ?? incoming.length));
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        if (page === 1) {
          setProjects([]);
          setLoadError('Could not load projects — the server may be waking up. Try again in a moment.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [city, category, debouncedSearch, page, selectedSkills, userContact]);

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
          <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
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

      <main className={embedded ? 'px-0 py-2 w-full' : 'w-full px-4 sm:px-6 lg:px-8 py-8'}>
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
          <aside className="lg:min-w-[200px] lg:w-64 xl:w-72 shrink-0 space-y-4">
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

            <div className="bg-white rounded-2xl border border-[#e0e0e0] p-4">
              <p className="text-xs font-bold text-[#1d2226] uppercase tracking-wide mb-2">Skills</p>
              <div className="flex flex-wrap gap-2">
                {SKILL_CHIPS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      selectedSkills.includes(skill)
                        ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                        : 'bg-[#f3f2ef] text-[#666] border-[#e0e0e0] hover:border-[#0A66C2]'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {loading && projects.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <ProjectCardSkeleton key={i} />
                ))}
              </div>
            ) : loadError ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-amber-200">
                <p className="font-bold text-[#1d2226]">Could not load projects</p>
                <p className="text-sm text-[#666] mt-1">{loadError}</p>
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  className="mt-4 px-5 py-2 rounded-full bg-[#0A66C2] text-white text-sm font-semibold"
                >
                  Retry
                </button>
              </div>
            ) : projects.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-[#d9d9d9]">
                <p className="font-bold text-[#1d2226]">No projects found</p>
                <p className="text-sm text-[#666] mt-1">Try different filters or search terms</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((p) => (
                    <ProjectExploreCard
                      key={p.id}
                      project={p}
                      userContact={userContact}
                      showJoin={embedded ? Boolean(onJoinProject || onOpenDashboard) : true}
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
