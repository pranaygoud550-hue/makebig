'use client';

import Link from 'next/link';
import { ECOSYSTEM_ARCHITECTURE } from '@/lib/ecosystem/architecture';
import { ECOSYSTEM_MODULES } from '@/lib/ecosystem/constants';
import { BrandLogo } from '@/components/BrandLogo';

const MODULE_LABELS: Record<(typeof ECOSYSTEM_MODULES)[number], string> = {
  investor_discovery: 'Investor discovery',
  startup_funding: 'Startup funding',
  recruiter_access: 'Recruiter access',
  talent_marketplace: 'Talent marketplace',
  accelerator_programs: 'Accelerator programs',
  startup_competitions: 'Startup competitions',
  hackathons: 'Hackathons',
  founder_communities: 'Founder communities',
  cofounder_matching: 'Co-founder matching',
  startup_incubation: 'Startup incubation',
};

const LIVE_FEATURES = [
  { label: 'Project journey timeline', href: '/idea-validator', note: 'Dashboard + project explore' },
  { label: 'Project health meter', href: '/idea-validator', note: 'Activity heatmap in dashboard' },
  { label: 'Startup showcase', href: '/', note: 'Featured startups on Home' },
  { label: 'AI idea validator', href: '/idea-validator' },
  { label: 'Founder reputation', href: '/profile', note: 'On your profile' },
  { label: 'Collaboration invites', href: '/', note: 'Join flow → Invitations tab' },
  { label: 'Public startup profiles', href: '/startup/make-big-platform-hyderabad' },
  { label: 'Startup journey feed', href: '/' },
  { label: 'Startup followers', href: '/startup/make-big-platform-hyderabad', note: 'Follow on startup page' },
];

export default function EcosystemPage() {
  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <header className="bg-white border-b border-[#d9d9d9] sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <BrandLogo size="sm" />
          <Link href="/" className="text-sm font-semibold text-[#0A66C2] hover:underline">
            ← Back to app
          </Link>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div>
          <p className="text-xs font-bold text-[#0A66C2] uppercase tracking-widest">MakeBig Ecosystem</p>
          <h1 className="text-3xl font-black text-[#1d2226] mt-1">Startup building platform</h1>
          <p className="text-[#666] mt-2 max-w-2xl">
            Live features ship today; future modules below are architecture hooks wired through shared
            models (users, projects, reputation, notifications).
          </p>
        </div>

        <section className="bg-white rounded-2xl border border-[#e0e0e0] p-6">
          <h2 className="text-lg font-bold text-[#1d2226] mb-4">✅ Live now</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {LIVE_FEATURES.map((f) => (
              <li key={f.label}>
                <Link
                  href={f.href}
                  className="block rounded-xl border border-[#eef3fb] bg-[#fafcff] px-4 py-3 hover:border-[#0A66C2] transition-colors"
                >
                  <p className="text-sm font-semibold text-[#1d2226]">{f.label}</p>
                  {f.note && <p className="text-xs text-[#666] mt-0.5">{f.note}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-[#e0e0e0] p-6">
          <h2 className="text-lg font-bold text-[#1d2226] mb-1">🔮 Coming next</h2>
          <p className="text-sm text-[#666] mb-4">
            Extension points in <code className="text-xs bg-[#f3f2ef] px-1 rounded">lib/ecosystem/architecture.ts</code>
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {ECOSYSTEM_MODULES.map((id) => (
              <div
                key={id}
                className="rounded-xl border border-dashed border-[#d9d9d9] px-4 py-3 bg-[#fafafa]"
              >
                <p className="text-sm font-semibold text-[#1d2226]">{MODULE_LABELS[id]}</p>
                <p className="text-[10px] font-bold uppercase text-[#999] mt-1">Planned</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[#e0e0e0] p-6 space-y-4">
          <h2 className="text-lg font-bold text-[#1d2226]">Shared infrastructure</h2>
          <div>
            <p className="text-xs font-bold text-[#666] uppercase mb-2">Services</p>
            <div className="flex flex-wrap gap-2">
              {ECOSYSTEM_ARCHITECTURE.sharedServices.map((s) => (
                <span key={s} className="text-xs px-2 py-1 rounded-full bg-[#EEF3FB] text-[#0A66C2] font-medium">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-[#666] uppercase mb-2">Public routes</p>
            <div className="flex flex-wrap gap-2">
              {ECOSYSTEM_ARCHITECTURE.publicRoutes.map((r) => (
                <span key={r} className="text-xs px-2 py-1 rounded-full bg-[#f3f2ef] text-[#444] font-mono">
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-[#666] uppercase mb-2">Data models</p>
            <div className="flex flex-wrap gap-2">
              {ECOSYSTEM_ARCHITECTURE.dataModels.map((m) => (
                <span key={m} className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-800 border border-green-100">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
