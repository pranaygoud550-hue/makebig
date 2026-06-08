'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { getAuthHeadersAsync } from '@/lib/api';
import { clientApiUrl } from '@/lib/apiBase';
import { useToast } from '@/lib/context/ToastContext';
import { useAuth } from '@/lib/hooks/useAuth';

interface FullReport {
  problemClarity?: number;
  marketSize?: string;
  similarSolutions?: string[];
  advantages?: string[];
  risks?: string[];
  nextSteps?: string[];
  verdict?: string;
  worthBuilding?: boolean;
  demo?: boolean;
}

export default function IdeaValidatorPage() {
  const auth = useAuth();
  const [step, setStep] = useState(1);
  const [idea, setIdea] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [report, setReport] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const startQuestions = async () => {
    if (!idea.trim()) return;
    setLoading(true);
    setError('');
    try {
      const headers = await getAuthHeadersAsync();
      const res = await fetch(clientApiUrl('/api/ai/idea-validator/questions'), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ideaDescription: idea }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Sign in to validate your idea');
        return;
      }
      setQuestions(data.data.questions || []);
      setAnswers([]);
      setQIndex(0);
      setStep(2);
    } catch {
      setError('Could not load questions');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = () => {
    const a = answers[qIndex]?.trim();
    if (!a) return;
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
    } else {
      void finishReport();
    }
  };

  const finishReport = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await getAuthHeadersAsync();
      const qa = questions.map((question, i) => ({
        question,
        answer: answers[i] || '',
      }));
      const res = await fetch(clientApiUrl('/api/ai/idea-validator/full-report'), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ideaDescription: idea, answers: qa }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Could not generate report');
        return;
      }
      setReport(data.data.report);
      setStep(3);
      showToast('Validation saved to your profile', 'success');
    } catch {
      setError('Could not generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f2ef] dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-900 border-b border-[#d9d9d9] dark:border-gray-700 px-4 sm:px-6 lg:px-8 py-3">
        <div className="w-full flex items-center justify-between">
          <Link href="/"><BrandLogo /></Link>
          <Link href="/" className="text-sm text-[#0A66C2] font-semibold">← Home</Link>
        </div>
      </header>

      <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-[#1d2226] dark:text-white">AI Idea Validator</h1>
          <p className="text-sm text-[#666] dark:text-gray-400 mt-1">
            Step {step} of 3 — validate before you build
          </p>
        </div>

        {step === 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e0e0e0] dark:border-gray-700 p-6 space-y-4">
            <label className="text-xs font-bold text-[#666] uppercase">Describe your idea</label>
            <textarea
              rows={6}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="What problem are you solving? Who is it for? What makes your approach different?"
              className="w-full border border-[#d9d9d9] dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:text-white"
            />
            {error && (
              <div className="space-y-2">
                <p className="text-sm text-red-500">{error}</p>
                {!auth.user && /sign in/i.test(error) && (
                  <Link
                    href="/?auth=signup"
                    className="inline-flex text-sm font-semibold text-[#0A66C2] hover:underline"
                  >
                    Sign up free to validate your idea →
                  </Link>
                )}
              </div>
            )}
            <button
              type="button"
              disabled={loading || !idea.trim()}
              onClick={() => void startQuestions()}
              className="w-full py-2.5 bg-[#0A66C2] text-white rounded-xl font-semibold disabled:opacity-50"
            >
              {loading ? 'Preparing questions…' : 'Continue →'}
            </button>
          </div>
        )}

        {step === 2 && questions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e0e0e0] dark:border-gray-700 p-6 space-y-4">
            <p className="text-xs text-[#0A66C2] font-semibold">
              Question {qIndex + 1} of {questions.length}
            </p>
            <p className="font-semibold text-[#1d2226] dark:text-white">{questions[qIndex]}</p>
            <textarea
              rows={4}
              value={answers[qIndex] || ''}
              onChange={(e) => {
                const next = [...answers];
                next[qIndex] = e.target.value;
                setAnswers(next);
              }}
              className="w-full border border-[#d9d9d9] dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:text-white"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="button"
              disabled={loading || !answers[qIndex]?.trim()}
              onClick={submitAnswer}
              className="w-full py-2.5 bg-[#0A66C2] text-white rounded-xl font-semibold disabled:opacity-50"
            >
              {loading ? 'Analyzing…' : qIndex < questions.length - 1 ? 'Next question →' : 'Get my report →'}
            </button>
          </div>
        )}

        {step === 3 && report && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e0e0e0] dark:border-gray-700 p-6 space-y-5">
            {report.demo && (
              <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">Demo mode — add GROQ_API_KEY for live AI</p>
            )}
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-[#666] uppercase">Problem clarity</p>
                <p className="text-3xl font-black text-[#0A66C2]">{report.problemClarity ?? 0}/10</p>
              </div>
              <div>
                <p className="text-xs text-[#666] uppercase">Worth building?</p>
                <p className="text-lg font-bold text-[#1d2226] dark:text-white">
                  {report.worthBuilding ? 'Yes — with validation' : 'Needs more work'}
                </p>
              </div>
            </div>
            <section>
              <h2 className="font-bold mb-1">Market size</h2>
              <p className="text-sm text-[#666]">{report.marketSize}</p>
            </section>
            <section>
              <h2 className="font-bold mb-1">Similar solutions</h2>
              <ul className="text-sm text-[#666] list-disc pl-4">
                {(report.similarSolutions || []).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="font-bold mb-1">Your advantages</h2>
              <ul className="text-sm text-[#666] list-disc pl-4">
                {(report.advantages || []).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="font-bold mb-1">Biggest risks</h2>
              <ul className="text-sm text-[#666] list-disc pl-4">
                {(report.risks || []).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="font-bold mb-1">Recommended next steps</h2>
              <ul className="text-sm text-[#666] list-disc pl-4">
                {(report.nextSteps || []).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
            <section className="bg-[#EEF3FB] dark:bg-blue-950/30 rounded-xl p-4">
              <h2 className="font-bold mb-1">Honest verdict</h2>
              <p className="text-sm text-[#1d2226] dark:text-gray-200 leading-relaxed">{report.verdict}</p>
            </section>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-200">
              AI Validated ✓ — saved to your profile
            </span>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setReport(null);
                setIdea('');
              }}
              className="w-full py-2.5 border border-[#0A66C2] text-[#0A66C2] rounded-xl font-semibold"
            >
              Validate another idea
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
