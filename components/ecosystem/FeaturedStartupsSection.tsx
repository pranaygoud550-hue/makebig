'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface FeaturedStartup {
  projectId: string;
  name: string;
  slug: string;
  categoryId: string;
  ownerName?: string;
  logoUrl?: string;
  readinessScore: number;
  healthScore: number;
  badge: { id: string; label: string; icon: string };
}

export function FeaturedStartupsSection() {
  const [featured, setFeatured] = useState<FeaturedStartup[]>([]);
  const [weekStart, setWeekStart] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/showcase/featured')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setFeatured(json.data.featured || []);
          setWeekStart(json.data.weekStart || '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (!loading && featured.length === 0) return null;

  return (
    <section className="py-12 bg-white border-y border-[#e0e0e0]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-widest mb-1">
            🏆 Featured Startups This Week
          </p>
          <h2 className="text-2xl font-bold text-[#1d2226]">Building in public on MakeBig</h2>
          {weekStart && (
            <p className="text-sm text-[#666] mt-1">Week of {weekStart}</p>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 bg-[#f3f2ef] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map((s) => (
              <Link
                key={s.projectId}
                href={`/startup/${s.slug}`}
                className="group block bg-[#fafcff] border border-[#e0e0e0] rounded-2xl p-4 hover:border-[#0A66C2] hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0A66C2] text-white flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden">
                    {s.logoUrl ? (
                      <img src={s.logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      s.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#1d2226] truncate group-hover:text-[#0A66C2]">
                      {s.name}
                    </p>
                    <p className="text-xs text-[#666] truncate">{s.ownerName || s.categoryId}</p>
                  </div>
                </div>
                <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 mb-2">
                  {s.badge.icon} {s.badge.label}
                </span>
                <div className="flex gap-3 text-xs text-[#666]">
                  <span>Readiness {Math.round(s.readinessScore)}%</span>
                  <span>Health {Math.round(s.healthScore)}%</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
