'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ProjectFeed } from '@/components/ProjectFeed';
import { ProjectDetailSheet, SearchProjectHit } from '@/components/app/ProjectDetailSheet';
import { BrowseProject } from '@/lib/api';
import { filterAllowedProjects } from '@/lib/projectAllowlist';
import { dedupeProjectsForDisplay } from '@/lib/dedupeProjects';
import { isProjectOwner } from '@/lib/projectOwnership';
import { getInitials } from '@/lib/utils';
import type { DashboardNavTab } from '@/components/DashboardNew';

interface SearchPerson {
  id?: string;
  name: string;
  contact: string;
  skills?: string[];
  college?: string;
  hobbies?: string[];
}

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
  const [people, setPeople] = useState<SearchPerson[]>([]);
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
        const list = dedupeProjectsForDisplay(data.data?.projects || []) as SearchProjectHit[];
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
          dedupeProjectsForDisplay(
            filterAllowedProjects(data.data?.projects || [])
          ) as SearchProjectHit[]
        );
        setPeople(data.data?.people || []);
        setRecommendations(Boolean(data.data?.recommendations));
      }
    } catch {
      setProjects([]);
      setPeople([]);
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
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A66C2] via-[#004182] to-[#1d2226] p-6 text-white shadow-lg">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#22c55e]/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-wider text-white/70">Dashboard</p>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm sm:text-base text-white/85 mt-2 max-w-xl leading-relaxed">
            Build, collaborate, and launch amazing projects with talented people around the world.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Total projects', value: stats.totalProjects },
              { label: 'Open roles', value: stats.openRoles },
              { label: 'Teams hiring', value: stats.teamsHiring },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-white/10 border border-white/15 px-3 py-2.5 backdrop-blur-sm"
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

      <div className="px-1">
        <Link
          href="/learn"
          className="flex items-center justify-between gap-3 rounded-xl border border-[#0A66C2]/20 bg-[#0A66C2]/5 px-4 py-3 text-sm font-semibold text-[#0A66C2] hover:bg-[#0A66C2]/10 transition-colors"
        >
          <span>Learn a course → start a project</span>
          <span aria-hidden>→</span>
        </Link>
      </div>

      <header className="px-1 space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666] text-sm">🔍</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, skills, colleges, people…"
            className="w-full pl-9 pr-4 py-3 rounded-full border border-[#d9d9d9] bg-white text-sm text-[#1d2226] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30 focus:border-[#0A66C2]"
          />
        </div>
      </header>

      {showResults && (
        <section className="space-y-4">
          <p className="text-xs font-bold text-[#666] uppercase tracking-wide px-1">
            {debounced ? `Results for “${debounced}”` : 'Recommended for you'}
          </p>

          {loading && (
            <p className="text-sm text-[#666] text-center py-6">Searching…</p>
          )}

          {!loading && projects.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#1d2226] px-1">Projects</p>
              <ul className="space-y-2">
                {projects.map((p) => {
                  const owner = isProjectOwner(userContact, p.ownerContact);
                  return (
                    <li key={p.id}>
                      <div className="w-full text-left bg-white rounded-xl border border-[#e0e0e0] p-4 hover:border-[#0A66C2]/40 hover:shadow-sm transition-all">
                        <button
                          type="button"
                          onClick={() => openProject(p.id)}
                          className="w-full text-left"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-[#1d2226]">{p.name}</p>
                            {owner && (
                              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF3FB] text-[#0A66C2] border border-[#0A66C2]/20">
                                Your project
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
                                className="text-[10px] px-2 py-0.5 rounded-full bg-[#EEF3FB] text-[#0A66C2] font-medium"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </button>
                        {owner && onOpenDashboard && (
                          <button
                            type="button"
                            onClick={() => onOpenDashboard('dashboard')}
                            className="mt-3 w-full py-2 rounded-full border border-[#0A66C2] text-[#0A66C2] text-xs font-semibold hover:bg-[#EEF3FB]"
                          >
                            Manage project
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {!loading && people.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#1d2226] px-1">People</p>
              <ul className="space-y-2">
                {people.map((person) => (
                  <li
                    key={person.contact}
                    className="bg-white rounded-xl border border-[#e0e0e0] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-10 h-10 rounded-full bg-[#0A66C2] text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {getInitials(person.name || person.contact)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1d2226] text-sm">{person.name}</p>
                        {person.college && (
                          <p className="text-xs text-[#666]">{person.college}</p>
                        )}
                        {(person.skills?.length || 0) > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {person.skills!.slice(0, 6).map((s) => (
                              <span
                                key={s}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-[#f3f2ef] text-[#444]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!loading && !projects.length && !people.length && debounced && (
            <p className="text-sm text-[#666] text-center py-6">
              No matches — try another skill, project name, or college.
            </p>
          )}
        </section>
      )}

      <section className="space-y-3 pt-2 border-t border-[#e0e0e0]">
        <header className="px-1">
          <h2 className="text-base font-bold text-[#1d2226]">Recent activity</h2>
          <p className="text-sm text-[#666] mt-0.5">Posts and updates from across Make Big</p>
        </header>
        <ProjectFeed global userContact={userContact} />
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
