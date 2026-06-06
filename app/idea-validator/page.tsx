'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';

interface ValidationReport {
  marketOpportunity?: { score?: number; summary?: string };
  competition?: { competitors?: string[]; saturation?: string; level?: string };
  risks?: { technical?: string[]; business?: string[]; execution?: string[] };
  monetization?: string[];
  viabilityScore?: number;
  summary?: string;
  demo?: boolean;
}

export default function IdeaValidatorPage() {
  const [form, setForm] = useState({
    ideaName: '',
    problemStatement: '',
    targetAudience: '',
    businessModel: '',
    industry: '',
  });
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [rawReport, setRawReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('makebig_token') : null;
      const res = await fetch('/api/ai/idea-validator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...form, save: true }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Sign in to validate your idea');
        return;
      }
      setReport(data.data.report);
      setRawReport(data.data.rawReport || '');
    } catch {
      setError('Could not generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = () => {
    const w = window.open('', '_blank');
    if (!w || !rawReport) return;
    w.document.write(`<pre style="font-family:sans-serif;padding:24px;white-space:pre-wrap">${rawReport.replace(/</g, '&lt;')}</pre>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <header className="bg-white border-b border-[#d9d9d9] px-4 sm:px-6 lg:px-8 py-3">
        <div className="w-full flex items-center justify-between">
          <Link href="/"><BrandLogo /></Link>
          <Link href="/" className="text-sm text-[#0A66C2] font-semibold">← Home</Link>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-[#1d2226]">AI Idea Validator</h1>
          <p className="text-sm text-[#666] mt-1">Validate your startup idea before you build</p>
        </div>

        {!report ? (
          <form onSubmit={submit} className="bg-white rounded-2xl border border-[#e0e0e0] p-6 space-y-4">
            {(['ideaName', 'problemStatement', 'targetAudience', 'businessModel', 'industry'] as const).map(
              (field) => (
                <div key={field}>
                  <label className="text-xs font-bold text-[#666] uppercase tracking-wide capitalize">
                    {field.replace(/([A-Z])/g, ' $1')}
                  </label>
                  <textarea
                    rows={field === 'problemStatement' ? 3 : 1}
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="mt-1 w-full bg-white text-[#1d2226] border border-[#d9d9d9] rounded-xl px-3 py-2 text-sm placeholder:text-[#999] focus:outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20"
                    required={field === 'ideaName'}
                  />
                </div>
              )
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading || !form.ideaName.trim()}
              className="w-full py-2.5 bg-[#0A66C2] text-white rounded-xl font-semibold disabled:opacity-50"
            >
              {loading ? 'Analyzing…' : 'Generate validation report'}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e0e0e0] p-6 space-y-5">
            {report.demo && (
              <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                Demo report — add GROQ_API_KEY for live AI analysis
              </p>
            )}
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="text-xs text-[#666] uppercase">Idea Viability</p>
                <p className="text-3xl font-black text-[#0A66C2]">{report.viabilityScore ?? 0}/100</p>
              </div>
              <div>
                <p className="text-xs text-[#666] uppercase">Market Opportunity</p>
                <p className="text-3xl font-black text-green-700">{report.marketOpportunity?.score ?? 0}/100</p>
              </div>
            </div>

            <section>
              <h2 className="font-bold text-[#1d2226] mb-1">Summary</h2>
              <p className="text-sm text-[#666] leading-relaxed">{report.summary}</p>
            </section>

            <section>
              <h2 className="font-bold text-[#1d2226] mb-1">Competition — {report.competition?.level}</h2>
              <p className="text-sm text-[#666]">{report.competition?.saturation}</p>
              <p className="text-xs text-[#999] mt-1">{(report.competition?.competitors || []).join(' · ')}</p>
            </section>

            <section>
              <h2 className="font-bold text-[#1d2226] mb-2">Risks</h2>
              <ul className="text-sm text-[#666] space-y-1 list-disc pl-4">
                {(report.risks?.technical || []).map((r) => (
                  <li key={r}>Technical: {r}</li>
                ))}
                {(report.risks?.business || []).map((r) => (
                  <li key={r}>Business: {r}</li>
                ))}
                {(report.risks?.execution || []).map((r) => (
                  <li key={r}>Execution: {r}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-[#1d2226] mb-2">Monetization</h2>
              <div className="flex flex-wrap gap-2">
                {(report.monetization || []).map((m) => (
                  <span key={m} className="text-xs px-2 py-1 bg-[#EEF3FB] text-[#0A66C2] rounded-full font-semibold">
                    {m}
                  </span>
                ))}
              </div>
            </section>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={exportPdf} className="flex-1 py-2 border border-[#0A66C2] text-[#0A66C2] rounded-xl font-semibold text-sm">
                Export PDF
              </button>
              <button type="button" onClick={() => setReport(null)} className="flex-1 py-2 bg-[#0A66C2] text-white rounded-xl font-semibold text-sm">
                Validate another
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
