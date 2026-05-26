'use client';

import { useState, useEffect, useCallback } from 'react';
import { WIZARD_CATEGORIES } from '@/lib/constants';
import {
  apiListCourses,
  apiGetCourse,
  apiEnrollCourse,
  apiCompleteLesson,
  apiGetMyCourses,
} from '@/lib/api';
import { Course } from '@/lib/types';

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

interface CoursesViewProps {
  userContact?: string;
  onStartProject?: (categoryId: string, skills?: string[]) => void;
  onExploreCategory?: (categoryId: string) => void;
}

export function CoursesView({
  userContact,
  onStartProject,
  onExploreCategory,
}: CoursesViewProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<Course | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab] = useState<'all' | 'mine'>('all');

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiListCourses({
        categoryId: category || undefined,
        q: search || undefined,
        limit: 24,
      });
      setCourses(result.courses);
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  const loadMyCourses = useCallback(async () => {
    if (!userContact) {
      setMyCourses([]);
      return;
    }
    const mine = await apiGetMyCourses();
    setMyCourses(mine);
  }, [userContact]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadMyCourses();
  }, [loadMyCourses]);

  const openCourse = async (slug: string) => {
    setSelectedSlug(slug);
    setDetailLoading(true);
    const course = await apiGetCourse(slug);
    setDetail(course);
    setActiveLessonId(course?.lessons[0]?.id || null);
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setSelectedSlug(null);
    setDetail(null);
    setActiveLessonId(null);
    loadCourses();
    loadMyCourses();
  };

  const handleEnroll = async () => {
    if (!detail) return;
    setActionLoading(true);
    const updated = await apiEnrollCourse(detail.id);
    if (updated) setDetail(updated);
    setActionLoading(false);
    loadMyCourses();
  };

  const handleCompleteLesson = async (lessonId: string) => {
    if (!detail) return;
    setActionLoading(true);
    const updated = await apiCompleteLesson(detail.id, lessonId);
    if (updated) {
      setDetail(updated);
      const idx = updated.lessons.findIndex((l) => l.id === lessonId);
      if (idx >= 0 && idx < updated.lessons.length - 1) {
        setActiveLessonId(updated.lessons[idx + 1].id);
      }
    }
    setActionLoading(false);
    loadMyCourses();
  };

  const displayList = tab === 'mine' ? myCourses : courses;
  const activeLesson = detail?.lessons.find((l) => l.id === activeLessonId);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#1d2226]">Courses</h1>
        <p className="text-sm text-[#666] mt-1">
          Learn a skill, then build it with a real team on Make Big.
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'mine'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              tab === t
                ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                : 'bg-white text-[#666] border-[#d9d9d9] hover:border-[#0A66C2]'
            }`}
          >
            {t === 'all' ? 'All courses' : 'My progress'}
          </button>
        ))}
      </div>

      {tab === 'all' && (
        <>
          <div className="mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadCourses()}
              placeholder="Search courses…"
              className="w-full px-4 py-2.5 bg-white border border-[#d9d9d9] rounded-full text-sm text-[#1d2226] placeholder-[#999] focus:outline-none focus:border-[#0A66C2]"
            />
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => setCategory('')}
              className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                !category
                  ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                  : 'bg-white text-[#666] border-[#d9d9d9]'
              }`}
            >
              All
            </button>
            {WIZARD_CATEGORIES.slice(0, 10).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                  category === cat.id
                    ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                    : 'bg-white text-[#666] border-[#d9d9d9]'
                }`}
              >
                {cat.title}
              </button>
            ))}
          </div>
        </>
      )}

      {loading && tab === 'all' ? (
        <p className="text-sm text-[#666] py-8 text-center">Loading courses…</p>
      ) : displayList.length === 0 ? (
        <div className="bg-white border border-[#d9d9d9] rounded-xl p-8 text-center">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-sm text-[#666]">
            {tab === 'mine'
              ? 'No enrolled courses yet. Browse and enroll to track progress.'
              : 'No courses yet. Run npm run seed:demo to load demo courses.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {displayList.map((course) => {
            const catTitle =
              WIZARD_CATEGORIES.find((c) => c.id === course.categoryId)?.title ||
              course.categoryId;
            return (
              <button
                key={course.id}
                type="button"
                onClick={() => openCourse(course.slug)}
                className="text-left bg-white border border-[#d9d9d9] rounded-xl p-4 hover:border-[#0A66C2] hover:shadow-sm transition-all"
              >
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#EEF3FB] flex items-center justify-center text-2xl shrink-0">
                    {course.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={course.coverImage}
                        alt=""
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      '📚'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-[#1d2226] text-sm leading-snug">
                      {course.title}
                    </h3>
                    <p className="text-xs text-[#666] mt-0.5">{catTitle}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f2ef] text-[#666]">
                        {LEVEL_LABELS[course.level] || course.level}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f2ef] text-[#666]">
                        {course.lessonCount ?? course.lessons.length} lessons
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f2ef] text-[#666]">
                        ~{course.hours}h
                      </span>
                    </div>
                    {(course.progress ?? 0) > 0 && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-[#f3f2ef] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0A66C2] rounded-full"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-[#0A66C2] font-semibold mt-1">
                          {course.progress}% complete
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedSlug && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-2xl max-h-[92vh] sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col overflow-hidden">
            {detailLoading || !detail ? (
              <div className="p-8 text-center text-sm text-[#666]">Loading course…</div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 p-4 border-b border-[#d9d9d9]">
                  <div>
                    <h2 className="text-lg font-bold text-[#1d2226]">{detail.title}</h2>
                    <p className="text-xs text-[#666] mt-1">{detail.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="text-[#666] hover:text-[#1d2226] text-xl leading-none px-2"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 grid sm:grid-cols-[180px_1fr] gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[#666] uppercase tracking-wide mb-2">
                      Lessons
                    </p>
                    {detail.lessons.map((lesson, i) => {
                      const done = detail.completedLessonIds?.includes(lesson.id);
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => setActiveLessonId(lesson.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            activeLessonId === lesson.id
                              ? 'bg-[#EEF3FB] text-[#0A66C2]'
                              : 'text-[#666] hover:bg-[#f3f2ef]'
                          }`}
                        >
                          <span className="mr-1">{done ? '✓' : `${i + 1}.`}</span>
                          {lesson.title}
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    {activeLesson ? (
                      <div>
                        <h3 className="font-bold text-[#1d2226] mb-2">{activeLesson.title}</h3>
                        <div className="prose prose-sm max-w-none text-sm text-[#444] whitespace-pre-wrap">
                          {activeLesson.content}
                        </div>
                        {activeLesson.videoUrl && (
                          <a
                            href={activeLesson.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-3 text-sm text-[#0A66C2] font-semibold hover:underline"
                          >
                            Watch video →
                          </a>
                        )}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {!detail.enrolled ? (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={handleEnroll}
                              className="px-4 py-2 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182] disabled:opacity-50"
                            >
                              Enroll free
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={
                                actionLoading ||
                                detail.completedLessonIds?.includes(activeLesson.id)
                              }
                              onClick={() => handleCompleteLesson(activeLesson.id)}
                              className="px-4 py-2 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182] disabled:opacity-50"
                            >
                              {detail.completedLessonIds?.includes(activeLesson.id)
                                ? 'Completed'
                                : 'Mark complete'}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#666]">Select a lesson to begin.</p>
                    )}

                    {detail.completed && (
                      <div className="mt-6 p-4 bg-[#EEF3FB] border border-[#0A66C2]/20 rounded-xl">
                        <p className="font-bold text-[#1d2226] text-sm">Course complete!</p>
                        <p className="text-xs text-[#666] mt-1">
                          Ready to build? Start a project or join a team in this category.
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {onStartProject && (
                            <button
                              type="button"
                              onClick={() => {
                                onStartProject(detail.categoryId, detail.skills);
                                closeDetail();
                              }}
                              className="px-4 py-2 rounded-full bg-[#0A66C2] text-white text-xs font-semibold hover:bg-[#004182]"
                            >
                              Start a project
                            </button>
                          )}
                          {onExploreCategory && (
                            <button
                              type="button"
                              onClick={() => {
                                onExploreCategory(detail.categoryId);
                                closeDetail();
                              }}
                              className="px-4 py-2 rounded-full border border-[#0A66C2] text-[#0A66C2] text-xs font-semibold hover:bg-[#EEF3FB]"
                            >
                              Find teams
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-[#d9d9d9] flex flex-wrap gap-2">
                  {detail.progress !== undefined && detail.progress > 0 && (
                    <span className="text-xs text-[#0A66C2] font-semibold self-center mr-auto">
                      {detail.progress}% done
                    </span>
                  )}
                  {onStartProject && (
                    <button
                      type="button"
                      onClick={() => {
                        onStartProject(detail.categoryId, detail.skills);
                        closeDetail();
                      }}
                      className="px-4 py-2 rounded-full border border-[#0A66C2] text-[#0A66C2] text-xs font-semibold hover:bg-[#EEF3FB]"
                    >
                      Build this skill
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
