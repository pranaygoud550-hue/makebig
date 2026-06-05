'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { WIZARD_CATEGORIES } from '@/lib/constants';
import { apiListCourses, apiGetCourse, apiGetMyCourses } from '@/lib/api';
import { Course } from '@/lib/types';
import { CourseLearnPanel } from '@/components/CourseLearnPanel';

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const SECTOR_ICONS: Record<string, string> = {
  web: '💻',
  mobile: '📱',
  game: '🎮',
  ai: '🤖',
  security: '🔐',
  cloud: '☁️',
  devops: '⚙️',
  data: '📊',
  web3: '⛓️',
  embedded: '🔌',
  arvr: '🥽',
  film: '🎬',
  music: '🎵',
  writing: '✍️',
  design: '🎨',
  content: '📹',
  photography: '📷',
  animation: '🎞️',
  marketing: '📢',
  education: '📚',
  health: '🏥',
};

interface CoursesDashboardProps {
  userContact?: string;
  onRequireAuth?: () => void;
  onStartProject?: (categoryId: string, skills?: string[]) => void;
}

export function CoursesDashboard({
  userContact,
  onRequireAuth,
  onStartProject,
}: CoursesDashboardProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState<string>('all');
  const [view, setView] = useState<'sectors' | 'mine'>('sectors');
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [opening, setOpening] = useState(false);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiListCourses({ limit: 100, q: search || undefined });
      setCourses(result.courses);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadMyCourses = useCallback(async () => {
    if (!userContact) {
      setMyCourses([]);
      return;
    }
    setMyCourses(await apiGetMyCourses());
  }, [userContact]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadMyCourses();
  }, [loadMyCourses]);

  const coursesBySector = useMemo(() => {
    const map = new Map<string, Course[]>();
    for (const cat of WIZARD_CATEGORIES) map.set(cat.id, []);
    for (const c of courses) {
      const list = map.get(c.categoryId) || [];
      list.push(c);
      map.set(c.categoryId, list);
    }
    return map;
  }, [courses]);

  const filteredSectors = useMemo(() => {
    if (sector === 'all') return WIZARD_CATEGORIES;
    return WIZARD_CATEGORIES.filter((c) => c.id === sector);
  }, [sector]);

  const openCourse = async (slug: string) => {
    setOpening(true);
    const course = await apiGetCourse(slug);
    if (course) setActiveCourse(course);
    setOpening(false);
  };

  const displayCourses =
    view === 'mine'
      ? myCourses
      : sector === 'all'
        ? courses
        : courses.filter((c) => c.categoryId === sector);

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#d9d9d9] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <Link
                href="/"
                className="text-xs font-semibold text-[#0A66C2] hover:underline mb-1 inline-block"
              >
                ← Back to home
              </Link>
              <h1 className="text-2xl font-black text-[#1d2226]">Learn Dashboard</h1>
              <p className="text-sm text-[#666] mt-0.5">
                {WIZARD_CATEGORIES.length} sectors · watch lessons · finish · start your project
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setView('sectors')}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  view === 'sectors'
                    ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                    : 'bg-white text-[#666] border-[#d9d9d9]'
                }`}
              >
                All sectors
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!userContact) onRequireAuth?.();
                  else setView('mine');
                }}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  view === 'mine'
                    ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                    : 'bg-white text-[#666] border-[#d9d9d9]'
                }`}
              >
                My learning
              </button>
            </div>
          </div>
          <div className="mt-4">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadCourses()}
              placeholder="Search courses, skills, sectors…"
              className="w-full max-w-xl px-4 py-2.5 bg-[#f3f2ef] border border-[#d9d9d9] rounded-full text-sm focus:outline-none focus:border-[#0A66C2]"
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6">
        {view === 'sectors' && (
          <aside className="lg:w-56 shrink-0">
            <p className="text-xs font-bold text-[#666] uppercase tracking-wide mb-2 px-1">
              Sectors
            </p>
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              <button
                type="button"
                onClick={() => setSector('all')}
                className={`shrink-0 text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sector === 'all'
                    ? 'bg-[#0A66C2] text-white'
                    : 'bg-white text-[#666] hover:bg-[#EEF3FB] border border-[#e0e0e0] lg:border-0'
                }`}
              >
                🌐 All sectors
              </button>
              {WIZARD_CATEGORIES.map((cat) => {
                const count = coursesBySector.get(cat.id)?.length || 0;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSector(cat.id)}
                    className={`shrink-0 text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      sector === cat.id
                        ? 'bg-[#0A66C2] text-white'
                        : 'bg-white text-[#666] hover:bg-[#EEF3FB] border border-[#e0e0e0] lg:border-0'
                    }`}
                  >
                    {SECTOR_ICONS[cat.id] || '📁'} {cat.title}
                    {count > 0 && (
                      <span className={`ml-1 text-[10px] ${sector === cat.id ? 'text-white/80' : 'text-[#999]'}`}>
                        ({count})
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        <main className="flex-1 min-w-0">
          {view === 'mine' && !userContact ? (
            <div className="bg-white rounded-2xl border border-dashed border-[#d9d9d9] p-10 text-center">
              <p className="text-sm text-[#666]">Sign in to track your course progress.</p>
              <button
                type="button"
                onClick={onRequireAuth}
                className="mt-4 px-6 py-2.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold"
              >
                Sign in
              </button>
            </div>
          ) : loading ? (
            <p className="text-sm text-[#666] py-12 text-center">Loading courses…</p>
          ) : view === 'sectors' && sector === 'all' ? (
            <div className="space-y-10">
              {filteredSectors.map((cat) => {
                const sectorCourses = coursesBySector.get(cat.id) || [];
                return (
                  <section key={cat.id} id={cat.id}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h2 className="text-lg font-bold text-[#1d2226] flex items-center gap-2">
                          <span>{SECTOR_ICONS[cat.id] || '📁'}</span>
                          {cat.title}
                        </h2>
                        <p className="text-sm text-[#666]">{cat.blurb}</p>
                      </div>
                      {sectorCourses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSector(cat.id)}
                          className="text-xs font-semibold text-[#0A66C2] hover:underline shrink-0"
                        >
                          View all
                        </button>
                      )}
                    </div>
                    {sectorCourses.length === 0 ? (
                      <div className="bg-white border border-dashed border-[#d9d9d9] rounded-xl p-6 text-center">
                        <p className="text-sm text-[#666]">Course launching soon in this sector.</p>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {sectorCourses.map((course) => (
                          <CourseCard
                            key={course.id}
                            course={course}
                            disabled={opening}
                            onOpen={() => openCourse(course.slug)}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          ) : displayCourses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-[#d9d9d9] p-10 text-center">
              <p className="text-4xl mb-2">📚</p>
              <p className="text-sm text-[#666]">
                {view === 'mine'
                  ? 'No courses started yet. Pick a sector and begin learning.'
                  : 'No courses in this sector yet.'}
              </p>
            </div>
          ) : (
            <>
              {sector !== 'all' && view === 'sectors' && (
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-[#1d2226]">
                    {SECTOR_ICONS[sector]}{' '}
                    {WIZARD_CATEGORIES.find((c) => c.id === sector)?.title}
                  </h2>
                </div>
              )}
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {displayCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    disabled={opening}
                    onOpen={() => openCourse(course.slug)}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {activeCourse && (
        <CourseLearnPanel
          course={activeCourse}
          userContact={userContact}
          onClose={() => {
            setActiveCourse(null);
            loadCourses();
            loadMyCourses();
          }}
          onRequireAuth={onRequireAuth}
          onStartProject={onStartProject}
          onUpdated={setActiveCourse}
        />
      )}
    </div>
  );
}

function CourseCard({
  course,
  disabled,
  onOpen,
}: {
  course: Course;
  disabled: boolean;
  onOpen: () => void;
}) {
  const catTitle =
    WIZARD_CATEGORIES.find((c) => c.id === course.categoryId)?.title || course.categoryId;
  const videoCount = course.lessons.filter((l) => l.videoUrl).length;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onOpen}
      className="text-left bg-white border border-[#e0e0e0] hover:border-[#0A66C2]/40 rounded-2xl p-4 transition-all hover:shadow-md group"
    >
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#EEF3FB] flex items-center justify-center text-2xl shrink-0 overflow-hidden">
          {course.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.coverImage} alt="" className="w-full h-full object-cover" />
          ) : (
            SECTOR_ICONS[course.categoryId] || '📚'
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[#1d2226] text-sm leading-snug group-hover:text-[#0A66C2]">
            {course.title}
          </h3>
          <p className="text-[10px] text-[#666] mt-0.5">{catTitle}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f2ef] text-[#666]">
              {LEVEL_LABELS[course.level] || course.level}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f2ef] text-[#666]">
              {course.lessonCount ?? course.lessons.length} lessons
            </span>
            {videoCount > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF3FB] text-[#0A66C2]">
                ▶ {videoCount} videos
              </span>
            )}
          </div>
          {(course.progress ?? 0) > 0 && (
            <p className="text-[10px] text-[#0A66C2] font-bold mt-2">{course.progress}% done</p>
          )}
        </div>
      </div>
    </button>
  );
}
