'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiBrowseProjects, BrowseProject } from '@/lib/api';
import { filterAllowedProjects, isAllowedPublicProject } from '@/lib/projectAllowlist';
import { createApiSocket } from '@/lib/realtime';
import { WIZARD_CATEGORIES } from '@/lib/constants';
import { inferProjectPurpose, showsSalaryForPurpose } from '@/lib/projectPurpose';

interface PublicProjectFeedProps {
  isAuthed: boolean;
  onRequireAuth: () => void;
  onJoinProject?: (project: BrowseProject) => void;
}

const CAT_COLORS = [
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-teal-50 text-teal-700 border-teal-200',
  'bg-indigo-50 text-indigo-700 border-indigo-200',
];

function colorForCategory(categoryId: string) {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) hash = categoryId.charCodeAt(i) + ((hash << 5) - hash);
  return CAT_COLORS[Math.abs(hash) % CAT_COLORS.length];
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

function categoryTitle(id: string) {
  return WIZARD_CATEGORIES.find(c => c.id === id)?.title || 'Project';
}

function formatBudget(min?: number, max?: number, currency = 'INR') {
  if (!min && !max) return 'Budget on request';
  const fmt = (n: number) => {
    if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(n);
  };
  if (min && max && min !== max) return `${currency} ${fmt(min)}–${fmt(max)}/mo`;
  return `${currency} ${fmt(min || max || 0)}/mo`;
}

