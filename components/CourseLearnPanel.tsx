'use client';

import { useState } from 'react';
import { Course } from '@/lib/types';
import { apiEnrollCourse, apiCompleteLesson } from '@/lib/api';
import { youtubeEmbedUrl } from '@/lib/youtubeEmbed';

interface CourseLearnPanelProps {
  course: Course;
  userContact?: string;
  onClose: () => void;
  onRequireAuth?: () => void;
  onStartProject?: (categoryId: string, skills?: string[]) => void;
  onUpdated?: (course: Course) => void;
}

export function CourseLearnPanel({
  course: initial,
  userContact,
  onClose,
  onRequireAuth,
  onStartProject,
  onUpdated,
}: CourseLearnPanelProps) {
  const [detail, setDetail] = useState(initial);
  const [activeLessonId, setActiveLessonId] = useState(initial.lessons[0]?.id || null);
  const [actionLoading, setActionLoading] = useState(false);

  const activeLesson = detail.lessons.find((l) => l.id === activeLessonId);
  const embed = activeLesson?.videoUrl ? youtubeEmbedUrl(activeLesson.videoUrl) : null;

  const handleEnroll = async () => {
    if (!userContact) {
      onRequireAuth?.();
      return;
    }
    setActionLoading(true);
    const updated = await apiEnrollCourse(detail.id);
    if (updated) {
      setDetail(updated);
      onUpdated?.(updated);
    }
    setActionLoading(false);
  };

  const handleCompleteLesson = async (lessonId: string) => {
    if (!userContact) {
      onRequireAuth?.();
      return;
    }
    setActionLoading(true);
    let current = detail;
    if (!current.enrolled) {
      const enrolled = await apiEnrollCourse(current.id);
      if (enrolled) {
        current = enrolled;
        setDetail(enrolled);
        onUpdated?.(enrolled);
      }
    }
    const updated = await apiCompleteLesson(current.id, lessonId);
    if (updated) {
      setDetail(updated);
      onUpdated?.(updated);
      const idx = updated.lessons.findIndex((l) => l.id === lessonId);
      if (idx >= 0 && idx < updated.lessons.length - 1) {
        setActiveLessonId(updated.lessons[idx + 1].id);
      }
    }
    setActionLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-4xl max-h-[94vh] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-4 border-b border-[#d9d9d9] shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#0A66C2]">
              Learn → Do project
            </p>
            <h2 className="text-lg font-bold text-[#1d2226]">{detail.title}</h2>
            <p className="text-xs text-[#666] mt-1">{detail.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#666] hover:text-[#1d2226] text-2xl leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid lg:grid-cols-[200px_1fr] gap-4 min-h-0">
          <div className="space-y-1 order-2 lg:order-1">
            <p className="text-xs font-bold text-[#666] uppercase tracking-wide mb-2">Lessons</p>
            {detail.lessons.map((lesson, i) => {
              const done = detail.completedLessonIds?.includes(lesson.id);
              const hasVideo = !!lesson.videoUrl;
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
                  {hasVideo && <span className="ml-1 opacity-60">▶</span>}
                </button>
              );
            })}
          </div>

          <div className="order-1 lg:order-2 min-w-0">
            {activeLesson ? (
              <div className="space-y-4">
                {embed ? (
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-[#e0e0e0]">
                    <iframe
                      src={embed}
                      title={activeLesson.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : activeLesson.videoUrl ? (
                  <a
                    href={activeLesson.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-video rounded-xl bg-[#1d2226] text-white flex items-center justify-center text-sm font-semibold hover:bg-[#333]"
                  >
                    ▶ Open video lesson
                  </a>
                ) : null}

                <div>
                  <h3 className="font-bold text-[#1d2226]">{activeLesson.title}</h3>
                  <div className="text-sm text-[#444] mt-2 whitespace-pre-wrap leading-relaxed">
                    {activeLesson.content}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!detail.enrolled ? (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleEnroll}
                      className="px-5 py-2.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182] disabled:opacity-50"
                    >
                      {userContact ? 'Start learning free' : 'Sign in to start'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        actionLoading || detail.completedLessonIds?.includes(activeLesson.id)
                      }
                      onClick={() => handleCompleteLesson(activeLesson.id)}
                      className="px-5 py-2.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182] disabled:opacity-50"
                    >
                      {detail.completedLessonIds?.includes(activeLesson.id)
                        ? 'Lesson completed'
                        : 'Mark lesson complete'}
                    </button>
                  )}
                </div>

                {detail.completed && (
                  <div className="p-5 bg-gradient-to-br from-[#EEF3FB] to-[#dcfce7]/40 border border-[#0A66C2]/20 rounded-2xl">
                    <p className="font-bold text-[#1d2226]">Course done — now ship a project</p>
                    <p className="text-sm text-[#666] mt-1">
                      You learned the skill. Turn it into a real project on your portfolio — that&apos;s
                      how you stand out, not empty job applications.
                    </p>
                    {onStartProject && (
                      <button
                        type="button"
                        onClick={() => {
                          onStartProject(detail.categoryId, detail.skills);
                          onClose();
                        }}
                        className="mt-4 px-6 py-3 rounded-full bg-[#0A66C2] text-white text-sm font-bold hover:bg-[#004182]"
                      >
                        Start your project →
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#666]">Select a lesson to watch and learn.</p>
            )}

            {detail.progress !== undefined && detail.progress > 0 && !detail.completed && (
              <div className="mt-4">
                <div className="h-2 bg-[#f3f2ef] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0A66C2] rounded-full transition-all"
                    style={{ width: `${detail.progress}%` }}
                  />
                </div>
                <p className="text-xs text-[#0A66C2] font-semibold mt-1">{detail.progress}% complete</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
