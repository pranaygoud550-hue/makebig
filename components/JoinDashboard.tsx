'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, ProjectData } from '@/lib/types';
import { getInitials, skillAlignmentForInvite } from '@/lib/utils';
import { WIZARD_CATEGORIES } from '@/lib/constants';
import { apiBrowseProjects, apiJoinProject, apiGetReceivedInvites, apiAcceptInvite, apiDeclineInvite, BrowseProject } from '@/lib/api';
import { filterAllowedProjects } from '@/lib/projectAllowlist';
import { getErrorMessage } from '@/lib/userErrors';
import { isJoinApproved, joinRequestNotice } from '@/lib/joinFlow';
import { useProjectListSocket } from '@/lib/useProjectListSocket';

interface JoinDashboardProps {
  user: User | null;
  preferredCategoryId?: string;
  /** Skills from join wizard — used for match scoring before profile skills */
  matchSkills?: string[];
  /** Pre-select project from a shared /p/[slug] link */
  highlightSlug?: string;
  onClose: () => void;
  onLogout: () => void;
  onJoinedProject: (project: ProjectData) => void;
}

interface ProjectPost {
  id: string;
  projectName: string;
  categoryId: string;
  category: string;
  skills: string[];
  description: string;
  creator: string;
  creatorAvatar: string;
  timestamp: string;
  joinedCount: number;
  matchScore: number;
}

