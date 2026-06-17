'use client';

import { useEffect, useState } from 'react';
import type { CodingChallengeClient, CodingLanguage } from '@/lib/skillVerification/types';

const LANG_LABELS: Record<CodingLanguage, string> = {
  javascript: 'JavaScript',
  python: 'Python 3',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
};

interface CodingExamPanelProps {
  challenges: CodingChallengeClient[];
  answers: { code: string; language: CodingLanguage }[];
  onChange: (index: number, code: string, language: CodingLanguage) => void;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  fullscreen?: boolean;
}

export function CodingExamPanel({
  challenges,
  answers,
  onChange,
  activeIndex,
  onActiveIndexChange,
  fullscreen = false,
}: CodingExamPanelProps) {
  const challenge = challenges[activeIndex];
  const answer = answers[activeIndex] || { code: '', language: 'javascript' as CodingLanguage };
  const [language, setLanguage] = useState<CodingLanguage>(answer.language || 'javascript');

  useEffect(() => {
    if (!challenge) return;
    const lang = answer.language || challenge.languages[0] || 'javascript';
    setLanguage(lang);
    if (!answer.code && challenge.starterCode[lang]) {
      onChange(activeIndex, challenge.starterCode[lang]!, lang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync starter on challenge switch
  }, [activeIndex, challenge?.id]);

  if (!challenge) return null;

  const switchLanguage = (lang: CodingLanguage) => {
    setLanguage(lang);
    const starter = challenge.starterCode[lang] || '';
    onChange(activeIndex, answers[activeIndex]?.code || starter, lang);
  };

  const gridClass = fullscreen
    ? 'grid lg:grid-cols-2 gap-0 flex-1 min-h-0 border border-[#30363d] overflow-hidden bg-[#0d1117]'
    : 'grid lg:grid-cols-2 gap-3 min-h-[320px] rounded-xl border border-[#30363d] overflow-hidden bg-[#0d1117]';

  const problemPaneClass = fullscreen
    ? 'p-5 overflow-y-auto border-b lg:border-b-0 lg:border-r border-[#30363d] bg-[#161b22] min-h-0'
    : 'p-4 overflow-y-auto max-h-[420px] border-b lg:border-b-0 lg:border-r border-[#30363d] bg-[#161b22]';

  const editorPaneClass = fullscreen
    ? 'flex flex-col min-h-0 h-full'
    : 'flex flex-col min-h-[280px]';

  const textareaClass = fullscreen
    ? 'flex-1 w-full min-h-0 p-4 font-mono text-sm leading-relaxed bg-[#0d1117] text-[#e6edf3] border-0 resize-none focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40'
    : 'flex-1 w-full min-h-[240px] p-3 font-mono text-[13px] leading-relaxed bg-[#0d1117] text-[#e6edf3] border-0 resize-none focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40';

  return (
    <section className={fullscreen ? 'flex flex-col flex-1 min-h-0 gap-0' : 'space-y-3'}>
      <div className={`flex flex-wrap items-center justify-between gap-2 ${fullscreen ? 'shrink-0 px-1 py-3' : ''}`}>
        <div>
          <h3 className={`font-bold text-[#e6edf3] ${fullscreen ? 'text-base' : 'text-sm'}`}>
            Section B — Coding ({challenges.length} problems · 60% of score)
          </h3>
          {fullscreen && (
            <p className="text-xs text-[#8b949e] mt-0.5">
              Competitive exam mode · stdin/stdout · complete both problems before submitting
            </p>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {challenges.map((c, i) => {
            const answered = Boolean(answers[i]?.code?.trim());
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onActiveIndexChange(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  i === activeIndex
                    ? 'border-[#58a6ff] bg-[#58a6ff]/15 text-[#58a6ff]'
                    : answered
                      ? 'border-[#238636] text-[#7ee787] bg-[#238636]/10'
                      : 'border-[#30363d] text-[#8b949e] hover:bg-[#21262d]'
                }`}
              >
                Problem {i + 1}
                {answered ? ' ✓' : ''}
              </button>
            );
          })}
        </div>
      </div>

      <div className={fullscreen ? 'flex flex-col flex-1 min-h-0' : ''}>
        <div className={gridClass}>
          <div className={problemPaneClass}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#58a6ff]">
              Problem {activeIndex + 1} of {challenges.length} · {challenge.difficulty}
            </p>
            <h4 className={`font-bold text-[#e6edf3] mt-1 ${fullscreen ? 'text-lg' : 'text-base'}`}>
              {challenge.title}
            </h4>
            <p className={`text-[#8b949e] mt-2 leading-relaxed ${fullscreen ? 'text-sm' : 'text-sm'}`}>
              {challenge.statement}
            </p>

            <div className="mt-5 space-y-4 text-xs">
              <div>
                <p className="font-semibold text-[#c9d1d9]">Input format</p>
                <p className="text-[#8b949e] mt-0.5 whitespace-pre-wrap">{challenge.inputFormat}</p>
              </div>
              <div>
                <p className="font-semibold text-[#c9d1d9]">Output format</p>
                <p className="text-[#8b949e] mt-0.5 whitespace-pre-wrap">{challenge.outputFormat}</p>
              </div>
              <div>
                <p className="font-semibold text-[#c9d1d9]">Constraints</p>
                <p className="text-[#8b949e] mt-0.5">{challenge.constraints}</p>
              </div>
            </div>

            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
                <p className="text-[10px] font-bold text-[#7ee787] uppercase">Sample input</p>
                <pre className="text-xs text-[#e6edf3] mt-1.5 whitespace-pre-wrap font-mono">
                  {challenge.sampleInput}
                </pre>
              </div>
              <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
                <p className="text-[10px] font-bold text-[#ffa657] uppercase">Sample output</p>
                <pre className="text-xs text-[#e6edf3] mt-1.5 whitespace-pre-wrap font-mono">
                  {challenge.sampleOutput}
                </pre>
              </div>
            </div>
          </div>

          <div className={editorPaneClass}>
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-[#30363d] bg-[#161b22] shrink-0">
              <label className="text-xs text-[#8b949e] font-medium flex items-center gap-2">
                Language
                <select
                  value={language}
                  onChange={(e) => switchLanguage(e.target.value as CodingLanguage)}
                  className="rounded-md border border-[#30363d] bg-[#0d1117] text-[#e6edf3] text-xs px-2 py-1.5"
                >
                  {challenge.languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {LANG_LABELS[lang]}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-[10px] text-[#8b949e] font-mono">stdin → stdout</span>
            </div>
            <textarea
              value={answer.code}
              onChange={(e) => onChange(activeIndex, e.target.value, language)}
              spellCheck={false}
              className={textareaClass}
              aria-label={`Code for ${challenge.title}`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
