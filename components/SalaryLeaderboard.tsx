'use client';

import { useState, useEffect } from 'react';
import { WIZARD_CATEGORIES } from '@/lib/constants';
import { apiGetTopSalaryProjects } from '@/lib/api';

interface SalaryProject {
  id: string;
  name: string;
  categoryId: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  roles?: string[];
}

function getCategoryIcon(categoryId: string) {
  const icons: Record<string, string> = {
    tech: '💻', design: '🎨', marketing: '📢', content: '✍️',
    finance: '💰', education: '📚', health: '🏥', social: '🤝', other: '🚀',
  };
  return icons[categoryId] || '🚀';
}

function getCategoryTitle(id: string) {
  return WIZARD_CATEGORIES.find(c => c.id === id)?.title || id;
}

function formatSalary(amount: number, currency: string) {
  if (currency === 'INR') {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000)  return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount}`;
  }
  const sym: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };
  return `${sym[currency] || currency}${amount >= 1000 ? `${(amount / 1000).toFixed(0)}K` : amount}`;
}

export function SalaryLeaderboard({ onRequireAuth }: { onRequireAuth?: () => void }) {
  const [projects, setProjects] = useState<SalaryProject[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    apiGetTopSalaryProjects().then(list => {
      setProjects(list);
      setLoading(false);
    });
  }, []);

  if (!loading && projects.length === 0) return null;

  return (
    <section className="py-12 bg-white border-y border-[#e0e0e0]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-widest mb-1">💸 Live Opportunities</p>
            <h2 className="text-2xl font-bold text-[#1d2226]">Highest paying open projects</h2>
            <p className="text-sm text-[#666] mt-1">Projects actively offering monthly compensation right now</p>
          </div>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-[#f3f2ef] rounded-2xl p-5 animate-pulse h-36" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {projects.map((p, i) => {
              const currency = p.currency || 'INR';
              const maxSalary = p.salaryMax || 0;
              const minSalary = p.salaryMin || 0;

              return (
                <div
                  key={p.id}
                  className="relative bg-[#f3f2ef] hover:bg-white border border-[#e0e0e0] hover:border-[#0A66C2]/30 rounded-2xl p-5 transition-all group cursor-pointer"
                  onClick={onRequireAuth}
                >
                  {i === 0 && (
                    <span className="absolute -top-2.5 left-4 bg-amber-400 text-white text-[10px] font-black uppercase tracking-wide px-2.5 py-0.5 rounded-full shadow-sm">
                      #1 Top Pay
                    </span>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{getCategoryIcon(p.categoryId)}</span>
                    <span className="text-[10px] font-semibold text-[#0A66C2] bg-[#EEF3FB] px-2 py-0.5 rounded-full border border-[#0A66C2]/20">
                      {getCategoryTitle(p.categoryId)}
                    </span>
                  </div>

                  <p className="font-bold text-[#1d2226] line-clamp-2 text-sm leading-snug mb-2">
                    {p.name}
                  </p>

                  <div className="mt-auto">
                    <p className="text-lg font-black text-green-700">
                      {formatSalary(maxSalary, currency)}
                      <span className="text-xs font-semibold text-[#666] ml-1">/mo</span>
                    </p>
                    {minSalary > 0 && minSalary < maxSalary && (
                      <p className="text-[10px] text-[#999]">
                        from {formatSalary(minSalary, currency)}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    {(p.roles || []).length > 0 && (
                      <span className="text-[10px] text-[#666] truncate">
                        Looking for: {(p.roles || []).slice(0,2).join(', ')}
                      </span>
                    )}
                    <span className="text-[10px] font-semibold text-[#0A66C2] group-hover:underline ml-auto">
                      Apply →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Average salaries by category */}
        {!loading && projects.length > 0 && (
          <div className="mt-8 p-5 bg-[#EEF3FB] border border-[#0A66C2]/15 rounded-2xl">
            <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-wide mb-3">
              Average max salary by category
            </p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(
                projects.reduce<Record<string, number[]>>((acc, p) => {
                  const cat = getCategoryTitle(p.categoryId);
                  if (!acc[cat]) acc[cat] = [];
                  if (p.salaryMax) acc[cat].push(p.salaryMax);
                  return acc;
                }, {})
              ).map(([cat, vals]) => {
                const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                return (
                  <div key={cat} className="bg-white rounded-xl px-3 py-2 border border-[#d9d9d9] text-sm">
                    <span className="text-[#666]">{cat}</span>
                    <span className="ml-2 font-bold text-[#1d2226]">
                      {formatSalary(Math.round(avg), projects[0]?.currency || 'INR')}
                    </span>
                    <span className="text-xs text-[#999] ml-1">/mo</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