function formatTimeAgo(dateStr?: string) {
  if (!dateStr) return 'Recently posted';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function toProjectPost(p: BrowseProject, userSkills: string[]): ProjectPost {
  const roles = p.roles || [];
  const { skillScore } = skillAlignmentForInvite(userSkills, roles, p.desc || '');
  const categoryTitle = WIZARD_CATEGORIES.find((c) => c.id === p.categoryId)?.title || p.categoryId;
  return {
    id: p.id,
    projectName: p.name,
    categoryId: p.categoryId,
    category: categoryTitle,
    skills: roles,
    description: p.desc || 'No description provided',
    creator: p.ownerContact || 'Creator',
    creatorAvatar: getInitials(p.ownerContact || 'C'),
    timestamp: formatTimeAgo(p.createdAt),
    joinedCount: p.joinedCount ?? 0,
    matchScore: Math.min(100, skillScore),
  };
}

function matchColor(score: number) {
  if (score >= 70) return 'text-green-600 bg-green-50 border-green-200';
  if (score >= 40) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-[#666] bg-[#f3f2ef] border-[#d9d9d9]';
}

type JoinTab = 'browse' | 'recommended' | 'invitations';

export function JoinDashboard({
  user,
  preferredCategoryId = 'all',
  matchSkills,
  highlightSlug,
  onClose,
  onLogout,
  onJoinedProject,
}: JoinDashboardProps) {
  const [activeTab, setActiveTab]       = useState<JoinTab>('browse');
  const [projects, setProjects] = useState<ProjectPost[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectPost | null>(null);
  const [showDetailMobile, setShowDetailMobile] = useState(false);
  const [filters, setFilters] = useState({ categoryId: preferredCategoryId || 'all', minMatch: 0 });
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Invitations state ── */
  const [invitations, setInvitations]       = useState<any[]>([]);
  const [inviteLoading, setInviteLoading]   = useState(false);
  const [inviteAction, setInviteAction]     = useState<string | null>(null);

  const userSkillsKey = (matchSkills?.length ? matchSkills : user?.skills || []).join(',');
  const userSkills = useMemo(
    () => (matchSkills?.length ? matchSkills : user?.skills || []),
    [matchSkills, userSkillsKey]
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProjects = useCallback(async () => {
    if (!user?.contact) return;
    setLoading(true);
    setError(null);
    try {
      const list = filterAllowedProjects(
        await apiBrowseProjects(
          filters.categoryId === 'all' ? undefined : filters.categoryId,
          user.contact
        )
      );
      const converted = list.map((p) => toProjectPost(p, userSkills));
      setProjects(converted);
      if (highlightSlug) {
        const idx = list.findIndex((b) => b.slug === highlightSlug);
        setSelectedProject(idx >= 0 ? converted[idx] : converted[0] ?? null);
      } else {
        setSelectedProject((prev) => prev ?? converted[0] ?? null);
      }
    } catch {
      setError('Could not load projects. Make sure the API server is running.');
    } finally {
      setLoading(false);
    }
  }, [user?.contact, filters.categoryId, userSkillsKey, highlightSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const fetchInvitations = useCallback(async () => {
    if (!user?.contact) return;
    setInviteLoading(true);
    const list = await apiGetReceivedInvites(user.contact);
    setInvitations(list);
    setInviteLoading(false);
  }, [user?.contact]);

  useEffect(() => {
    if (activeTab === 'invitations') fetchInvitations();
  }, [activeTab, fetchInvitations]);

  useProjectListSocket({
    onPublished: (p) => {
      if (!user?.contact) return;
      if ((p.ownerContact || '').toLowerCase() === user.contact.toLowerCase()) return;
      if (filters.categoryId !== 'all' && p.categoryId !== filters.categoryId) return;
      setProjects((prev) =>
        prev.some((x) => x.id === p.id) ? prev : [toProjectPost(p, userSkills), ...prev]
      );
    },
    onChanged: ({ projectId, status }) => {
      if (status && status !== 'published' && status !== 'in-progress') {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      }
    },
  });

  const filteredProjects = projects.filter((p) => p.matchScore >= filters.minMatch);

  const handleJoin = async () => {
    if (!selectedProject || !user) return;
    setJoining(true);
    setError(null);
    try {
      const result = await apiJoinProject(selectedProject.id, user.name, userSkills[0] || 'member');
      if (!result?.project) return;
      if (!isJoinApproved(result)) {
        setJoinSuccess(true);
        return;
      }
      const categoryTitle =
        WIZARD_CATEGORIES.find((c) => c.id === result.project.categoryId)?.title ||
        result.project.categoryId;
      setJoinSuccess(true);
      setTimeout(() => {
        onJoinedProject({
          id: result.project.id,
          name: result.project.name,
          description: result.project.desc,
          categoryId: result.project.categoryId,
          category: categoryTitle,
          skills: result.project.roles || [],
          vision: '',
          mode: 'member',
          salaryMin: result.project.salaryMin,
          salaryMax: result.project.salaryMax,
          salaryCurrency: result.project.currency,
        });
      }, 1200);
    } catch (e) {
      setError(getErrorMessage(e, 'join'));
    } finally {
      setJoining(false);
    }
  };

  const categoryFilters = [{ id: 'all', title: 'All' }, ...WIZARD_CATEGORIES.slice(0, 9)];

  return (
    <div className="min-h-screen bg-[#f3f2ef] flex flex-col">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#d9d9d9] shadow-sm flex-shrink-0">
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          <span className="text-xl font-black text-[#0A66C2] tracking-tight">Make Big</span>

          <div className="flex-1 max-w-sm hidden md:block">
            <input
              type="text"
              placeholder="Search projects..."
              className="w-full px-4 py-2 bg-[#f3f2ef] border border-[#d9d9d9] rounded-full text-sm text-[#1d2226] placeholder-[#999] focus:outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="hidden sm:block px-4 py-1.5 border border-[#0A66C2] text-[#0A66C2] text-sm font-semibold rounded-full hover:bg-[#EEF3FB] transition-colors"
            >
              ← Back
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-[#f3f2ef] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-xs font-bold">
                  {user ? getInitials(user.name) : '?'}
                </div>
                <span className="hidden sm:block text-sm font-semibold text-[#1d2226]">
                  {user?.name.split(' ')[0]}
                </span>
                <span className="text-[#666] text-xs">▾</span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-[#d9d9d9] rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 bg-[#f8f9fa] border-b border-[#e0e0e0]">
                    <p className="text-sm font-bold text-[#1d2226]">{user?.name}</p>
                    <p className="text-xs text-[#666] truncate">{user?.contact}</p>
                  </div>
                  <button
                    onClick={() => { onLogout(); setShowProfileMenu(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: project list ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

            {/* Heading */}
            <div>
              <h2 className="text-2xl font-bold text-[#1d2226]">Discover Projects</h2>
              <p className="text-[#666] text-sm mt-1">
                Find projects that match your skills and collaborate
              </p>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-[#e0e0e0] -mx-0 pb-0">
              {([
                { id: 'browse',       icon: '🔍', label: 'All Projects' },
                { id: 'recommended',  icon: '⭐', label: 'Recommended' },
                { id: 'invitations',  icon: '📩', label: `Invitations${invitations.filter(i => i.status === 'pending').length > 0 ? ` (${invitations.filter(i => i.status === 'pending').length})` : ''}` },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
                    activeTab === tab.id
                      ? 'border-[#0A66C2] text-[#0A66C2]'
                      : 'border-transparent text-[#666] hover:text-[#1d2226]'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* ── INVITATIONS TAB ── */}
            {activeTab === 'invitations' && (
              <div className="space-y-3">
                {inviteLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl p-4 animate-pulse h-20 border border-[#e0e0e0]" />)}
                  </div>
                ) : invitations.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-[#d9d9d9]">
                    <p className="text-4xl mb-3">📭</p>
                    <p className="font-semibold text-[#1d2226]">No invitations yet</p>
                    <p className="text-sm text-[#666] mt-1 max-w-xs mx-auto">
                      When project creators invite you, you&apos;ll see them here. Browse projects and apply to get noticed!
                    </p>
                  </div>
                ) : (
                  invitations.map(inv => (
                    <div key={inv.id} className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-wide mb-1">
                            Project Invitation
                          </p>
                          <h3 className="font-bold text-[#1d2226]">{inv.projectName}</h3>
                          {inv.projectCategory && (
                            <p className="text-xs text-[#666] mt-0.5">
                              {WIZARD_CATEGORIES.find(c => c.id === inv.projectCategory)?.title || inv.projectCategory}
                            </p>
                          )}
                          {(inv.projectSalaryMax || 0) > 0 && (
                            <p className="text-xs font-bold text-green-700 mt-1">
                              Up to {inv.projectCurrency || 'INR'} {Number(inv.projectSalaryMax).toLocaleString('en-IN')}/mo
                            </p>
                          )}
                          <p className="text-sm text-[#666] mt-2">
                            Role invited for: <span className="font-semibold text-[#1d2226]">{inv.role || 'member'}</span>
                          </p>
                          {inv.message && (
                            <p className="text-sm text-[#888] italic mt-1">&quot;{inv.message}&quot;</p>
                          )}
                          <p className="text-[10px] text-[#bbb] mt-2">
                            From <span className="font-medium">{inv.senderContact}</span>
                            {inv.createdAt && ` · ${new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                          </p>
                        </div>

                        <span className={`shrink-0 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                          inv.status === 'accepted' ? 'text-green-700 bg-green-50 border-green-200' :
                          inv.status === 'declined' ? 'text-red-700 bg-red-50 border-red-200' :
                          'text-amber-700 bg-amber-50 border-amber-200'
                        }`}>
                          {inv.status}
                        </span>
                      </div>

                      {inv.status === 'pending' && (
                        <div className="flex gap-2 mt-4 pt-4 border-t border-[#f0f0f0]">
                          <button
                            disabled={inviteAction === inv.id}
                            onClick={async () => {
                              setInviteAction(inv.id);
                              await apiAcceptInvite(inv.id);
                              setInvitations(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'accepted' } : i));
                              setInviteAction(null);
                            }}
                            className="flex-1 py-2 bg-[#0A66C2] text-white rounded-full text-sm font-semibold hover:bg-[#004182] disabled:opacity-50 transition-all"
                          >
                            {inviteAction === inv.id ? 'Processing…' : '✓ Accept Invitation'}
                          </button>
                          <button
                            disabled={inviteAction === inv.id}
                            onClick={async () => {
                              setInviteAction(inv.id);
                              await apiDeclineInvite(inv.id);
                              setInvitations(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'declined' } : i));
                              setInviteAction(null);
                            }}
                            className="px-4 py-2 border border-[#d9d9d9] text-[#666] rounded-full text-sm font-semibold hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-all"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── RECOMMENDED TAB ── */}
            {activeTab === 'recommended' && (() => {
              const recommended = [...projects]
                .filter(p => p.matchScore > 0)
                .sort((a, b) => b.matchScore - a.matchScore)
                .slice(0, 10);
              return recommended.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-[#d9d9d9]">
                  <p className="text-4xl mb-3">⭐</p>
                  <p className="font-semibold text-[#1d2226]">No recommendations yet</p>
                  <p className="text-sm text-[#666] mt-1 max-w-xs mx-auto">
                    Add more skills to your profile and explore all projects to get personalised recommendations.
                  </p>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="mt-4 px-5 py-2 border border-[#0A66C2] text-[#0A66C2] font-semibold rounded-full hover:bg-[#EEF3FB] text-sm transition-colors"
                  >
                    Browse All Projects
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-[#666] font-medium">
                    {recommended.length} project{recommended.length !== 1 ? 's' : ''} matched to your skills, ranked by fit
                  </p>
                  {recommended.map((project, idx) => (
                    <div
                      key={project.id}
                      onClick={() => { setSelectedProject(project); setShowDetailMobile(true); }}
                      className={`bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all ${
                        selectedProject?.id === project.id
                          ? 'border-[#0A66C2] shadow-md shadow-[#0A66C2]/10'
                          : 'border-[#e0e0e0] hover:border-[#0A66C2]/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          {idx === 0 && (
                            <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 mb-1.5 inline-block">
                              Best match for you
                            </span>
                          )}
                          <h3 className="font-bold text-[#1d2226]">{project.projectName}</h3>
                          <p className="text-xs text-[#0A66C2] font-medium">{project.category}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border whitespace-nowrap ${matchColor(project.matchScore)}`}>
                          {project.matchScore}% match
                        </span>
                      </div>
                      <p className="text-sm text-[#666] mt-2 line-clamp-2">{project.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {project.skills.slice(0, 4).map(s => (
                          <span key={s} className="px-2 py-0.5 bg-[#EEF3FB] text-[#0A66C2] border border-[#0A66C2]/20 rounded-full text-xs font-medium">{s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* ── BROWSE (All Projects) TAB ── */}
            {activeTab === 'browse' && <>
            {/* Category filter chips */}
            <div className="flex flex-wrap gap-2">
              {categoryFilters.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilters({ ...filters, categoryId: cat.id })}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    filters.categoryId === cat.id
                      ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                      : 'bg-white text-[#666] border-[#d9d9d9] hover:border-[#0A66C2] hover:text-[#0A66C2]'
                  }`}
                >
                  {cat.title}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-2 border-[#0A66C2] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[#666] text-sm">Loading projects from database…</p>
              </div>
            )}

            {/* Empty */}
            {!loading && filteredProjects.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#d9d9d9]">
                <div className="text-4xl mb-3">🔍</div>
                <p className="font-semibold text-[#1d2226]">No projects found</p>
                <p className="text-[#666] text-sm mt-1 max-w-xs mx-auto">
                  No published projects from others yet. Try a different category or check back later.
                </p>
                <button
                  onClick={loadProjects}
                  className="mt-4 px-5 py-2 border border-[#0A66C2] text-[#0A66C2] font-semibold rounded-full hover:bg-[#EEF3FB] text-sm transition-colors"
                >
                  Refresh
                </button>
              </div>
            )}

            {/* Project cards */}
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => { setSelectedProject(project); setShowDetailMobile(true); }}
                  className={`bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all ${
                    selectedProject?.id === project.id
                      ? 'border-[#0A66C2] shadow-md shadow-[#0A66C2]/10'
                      : 'border-[#e0e0e0] hover:border-[#0A66C2]/50 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[#1d2226] truncate">{project.projectName}</h3>
                      <p className="text-xs text-[#0A66C2] font-medium mt-0.5">{project.category}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border whitespace-nowrap ${matchColor(project.matchScore)}`}>
                      {project.matchScore}% match
                    </span>
                  </div>

                  <p className="text-sm text-[#666] mt-2 line-clamp-2">{project.description}</p>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {project.skills.slice(0, 4).map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-[#EEF3FB] text-[#0A66C2] border border-[#0A66C2]/20 rounded-full text-xs font-medium">
                        {s}
                      </span>
                    ))}
                    {project.skills.length > 4 && (
                      <span className="px-2 py-0.5 bg-[#f3f2ef] text-[#666] rounded-full text-xs">
                        +{project.skills.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#f0f0f0]">
                    <div className="w-6 h-6 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-[10px] font-bold">
                      {getInitials(project.creator)}
                    </div>
                    <span className="text-xs text-[#666]">{project.creator}</span>
                    <span className="text-[#ccc]">·</span>
                    <span className="text-xs text-[#666]">{project.joinedCount} joined</span>
                    <span className="text-[#ccc]">·</span>
                    <span className="text-xs text-[#999]">{project.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
            </>}

          </div>
        </div>

        {/* ── Right: detail panel ── */}
        <div className="w-80 bg-white border-l border-[#d9d9d9] overflow-y-auto hidden lg:flex flex-col">
          {selectedProject ? (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-5 border-b border-[#e0e0e0]">
                <span className="text-xs font-semibold text-[#0A66C2] uppercase tracking-wide">
                  {selectedProject.category}
                </span>
                <h3 className="text-lg font-bold text-[#1d2226] mt-1">{selectedProject.projectName}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-7 h-7 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-xs font-bold">
                    {selectedProject.creatorAvatar}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1d2226]">{selectedProject.creator}</p>
                    <p className="text-xs text-[#666]">Posted {selectedProject.timestamp}</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 p-5 space-y-4 overflow-y-auto">
                <div>
                  <p className="text-xs font-semibold text-[#666] uppercase tracking-wide mb-1">About</p>
                  <p className="text-sm text-[#1d2226] leading-relaxed">{selectedProject.description}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#666] uppercase tracking-wide mb-2">Roles Needed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProject.skills.map((s) => (
                      <span key={s} className="px-2.5 py-1 bg-[#EEF3FB] text-[#0A66C2] border border-[#0A66C2]/20 rounded-full text-xs font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-[#f3f2ef] rounded-xl">
                  <span className="text-lg">👥</span>
                  <div>
                    <p className="text-xs font-semibold text-[#1d2226]">{selectedProject.joinedCount} people joined</p>
                    <p className="text-xs text-[#666]">Be part of this project</p>
                  </div>
                </div>

                {/* Match score bar */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-semibold text-[#666]">Skill Match</p>
                    <p className="text-xs font-bold text-[#0A66C2]">{selectedProject.matchScore}%</p>
                  </div>
                  <div className="h-2 bg-[#e0e0e0] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${selectedProject.matchScore}%`,
                        background: selectedProject.matchScore >= 70 ? '#057642' : selectedProject.matchScore >= 40 ? '#f59e0b' : '#0A66C2',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="p-5 border-t border-[#e0e0e0] space-y-2">
                {joinSuccess ? (
                  <div className="w-full py-3 bg-green-50 border border-green-200 text-green-700 font-semibold rounded-full text-sm text-center">
                    ✓ Joined! Opening dashboard…
                  </div>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full py-2.5 bg-[#0A66C2] text-white font-semibold rounded-full hover:bg-[#004182] disabled:opacity-50 transition-all text-sm"
                  >
                    {joining ? 'Joining…' : '🤝 Join This Project'}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-full py-2.5 border border-[#d9d9d9] text-[#666] font-semibold rounded-full hover:bg-[#f3f2ef] transition-all text-sm"
                >
                  ← Go Back
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-[#999]">
              <div className="text-4xl mb-3">👈</div>
              <p className="text-sm">Select a project to see details and join</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile detail sheet ── */}
      {showDetailMobile && selectedProject && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e0e0e0]">
            <button
              onClick={() => setShowDetailMobile(false)}
              className="text-[#0A66C2] font-semibold text-sm"
            >
              ← Back
            </button>
            <span className="text-sm font-bold text-[#1d2226] truncate max-w-[60%]">
              {selectedProject.projectName}
            </span>
            <span className={`text-xs font-bold px-2 py-1 rounded-full border ${matchColor(selectedProject.matchScore)}`}>
              {selectedProject.matchScore}%
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <p className="text-xs text-[#0A66C2] font-semibold uppercase">{selectedProject.category}</p>
              <p className="text-sm text-[#1d2226] mt-2 leading-relaxed">{selectedProject.description}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#666] uppercase mb-2">Roles Needed</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedProject.skills.map((s) => (
                  <span key={s} className="px-2.5 py-1 bg-[#EEF3FB] text-[#0A66C2] border border-[#0A66C2]/20 rounded-full text-xs font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-[#f3f2ef] rounded-xl">
              <span className="text-lg">👥</span>
              <p className="text-xs font-semibold text-[#1d2226]">{selectedProject.joinedCount} people joined</p>
            </div>
          </div>

          <div className="p-5 border-t border-[#e0e0e0] space-y-2">
            {joinSuccess ? (
              <div className="w-full py-3 bg-green-50 border border-green-200 text-green-700 font-semibold rounded-full text-sm text-center">
                ✓ Joined! Opening dashboard…
              </div>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-3 bg-[#0A66C2] text-white font-semibold rounded-full hover:bg-[#004182] disabled:opacity-50 transition-all text-sm"
              >
                {joining ? 'Joining…' : '🤝 Join This Project'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
