'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  apiGetCofounderMatches,
  apiSendInvite,
  MatchCandidate,
  MatchMeta,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/userErrors';
import { ProjectData, User } from '@/lib/types';

interface CofounderMatchProps {
  project: ProjectData;
  user: User | null;
  ownerContact?: string;
}

/* ── Helpers ── */
function getInitials(name: string) {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function scoreColor(score: number) {
  if (score >= 75) return { ring: 'ring-green-400',   text: 'text-green-700',   bg: 'bg-green-50',   bar: 'bg-green-500'  };
  if (score >= 50) return { ring: 'ring-blue-400',    text: 'text-blue-700',    bg: 'bg-blue-50',    bar: 'bg-blue-500'   };
  if (score >= 30) return { ring: 'ring-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50',   bar: 'bg-amber-500'  };
  return             { ring: 'ring-[#d9d9d9]',     text: 'text-[#666]',      bg: 'bg-[#f3f2ef]',  bar: 'bg-[#aaa]'     };
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Active today';
  if (d <= 7)  return `Active ${d}d ago`;
  if (d <= 30) return 'Active this month';
  return null; // don't show if stale
}

/* ── Score breakdown tooltip ── */
function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  if (value === 0) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-[#999] shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[#e0e0e0] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="w-5 text-right font-bold text-[#666]">{value}</span>
    </div>
  );
}

