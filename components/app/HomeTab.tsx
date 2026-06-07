'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ProjectDetailSheet, SearchProjectHit } from '@/components/app/ProjectDetailSheet';
import { FeaturedStartupsSection } from '@/components/ecosystem/FeaturedStartupsSection';
import { StartupJourneyFeed } from '@/components/ecosystem/StartupJourneyFeed';
import { BrowseProject } from '@/lib/api';
import { filterAllowedProjects } from '@/lib/projectAllowlist';
import { dedupeById } from '@/lib/dedupeProjects';
import { isProjectOwner } from '@/lib/projectOwnership';
import type { DashboardNavTab } from '@/components/DashboardNew';

const STARTUP_TOOLS = [
  {
    href: '/idea-validator',
    icon: '✨',
    title: 'AI Idea Validator',
    desc: 'Score market fit, competition, and viability before you build.',
    accent: 'border-[#0A66C2]/25 bg-gradient-to-br from-[#EEF3FB] to-white',
  },
  {
    href: '/ecosystem',
    icon: '🗺️',
    title: 'Ecosystem roadmap',
    desc: 'See what’s live today and what’s coming next on MakeBig.',
    accent: 'border-[#e0e0e0] bg-white',
  },
  {
    href: '/learn',
    icon: '📚',
    title: 'Learn & build',
    desc: 'Pick up skills, then spin up a project with your team.',
    accent: 'border-[#e0e0e0] bg-white',
  },
] as const;

interface HomeStats {
  totalProjects: number;
  openRoles: number;
  teamsHiring: number;
}

interface HomeTabProps {
  userName?: string;
  userContact?: string;
  onJoinProject?: (project: BrowseProject) => void;
  onOpenDashboard?: (section?: DashboardNavTab) => void;
}

