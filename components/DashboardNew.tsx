'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ProjectData, User } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { DashboardOverview } from './DashboardOverview';
import { ProjectsView } from './ProjectsView';
import { TeamMembersView } from './TeamMembersView';
import { MessagesView } from './MessagesView';
import { ActivityFeed } from './ActivityFeed';
import { InvitePeopleView } from './InvitePeopleView';
import { RequestsView } from './RequestsView';
import { ProjectFeed } from './ProjectFeed';
import { CofounderMatch } from './CofounderMatch';
import { UpgradeGate } from './UpgradeGate';
import { ShareProject } from './ShareProject';
import { apiGetCofounderMatches } from '@/lib/api';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { BrandLogo } from '@/components/BrandLogo';
import { useProfileView } from '@/lib/context/ProfileViewContext';
import { useToast } from '@/lib/context/ToastContext';
import { useRemovedFromProject } from '@/lib/hooks/useRemovedFromProject';

interface DashboardNewProps {
  project: ProjectData;
  user: User | null;
  onClose: () => void;
  onLogout: () => void;
  onProjectUpdate?: (project: ProjectData) => void;
  onClearProject?: () => void;
  initialNav?: DashboardNavTab;
}

export type DashboardNavTab =
  | 'dashboard'
  | 'matches'
  | 'projects'
  | 'team'
  | 'feed'
  | 'invite'
  | 'requests'
  | 'messages'
  | 'activity';

type NavTab = DashboardNavTab;

const NAV_ITEMS: { id: NavTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard',        icon: '📊' },
  { id: 'matches',   label: 'Find Co-founders', icon: '🤝' },
  { id: 'projects',  label: 'My Projects',      icon: '📁' },
  { id: 'team',      label: 'Team Members',     icon: '👥' },
  { id: 'feed',      label: 'Project Feed',     icon: '📣' },
  { id: 'invite',    label: 'Invite People',    icon: '✉️' },
  { id: 'requests',  label: 'Requests',         icon: '📬' },
  { id: 'messages',  label: 'Messages',         icon: '💬' },
  { id: 'activity',  label: 'Activity',         icon: '⚡' },
];

