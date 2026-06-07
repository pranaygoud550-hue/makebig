'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PublicProjectFeed } from '@/components/PublicProjectFeed';
import { SalaryLeaderboard } from '@/components/SalaryLeaderboard';
import { VerifiedSkillsLeaderboard } from '@/components/skillVerification/VerifiedSkillsLeaderboard';
import { FeaturedStartupsSection } from '@/components/ecosystem/FeaturedStartupsSection';
import { StartupJourneyFeed } from '@/components/ecosystem/StartupJourneyFeed';
import { ShowcaseFeed } from '@/components/ShowcaseFeed';
import { WIZARD_CATEGORIES } from '@/lib/constants';
import { BrowseProject } from '@/lib/api';

export interface DebugSnapshot {
  timestamp: string;
  backend_health: string;
  localStorage_user: unknown;
  localStorage_profile: unknown;
  currentUser: unknown;
  currentProject: unknown;
}

interface MarketingHomepageProps {
  isSignedIn?: boolean;
  onStartProject: () => void;
  onRequireAuth: () => void;
  onJoinProject: (project: BrowseProject) => void;
  onExploreClick?: () => void;
  onCheckDebug?: () => void;
  showDebug?: boolean;
  debugData?: DebugSnapshot | null;
  onCloseDebug?: () => void;
}

const FEATURES = [
  {
    icon: '🚀',
    title: 'Create Projects',
    desc: 'Turn your idea into a published project with roles, timeline, and a clear pitch for teammates.',
  },
  {
    icon: '👥',
    title: 'Find Team Members',
    desc: 'Match by skills, college, and interests. Build the team your project actually needs.',
  },
  {
    icon: '🤝',
    title: 'Collaborate',
    desc: 'Tasks, posts, chat, and live updates in one workspace for your whole team.',
  },
  {
    icon: '💼',
    title: 'Build Startups',
    desc: 'Ship real products with co-founders — not just classroom assignments.',
  },
  {
    icon: '💡',
    title: 'Share Ideas',
    desc: 'Post updates, get feedback, and grow visibility across the Make Big community.',
  },
  {
    icon: '🌍',
    title: 'Discover Opportunities',
    desc: 'Browse open roles, join teams, and find paid or portfolio-building projects.',
  },
];

const DEFAULT_STATS = [
  { value: '50+', label: 'Total Projects', key: 'projects' },
  { value: '100+', label: 'Active Members', key: 'members' },
  { value: '12+', label: 'Cities', key: 'cities' },
];