export function PublicProjectFeed({ isAuthed, onRequireAuth, onJoinProject }: PublicProjectFeedProps) {
  const [projects, setProjects]   = useState<BrowseProject[]>([]);
  const [loading, setLoading]     = useState(true);
  const [category, setCategory]   = useState<string>('all');
  const [search, setSearch]       = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(null);

  /* ─── Initial load + on category change ─── */
  const load = useCallback(async () => {
    setLoading(true);
    const list = filterAllowedProjects(await apiBrowseProjects(category));
    setProjects(list);
    setLoading(false);
  }, [category]);

  useEffect(() => { load(); }, [load]);

  /* ─── Live socket when API is running ─── */
  useEffect(() => {
    let socket: Awaited<ReturnType<typeof createApiSocket>> = null;
    let cancelled = false;

    const handleAdd = (incoming: Record<string, unknown>) => {
      const proj = incoming as unknown as BrowseProject;
      if (!proj?.id && !proj?._id) return;
      if (!isAllowedPublicProject(proj)) return;
      const id = proj.id || (proj._id as string);
      setProjects((prev) => {
        if (prev.some((p) => (p.id || p._id) === id)) return prev;
        return [{ ...proj, id }, ...prev];
      });
      setHighlightId(id);
      setTimeout(() => setHighlightId((curr) => (curr === id ? null : curr)), 3000);
    };

    createApiSocket().then((s) => {
      if (cancelled || !s) return;
      socket = s;
      s.on('project_published', handleAdd);
      s.on('project_created', handleAdd);
    });

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, []);

  /* ─── Client-side filter by search ─── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(p => {
      const hay = `${p.name || ''} ${p.desc || ''} ${(p.roles || []).join(' ')} ${categoryTitle(p.categoryId || '')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [projects, search]);

  const handleJoinClick = (project: BrowseProject) => {
    if (!isAuthed) {
      onRequireAuth();
      return;
    }
    onJoinProject?.(project);
  };

  const stats = useMemo(() => ({
    total:   projects.length,
    open:    projects.filter(p => (p.joinedCount || 0) < (p.teamMemberCount || 5)).length,
    skills:  Array.from(new Set(projects.flatMap(p => p.roles || []))).length,
  }), [projects]);

  return (
    <section className="bg-[#f3f2ef] py-12 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Section heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex w-2.5 h-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#0A66C2] opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0A66C2]" />
              </span>
              <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-wider">Live</p>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1d2226]">
              What people are building right now
            </h2>
            <p className="text-[#666] text-sm md:text-base mt-1">
              {loading
                ? 'Loading the latest projects from creators…'
                : `${stats.total} active project${stats.total !== 1 ? 's' : ''} · ${stats.skills} skill${stats.skills !== 1 ? 's' : ''} needed · updated live`}
            </p>
          </div>
          <Link
            href="/explore"
            className="shrink-0 px-5 py-2.5 text-sm font-semibold text-[#0A66C2] border border-[#0A66C2] rounded-full hover:bg-[#EEF3FB] transition-colors"
          >
            Explore all →
          </Link>
        </div>

        {/* Search + Category Chips */}
        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 mb-5">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" /></svg>
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search projects, skills, categories…"
                className="w-full pl-9 pr-3 py-2.5 bg-[#f3f2ef] border border-[#d9d9d9] rounded-full text-sm text-[#1d2226] placeholder-[#999] focus:outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20 transition-all"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto md:overflow-visible -mx-1 px-1 md:m-0 md:p-0">
              <button
                onClick={() => setCategory('all')}
                className={`px-4 py-2 text-xs font-semibold rounded-full whitespace-nowrap transition-all border ${
                  category === 'all'
                    ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                    : 'bg-white text-[#666] border-[#d9d9d9] hover:border-[#0A66C2] hover:text-[#0A66C2]'
                }`}
              >
                All
              </button>
              {WIZARD_CATEGORIES.slice(0, 6).map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`px-4 py-2 text-xs font-semibold rounded-full whitespace-nowrap transition-all border ${
                    category === c.id
                      ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                      : 'bg-white text-[#666] border-[#d9d9d9] hover:border-[#0A66C2] hover:text-[#0A66C2]'
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-[#e0e0e0] rounded-2xl p-5 animate-pulse">
                <div className="h-3 w-20 bg-[#f0f0f0] rounded mb-3" />
                <div className="h-5 w-3/4 bg-[#e8e8e8] rounded mb-2" />
                <div className="h-4 w-full bg-[#f3f3f3] rounded mb-1" />
                <div className="h-4 w-5/6 bg-[#f3f3f3] rounded mb-4" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-[#f0f0f0] rounded-full" />
                  <div className="h-6 w-20 bg-[#f0f0f0] rounded-full" />
                  <div className="h-6 w-14 bg-[#f0f0f0] rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-[#d9d9d9] rounded-2xl p-12 text-center">
            <p className="text-5xl mb-3">·</p>
            <p className="text-[#1d2226] font-semibold text-lg">No projects match this filter</p>
            <p className="text-[#666] text-sm mt-1">
              {search
                ? `No results for "${search}". Try a different keyword.`
                : 'Try a different category, or be the first to post here.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(project => {
              const id = (project.id || project._id) as string;
              const isHot = highlightId === id;
              const skills = project.roles || [];
              const team = project.teamMemberCount || 0;
              const cap = project.maxTeamSize || team + 5;
              const filledPct = Math.min(100, Math.round((team / Math.max(cap, 1)) * 100));

              return (
                <article
                  key={id}
                  className={`group relative bg-white border rounded-2xl p-5 hover:border-[#0A66C2]/40 hover:shadow-sm transition-all ${
                    isHot
                      ? 'border-[#0A66C2] ring-2 ring-[#0A66C2]/20'
                      : 'border-[#e0e0e0]'
                  }`}
                >
                  {isHot && (
                    <span className="absolute -top-2 left-5 px-2 py-0.5 text-[10px] font-bold text-white bg-[#0A66C2] rounded-full uppercase tracking-wider">
                      Just posted
                    </span>
                  )}

                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full border ${colorForCategory(project.categoryId || '')}`}>
                      {categoryTitle(project.categoryId || '')}
                    </span>
                    <p className="text-[10px] text-[#999] shrink-0">{timeAgo(project.updatedAt || project.createdAt)}</p>
                  </div>

                  {/* Title */}
                  {project.slug ? (
                    <Link href={`/p/${project.slug}`} className="block group/title">
                      <h3 className="font-bold text-[#1d2226] text-lg leading-tight mb-1.5 group-hover/title:text-[#0A66C2] transition-colors">
                        {project.name}
                      </h3>
                    </Link>
                  ) : (
                    <h3 className="font-bold text-[#1d2226] text-lg leading-tight mb-1.5">
                      {project.name}
                    </h3>
                  )}

                  {/* Description */}
                  {project.desc && (
                    <p className="text-sm text-[#666] line-clamp-2 mb-3">{project.desc}</p>
                  )}

                  {/* Skills */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {skills.slice(0, 4).map(s => (
                        <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF3FB] text-[#0A66C2] border border-[#0A66C2]/15">
                          {s}
                        </span>
                      ))}
                      {skills.length > 4 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f2ef] text-[#666]">
                          +{skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center justify-between text-xs text-[#666] pt-3 border-t border-[#f0f0f0]">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>
                      {showsSalaryForPurpose(
                        inferProjectPurpose(
                          (project as { projectPurpose?: string }).projectPurpose,
                          project.salaryMax,
                          project.salaryMin
                        )
                      )
                        ? formatBudget(project.salaryMin, project.salaryMax, project.currency || 'INR')
                        : 'Collaboration — no salary'}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      {team}/{cap} joined
                    </span>
                  </div>

                  {/* Capacity bar */}
                  <div className="h-1 bg-[#f0f0f0] rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-[#0A66C2] rounded-full transition-all duration-500" style={{ width: `${filledPct}%` }} />
                  </div>

                  {/* Anonymized owner + CTA */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#f3f2ef] border border-[#e0e0e0] flex items-center justify-center text-[#999] text-xs">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                      </div>
                      <p className="text-xs text-[#666] truncate">
                        {isAuthed ? 'Posted by a creator' : 'Sign in to see who posted'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      {project.slug && (
                        <Link
                          href={`/p/${project.slug}`}
                          className="px-3 py-1.5 text-xs font-semibold rounded-full border border-[#d9d9d9] text-[#666] hover:border-[#0A66C2] hover:text-[#0A66C2] whitespace-nowrap"
                        >
                          View & share
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleJoinClick(project)}
                        className="px-4 py-1.5 text-xs font-semibold rounded-full bg-[#0A66C2] text-white hover:bg-[#004182] transition-all whitespace-nowrap"
                      >
                        {isAuthed ? 'Join Project' : 'Sign in to join'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Footer banner — encourages signup */}
        {!loading && filtered.length > 0 && !isAuthed && (
          <div className="mt-6 bg-white border border-[#e0e0e0] rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="font-semibold text-[#1d2226]">See more, message creators, and post your own project</p>
              <p className="text-sm text-[#666] mt-0.5">Free for college students · email + phone verified</p>
            </div>
            <button
              onClick={onRequireAuth}
              className="px-5 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#004182] transition-all shrink-0"
            >
              Join Make Big
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
