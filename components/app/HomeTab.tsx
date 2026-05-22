'use client';

import { useCallback, useEffect, useState } from 'react';
import { ProjectFeed } from '@/components/ProjectFeed';
import { ProjectDetailSheet, SearchProjectHit } from '@/components/app/ProjectDetailSheet';
import { BrowseProject } from '@/lib/api';
import { filterAllowedProjects } from '@/lib/projectAllowlist';
import { getInitials } from '@/lib/utils';

interface SearchPerson {
  id?: string;
  name: string;
  contact: string;
  skills?: string[];
  college?: string;
  hobbies?: string[];
}

interface HomeTabProps {
  userContact?: string;
  onJoinProject?: (project: BrowseProject) => void;
}

export function HomeTab({ userContact, onJoinProject }: HomeTabProps) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<SearchProjectHit[]>([]);
  const [people, setPeople] = useState<SearchPerson[]>([]);
  const [recommendations, setRecommendations] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/search?q=${encodeURIComponent(q)}&limit=12`);
      const data = await res.json();
      if (data.success) {
        setProjects(filterAllowedProjects(data.data?.projects || []));
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

  return (
    <div className="space-y-4">
      <header className="px-1 space-y-3">
        <div>
          <h1 className="text-xl font-bold text-[#1d2226]">Home</h1>
          <p className="text-sm text-[#666] mt-0.5">
            Search projects and people on Make Big, then open full team details.
          </p>
        </div>

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
            {debounced
              ? `Results for “${debounced}”`
              : 'Recommended for you'}
          </p>

          {loading && (
            <p className="text-sm text-[#666] text-center py-6">Searching…</p>
          )}

          {!loading && projects.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#1d2226] px-1">Projects</p>
              <ul className="space-y-2">
                {projects.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => openProject(p.id)}
                      className="w-full text-left bg-white rounded-xl border border-[#e0e0e0] p-4 hover:border-[#0A66C2]/40 hover:shadow-sm transition-all"
                    >
                      <p className="font-semibold text-[#1d2226]">{p.name}</p>
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
                        {(p.joinedCount ?? 0) > 0 && (
                          <span className="text-[10px] text-[#666]">
                            · {p.joinedCount} member{p.joinedCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
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
          <h2 className="text-base font-bold text-[#1d2226]">Recent posts</h2>
          <p className="text-sm text-[#666] mt-0.5">Updates from across Make Big</p>
        </header>
        <ProjectFeed global userContact={userContact} />
      </section>

      <ProjectDetailSheet
        projectId={selectedProjectId}
        userContact={userContact}
        onClose={() => setSelectedProjectId(null)}
        onJoin={onJoinProject ? handleJoinFromDetail : undefined}
      />
    </div>
  );
}
