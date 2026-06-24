'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { PublicProjectFeed } from '@/components/PublicProjectFeed';
import { SalaryLeaderboard } from '@/components/SalaryLeaderboard';
import { VerifiedSkillsLeaderboard } from '@/components/skillVerification/VerifiedSkillsLeaderboard';
import { FeaturedStartupsSection } from '@/components/ecosystem/FeaturedStartupsSection';
import { StartupJourneyFeed } from '@/components/ecosystem/StartupJourneyFeed';
import { ShowcaseFeed } from '@/components/ShowcaseFeed';
import { WeeklyTeamsLeaderboard } from '@/components/ecosystem/WeeklyTeamsLeaderboard';
import { MarketingFooter } from '@/components/MarketingFooter';
import { HeroSection } from '@/components/landing/HeroSection';
import { WIZARD_CATEGORIES } from '@/lib/constants';
import { BrowseProject } from '@/lib/api';

const HowItWorks = dynamic(
  () => import('@/components/landing/HowItWorks').then((m) => m.HowItWorks),
  { loading: () => <SectionPlaceholder /> }
);
const FeatureBento = dynamic(
  () => import('@/components/landing/FeatureBento').then((m) => m.FeatureBento),
  { loading: () => <SectionPlaceholder /> }
);
const TestimonialMarquee = dynamic(
  () => import('@/components/landing/TestimonialMarquee').then((m) => m.TestimonialMarquee),
  { loading: () => <SectionPlaceholder /> }
);
const FinalCTA = dynamic(
  () => import('@/components/landing/FinalCTA').then((m) => m.FinalCTA),
  { loading: () => <SectionPlaceholder /> }
);

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
  userContact?: string;
  onStartProject: () => void;
  onRequireAuth: () => void;
  onJoinProject: (project: BrowseProject) => void;
  onExploreClick?: () => void;
  onCheckDebug?: () => void;
  showDebug?: boolean;
  debugData?: DebugSnapshot | null;
  onCloseDebug?: () => void;
}

function SectionPlaceholder() {
  return <div className="h-32 bg-[#0A0A0F]" aria-hidden />;
}

export function MarketingHomepage({
  isSignedIn = false,
  userContact,
  onStartProject,
  onRequireAuth,
  onJoinProject,
  onCheckDebug,
  showDebug,
  debugData,
  onCloseDebug,
}: MarketingHomepageProps) {
  const handleStartFree = () => {
    onRequireAuth();
  };

  return (
    <div className="bg-[#0A0A0F]">
      <HeroSection onStartFree={handleStartFree} />

      <Suspense fallback={<SectionPlaceholder />}>
        <HowItWorks />
      </Suspense>

      <Suspense fallback={<SectionPlaceholder />}>
        <FeatureBento />
      </Suspense>

      <Suspense fallback={<SectionPlaceholder />}>
        <TestimonialMarquee />
      </Suspense>

      {!isSignedIn && (
        <Suspense fallback={<SectionPlaceholder />}>
          <FinalCTA onCreateAccount={onRequireAuth} />
        </Suspense>
      )}

      {/* ── Live activity & discovery (below the fold) ── */}
      <div id="discover" className="bg-[#f3f2ef]">
        <ShowcaseFeed />
        <PublicProjectFeed
          isAuthed={isSignedIn}
          userContact={userContact}
          onRequireAuth={onRequireAuth}
          onJoinProject={onJoinProject}
        />
        <SalaryLeaderboard onRequireAuth={onRequireAuth} />
        <FeaturedStartupsSection />
        <VerifiedSkillsLeaderboard />
        <StartupJourneyFeed />
        <WeeklyTeamsLeaderboard />

        <section className="bg-[#EEF3FB] border-t border-[#0A66C2]/15 py-10 px-4">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#1d2226]">Need a mentor?</h2>
              <p className="text-sm text-[#666] mt-1">
                Professors and alumni offering 30-minute sessions for student teams.
              </p>
            </div>
            <a
              href="/mentors"
              className="shrink-0 px-5 py-2.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182]"
            >
              Browse mentors →
            </a>
          </div>
        </section>

        <section className="bg-white border-t border-[#e0e0e0] py-14 px-4">
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1d2226]">Browse by category</h2>
            <p className="text-[#666] text-sm mt-1 mb-6">
              {WIZARD_CATEGORIES.length} fields where students are shipping projects right now.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {WIZARD_CATEGORIES.map((category) => (
                <a
                  key={category.id}
                  href="#discover"
                  onClick={() => {
                    sessionStorage.setItem('makeBigExploreCategory', category.id);
                  }}
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
      </div>

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
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(debugData.currentUser, null, 2) || 'empty'}
                </pre>
              </div>
              <div className="bg-[#f3f2ef] p-3 rounded-lg">
                <p className="font-semibold text-xs uppercase text-[#666] mb-1">localStorage: user</p>
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(debugData.localStorage_user, null, 2) || 'empty'}
                </pre>
              </div>
              <div className="bg-[#f3f2ef] p-3 rounded-lg">
                <p className="font-semibold text-xs uppercase text-[#666] mb-1">Current Project</p>
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(debugData.currentProject, null, 2) || 'empty'}
                </pre>
              </div>
              <p className="text-xs text-[#999]">Updated: {debugData.timestamp}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
