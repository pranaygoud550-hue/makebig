'use client';

import Link from 'next/link';
import { BrowseProject } from '@/lib/api';
import { inferProjectPurpose, showsSalaryForPurpose } from '@/lib/projectPurpose';
import { isProjectOwner } from '@/lib/projectOwnership';
import { getViewerProjectRelation, type ViewerProjectRelation } from '@/lib/projectMembership';

const CAT_ICONS: Record<string, string> = {
  tech: '💻',
  design: '🎨',
  marketing: '📢',
  content: '✍️',
  finance: '💰',
  education: '📚',
  health: '🏥',
  social: '🤝',
  other: '🚀',
};

export interface ProjectCardData {
  id: string;
  name: string;
  desc?: string;
  categoryId?: string;
  roles?: string[];
  city?: string;
  state?: string;
  slug?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  ownerContact?: string;
  createdAt?: string;
  projectPurpose?: string;
  tags?: string[];
  viewerRelation?: ViewerProjectRelation;
}

function formatSalary(max?: number, currency = 'INR') {
  if (!max || max <= 0) return null;
  const sym: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
  const s = sym[currency] || currency;
  if (max >= 100000) return `${s}${(max / 100000).toFixed(1)}L/mo`;
  if (max >= 1000) return `${s}${Math.round(max / 1000)}K/mo`;
  return `${s}${max}/mo`;
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

interface ProjectExploreCardProps {
  project: ProjectCardData;
  userContact?: string;
  showJoin?: boolean;
  onJoinProject?: (project: BrowseProject) => void;
  onOpenDashboard?: () => void;
}

export function ProjectExploreCard({
  project: p,
  userContact,
  showJoin = true,
  onJoinProject,
  onOpenDashboard,
}: ProjectExploreCardProps) {
  const relation =
    p.viewerRelation ||
    getViewerProjectRelation(userContact, {
      ownerContact: p.ownerContact,
    });
  const owner = relation === 'owner' || isProjectOwner(userContact, p.ownerContact);
  const pending = relation === 'pending';
  const salaryLabel = showsSalaryForPurpose(
    inferProjectPurpose(p.projectPurpose, p.salaryMax, p.salaryMin)
  )
    ? formatSalary(p.salaryMax, p.currency)
    : null;

  const browsePayload = {
    id: p.id,
    name: p.name,
    desc: p.desc || '',
    categoryId: p.categoryId || 'other',
    roles: p.roles || [],
    city: p.city || '',
    state: p.state || '',
    slug: p.slug || '',
    ownerContact: p.ownerContact,
    salaryMin: p.salaryMin,
    salaryMax: p.salaryMax,
    currency: p.currency,
  } as BrowseProject;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e0e0e0] dark:border-gray-700 hover:border-[#0A66C2]/40 hover:shadow-sm p-5 transition-all flex flex-col h-full min-h-[220px] hover:scale-[1.01] active:scale-[0.99]">
      <Link href={p.slug ? `/p/${p.slug}` : '/explore'} className="block flex-1">
        <div className="flex justify-between items-start gap-2 mb-2 min-h-[28px]">
          <span className="text-lg shrink-0">{CAT_ICONS[p.categoryId || ''] || '🚀'}</span>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 max-w-[55%] text-right leading-tight ${
              salaryLabel
                ? 'text-green-800 bg-green-50 border border-green-200'
                : 'text-[#666] bg-[#f3f2ef] border border-[#e0e0e0]'
            }`}
          >
            {salaryLabel || 'Compensation Not Specified'}
          </span>
        </div>
        <h2 className="font-bold text-[#1d2226] line-clamp-2">{p.name}</h2>
        <p className="text-sm text-[#666] mt-1 line-clamp-2 min-h-[2.5rem]">
          {p.desc || 'No description yet.'}
        </p>
        {p.tags && p.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {p.tags.slice(0, 4).map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#f3f2ef] text-[#666] border border-[#e8e8e8]">
                {t}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-[#999] mt-2">
          {p.city && `📍 ${p.city} · `}
          {timeAgo(p.createdAt)}
        </p>
      </Link>

      {showJoin && (
        <div className="mt-4 pt-3 border-t border-[#f0f0f0]">
          {owner ? (
            <div className="space-y-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#EEF3FB] text-[#0A66C2] text-xs font-bold border border-[#0A66C2]/20">
                Your Project
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                {onOpenDashboard && (
                  <>
                    <button
                      type="button"
                      onClick={onOpenDashboard}
                      className="flex-1 py-2.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182]"
                    >
                      Manage team
                    </button>
                    <button
                      type="button"
                      onClick={onOpenDashboard}
                      className="flex-1 py-2.5 rounded-full border border-[#0A66C2] text-[#0A66C2] text-sm font-semibold hover:bg-[#EEF3FB]"
                    >
                      Edit project
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : pending ? (
            <span className="inline-flex w-full items-center justify-center py-2.5 rounded-full bg-amber-50 text-amber-800 text-sm font-semibold border border-amber-200">
              Request sent
            </span>
          ) : onJoinProject ? (
            <button
              type="button"
              onClick={() => onJoinProject(browsePayload)}
              className="w-full py-2.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182]"
            >
              Request to join
            </button>
          ) : p.slug ? (
            <Link
              href={`/?join=${encodeURIComponent(p.slug)}`}
              className="flex w-full items-center justify-center py-2.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182]"
            >
              Request to join
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
