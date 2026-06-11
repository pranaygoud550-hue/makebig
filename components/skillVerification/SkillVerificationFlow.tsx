'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SkillExamClient, SkillGradeResult, CodingLanguage } from '@/lib/skillVerification/types';
import { SkillBadgeChip } from '@/components/skillVerification/SkillBadgeChip';
import { TestProctorShell } from '@/components/skillVerification/TestProctorShell';
import { CodingExamPanel } from '@/components/skillVerification/CodingExamPanel';
import { useTestProctoring } from '@/lib/skillVerification/useTestProctoring';

interface SkillVerificationFlowProps {
  skillIds: string[];
  contact?: string;
  onComplete: (results: SkillGradeResult[]) => void;
  onBack: () => void;
  onSkip?: () => void;
  skipLabel?: string;
}

export function SkillVerificationFlow({
  skillIds,
  contact,
  onComplete,
  onBack,
  onSkip,
  skipLabel = 'Take test later',
}: SkillVerificationFlowProps) {
  const [index, setIndex] = useState(0);
  const [exam, setExam] = useState<SkillExamClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [error, setError] = useState('');
  const [mcqAnswers, setMcqAnswers] = useState<number[]>([]);
  const [practicalAnswers, setPracticalAnswers] = useState<number[]>([]);
  const [codeAnswers, setCodeAnswers] = useState<{ code: string; language: CodingLanguage }[]>([]);
  const [codingIndex, setCodingIndex] = useState(0);
  const [results, setResults] = useState<SkillGradeResult[]>([]);
  const [done, setDone] = useState(false);
  const [proctorReady, setProctorReady] = useState(false);
  const autoSubmitRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const submitCurrentRef = useRef<(auto?: boolean) => void>(() => {});

  const currentSkillId = skillIds[index];

  const submitCurrent = useCallback(
    async (autoSubmitted = false) => {
      if (!exam) return;
      const sessionId = sessionIdRef.current;
      if (!sessionId) {
        setError('Session expired — restart verification');
        return;
      }
      if (!autoSubmitted) {
        const mcqIncomplete = mcqAnswers.some((a) => a < 0);
        const practicalIncomplete = exam.isCodingSkill
          ? codeAnswers.some((a) => !a.code.trim())
          : practicalAnswers.some((a) => a < 0);
        if (mcqIncomplete || practicalIncomplete) {
          setError(
            exam.isCodingSkill
              ? 'Complete all MCQ and coding problems before continuing'
              : 'Answer all questions before continuing'
          );
          return;
        }
      }
      setSubmitting(true);
      setError('');
      try {
        const res = await fetch('/api/skills/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skillId: exam.skillId,
            sessionId,
            mcqAnswers,
            practicalAnswers,
            codeSubmissions: exam.isCodingSkill ? codeAnswers : undefined,
            autoSubmitted,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || 'Could not grade test');
          return;
        }
        const graded = data.data as SkillGradeResult;
        const nextResults = [...results, graded];
        setResults(nextResults);
        setProctorReady(false);
        if (index + 1 >= skillIds.length) {
          setDone(true);
          onComplete(nextResults);
        } else {
          setIndex(index + 1);
        }
      } catch {
        setError('Network error submitting test');
      } finally {
        setSubmitting(false);
      }
    },
    [exam, mcqAnswers, practicalAnswers, codeAnswers, results, index, skillIds.length, onComplete]
  );

  useEffect(() => {
    submitCurrentRef.current = (auto) => {
      void submitCurrent(auto);
    };
  }, [submitCurrent]);

  const proctor = useTestProctoring({
    skillId: currentSkillId || '',
    contact,
    enabled: proctorReady && !done && !submitting,
    onAutoSubmit: () => {
      if (!autoSubmitRef.current) {
        autoSubmitRef.current = true;
        submitCurrentRef.current(true);
      }
    },
  });

  useEffect(() => {
    sessionIdRef.current = proctor.state.sessionId;
  }, [proctor.state.sessionId]);

  useEffect(() => {
    if (done || !currentSkillId || !proctorReady) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setMcqAnswers([]);
    setPracticalAnswers([]);
    setCodeAnswers([]);
    setCodingIndex(0);
    autoSubmitRef.current = false;
    fetch(`/api/skills/${currentSkillId}/exam`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) {
          setError(data.error || 'Could not load test');
          setExam(null);
          return;
        }
        setExam(data.data);
        setMcqAnswers(Array(data.data.mcq.length).fill(-1));
        if (data.data.isCodingSkill && data.data.coding?.length) {
          setCodeAnswers(
            data.data.coding.map((c: { languages: CodingLanguage[]; starterCode: Partial<Record<CodingLanguage, string>> }) => ({
              code: c.starterCode[c.languages[0]] || '',
              language: c.languages[0] || 'javascript',
            }))
          );
          setPracticalAnswers([]);
        } else {
          setPracticalAnswers(Array(data.data.practical.length).fill(-1));
          setCodeAnswers([]);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Network error loading test');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentSkillId, done, proctorReady]);

  const handleSetup = async () => {
    setSettingUp(true);
    setError('');
    try {
      await proctor.setupProctor();
      setProctorReady(true);
    } catch {
      setError('Could not start proctored session');
    } finally {
      setSettingUp(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-[#1d2226]">Verification complete</h2>
          <p className="text-sm text-[#666] mt-1">Final scores include integrity monitoring (70/30)</p>
        </div>
        <ul className="space-y-2">
          {results.map((r) => (
            <li
              key={r.skillId}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#e0e0e0] px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-semibold text-[#1d2226]">{r.skillName}</p>
                <p className="text-xs text-[#666]">
                  Final {r.score} · Test {r.testScore}% · Integrity {r.integrityScore}%
                </p>
                {r.suspicious && (
                  <p className="text-[10px] text-amber-700">Flagged for review</p>
                )}
              </div>
              <SkillBadgeChip badge={r.badge} label={r.badgeLabel} icon={r.badgeIcon} score={r.score} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[58vh] overflow-y-auto pr-1">
      <div>
        <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-wide">
          Skill {index + 1} of {skillIds.length}
        </p>
        <h2 className="text-xl font-bold text-[#1d2226]">{exam?.name || 'Skill verification'}</h2>
      </div>

      <TestProctorShell
        skillName={exam?.name || 'skill'}
        ready={proctorReady}
        consentGiven={proctor.state.consentGiven}
        webcamActive={proctor.state.webcamActive}
        fullscreenActive={proctor.state.fullscreenActive}
        violationCount={proctor.state.violationCount}
        integrityHint={proctor.state.integrityHint}
        warning={proctor.state.warning}
        videoRef={proctor.videoRef}
        onSetup={handleSetup}
        settingUp={settingUp}
      >
        {proctorReady && (
          <>
            <p className="text-sm text-[#666]">{exam?.description}</p>
            {loading && <p className="text-sm text-[#999]">Loading questions…</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}

            {exam && !loading && (
              <>
                <section>
                  <h3 className="text-sm font-bold text-[#1d2226] mb-2">
                    Section A — Multiple choice (40% of test score)
                  </h3>
                  <div className="space-y-4">
                    {exam.mcq.map((q, qi) => (
                      <div key={q.id} className="rounded-xl border border-[#e0e0e0] p-3">
                        <p className="text-xs text-[#999] capitalize mb-1">{q.difficulty}</p>
                        <p className="text-sm font-medium text-[#1d2226] mb-2">
                          {qi + 1}. {q.question}
                        </p>
                        <div className="space-y-1.5">
                          {q.options.map((opt, oi) => (
                            <label
                              key={oi}
                              className={`flex items-start gap-2 text-sm rounded-lg px-2 py-1.5 cursor-pointer border ${
                                mcqAnswers[qi] === oi
                                  ? 'border-[#0A66C2] bg-[#EEF3FB]'
                                  : 'border-transparent hover:bg-[#f8f9fa]'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`mcq-${q.id}`}
                                checked={mcqAnswers[qi] === oi}
                                onChange={() => {
                                  const next = [...mcqAnswers];
                                  next[qi] = oi;
                                  setMcqAnswers(next);
                                }}
                                className="mt-0.5"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {exam.isCodingSkill && exam.coding?.length ? (
                  <CodingExamPanel
                    challenges={exam.coding}
                    answers={codeAnswers}
                    activeIndex={codingIndex}
                    onActiveIndexChange={setCodingIndex}
                    onChange={(qi, code, language) => {
                      const next = [...codeAnswers];
                      next[qi] = { code, language };
                      setCodeAnswers(next);
                    }}
                  />
                ) : (
                  <section>
                    <h3 className="text-sm font-bold text-[#1d2226] mb-2">
                      Section B — Practical scenarios (60% of test score)
                    </h3>
                    <div className="space-y-4">
                      {exam.practical.map((q, qi) => (
                        <div key={q.id} className="rounded-xl border border-[#e8f4fc] bg-[#fafcff] p-3">
                          <p className="text-sm font-semibold text-[#1d2226]">{q.question}</p>
                          <p className="text-xs text-[#666] mt-1 mb-2">{q.prompt}</p>
                          <div className="space-y-1.5">
                            {q.options.map((opt, oi) => (
                              <label
                                key={oi}
                                className={`flex items-start gap-2 text-sm rounded-lg px-2 py-1.5 cursor-pointer border ${
                                  practicalAnswers[qi] === oi
                                    ? 'border-[#0A66C2] bg-white'
                                    : 'border-transparent hover:bg-white/80'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`pr-${q.id}`}
                                  checked={practicalAnswers[qi] === oi}
                                  onChange={() => {
                                    const next = [...practicalAnswers];
                                    next[qi] = oi;
                                    setPracticalAnswers(next);
                                  }}
                                  className="mt-0.5"
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </TestProctorShell>

      <canvas ref={proctor.canvasRef} className="hidden" aria-hidden />

      <div className="flex flex-wrap gap-3 pt-2 sticky bottom-0 bg-white pb-1">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 text-sm font-semibold text-[#666] border border-[#d9d9d9] rounded-xl hover:bg-[#f8f9fa]"
        >
          ← Back
        </button>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2.5 text-sm font-semibold text-[#666] hover:text-[#1d2226]"
          >
            {skipLabel}
          </button>
        )}
        {proctorReady && (
          <button
            type="button"
            onClick={() => submitCurrent(false)}
            disabled={loading || submitting || !exam}
            className="flex-1 py-2.5 bg-[#0A66C2] text-white rounded-xl font-semibold text-sm hover:bg-[#004182] disabled:opacity-50"
          >
            {submitting
              ? 'Grading…'
              : index + 1 >= skillIds.length
                ? 'Finish verification'
                : 'Next skill →'}
          </button>
        )}
      </div>
    </div>
  );
}
