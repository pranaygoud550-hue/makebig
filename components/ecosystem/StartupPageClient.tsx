'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProjectTimeline } from '@/components/ecosystem/ProjectTimeline';
import { ProjectHealthMeter } from '@/components/ecosystem/ProjectHealthMeter';
import { ActivityHeatmap } from '@/components/ecosystem/ActivityHeatmap';
import { StartupReadinessDashboard } from '@/components/startupReadiness/StartupReadinessDashboard';
import { StartupFollowButton } from '@/components/ecosystem/StartupFollowButton';
import type { JourneyStageId } from '@/lib/ecosystem/journey';
import type { HealthScore } from '@/lib/ecosystem/health';
import type { StartupReadinessScores } from '@/lib/startupReadiness/types';

interface StartupPageClientProps {
  slug: string;
}

export function StartupPageClient({ slug }: StartupPageClientProps) {
  const [data, setData] = useState<{
    startup: {
      id: string;
      name: string;
      desc: string;
      slug: string;
      categoryId: string;
      logoUrl?: string;
      gallery?: string[];
      roles: string[];
      city?: string;
      owner?: { name?: string; contact?: string };
      journey?: {
        currentStage: JourneyStageId;
        completionPercent: number;
        nextMilestone?: string;
        lastUpdated?: string;
      };
      startupReadiness?: StartupReadinessScores;
      health?: HealthScore;
      featured?: { badgeIcon?: string; badge?: string };
      stats?: {
        members: number;
        tasksCompleted: number;
        projectAgeDays: number;
        updatesPosted: number;
        followerCount: number;
      };
    };
    team: Array<{ name?: string; role: string; verifiedSkills?: unknown[] }>;
    posts: Array<{ body: string; createdAt: string }>;
    feed: Array<{ description: string; createdAt: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/startup/${slug}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse h-96 bg-white rounded-2xl" />;
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-[#666]">Startup not found</p>
        <Link href="/explore" className="text-[#0A66C2] font-semibold text-sm mt-2 inline-block">
          Browse projects →
        </Link>
      </div>
    );
  }

  const { startup, team, posts, feed } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Overview */}
          <div className="bg-white rounded-2xl border border-[#e0e0e0] overflow-hidden">
            <div className="h-2 bg-[#0A66C2]" />
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-[#0A66C2] text-white flex items-center justify-center text-2xl font-black shrink-0 overflow-hidden">
                  {startup.logoUrl ? (
                    <img src={startup.logoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    startup.name.charAt(0)
                  )}
                </div>
                <div>
                  {startup.featured?.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      {startup.featured.badgeIcon} Featured
                    </span>
                  )}
                  <h1 className="text-2xl sm:text-3xl font-black text-[#1d2226]">{startup.name}</h1>
                  <p className="text-sm text-[#666]">
                    by {startup.owner?.name || 'Founder'} · {startup.categoryId}
                    {startup.city ? ` · ${startup.city}` : ''}
                  </p>
                </div>
              </div>
              {startup.desc && (
                <p className="text-[#1d2226] leading-relaxed">{startup.desc}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-[#f0f0f0] text-sm">
                <div><span className="text-[#999]">Members </span><strong>{startup.stats?.members}</strong></div>
                <div><span className="text-[#999]">Tasks done </span><strong>{startup.stats?.tasksCompleted}</strong></div>
                <div><span className="text-[#999]">Age </span><strong>{startup.stats?.projectAgeDays}d</strong></div>
                <div><span className="text-[#999]">Followers </span><strong>{startup.stats?.followerCount}</strong></div>
              </div>
            </div>
          </div>

          {/* Roadmap / Timeline */}
          {startup.journey && (
            <ProjectTimeline
              currentStage={startup.journey.currentStage}
              completionPercent={startup.journey.completionPercent}
              nextMilestone={startup.journey.nextMilestone}
              lastUpdated={startup.journey.lastUpdated}
            />
          )}

          {/* Updates */}
          {posts.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#1d2226]">Updates</h2>
              {posts.map((p, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#e0e0e0] p-4">
                  <p className="text-sm text-[#1d2226] whitespace-pre-line">{p.body}</p>
                  <p className="text-xs text-[#999] mt-2">{new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </section>
          )}

          {/* Journey feed */}
          {feed.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#1d2226]">Milestones</h2>
              <ul className="space-y-2">
                {feed.map((f, i) => (
                  <li key={i} className="text-sm bg-[#fafcff] border border-[#e8f4fc] rounded-xl px-4 py-2">
                    {f.description}
                    <span className="text-xs text-[#999] ml-2">{new Date(f.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Gallery */}
          {(startup.gallery?.length || 0) > 0 && (
            <section>
              <h2 className="text-lg font-bold text-[#1d2226] mb-3">Gallery</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {startup.gallery!.map((url) => (
                  <img key={url} src={url} alt="" className="rounded-xl w-full h-28 object-cover border border-[#e0e0e0]" />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#e0e0e0] p-5 sticky top-20 space-y-3">
            <StartupFollowButton projectId={startup.id} />
            <Link
              href={`/?join=${startup.slug}`}
              className="block w-full py-2.5 bg-[#0A66C2] text-white text-center font-bold rounded-full text-sm hover:bg-[#004182]"
            >
              Join this startup →
            </Link>
          </div>

          {startup.startupReadiness && (
            <StartupReadinessDashboard scores={startup.startupReadiness} compact />
          )}

          {startup.health && (
            <>
              <ProjectHealthMeter health={startup.health} compact />
              {startup.health.heatmap?.length > 0 && (
                <ActivityHeatmap heatmap={startup.health.heatmap} />
              )}
            </>
          )}

          {/* Team */}
          <section className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
            <h2 className="text-xs font-bold text-[#666] uppercase mb-3">Team</h2>
            <ul className="space-y-2">
              {team.map((m) => (
                <li key={m.role + (m.name || '')} className="text-sm">
                  <span className="font-semibold">{m.name || 'Member'}</span>
                  <span className="text-[#999] ml-1 capitalize">· {m.role}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Open roles */}
          {startup.roles.length > 0 && (
            <section className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
              <h2 className="text-xs font-bold text-[#666] uppercase mb-3">Open roles</h2>
              <div className="flex flex-wrap gap-2">
                {startup.roles.map((r) => (
                  <span key={r} className="text-xs px-2.5 py-1 bg-[#EEF3FB] text-[#0A66C2] rounded-full font-semibold">
                    {r}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