export function HomeTab({
  userName,
  userContact,
  onJoinProject,
  onOpenDashboard,
}: HomeTabProps) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<SearchProjectHit[]>([]);
  const [recommendations, setRecommendations] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [stats, setStats] = useState<HomeStats>({
    totalProjects: 0,
    openRoles: 0,
    teamsHiring: 0,
  });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    fetch('/api/public/explore?limit=50&page=1')
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;
        const list = dedupeById(data.data?.projects || []) as SearchProjectHit[];
        const openRoles = list.reduce((n, p) => n + (p.roles?.length || 0), 0);
        setStats({
          totalProjects: data.data?.total ?? list.length,
          openRoles,
          teamsHiring: list.filter((p) => (p.roles?.length || 0) > 0).length,
        });
      })
      .catch(() => {});
  }, []);

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/search?q=${encodeURIComponent(q)}&limit=12`);
      const data = await res.json();
      if (data.success) {
        setProjects(
          dedupeById(filterAllowedProjects(data.data?.projects || [])) as SearchProjectHit[]
        );
        setRecommendations(Boolean(data.data?.recommendations));
      }
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch(debounced);
  }, [debounced, runSearch]);

  const openProject = (id: string) => setSelectedProjectId(id);

  const handleJoinFromDetail = (hit: SearchProjectHit) => {
    setSelectedProjectId(null);
    onJoinProject?.({
      id: hit.id,
      name: hit.name,
      desc: hit.desc || '',
      categoryId: hit.categoryId || 'other',
      roles: hit.roles || [],
      city: hit.city || '',
      state: hit.state || '',
      slug: hit.slug || '',
      ownerContact: hit.ownerContact,
      joinedCount: hit.joinedCount,
    } as BrowseProject);
  };

  const showResults = debounced.length > 0 || recommendations;
  const firstName = userName?.split(' ')[0] || 'there';

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A66C2] via-[#004182] to-[#1d2226] p-6 text-white shadow-lg">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#22c55e]/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-wider text-white/70">Home</p>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm sm:text-base text-white/85 mt-2 max-w-xl leading-relaxed">
            Discover startups, open roles, and tools to validate and launch your next idea.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Projects', value: stats.totalProjects },
              { label: 'Open roles', value: stats.openRoles },
              { label: 'Teams hiring', value: stats.teamsHiring },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-white/10 border border-white/15 px-3 py-2.5 backdrop-blur-sm text-center sm:text-left"
              >
                <p className="text-lg sm:text-xl font-black">{s.value}</p>
                <p className="text-[10px] sm:text-xs text-white/75 font-medium leading-tight mt-0.5">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FeaturedStartupsSection embedded />
      <StartupJourneyFeed embedded />

      <section className="rounded-2xl border border-[#e0e0e0] bg-white p-5 sm:p-6">
        <div className="mb-4">
          <p className="text-xs font-bold text-[#0A66C2] uppercase tracking-widest">Startup ecosystem</p>
          <h2 className="text-lg font-bold text-[#1d2226] mt-0.5">Validate, learn, and grow</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {STARTUP_TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`group flex flex-col rounded-xl border p-4 transition-all hover:border-[#0A66C2]/40 hover:shadow-sm ${tool.accent}`}
            >
              <span className="text-2xl mb-2">{tool.icon}</span>
              <p className="text-sm font-bold text-[#1d2226] group-hover:text-[#0A66C2] transition-colors">
                {tool.title}
              </p>
              <p className="text-xs text-[#666] mt-1 leading-relaxed flex-1">{tool.desc}</p>
              <span className="text-xs font-semibold text-[#0A66C2] mt-3">Open →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666] text-sm pointer-events-none">
            🔍
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, skills, or categories…"
            className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-[#d9d9d9] bg-white text-sm text-[#1d2226] placeholder:text-[#999] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30 focus:border-[#0A66C2]"
          />
        </div>

        {showResults && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-[#666] uppercase tracking-wide px-0.5">
              {debounced ? `Results for “${debounced}”` : 'Recommended projects'}
            </p>

            {loading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-white rounded-xl border border-[#e0e0e0] animate-pulse" />
                ))}
              </div>
            )}

            {!loading && projects.length > 0 && (
              <ul className="space-y-2">
                {projects.map((p) => {
                  const owner = isProjectOwner(userContact, p.ownerContact);
                  return (
                    <li key={p.id}>
                      <div className="bg-white rounded-xl border border-[#e0e0e0] p-4 hover:border-[#0A66C2]/35 hover:shadow-sm transition-all">
                        <button
                          type="button"
                          onClick={() => openProject(p.id)}
                          className="w-full text-left"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#EEF3FB] text-[#0A66C2] flex items-center justify-center text-sm font-black shrink-0">
                              {p.name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-[#1d2226]">{p.name}</p>
                                {owner && (
                                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF3FB] text-[#0A66C2] border border-[#0A66C2]/20">
                                    Yours
                                  </span>
                                )}
                              </div>
                              {p.desc && (
                                <p className="text-xs text-[#666] mt-1 line-clamp-2">{p.desc}</p>
                              )}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {(p.roles || []).slice(0, 3).map((r) => (
                                  <span
                                    key={r}
                                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#f3f2ef] text-[#444] font-medium"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </button>
                        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-[#f0f0f0]">
                          {p.slug && (
                            <Link
                              href={`/startup/${p.slug}`}
                              className="text-xs font-semibold text-[#0A66C2] hover:underline"
                            >
                              Startup profile →
                            </Link>
                          )}
                          {owner && onOpenDashboard && (
                            <button
                              type="button"
                              onClick={() => onOpenDashboard('dashboard')}
                              className="text-xs font-semibold text-[#666] hover:text-[#0A66C2]"
                            >
                              Manage →
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {!loading && !projects.length && debounced && (
              <p className="text-sm text-[#666] text-center py-8 bg-white rounded-xl border border-dashed border-[#d9d9d9]">
                No projects found — try another name, skill, or category.
              </p>
            )}
          </div>
        )}
      </section>

      <ProjectDetailSheet
        projectId={selectedProjectId}
        userContact={userContact}
        onClose={() => setSelectedProjectId(null)}
        onJoin={onJoinProject ? handleJoinFromDetail : undefined}
        onOpenDashboard={onOpenDashboard}
      />
    </div>
  );
}
