'use client';

import { useEffect, useState } from 'react';
import { formatSalaryBand, getInitials } from '@/lib/utils';
import { getErrorMessage } from '@/lib/userErrors';

export interface SearchProjectHit {
  id: string;
  name: string;
  desc?: string;
  categoryId?: string;
  roles?: string[];
  city?: string;
  state?: string;
  slug?: string;
  ownerContact?: string;
  joinedCount?: number;
}

interface TeamMemberDetail {
  contact: string;
  role: string;
  name?: string;
  skills?: string[];
  hobbies?: string[];
  college?: string;
  graduationYear?: string;
}

interface ProjectDetailPayload {
  project: {
    id: string;
    name: string;
    desc: string;
    categoryId: string;
    projectPurpose?: string;
    roles: string[];
    city: string;
    state: string;
    slug: string;
    status: string;
    salaryMin?: number;
    salaryMax?: number;
    currency?: string;
    ownerContact: string;
    teamSize: number;
  };
  team: TeamMemberDetail[];
  openRoles: string[];
}

interface ProjectDetailSheetProps {
  projectId: string | null;
  userContact?: string;
  onClose: () => void;
  onJoin?: (hit: SearchProjectHit) => void;
}

export function ProjectDetailSheet({
  projectId,
  userContact,
  onClose,
  onJoin,
}: ProjectDetailSheetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectDetailPayload | null>(null);

  useEffect(() => {
    if (!projectId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/public/projects/${projectId}/detail`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) {
          setError(getErrorMessage(data.error, 'load'));
          setDetail(null);
          return;
        }
        setDetail(data.data as ProjectDetailPayload);
      })
      .catch((e) => {
        if (!cancelled) setError(getErrorMessage(e, 'load'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (!projectId) return null;

  const p = detail?.project;
  const isOwner =
    userContact &&
    p?.ownerContact &&
    userContact.trim().toLowerCase() === p.ownerContact.trim().toLowerCase();

  const hit: SearchProjectHit | null = p
    ? {
        id: p.id,
        name: p.name,
        desc: p.desc,
        categoryId: p.categoryId,
        roles: p.roles,
        city: p.city,
        state: p.state,
        slug: p.slug,
        ownerContact: p.ownerContact,
        joinedCount: p.teamSize,
      }
    : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e0e0e0] px-4 py-3 flex items-center justify-between z-10">
          <h2 className="font-bold text-[#1d2226]">Project details</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#f3f2ef] text-[#666] font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-5 pb-24">
          {loading && (
            <p className="text-sm text-[#666] text-center py-12">Loading…</p>
          )}
          {error && (
            <p className="text-sm text-red-600 text-center py-12">{error}</p>
          )}
          {p && (
            <>
              <div>
                <h3 className="text-xl font-bold text-[#1d2226]">{p.name}</h3>
                <p className="text-xs text-[#666] mt-1 capitalize">
                  {p.categoryId?.replace(/-/g, ' ')} · {p.projectPurpose || 'college'} · {p.status}
                </p>
                {(p.city || p.state) && (
                  <p className="text-sm text-[#666] mt-1">
                    📍 {[p.city, p.state].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>

              {p.desc && (
                <section>
                  <h4 className="text-xs font-bold text-[#666] uppercase tracking-wide mb-1">
                    About
                  </h4>
                  <p className="text-sm text-[#1d2226] leading-relaxed">{p.desc}</p>
                </section>
              )}

              {(detail?.openRoles?.length || 0) > 0 && (
                <section>
                  <h4 className="text-xs font-bold text-[#666] uppercase tracking-wide mb-2">
                    Roles needed
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {detail!.openRoles.map((role) => (
                      <span
                        key={role}
                        className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF3FB] text-[#0A66C2]"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {p.salaryMax && p.salaryMax > 0 && (
                <p className="text-sm font-semibold text-green-700">
                  {formatSalaryBand(p.salaryMin || 0, p.salaryMax, p.currency || 'INR')}
                </p>
              )}

              <section>
                <h4 className="text-xs font-bold text-[#666] uppercase tracking-wide mb-3">
                  Team & capabilities ({detail?.team.length || 0})
                </h4>
                <ul className="space-y-3">
                  {(detail?.team || []).map((m) => (
                    <li
                      key={`${m.contact}-${m.role}`}
                      className="border border-[#e0e0e0] rounded-xl p-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-10 h-10 rounded-full bg-[#0A66C2] text-white flex items-center justify-center text-sm font-bold shrink-0">
                          {getInitials(m.name || m.contact)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#1d2226] text-sm">
                            {m.name || m.contact.split('@')[0]}
                            <span className="ml-2 text-[10px] font-semibold text-[#666] capitalize">
                              {m.role}
                            </span>
                          </p>
                          <p className="text-[11px] text-[#666] truncate">{m.contact}</p>
                          {m.college && (
                            <p className="text-xs text-[#666] mt-0.5">🎓 {m.college}</p>
                          )}
                          {(m.skills?.length || 0) > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {m.skills!.slice(0, 8).map((s) => (
                                <span
                                  key={s}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-[#f3f2ef] text-[#444]"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                          {(m.hobbies?.length || 0) > 0 && (
                            <p className="text-[10px] text-[#999] mt-1">
                              Interests: {m.hobbies!.slice(0, 4).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {!isOwner && hit && onJoin && (
                <button
                  type="button"
                  onClick={() => onJoin(hit)}
                  className="w-full py-3 rounded-full bg-[#0A66C2] text-white font-semibold hover:bg-[#004182]"
                >
                  Join this project
                </button>
              )}
              {isOwner && (
                <p className="text-center text-sm text-[#666]">
                  This is your project — open the Project tab for your dashboard.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
