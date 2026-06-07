import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getApiOrigin } from '@/lib/apiBase';
import { SITE_URL } from '@/lib/site';

async function getProgress(slug: string) {
  try {
    const res = await fetch(`${getApiOrigin()}/api/startup/${encodeURIComponent(slug)}/progress`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const data = await getProgress(params.slug);
  if (!data) return { title: 'Progress | Make Big' };
  const title = `${data.startup.name} — Progress`;
  const description =
    data.startup.desc ||
    `See what ${data.startup.name} shipped this week on Make Big.`;
  return {
    title: `${title} | Make Big`,
    description,
    alternates: { canonical: `${SITE_URL}/startup/${params.slug}/progress` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/startup/${params.slug}/progress`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

const STAGE_LABELS: Record<string, string> = {
  idea: 'Idea',
  research: 'Research',
  prototype: 'Prototype',
  mvp: 'MVP',
  beta: 'Beta',
  launch: 'Launch',
  revenue: 'Revenue',
  scaling: 'Scaling',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function StartupProgressPage({ params }: { params: { slug: string } }) {
  const data = await getProgress(params.slug);
  if (!data) notFound();

  const { startup, team, journey, health, shippedThisWeek, commits, timeline } = data;
  const stage = journey?.currentStage || 'idea';
  const completion = journey?.completionPercent ?? 0;
  const healthScore = health?.score ?? 0;

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#d9d9d9] shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-black text-[#0A66C2] tracking-tight">
            Make Big
          </Link>
          <Link href="/explore" className="text-sm font-medium text-[#0A66C2]">
            Explore →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <section className="bg-white rounded-2xl border border-[#e0e0e0] p-6 md:p-8">
          <div className="flex items-start gap-4">
            {startup.logoUrl ? (
              <img
                src={startup.logoUrl}
                alt=""
                className="w-16 h-16 rounded-xl object-cover border border-[#e0e0e0]"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-[#EEF3FB] flex items-center justify-center text-2xl">
                🚀
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-[#1d2226]">{startup.name}</h1>
              <p className="text-[#666] text-sm mt-2 leading-relaxed">{startup.desc}</p>
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
            <h2 className="font-bold text-[#1d2226] mb-3">Journey</h2>
            <p className="text-sm text-[#666]">
              Stage: <span className="font-semibold text-[#0A66C2]">{STAGE_LABELS[stage] || stage}</span>
            </p>
            <div className="mt-3 h-2 bg-[#e5e7eb] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0A66C2] rounded-full transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
            <p className="text-xs text-[#999] mt-1">{completion}% complete</p>
            {timeline?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {timeline.map((s: { stage: string; label?: string }) => (
                  <span
                    key={s.stage}
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      s.stage === stage
                        ? 'bg-[#0A66C2] text-white'
                        : 'bg-[#f3f2ef] text-[#666]'
                    }`}
                  >
                    {s.label || STAGE_LABELS[s.stage] || s.stage}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
            <h2 className="font-bold text-[#1d2226] mb-3">Health score</h2>
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-black border-4"
                style={{
                  borderColor: healthScore >= 70 ? '#22c55e' : healthScore >= 40 ? '#f59e0b' : '#ef4444',
                  color: healthScore >= 70 ? '#16a34a' : healthScore >= 40 ? '#d97706' : '#dc2626',
                }}
              >
                {healthScore}
              </div>
              <p className="text-sm text-[#666]">
                {healthScore >= 70
                  ? 'Strong momentum — team is active and shipping.'
                  : healthScore >= 40
                    ? 'Making progress — keep the weekly rhythm going.'
                    : 'Early stage — join the team and help push forward.'}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
          <h2 className="font-bold text-[#1d2226] mb-4">Team</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {team.map((m: { contact: string; name: string; role: string; skills: string[] }) => (
              <div key={m.contact} className="border border-[#f0f0f0] rounded-xl p-3">
                <p className="font-semibold text-sm text-[#1d2226]">{m.name}</p>
                <p className="text-xs text-[#0A66C2]">{m.role}</p>
                {m.skills?.length > 0 && (
                  <p className="text-[10px] text-[#666] mt-1">{m.skills.slice(0, 4).join(' · ')}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
          <h2 className="font-bold text-[#1d2226] mb-3">What we shipped this week</h2>
          {shippedThisWeek?.length ? (
            <div className="space-y-3">
              {shippedThisWeek.map((s: { date: string; summary: string }) => (
                <div key={s.date} className="text-sm text-[#666] border-l-2 border-[#0A66C2] pl-3 whitespace-pre-wrap">
                  {s.summary}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#999]">Standup summaries will appear here as the team posts daily updates.</p>
          )}
        </section>

        {commits?.length > 0 && (
          <section className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
            <h2 className="font-bold text-[#1d2226] mb-3">Recent GitHub commits</h2>
            <ul className="space-y-2">
              {commits.map((c: { sha: string; message: string; author: string; date: string; url: string }) => (
                <li key={c.sha} className="text-sm border border-[#f0f0f0] rounded-lg p-3">
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-medium text-[#1d2226] hover:text-[#0A66C2]">
                    {c.message}
                  </a>
                  <p className="text-xs text-[#999] mt-1">
                    {c.author} · {c.date ? timeAgo(c.date) : ''}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="text-center pb-8">
          <Link
            href={`/p/${startup.slug}`}
            className="inline-flex px-8 py-3 bg-[#0A66C2] text-white font-bold rounded-full hover:bg-[#004182] transition-all"
          >
            Join this project
          </Link>
        </div>
      </main>
    </div>
  );
}