export function DashboardNew({
  project,
  user,
  onClose,
  onLogout,
  onProjectUpdate,
  onClearProject,
  initialNav,
}: DashboardNewProps) {
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [activeNav, setActiveNav]       = useState<NavTab>(initialNav ?? 'dashboard');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifPanel, setShowNotifPanel]   = useState(false);
  const [searchQuery, setSearchQuery]         = useState('');
  const [matchCount, setMatchCount]           = useState<number | null>(null);
  const [showFloatingTask, setShowFloatingTask] = useState(false);
  const isOwner = project.mode === 'create';
  const ownerContact = project.ownerContact || (isOwner ? user?.contact : undefined);
  const { plan } = useSubscription(ownerContact);
  const { showToast } = useToast();
  const notifUserKey = user?.id || user?.contact;
  const {
    notifications,
    loading: loadingNotifs,
    unreadCount,
    fetchNotifications,
    markAllRead,
  } = useNotifications(notifUserKey);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const { openProfile } = useProfileView();

  /* ── Deadline calc ── */
  const daysLeft = project.deadline
    ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / 86400000)
    : null;
  const showDeadlineBanner = daysLeft !== null && daysLeft <= 7;

  /* ── Mark all read when panel opens ── */
  const openNotifPanel = async () => {
    setShowNotifPanel(true);
    setShowProfileMenu(false);
    if (unreadCount > 0) {
      await markAllRead();
    }
  };

  useEffect(() => {
    if (initialNav) setActiveNav(initialNav);
  }, [initialNav]);

  /* ── Silently probe match count for sidebar badge ── */
  useEffect(() => {
    if (!project.id) return;
    apiGetCofounderMatches(project.id, 30, ownerContact).then(result => {
      if (result) setMatchCount(result.meta.total);
    });
  }, [project.id, ownerContact]);

  useRemovedFromProject({
    userContact: user?.contact,
    activeProjectId: project.id,
    onRemoved: (payload) => {
      showToast(
        payload.message || `You have been removed from ${payload.projectName || project.name}`,
        'error'
      );
      onClearProject?.();
      onClose();
    },
  });

  /* ── Close dropdowns on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f3f2ef] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-[#666]">Not logged in</p>
          <Button onClick={onClose}>Back to app</Button>
        </div>
      </div>
    );
  }

  const notifIcon: Record<string, string> = {
    join:   '🙋',
    invite: '📩',
    task:   '✅',
    system: '⚙️',
    post: '📝',
    like: '❤️',
    comment: '💬',
    message: '💬',
    activity: '👥',
    mention: '@',
    project_update: '📁',
  };

  function timeAgo(d: string) {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  const toggleSidebar = () => setSidebarOpen((o) => !o);
  const closeSidebar = () => setSidebarOpen(false);
  const selectNav = (id: NavTab) => {
    setActiveNav(id);
    closeSidebar();
  };

  return (
    <div className="min-h-screen bg-[#f3f2ef] flex flex-col">

      {/* ─── Top Bar ─── */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#d9d9d9] shadow-sm">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={sidebarOpen}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#f3f2ef] transition-colors"
            >
              <span className="flex flex-col gap-1.5 w-5" aria-hidden>
                <span className={`h-0.5 bg-[#1d2226] transition-all ${sidebarOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`h-0.5 bg-[#1d2226] ${sidebarOpen ? 'opacity-0' : ''}`} />
                <span className={`h-0.5 bg-[#1d2226] transition-all ${sidebarOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </span>
            </button>
            <BrandLogo size="sm" href={null} />
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md hidden md:block">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks, members, messages…"
              className="w-full px-4 py-2 bg-[#f3f2ef] border border-[#d9d9d9] rounded-full text-sm text-[#1d2226] placeholder-[#999] focus:outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={openNotifPanel}
                className="relative w-9 h-9 flex items-center justify-center rounded-full text-[#666] hover:text-[#0A66C2] hover:bg-[#EEF3FB] text-xl transition-all"
              >
                🔔
                {unreadCount > 0 && (
                  <>
                    {/* Pulse ring */}
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-400 animate-ping opacity-60" />
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 z-10">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </>
                )}
              </button>

              {/* Notification Panel */}
              {showNotifPanel && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#d9d9d9] rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#e0e0e0]">
                    <p className="text-sm font-bold text-[#1d2226]">Notifications</p>
                    <button
                      onClick={() => setShowNotifPanel(false)}
                      className="text-[#999] hover:text-[#666] text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-[#f0f0f0]">
                    {loadingNotifs && (
                      <div className="px-4 py-6 text-center text-sm text-[#999]">Loading…</div>
                    )}
                    {!loadingNotifs && notifications.length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-[#999]">
                        <p className="text-2xl mb-2">🔔</p>
                        <p>No notifications yet</p>
                      </div>
                    )}
                    {notifications.map(n => {
                      const actor =
                        (n.metadata?.authorContact as string) ||
                        (n.metadata?.liker as string) ||
                        (n.metadata?.commenter as string) ||
                        (n.metadata?.memberContact as string) ||
                        (n.metadata?.senderContact as string) ||
                        (n.metadata?.rater as string) ||
                        null;
                      return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => actor && openProfile(String(actor), String(actor))}
                        className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-[#f8f9fa] transition-colors ${!n.read ? 'bg-[#EEF3FB]' : ''}`}
                      >
                        <span className="text-xl shrink-0 mt-0.5">{notifIcon[n.type] || '📢'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1d2226] leading-tight">{n.title}</p>
                          <p className="text-xs text-[#666] mt-0.5 leading-snug">{n.message}</p>
                          <p className="text-[10px] text-[#999] mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.read && <span className="w-2 h-2 bg-[#0A66C2] rounded-full shrink-0 mt-1.5" />}
                      </button>
                    );})}
                  </div>

                  {notifications.length > 0 && (
                    <div className="px-4 py-2 border-t border-[#e0e0e0]">
                      <button
                        onClick={fetchNotifications}
                        className="text-xs text-[#0A66C2] hover:underline"
                      >
                        Refresh
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifPanel(false); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-[#f3f2ef] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-xs font-bold">
                  {getInitials(user.name)}
                </div>
                <span className="hidden sm:block text-sm font-semibold text-[#1d2226]">
                  {user.name.split(' ')[0]}
                </span>
                <span className="text-[#666] text-xs">▾</span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#d9d9d9] rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="p-4 border-b border-[#e0e0e0] bg-[#f8f9fa]">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-sm font-bold">
                        {getInitials(user.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1d2226] truncate">{user.name}</p>
                        <p className="text-xs text-[#666] truncate">{user.contact}</p>
                      </div>
                    </div>
                    {user.college && (
                      <p className="text-xs text-[#0A66C2] font-medium truncate">🎓 {user.college}</p>
                    )}
                    {user.graduationYear && (
                      <p className="text-xs text-[#999]">Class of {user.graduationYear}</p>
                    )}
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => { setShowProfileMenu(false); selectNav('team'); }}
                      className="w-full px-4 py-2 text-left text-sm text-[#1d2226] hover:bg-[#f3f2ef] rounded-lg transition-colors"
                    >
                      👤 View Team
                    </button>
                    <button
                      onClick={() => { setShowProfileMenu(false); selectNav('activity'); }}
                      className="w-full px-4 py-2 text-left text-sm text-[#1d2226] hover:bg-[#f3f2ef] rounded-lg transition-colors"
                    >
                      ⚡ Activity Feed
                    </button>
                    <button
                      onClick={onLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors border-t border-[#e0e0e0] mt-1 pt-2"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Deadline banner ── */}
      {showDeadlineBanner && (
        <div className={`flex items-center gap-3 px-5 py-2.5 text-sm font-semibold
          ${daysLeft! <= 0 ? 'bg-red-600 text-white' : 'bg-amber-400 text-amber-900'}`}>
          <span className="text-base shrink-0">{daysLeft! <= 0 ? '🔴' : '⚠️'}</span>
          <span>
            {daysLeft! <= 0
              ? `Deadline passed ${Math.abs(daysLeft!)} day${Math.abs(daysLeft!) !== 1 ? 's' : ''} ago — update your project status`
              : `Deadline in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — ${daysLeft === 1 ? 'final stretch!' : 'keep pushing!'}`}
          </span>
          <span className="ml-auto text-xs opacity-70 shrink-0">
            {project.deadline ? new Date(project.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
          </span>
        </div>
      )}

      {/* ─── Layout ─── */}
      <div className="flex flex-1 overflow-hidden relative">

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/30"
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar — opens via hamburger only */}
        <aside
          className={`fixed top-[57px] left-0 z-50 h-[calc(100vh-57px)] w-64 max-w-[85vw] flex flex-col bg-white border-r border-[#d9d9d9] overflow-y-auto shrink-0 shadow-xl transition-transform duration-200 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
          }`}
        >
          <nav className="p-3 space-y-0.5">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => selectNav(item.id)}
                className={`w-full px-4 py-3 rounded-lg text-left text-sm font-medium transition-all flex items-center gap-3 ${
                  activeNav === item.id
                    ? 'bg-[#EEF3FB] text-[#0A66C2] font-semibold'
                    : 'text-[#666] hover:bg-[#f3f2ef] hover:text-[#1d2226]'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
                {item.id === 'matches' && matchCount !== null && matchCount > 0 && activeNav !== 'matches' && (
                  <span className="ml-auto text-[10px] font-black bg-[#0A66C2] text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">
                    {matchCount > 99 ? '99+' : matchCount}
                  </span>
                )}
                {activeNav === item.id && (
                  <span className="ml-auto w-1 h-5 bg-[#0A66C2] rounded-full" />
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 mt-4 border-t border-[#e0e0e0]">
            <div className="px-3 py-3 bg-[#EEF3FB] border border-[#0A66C2]/20 rounded-xl mb-3">
              <p className="text-[10px] text-[#666] font-semibold uppercase tracking-wide mb-1">Active Project</p>
              <p className="text-sm font-bold text-[#1d2226] line-clamp-2">{project.name}</p>
              <p className="text-xs text-[#0A66C2] mt-0.5">{project.category}</p>
            </div>
            {isOwner && project.slug && (
              <div className="mb-3">
                <ShareProject slug={project.slug} projectName={project.name} compact />
              </div>
            )}
            <Button onClick={onClose} variant="outline" className="w-full text-xs">
              ← Back to app (Home, Explore, Posts…)
            </Button>
          </div>
        </aside>

        {/* Main Content — full width until sidebar opens */}
        <main className="flex-1 overflow-y-auto bg-[#f3f2ef] w-full min-w-0">
          <div className="p-4 md:p-6 lg:px-8 pb-24 mx-auto w-full max-w-none">

            {activeNav === 'dashboard' && (
              <DashboardOverview
                project={project}
                user={user}
                onProjectUpdate={onProjectUpdate}
                externalShowNewTask={showFloatingTask}
                onExternalTaskClose={() => setShowFloatingTask(false)}
              />
            )}

            {activeNav === 'projects' && (
              <ProjectsView currentProject={project} ownerContact={user.contact} />
            )}

            {activeNav === 'team' && (
              <TeamMembersView
                projectId={project.id}
                isOwner={isOwner}
                ownerContact={ownerContact}
                userId={user.id || user.contact}
                userName={user.name}
                userContact={user.contact}
                onInvite={() => setActiveNav('invite')}
                onShowToast={showToast}
              />
            )}

            {activeNav === 'matches' && (
              !isOwner ? (
                <div className="bg-white rounded-xl border border-[#e0e0e0] p-8 text-center text-sm text-[#666]">
                  Co-founder matching is available to project owners.
                </div>
              ) : (
                <UpgradeGate
                  plan={plan}
                  feature="Priority co-founder matching"
                  description="See more matches ranked by skills, activity, and fit — find the right teammates faster."
                >
                  <CofounderMatch project={project} user={user} ownerContact={ownerContact} />
                </UpgradeGate>
              )
            )}

            {activeNav === 'feed' && project.id && (
              <ProjectFeed
                projectId={project.id}
                userContact={user.contact}
                isOwner={project.mode === 'create'}
              />
            )}

            {activeNav === 'invite' && (
              <div className="bg-white rounded-xl border border-[#e0e0e0] overflow-hidden">
                <InvitePeopleView project={project} user={user} />
              </div>
            )}

            {activeNav === 'requests' && (
              <div className="bg-white rounded-xl border border-[#e0e0e0] overflow-hidden">
                <RequestsView project={project} user={user} />
              </div>
            )}

            {activeNav === 'messages' && (
              project.id ? (
                <MessagesView
                  projectId={project.id}
                  userId={user.id || user.contact}
                  userName={user.name}
                  userContact={user.contact}
                />
              ) : (
                <div className="bg-white rounded-xl border border-[#e0e0e0] p-8 text-center">
                  <p className="text-2xl mb-2">💬</p>
                  <p className="text-[#666] text-sm">Save your project first to enable live chat.</p>
                </div>
              )
            )}

            {activeNav === 'activity' && (
              <div className="bg-white rounded-xl border border-[#e0e0e0] p-5">
                <ActivityFeed
                  projectId={project.id}
                  userId={user.id || user.contact}
                  userName={user.name}
                  userContact={user.contact}
                />
              </div>
            )}

          </div>
        </main>

      </div>

      {/* ── Floating "+ Task" FAB ── */}
      <button
        onClick={() => {
          if (activeNav !== 'dashboard') setActiveNav('dashboard');
          setShowFloatingTask(true);
        }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#0A66C2] text-white rounded-full shadow-2xl flex items-center justify-center text-2xl font-bold hover:bg-[#004182] hover:scale-110 active:scale-95 transition-all"
        title="Quick add task"
        aria-label="Add task"
      >
        +
      </button>
    </div>
  );
}