/* ── Single match card ── */
function MatchCard({
  match,
  projectId,
  dismissed,
  onDismiss,
  onInvited,
}: {
  match: MatchCandidate;
  projectId: string;
  dismissed: boolean;
  onDismiss: (id: string) => void;
  onInvited: (id: string) => void;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [inviting, setInviting]           = useState(false);
  const [invited, setInvited]             = useState(false);
  const [inviteError, setInviteError]     = useState('');

  const clr = scoreColor(match.score);

  if (dismissed) return null;

  const handleInvite = async () => {
    setInviting(true); setInviteError('');
    const result = await apiSendInvite(
      projectId,
      match.contact,
      match.skills[0] || 'member',
      `Hi ${match.name.split(' ')[0]}, I came across your profile on Make Big and think you'd be a great fit for my project. Would love to have a chat!`
    );
    setInviting(false);
    if (result) { setInvited(true); onInvited(match.id); }
    else setInviteError('Could not send invite — check the contact and try again');
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e0e0e0] hover:border-[#0A66C2]/30 hover:shadow-sm transition-all overflow-hidden">

      {/* Top: score bar */}
      <div className={`h-1 ${clr.bar}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3">

          {/* Avatar */}
          <div className={`w-12 h-12 rounded-full ring-2 ${clr.ring} flex items-center justify-center text-white text-sm font-black shrink-0`}
            style={{ background: 'linear-gradient(135deg,#0A66C2,#7c3aed)' }}>
            {getInitials(match.name)}
          </div>

          {/* Name block */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-[#1d2226] text-sm truncate">
                {match.name.split(' ')[0]} {match.name.split(' ').length > 1 ? match.name.split(' ').slice(-1)[0][0] + '.' : ''}
              </p>
              {match.graduationYear && (
                <span className="text-[10px] text-[#999] bg-[#f3f2ef] px-2 py-0.5 rounded-full border border-[#e0e0e0]">
                  Class of {match.graduationYear}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {match.city && (
                <span className="text-xs text-[#666]">📍 {match.city}</span>
              )}
              {match.college && (
                <span className="text-xs text-[#999] truncate max-w-[160px]">🎓 {match.college}</span>
              )}
            </div>
            {timeAgo(match.lastActive) && (
              <span className="text-[10px] text-green-600 font-medium">{timeAgo(match.lastActive)}</span>
            )}
          </div>

          {/* Score badge */}
          <button
            onClick={() => setShowBreakdown(s => !s)}
            className={`shrink-0 text-right cursor-pointer group`}
          >
            <div className={`text-lg font-black ${clr.text}`}>{match.score}<span className="text-xs font-bold">%</span></div>
            <div className="text-[9px] text-[#999] group-hover:text-[#0A66C2] transition-colors">
              {showBreakdown ? 'hide ▲' : 'why? ▾'}
            </div>
          </button>
        </div>

        {/* Score breakdown */}
        {showBreakdown && (
          <div className={`mt-3 p-3 rounded-xl ${clr.bg} border border-[#e0e0e0] space-y-1.5`}>
            <p className="text-[10px] font-bold text-[#666] uppercase tracking-wide mb-2">Match score breakdown</p>
            <ScoreBar label="Skills"    value={match.scoreBreakdown.skill}    max={50} color={clr.bar} />
            <ScoreBar label="Breadth"   value={match.scoreBreakdown.breadth}  max={10} color="bg-blue-400" />
            <ScoreBar label="Category"  value={match.scoreBreakdown.category} max={20} color="bg-purple-500" />
            <ScoreBar label="Activity"  value={match.scoreBreakdown.activity} max={10} color="bg-green-500" />
            <ScoreBar label="Location"  value={match.scoreBreakdown.location} max={10} color="bg-orange-400" />
            {match.scoreBreakdown.collab > 0 && (
              <ScoreBar label="Past collab" value={match.scoreBreakdown.collab} max={8} color="bg-pink-500" />
            )}
          </div>
        )}

        {/* Why we matched */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {match.reasons.map((r, i) => (
            <span key={i} className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${clr.bg} ${clr.text} border-current/20`}>
              {r}
            </span>
          ))}
        </div>

        {/* Skills — filled (green) vs gap remaining (blue) */}
        <div className="mt-3 space-y-1.5">
          {match.filledSkills.length > 0 && (
            <div>
              <p className="text-[9px] font-bold text-green-700 uppercase tracking-wide mb-1">✓ Fills your skill gap</p>
              <div className="flex flex-wrap gap-1">
                {match.filledSkills.slice(0, 6).map(s => (
                  <span key={s} className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full font-semibold">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {match.skills.filter(s => !match.filledSkills.includes(s)).length > 0 && (
            <div>
              <p className="text-[9px] font-bold text-[#999] uppercase tracking-wide mb-1">Other skills</p>
              <div className="flex flex-wrap gap-1">
                {match.skills.filter(s => !match.filledSkills.includes(s)).slice(0, 4).map(s => (
                  <span key={s} className="text-[10px] px-2 py-0.5 bg-[#f3f2ef] text-[#666] border border-[#e0e0e0] rounded-full">
                    {s}
                  </span>
                ))}
                {match.skills.length > match.filledSkills.length + 4 && (
                  <span className="text-[10px] px-2 py-0.5 bg-[#f3f2ef] text-[#999] rounded-full">
                    +{match.skills.length - match.filledSkills.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action row */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-[#f0f0f0]">
          {invited ? (
            <div className="flex-1 py-2 text-center text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full">
              ✓ Invite sent
            </div>
          ) : (
            <button
              onClick={handleInvite}
              disabled={inviting}
              className="flex-1 py-2 bg-[#0A66C2] text-white rounded-full text-sm font-bold hover:bg-[#004182] disabled:opacity-50 transition-all"
            >
              {inviting ? 'Sending…' : '✉️ Invite to project'}
            </button>
          )}
          <button
            onClick={() => onDismiss(match.id)}
            className="px-3 py-2 border border-[#d9d9d9] text-[#999] rounded-full text-xs hover:border-red-300 hover:text-red-500 transition-all"
            title="Not interested"
          >
            ✕
          </button>
        </div>
        {inviteError && <p className="text-xs text-red-600 mt-1">{inviteError}</p>}
      </div>
    </div>
  );
}

/* ── Skill gap banner ── */
function SkillGapBanner({ gap, ownerSkills }: { gap: string[]; ownerSkills: string[] }) {
  if (gap.length === 0) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <div className="flex items-start gap-2">
        <span className="text-lg shrink-0">⚠️</span>
        <div>
          <p className="text-sm font-bold text-amber-800">Skill gaps in your project</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Your project needs these skills that you don&apos;t have on the team yet:
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {gap.map(s => (
              <span key={s} className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Filter bar ── */
type FilterKey = 'all' | 'high' | 'local' | 'active';

const FILTERS: { id: FilterKey; label: string; icon: string }[] = [
  { id: 'all',    label: 'All matches',    icon: '✨' },
  { id: 'high',   label: 'Best fit (75%+)', icon: '🎯' },
  { id: 'local',  label: 'Same city',      icon: '📍' },
  { id: 'active', label: 'Active recently', icon: '🟢' },
];

/* ── Main export ── */
export function CofounderMatch({ project, user, ownerContact }: CofounderMatchProps) {
  const [matches, setMatches]     = useState<MatchCandidate[]>([]);
  const [meta, setMeta]           = useState<MatchMeta | null>(null);
  const [planLimited, setPlanLimited] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<FilterKey>('all');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [invited, setInvited]     = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!project.id) return;
    setLoading(true);
    const result = await apiGetCofounderMatches(project.id, 30, ownerContact);
    if (result) {
      setMatches(result.matches);
      setMeta(result.meta);
      setPlanLimited(Boolean(result.planLimited));
    }
    setLoading(false);
  }, [project.id, ownerContact]);

  useEffect(() => { load(); }, [load]);

  const handleDismiss = (id: string) => setDismissed(prev => new Set([...prev, id]));
  const handleInvited = (id: string) => setInvited(prev => new Set([...prev, id]));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const filtered = matches.filter(m => {
    if (dismissed.has(m.id)) return false;
    if (filter === 'high')   return m.score >= 75;
    if (filter === 'local')  return m.city && project.city && m.city.toLowerCase() === project.city.toLowerCase();
    if (filter === 'active') return m.lastActive && new Date(m.lastActive) >= sevenDaysAgo;
    return true;
  });

  const visibleCount    = filtered.length;
  const invitedCount    = [...invited].filter(id => !dismissed.has(id)).length;

  if (!project.id) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-4xl mb-3">🤝</p>
        <p className="font-semibold text-[#1d2226]">Publish your project first</p>
        <p className="text-sm text-[#666] mt-1">Matches are generated once your project is live.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1d2226]">Co-founder Matches</h2>
          <p className="text-sm text-[#666] mt-0.5">
            People you might work well with — ranked by skill fit, category experience, and location
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="shrink-0 px-3 py-1.5 border border-[#d9d9d9] text-[#666] rounded-full text-xs font-semibold hover:border-[#0A66C2] hover:text-[#0A66C2] transition-all disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* ── Skill gap banner ── */}
      {meta && <SkillGapBanner gap={meta.skillGap} ownerSkills={meta.ownerSkills} />}

      {planLimited && meta && meta.total > matches.length && (
        <div className="rounded-xl border border-[#0A66C2]/30 bg-[#EEF3FB] px-4 py-3 text-sm text-[#1d2226] flex flex-wrap items-center justify-between gap-2">
          <span>Showing top {matches.length} of {meta.total} matches on Free. Upgrade for full priority matching.</span>
          <a href="/pricing" className="font-semibold text-[#0A66C2] hover:underline shrink-0">
            Upgrade to Pro →
          </a>
        </div>
      )}

      {/* ── Stats row ── */}
      {!loading && matches.length > 0 && (
        <div className="flex gap-4 text-sm">
          <div className="bg-white border border-[#e0e0e0] rounded-xl px-4 py-2.5 text-center min-w-[70px]">
            <p className="text-xl font-black text-[#0A66C2]">{meta?.total ?? matches.length}</p>
            <p className="text-[10px] text-[#999] uppercase tracking-wide">Matches</p>
          </div>
          <div className="bg-white border border-[#e0e0e0] rounded-xl px-4 py-2.5 text-center min-w-[70px]">
            <p className="text-xl font-black text-green-700">{matches.filter(m => m.score >= 75).length}</p>
            <p className="text-[10px] text-[#999] uppercase tracking-wide">Great fit</p>
          </div>
          <div className="bg-white border border-[#e0e0e0] rounded-xl px-4 py-2.5 text-center min-w-[70px]">
            <p className="text-xl font-black text-purple-700">{invitedCount}</p>
            <p className="text-[10px] text-[#999] uppercase tracking-wide">Invited</p>
          </div>
          {meta?.skillGap && meta.skillGap.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-center min-w-[70px]">
              <p className="text-xl font-black text-amber-700">{meta.skillGap.length}</p>
              <p className="text-[10px] text-[#999] uppercase tracking-wide">Skill gaps</p>
            </div>
          )}
        </div>
      )}

      {/* ── Filter chips ── */}
      {!loading && matches.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                filter === f.id
                  ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                  : 'bg-white text-[#666] border-[#d9d9d9] hover:border-[#0A66C2]/50'
              }`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Cards grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-[#e0e0e0] p-5 animate-pulse">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-full bg-[#f0f0f0] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[#e8e8e8] rounded" />
                  <div className="h-3 w-24 bg-[#f0f0f0] rounded" />
                </div>
                <div className="w-10 h-10 bg-[#f0f0f0] rounded-full" />
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                {[1,2,3].map(j => <div key={j} className="h-6 w-16 bg-[#f3f3f3] rounded-full" />)}
              </div>
            </div>
          ))}
        </div>
      ) : visibleCount === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#d9d9d9] p-12 flex flex-col items-center text-center">
          <p className="text-4xl mb-3">
            {filter !== 'all' ? '🔍' : matches.length === 0 ? '👥' : '✓'}
          </p>
          <p className="font-bold text-[#1d2226]">
            {filter !== 'all'
              ? `No "${FILTERS.find(f => f.id === filter)?.label}" matches`
              : matches.length === 0
              ? 'No matches yet'
              : 'All caught up!'}
          </p>
          <p className="text-sm text-[#666] mt-1 max-w-xs">
            {filter !== 'all'
              ? 'Try a different filter to see more candidates.'
              : matches.length === 0
              ? 'As more people join Make Big and add skills, your matches will appear here.'
              : "You've reviewed everyone. Check back as new users register."}
          </p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-4 px-5 py-2 border border-[#0A66C2] text-[#0A66C2] font-semibold rounded-full hover:bg-[#EEF3FB] text-sm transition-colors"
            >
              Show all matches
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              projectId={project.id!}
              dismissed={dismissed.has(match.id)}
              onDismiss={handleDismiss}
              onInvited={handleInvited}
            />
          ))}
        </div>
      )}

      {/* ── How scores work ── */}
      {!loading && matches.length > 0 && (
        <details className="group bg-[#f3f2ef] border border-[#e0e0e0] rounded-2xl">
          <summary className="cursor-pointer px-5 py-3 text-xs font-semibold text-[#666] list-none flex items-center justify-between hover:text-[#0A66C2] transition-colors">
            <span>ℹ️ How match scores are calculated</span>
            <span className="group-open:rotate-180 transition-transform text-[#999]">▾</span>
          </summary>
          <div className="px-5 pb-4 text-xs text-[#666] leading-relaxed space-y-1.5">
            <p><strong className="text-[#1d2226]">Skill complementarity (50 pts):</strong> How many of your project&apos;s skill gaps this person fills.</p>
            <p><strong className="text-[#1d2226]">Skill breadth (10 pts):</strong> How many total skills they have listed — a signal for versatility.</p>
            <p><strong className="text-[#1d2226]">Category experience (20 pts):</strong> Have they worked on projects in the same or adjacent field before?</p>
            <p><strong className="text-[#1d2226]">Recent activity (10 pts):</strong> Were they active in the last 7–30 days?</p>
            <p><strong className="text-[#1d2226]">Location (10 pts):</strong> Same city as your project → easier to meet in person.</p>
            <p className="mt-2 text-[#0A66C2] font-medium">Click the score badge on any card to see the breakdown for that specific person.</p>
          </div>
        </details>
      )}
    </div>
  );
}
