'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useProfileView } from '@/lib/context/ProfileViewContext';

const RECENT_KEY = 'makebig_recent_searches';

interface SmartSearchProps {
  userContact?: string;
  onOpenExplore?: () => void;
}

export function SmartSearch({ userContact, onOpenExplore }: SmartSearchProps) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'projects' | 'people' | 'posts'>('all');
  const [results, setResults] = useState<{
    projects: { id: string; name: string; desc?: string; slug?: string; tags?: string[] }[];
    users: { contact: string; name: string; skills?: string[]; college?: string }[];
    posts: { id: string; content?: string; authorName?: string }[];
    trending: string[];
  }>({ projects: [], users: [], posts: [], trending: [] });
  const [recent, setRecent] = useState<string[]>([]);
  const { openProfile } = useProfileView();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 8));
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debounced.length < 2) {
      fetch('/api/public/smart-search?q=')
        .then((r) => r.json())
        .then((d) => setResults((prev) => ({ ...prev, trending: d.trending || [] })))
        .catch(() => {});
      return;
    }
    fetch(`/api/public/smart-search?q=${encodeURIComponent(debounced)}`)
      .then((r) => r.json())
      .then(setResults)
      .catch(() => {});
  }, [debounced]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const saveRecent = (q: string) => {
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, 8);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const projectCount = results.projects.length;
  const userCount = results.users.length;
  const postCount = results.posts.length;

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]">🔍</span>
        <input
          type="search"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim().length >= 2) saveRecent(query.trim());
          }}
          placeholder="Search projects, people, posts…"
          className="w-full pl-10 pr-4 py-3 rounded-full border border-[#d9d9d9] dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30"
        />
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 right-0 bg-white dark:bg-gray-900 border border-[#e0e0e0] dark:border-gray-700 rounded-2xl shadow-xl max-h-[420px] overflow-hidden flex flex-col">
          {debounced.length >= 2 && (
            <div className="px-3 py-2 border-b border-[#f0f0f0] dark:border-gray-700 text-[10px] text-[#666]">
              Projects matching &apos;{debounced}&apos; ({projectCount}) · People ({userCount}) · Posts ({postCount})
            </div>
          )}

          {debounced.length < 2 && recent.length > 0 && (
            <div className="px-3 py-2 border-b border-[#f0f0f0] dark:border-gray-700">
              <p className="text-[10px] font-bold text-[#999] uppercase mb-1">Recent</p>
              <div className="flex flex-wrap gap-1">
                {recent.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setQuery(r)}
                    className="text-xs px-2 py-1 rounded-full bg-[#f3f2ef] dark:bg-gray-800 text-[#666]"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {debounced.length < 2 && (
            <div className="px-3 py-2 border-b border-[#f0f0f0] dark:border-gray-700">
              <p className="text-[10px] font-bold text-[#999] uppercase mb-1">Trending</p>
              <div className="flex flex-wrap gap-1">
                {(results.trending || []).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQuery(t)}
                    className="text-xs px-2 py-1 rounded-full bg-[#EEF3FB] text-[#0A66C2]"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {debounced.length >= 2 && (
            <>
              <div className="flex gap-1 px-2 py-2 border-b border-[#f0f0f0] dark:border-gray-700">
                {(['all', 'projects', 'people', 'posts'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`px-2 py-1 text-xs rounded-full capitalize ${
                      tab === t ? 'bg-[#0A66C2] text-white' : 'text-[#666]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {(tab === 'all' || tab === 'projects') &&
                  results.projects.map((p) => (
                    <Link
                      key={p.id}
                      href={p.slug ? `/p/${p.slug}` : '#'}
                      onClick={() => saveRecent(debounced)}
                      className="block px-3 py-2 rounded-lg hover:bg-[#f3f2ef] dark:hover:bg-gray-800"
                    >
                      <p className="text-sm font-semibold text-[#1d2226] dark:text-white">{p.name}</p>
                      <p className="text-xs text-[#666] line-clamp-1">{p.desc}</p>
                    </Link>
                  ))}
                {(tab === 'all' || tab === 'people') &&
                  results.users
                    .filter((u) => u.contact !== userContact)
                    .map((u) => (
                      <button
                        key={u.contact}
                        type="button"
                        onClick={() => {
                          saveRecent(debounced);
                          openProfile(u.contact, u.name);
                          setOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#f3f2ef] dark:hover:bg-gray-800"
                      >
                        <p className="text-sm font-semibold">{u.name}</p>
                        <p className="text-xs text-[#666]">
                          {(u.skills || []).slice(0, 3).join(' · ')}
                          {u.college ? ` · ${u.college}` : ''}
                        </p>
                      </button>
                    ))}
                {(tab === 'all' || tab === 'posts') &&
                  results.posts.map((p) => (
                    <div key={p.id} className="px-3 py-2 rounded-lg bg-[#f8f9fa] dark:bg-gray-800">
                      <p className="text-xs text-[#666]">{p.authorName}</p>
                      <p className="text-sm line-clamp-2">{p.content}</p>
                    </div>
                  ))}
              </div>
            </>
          )}

          {onOpenExplore && (
            <button
              type="button"
              onClick={() => {
                onOpenExplore();
                setOpen(false);
              }}
              className="text-xs text-center py-2 border-t border-[#f0f0f0] text-[#0A66C2] font-semibold"
            >
              Browse all projects →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
