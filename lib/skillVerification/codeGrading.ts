import vm from 'vm';
import type { CodingChallenge, CodingLanguage } from './types';

function normalizeOutput(raw: string): string {
  return raw.trim().replace(/\r\n/g, '\n');
}

/** Run competitive-style JS submissions against hidden tests (Node vm, 2s timeout). */
export function gradeJavaScriptSubmission(
  code: string,
  challenge: CodingChallenge
): { passed: number; total: number; score: number } {
  const total = challenge.testCases.length;
  let passed = 0;

  for (const tc of challenge.testCases) {
    try {
      const out = captureConsoleOutput(code, tc.input);
      if (normalizeOutput(out) === normalizeOutput(tc.expectedOutput)) {
        passed += 1;
      }
    } catch {
      /* failed test */
    }
  }

  return { passed, total, score: total ? Math.round((passed / total) * 100) : 0 };
}

function captureConsoleOutput(code: string, stdin: string): string {
  const logs: string[] = [];
  const sandbox = {
    console: { log: (...args: unknown[]) => logs.push(args.map(String).join(' ')) },
    require: (id: string) => {
      if (id === 'fs') {
        return {
          readFileSync: () => stdin,
        };
      }
      throw new Error('Module not allowed');
    },
  };
  const script = new vm.Script(`${code}\n//# sourceURL=skill-test.js`);
  script.runInContext(vm.createContext(sandbox), { timeout: 2000 });
  return logs.join('\n');
}

/** Pattern-based partial grading for non-JS languages (competitive exam UI, offline judge). */
export function gradePatternSubmission(
  code: string,
  challenge: CodingChallenge,
  language: CodingLanguage
): { passed: number; total: number; score: number } {
  const normalized = code.toLowerCase().replace(/\s+/g, ' ');
  const patterns = patternHints(challenge.id, language);
  const matched = patterns.filter((p) => normalized.includes(p)).length;
  const ratio = patterns.length ? matched / patterns.length : 0;
  const score = Math.round(ratio * 100);
  const passed = Math.round(ratio * challenge.testCases.length);
  return { passed, total: challenge.testCases.length, score };
}

function patternHints(challengeId: string, language: CodingLanguage): string[] {
  const base: Record<string, string[]> = {
    'fe-c1': ['reverse', 'split', 'join'],
    'fe-c2': ['vowel', 'aeiou', 'count'],
    'be-c1': ['sum', 'reduce', '+'],
    'be-c2': ['palindrome', 'reverse', 'yes', 'no'],
  };
  const lang: Record<CodingLanguage, string[]> = {
    javascript: ['function', 'return'],
    python: ['def ', 'return'],
    java: ['public', 'static'],
    cpp: ['#include', 'return'],
    c: ['#include', 'return'],
  };
  return [...(base[challengeId] || []), ...(lang[language] || [])];
}

export function gradeCodingAnswers(
  skillId: string,
  challenges: CodingChallenge[],
  submissions: { code: string; language: CodingLanguage }[]
): number {
  if (submissions.length !== challenges.length) return 0;
  let totalScore = 0;
  submissions.forEach((sub, i) => {
    const ch = challenges[i];
    if (!ch) return;
    const result =
      sub.language === 'javascript'
        ? gradeJavaScriptSubmission(sub.code, ch)
        : gradePatternSubmission(sub.code, ch, sub.language);
    totalScore += result.score;
  });
  return Math.round(totalScore / challenges.length);
}
