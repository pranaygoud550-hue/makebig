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
}

export function CodingExamPanel({
  challenges,
  answers,
  onChange,
  activeIndex,
  onActiveIndexChange,
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

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#1d2226]">
          Section B — Coding ({challenges.length} problems · 60% of test score)
        </h3>
        <div className="flex gap-1 flex-wrap">
          {challenges.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onActiveIndexChange(i)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                i === activeIndex
                  ? 'border-[#0A66C2] bg-[#EEF3FB] text-[#0A66C2]'
                  : 'border-[#e0e0e0] text-[#666] hover:bg-[#f8f9fa]'
              }`}
            >
              Q{i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-3 min-h-[320px] rounded-xl border border-[#30363d] overflow-hidden bg-[#0d1117]">
        {/* Problem pane — competitive exam layout */}
        <div className="p-4 overflow-y-auto max-h-[420px] border-b lg:border-b-0 lg:border-r border-[#30363d] bg-[#161b22]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#58a6ff]">
            {challenge.difficulty}
          </p>
          <h4 className="text-base font-bold text-[#e6edf3] mt-1">{challenge.title}</h4>
          <p className="text-sm text-[#8b949e] mt-2 leading-relaxed">{challenge.statement}</p>

          <div className="mt-4 space-y-3 text-xs">
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

          <div className="mt-4 grid sm:grid-cols-2 gap-2">
            <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-2.5">
              <p className="text-[10px] font-bold text-[#7ee787] uppercase">Sample input</p>
              <pre className="text-xs text-[#e6edf3] mt-1 whitespace-pre-wrap font-mono">
                {challenge.sampleInput}
              </pre>
            </div>
            <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-2.5">
              <p className="text-[10px] font-bold text-[#ffa657] uppercase">Sample output</p>
              <pre className="text-xs text-[#e6edf3] mt-1 whitespace-pre-wrap font-mono">
                {challenge.sampleOutput}
              </pre>
            </div>
          </div>
        </div>

        {/* Code editor pane */}
        <div className="flex flex-col min-h-[280px]">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#30363d] bg-[#161b22]">
            <label className="text-xs text-[#8b949e] font-medium">
              Language
              <select
                value={language}
                onChange={(e) => switchLanguage(e.target.value as CodingLanguage)}
                className="ml-2 rounded-md border border-[#30363d] bg-[#0d1117] text-[#e6edf3] text-xs px-2 py-1"
              >
                {challenge.languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {LANG_LABELS[lang]}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-[10px] text-[#8b949e]">Competitive exam mode · stdin/stdout</span>
          </div>
          <textarea
            value={answer.code}
            onChange={(e) => onChange(activeIndex, e.target.value, language)}
            spellCheck={false}
            className="flex-1 w-full min-h-[240px] p-3 font-mono text-[13px] leading-relaxed bg-[#0d1117] text-[#e6edf3] border-0 resize-none focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40"
            aria-label={`Code for ${challenge.title}`}
          />
        </div>
      </div>
    </section>
  );
}