function HeroIllustration() {
  return (
    <svg viewBox="0 0 400 320" className="w-full max-w-md mx-auto" aria-hidden>
      <defs>
        <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0A66C2" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <rect x="40" y="40" width="320" height="240" rx="20" fill="url(#heroGrad)" stroke="#0A66C2" strokeOpacity="0.2" />
      <rect x="60" y="70" width="130" height="80" rx="12" fill="white" stroke="#e0e0e0" />
      <rect x="70" y="82" width="60" height="8" rx="4" fill="#0A66C2" opacity="0.7" />
      <rect x="70" y="98" width="90" height="6" rx="3" fill="#e0e0e0" />
      <rect x="70" y="110" width="70" height="6" rx="3" fill="#e0e0e0" />
      <circle cx="95" cy="135" r="10" fill="#EEF3FB" stroke="#0A66C2" strokeWidth="1.5" />
      <circle cx="120" cy="135" r="10" fill="#EEF3FB" stroke="#0A66C2" strokeWidth="1.5" />
      <circle cx="145" cy="135" r="10" fill="#dcfce7" stroke="#22c55e" strokeWidth="1.5" />
      <rect x="210" y="70" width="130" height="55" rx="10" fill="white" stroke="#e0e0e0" />
      <rect x="222" y="82" width="50" height="6" rx="3" fill="#22c55e" opacity="0.8" />
      <rect x="222" y="96" width="80" height="5" rx="2" fill="#f3f2ef" />
      <rect x="222" y="106" width="60" height="5" rx="2" fill="#f3f2ef" />
      <rect x="210" y="140" width="130" height="55" rx="10" fill="white" stroke="#e0e0e0" />
      <rect x="222" y="152" width="40" height="6" rx="3" fill="#f59e0b" opacity="0.8" />
      <rect x="222" y="166" width="90" height="5" rx="2" fill="#f3f2ef" />
      <rect x="60" y="170" width="280" height="90" rx="12" fill="white" stroke="#0A66C2" strokeOpacity="0.25" />
      <rect x="75" y="188" width="8" height="55" rx="4" fill="#0A66C2" opacity="0.3" />
      <rect x="95" y="200" width="8" height="43" rx="4" fill="#22c55e" opacity="0.5" />
      <rect x="115" y="210" width="8" height="33" rx="4" fill="#0A66C2" opacity="0.6" />
      <rect x="135" y="195" width="8" height="48" rx="4" fill="#f59e0b" opacity="0.5" />
      <rect x="155" y="205" width="8" height="38" rx="4" fill="#22c55e" opacity="0.4" />
      <text x="200" y="220" fill="#666" fontSize="11" fontFamily="system-ui">Tasks · Posts · Team</text>
    </svg>
  );
}

export function MarketingHomepage({
  isSignedIn = false,
  onStartProject,
  onRequireAuth,
  onJoinProject,
  onExploreClick,
  onCheckDebug,
  showDebug,
  debugData,
  onCloseDebug,
}: MarketingHomepageProps) {
  const exploreHref = '/explore';
  const [stats, setStats] = useState(DEFAULT_STATS);

  useEffect(() => {
    fetch('/api/public/stats')
      .then((r) => r.json())
      .then((data) => {
        setStats([
          { value: `${data.totalProjects || 0}+`, label: 'Total Projects', key: 'projects' },
          { value: `${data.totalUsers || 0}+`, label: 'Active Members', key: 'members' },
          { value: `${data.totalCities || 0}+`, label: 'Cities', key: 'cities' },
          { value: `${WIZARD_CATEGORIES.length}+`, label: 'Categories', key: 'categories' },
        ]);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(12px, -18px) scale(1.05); }
        }
        @keyframes float-slower {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-16px, 12px); }
        }
        @keyframes grid-fade {
          0%, 100% { opacity: 0.04; }
          50% { opacity: 0.08; }
        }
        @keyframes rise-in {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-float-slower { animation: float-slower 11s ease-in-out infinite; }
        .animate-grid-fade { animation: grid-fade 6s ease-in-out infinite; }
        .animate-rise-in { animation: rise-in 0.7s ease-out forwards; }
      `}</style>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EEF3FB] via-white to-[#f3f2ef] border-b border-[#e0e0e0]">
        <div
          className="absolute inset-0 animate-grid-fade pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#0A66C2 1px, transparent 1px), linear-gradient(90deg, #0A66C2 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-16 -left-20 w-80 h-80 bg-[#0A66C2]/15 rounded-full blur-3xl animate-float-slow pointer-events-none" />
        <div className="absolute bottom-10 -right-16 w-96 h-96 bg-[#22c55e]/10 rounded-full blur-3xl animate-float-slower pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0A66C2]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-rise-in text-center lg:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-white text-[#0A66C2] text-xs font-bold rounded-full uppercase tracking-wider mb-5 border border-[#0A66C2]/20 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0A66C2] animate-pulse" />
              No unemployment in India — after graduation
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-black text-[#1d2226] leading-[1.08] tracking-tight">
              Build Projects.{' '}
              <span className="text-[#0A66C2]">Find Teams.</span>{' '}
              Get Opportunities.
            </h1>
            <p className="text-[#666] text-base md:text-lg mt-5 leading-relaxed max-w-xl mx-auto lg:mx-0">
              A collaboration platform where creators, developers, filmmakers, marketers and innovators build together.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center lg:justify-start">
              <button
                type="button"
                onClick={onRequireAuth}
                className="px-8 py-3.5 bg-[#0A66C2] text-white font-bold rounded-full hover:bg-[#004182] hover:shadow-lg hover:shadow-[#0A66C2]/25 transition-all text-sm sm:text-base text-center"
              >
                Get Started
              </button>
              <Link
                href={exploreHref}
                className="px-8 py-3.5 bg-white border-2 border-[#0A66C2] text-[#0A66C2] font-bold rounded-full hover:bg-[#EEF3FB] transition-all text-sm sm:text-base text-center"
              >
                Explore Projects
              </Link>
              <button
                type="button"
                onClick={onStartProject}
                className="px-8 py-3.5 bg-white border border-[#d9d9d9] text-[#666] font-bold rounded-full hover:bg-[#f3f2ef] transition-all text-sm sm:text-base"
              >
                Start a project
              </button>
            </div>

            <p className="text-xs text-[#999] mt-5">
              Free for students · OTP sign-in · Ship with tasks, posts &amp; team tools
            </p>
          </div>

          <div className="relative animate-rise-in lg:delay-150 hidden sm:block">
            <div className="absolute -inset-4 bg-gradient-to-br from-[#0A66C2]/10 to-transparent rounded-3xl blur-xl" />
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* ── Live showcase feed ── */}
      <ShowcaseFeed />

      {/* ── Social proof ── */}
      <section className="bg-[#0A66C2] py-8 px-4">
        <div className="w-full px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.key}>
              <p className="text-3xl md:text-4xl font-black text-white">{s.value}</p>
              <p className="text-sm text-white/75 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Learn CTA (full dashboard at /learn) ── */}
      <section className="bg-white py-12 px-4 border-b border-[#e0e0e0]">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-wide text-[#0A66C2] mb-2">
              Learn course → Do project
            </p>
            <h2 className="text-2xl md:text-3xl font-black text-[#1d2226]">
              No empty employment — learn a skill, then ship a project.
            </h2>
            <p className="text-sm text-[#666] mt-2 leading-relaxed">
              {WIZARD_CATEGORIES.length} sectors from filmmaking to cybersecurity. Video lessons,
              progress tracking, then start your project on Make Big.
            </p>
          </div>
          <Link
            href="/learn"
            className="shrink-0 px-8 py-3.5 bg-[#0A66C2] text-white font-bold rounded-full hover:bg-[#004182] transition-all text-center text-sm"
          >
            Open Learn Dashboard →
          </Link>
        </div>
      </section>

      {/* ── Feature preview cards ── */}
      <section className="bg-white py-16 md:py-20 px-4 border-b border-[#e0e0e0]">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1d2226]">
              Everything you need to go from idea to shipped
            </h2>
            <p className="text-[#666] text-sm md:text-base mt-2">
              One platform for finding people, organizing work, and showing what you build.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group bg-[#f8f9fa] hover:bg-white border border-[#e0e0e0] hover:border-[#0A66C2]/30 rounded-2xl p-6 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <span className="text-3xl block mb-3" aria-hidden>
                  {f.icon}
                </span>
                <h3 className="font-bold text-[#1d2226] text-lg group-hover:text-[#0A66C2] transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-[#666] mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div id="discover">
        <PublicProjectFeed
          isAuthed={isSignedIn}
          onRequireAuth={onRequireAuth}
          onJoinProject={onJoinProject}
        />
      </div>

      <SalaryLeaderboard onRequireAuth={onRequireAuth} />
      <FeaturedStartupsSection />
      <VerifiedSkillsLeaderboard />
      <StartupJourneyFeed />

      <section className="bg-white border-t border-[#e0e0e0] py-14 px-4">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#1d2226]">Browse by category</h2>
              <p className="text-[#666] text-sm mt-1">
                {WIZARD_CATEGORIES.length} fields where students are shipping projects right now.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {WIZARD_CATEGORIES.map((category) => (
              <a
                key={category.id}
                href="#discover"
                className="group block bg-[#f3f2ef] hover:bg-[#EEF3FB] border border-[#e0e0e0] hover:border-[#0A66C2]/30 rounded-xl p-4 transition-all"
              >
                <p className="font-semibold text-[#1d2226] text-sm group-hover:text-[#0A66C2] transition-colors">
                  {category.title}
                </p>
                <p className="text-xs text-[#666] mt-0.5 line-clamp-1">{category.blurb}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f3f2ef] py-14 px-4">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1d2226]">How it works</h2>
            <p className="text-[#666] text-sm mt-1">From idea to launch in four simple steps</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: '1', t: 'Create Project', d: 'Define your idea, roles, and goals — publish it for the community to discover.' },
              { n: '2', t: 'Find Talent', d: 'Search by skills and college, send join requests, and build your dream team.' },
              { n: '3', t: 'Build Together', d: 'Use tasks, posts, chat, and AI tools to ship milestones as a team.' },
              { n: '4', t: 'Launch', d: 'Showcase what you built — portfolio, startup, or campus impact project.' },
            ].map((s) => (
              <div key={s.n} className="bg-white border border-[#e0e0e0] rounded-2xl p-6">
                <div className="w-9 h-9 rounded-full bg-[#0A66C2] text-white font-bold flex items-center justify-center text-sm mb-3">
                  {s.n}
                </div>
                <p className="font-semibold text-[#1d2226]">{s.t}</p>
                <p className="text-sm text-[#666] mt-1.5">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!isSignedIn && (
        <section className="bg-[#0A66C2] py-14 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Ready to build something big?</h2>
            <p className="text-white/80 text-sm md:text-base mt-2">
              Join creators on Make Big — verify your email, post your first project, and find your team this week.
            </p>
            <button
              type="button"
              onClick={onRequireAuth}
              className="mt-6 px-8 py-3.5 bg-white text-[#0A66C2] font-bold rounded-full hover:bg-[#EEF3FB] hover:shadow-lg transition-all text-sm"
            >
              Create your free account
            </button>
          </div>
        </section>
      )}

      <MarketingFooter onCheckDebug={onCheckDebug} />

      {showDebug && debugData && onCloseDebug && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onCloseDebug}
        >
          <div
            className="bg-white border border-[#d9d9d9] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-5 py-4 border-b border-[#e0e0e0] sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-[#1d2226]">Debug Info</h2>
              <button type="button" onClick={onCloseDebug} className="text-[#666] hover:text-[#1d2226]">
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm text-[#1d2226]">
              <div className="bg-[#f3f2ef] p-3 rounded-lg">
                <p className="font-semibold text-xs uppercase text-[#666] mb-1">Backend Status</p>
                <p>{debugData.backend_health}</p>
              </div>
              <div className="bg-[#f3f2ef] p-3 rounded-lg">
                <p className="font-semibold text-xs uppercase text-[#666] mb-1">Current User</p>
                <pre className="text-xs overflow-x-auto">{JSON.stringify(debugData.currentUser, null, 2) || 'empty'}</pre>
              </div>
              <div className="bg-[#f3f2ef] p-3 rounded-lg">
                <p className="font-semibold text-xs uppercase text-[#666] mb-1">localStorage: user</p>
                <pre className="text-xs overflow-x-auto">{JSON.stringify(debugData.localStorage_user, null, 2) || 'empty'}</pre>
              </div>
              <div className="bg-[#f3f2ef] p-3 rounded-lg">
                <p className="font-semibold text-xs uppercase text-[#666] mb-1">Current Project</p>
                <pre className="text-xs overflow-x-auto">{JSON.stringify(debugData.currentProject, null, 2) || 'empty'}</pre>
              </div>
              <p className="text-xs text-[#999]">Updated: {debugData.timestamp}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
