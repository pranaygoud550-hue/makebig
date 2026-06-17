'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SkillExamClient, SkillGradeResult, CodingLanguage } from '@/lib/skillVerification/types';
import { SkillBadgeChip } from '@/components/skillVerification/SkillBadgeChip';
import { CodingExamPanel } from '@/components/skillVerification/CodingExamPanel';
import { ExamFullscreenPortal } from '@/components/skillVerification/ExamFullscreenPortal';
import { ExamTopBar } from '@/components/skillVerification/ExamTopBar';
import { useTestProctoring } from '@/lib/skillVerification/useTestProctoring';

type ExamPhase = 'consent' | 'mcq' | 'coding' | 'practical';

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
  const [examPhase, setExamPhase] = useState<ExamPhase>('consent');
  const autoSubmitRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const submitCurrentRef = useRef<(auto?: boolean) => void>(() => {});

  const currentSkillId = skillIds[index];
  const isCodingExam = Boolean(exam?.isCodingSkill && exam.coding?.length);

  const mcqComplete = mcqAnswers.length > 0 && mcqAnswers.every((a) => a >= 0);
  const codingComplete =
    !isCodingExam || (codeAnswers.length > 0 && codeAnswers.every((a) => a.code.trim()));

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
              ? 'Complete all MCQ and both coding problems before continuing'
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
        setExamPhase('consent');
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
    setExamPhase('mcq');
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
            data.data.coding.map(
              (c: {
                languages: CodingLanguage[];
                starterCode: Partial<Record<CodingLanguage, string>>;
              }) => ({
                code: c.starterCode[c.languages[0]] || '',
                language: c.languages[0] || 'javascript',
              })
            )
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
      setExamPhase('mcq');
    } catch {
      setError('Could not start proctored session — allow camera and fullscreen');
    } finally {
      setSettingUp(false);
    }
  };

  const proceedToCoding = () => {
    if (!mcqComplete) {
      setError('Answer all multiple-choice questions before the coding section');
      return;
    }
    setError('');
    setExamPhase('coding');
    setCodingIndex(0);
  };

  const sectionLabel =
    examPhase === 'consent'
      ? 'Pre-exam briefing'
      : examPhase === 'mcq'
        ? 'Section A — Multiple choice (40%)'
        : examPhase === 'coding'
          ? 'Section B — Coding problems (60%)'
          : 'Section B — Practical scenarios (60%)';

  const footer = (
    <footer className="shrink-0 flex flex-wrap items-center gap-3 border-t border-[#30363d] bg-[#161b22] px-4 py-3">
      <button
        type="button"
        onClick={onBack}
        className="px-4 py-2.5 text-sm font-semibold text-[#8b949e] border border-[#30363d] rounded-lg hover:bg-[#21262d]"
      >
        ← Back
      </button>
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="px-4 py-2.5 text-sm font-semibold text-[#8b949e] hover:text-[#e6edf3]"
        >
          {skipLabel}
        </button>
      )}
      {proctorReady && isCodingExam && examPhase === 'mcq' && (
        <button
          type="button"
          onClick={proceedToCoding}
          disabled={loading || !mcqComplete}
          className="flex-1 min-w-[200px] py-2.5 bg-[#238636] text-white rounded-lg font-bold text-sm hover:bg-[#2ea043] disabled:opacity-40"
        >
          Continue to coding section (2 problems) →
        </button>
      )}
      {proctorReady && (examPhase === 'coding' || (!isCodingExam && examPhase === 'mcq')) && (
        <button
          type="button"
          onClick={() => submitCurrent(false)}
          disabled={loading || submitting || !exam || (isCodingExam ? !codingComplete : !mcqComplete || practicalAnswers.some((a) => a < 0))}
          className="flex-1 min-w-[200px] py-2.5 bg-[#0A66C2] text-white rounded-lg font-bold text-sm hover:bg-[#004182] disabled:opacity-40"
        >
          {submitting
            ? 'Grading…'
            : index + 1 >= skillIds.length
              ? 'Finish verification'
              : 'Submit & next skill →'}
        </button>
      )}
    </footer>
  );

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
                {r.suspicious && <p className="text-[10px] text-amber-700">Flagged for review</p>}
              </div>
              <SkillBadgeChip badge={r.badge} label={r.badgeLabel} icon={r.badgeIcon} score={r.score} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ExamFullscreenPortal active>
      <ExamTopBar
        skillName={exam?.name || 'Skill verification'}
        skillIndex={index}
        skillTotal={skillIds.length}
        sectionLabel={sectionLabel}
        fullscreenActive={proctor.state.fullscreenActive}
        webcamActive={proctor.state.webcamActive}
        violationCount={proctor.state.violationCount}
        integrityHint={proctor.state.integrityHint}
      />

      {proctor.state.webcamActive && proctor.state.consentGiven && (
        <div className="absolute top-16 right-4 z-10 hidden sm:block">
          <video
            ref={proctor.videoRef}
            muted
            playsInline
            className="w-28 h-20 rounded-lg border-2 border-[#30363d] object-cover shadow-lg"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {examPhase === 'consent' && !proctorReady && (
          <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-10">
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#e6edf3]">Proctored skill exam</h2>
                <p className="text-sm text-[#8b949e] mt-2 leading-relaxed">
                  You are about to start a <strong className="text-[#e6edf3]">fullscreen competitive exam</strong>{' '}
                  for <strong className="text-[#58a6ff]">{skillIds.length > 1 ? `${skillIds.length} skills` : 'your selected skill'}</strong>.
                  Frontend and Backend tests include <strong className="text-[#e6edf3]">10 MCQ</strong> then{' '}
                  <strong className="text-[#e6edf3]">2 coding problems</strong> in a split-pane editor (like GATE / CodeChef).
                </p>
              </div>
              <ul className="text-sm text-[#8b949e] space-y-2 list-disc pl-5">
                <li>Fullscreen + webcam required before questions load</li>
                <li>3 tab/window violations → auto-submit</li>
                <li>Copy, paste, and right-click disabled during the exam</li>
                <li>Final score = 70% test + 30% integrity</li>
              </ul>
              {error && (
                <p className="text-sm text-[#ffa198] bg-[#f85149]/10 border border-[#f85149]/30 rounded-lg px-4 py-3">
                  {error}
                </p>
              )}
              {proctor.state.warning && (
                <p className="text-sm text-[#e3b341] bg-[#d29922]/10 border border-[#d29922]/30 rounded-lg px-4 py-3">
                  {proctor.state.warning}
                </p>
              )}
              <button
                type="button"
                onClick={() => void handleSetup()}
                disabled={settingUp}
                className="w-full py-3.5 bg-[#238636] text-white rounded-xl font-bold text-sm hover:bg-[#2ea043] disabled:opacity-50"
              >
                {settingUp ? 'Requesting camera & fullscreen…' : 'I consent — enter fullscreen exam'}
              </button>
            </div>
          </div>
        )}

        {proctorReady && (
          <div
            className={`flex-1 min-h-0 flex flex-col select-none ${
              examPhase === 'coding' ? 'px-3 py-3 sm:px-4' : 'overflow-y-auto px-4 py-4 sm:px-8'
            }`}
            data-proctor-active
          >
            {proctor.state.warning && (
              <p className="shrink-0 mb-3 text-sm text-[#e3b341] bg-[#d29922]/10 border border-[#d29922]/30 rounded-lg px-4 py-2">
                {proctor.state.warning}
              </p>
            )}

            {loading && <p className="text-sm text-[#8b949e]">Loading exam questions…</p>}
            {error && (
              <p className="shrink-0 mb-3 text-sm text-[#ffa198] bg-[#f85149]/10 border border-[#f85149]/30 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            {exam && !loading && examPhase === 'mcq' && (
              <div className="max-w-3xl mx-auto w-full space-y-5 pb-6">
                <div>
                  <p className="text-xs text-[#8b949e]">{exam.description}</p>
                  <h2 className="text-lg font-bold text-[#e6edf3] mt-2">
                    Section A — Multiple choice ({exam.mcq.length} questions)
                  </h2>
                  <p className="text-xs text-[#8b949e] mt-1">
                    {isCodingExam
                      ? 'Complete all questions, then continue to the 2 coding problems.'
                      : 'Answer every question, then submit.'}
                  </p>
                </div>
                <div className="space-y-4">
                  {exam.mcq.map((q, qi) => (
                    <div
                      key={q.id}
                      className="rounded-xl border border-[#30363d] bg-[#161b22] p-4"
                    >
                      <p className="text-[10px] font-bold uppercase text-[#58a6ff] mb-1">
                        Q{qi + 1} · {q.difficulty}
                      </p>
                      <p className="text-sm font-medium text-[#e6edf3] mb-3">{q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => (
                          <label
                            key={oi}
                            className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 cursor-pointer border ${
                              mcqAnswers[qi] === oi
                                ? 'border-[#58a6ff] bg-[#58a6ff]/10 text-[#e6edf3]'
                                : 'border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d]'
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

                {!isCodingExam && exam.practical.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-[#30363d]">
                    <h2 className="text-lg font-bold text-[#e6edf3]">
                      Section B — Practical scenarios ({exam.practical.length} questions)
                    </h2>
                    {exam.practical.map((q, qi) => (
                      <div
                        key={q.id}
                        className="rounded-xl border border-[#30363d] bg-[#161b22] p-4"
                      >
                        <p className="text-sm font-semibold text-[#e6edf3]">{q.question}</p>
                        <p className="text-xs text-[#8b949e] mt-1 mb-3">{q.prompt}</p>
                        <div className="space-y-2">
                          {q.options.map((opt, oi) => (
                            <label
                              key={oi}
                              className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 cursor-pointer border ${
                                practicalAnswers[qi] === oi
                                  ? 'border-[#58a6ff] bg-[#58a6ff]/10'
                                  : 'border-[#30363d] hover:bg-[#21262d]'
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
                )}
              </div>
            )}

            {exam && !loading && examPhase === 'coding' && exam.coding?.length && (
              <CodingExamPanel
                fullscreen
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
            )}
          </div>
        )}
      </div>

      <canvas ref={proctor.canvasRef} className="hidden" aria-hidden />
      {footer}
    </ExamFullscreenPortal>
  );
}
