'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { AuthModal } from '@/components/AuthModal';
import { SplashScreen } from '@/components/SplashScreen';
import { ProjectWizardNew } from '@/components/ProjectWizardNew';
import { DashboardNew, type DashboardNavTab } from '@/components/DashboardNew';
import { saveActiveProject, clearSessionActiveProject } from '@/lib/activeProjectStorage';
import { restoreUserProject } from '@/lib/restoreUserProject';
import { ensureProjectOnline } from '@/lib/ensureProjectOnline';
import { projectNeedsSync } from '@/lib/projectWorkspace';
import { JoinDashboard } from '@/components/JoinDashboard';
import { AppShell } from '@/components/AppShell';
import { UserProfilePanel } from '@/components/app/UserProfilePanel';
import { MarketingHomepage, type DebugSnapshot } from '@/components/MarketingHomepage';
import { useAuth } from '@/lib/hooks/useAuth';
import { ProjectData } from '@/lib/types';
import { apiCreateProject, apiPublishProject, apiCheckHealth, apiGetUser, BrowseProject, PlanLimitError } from '@/lib/api';
import { getErrorMessage } from '@/lib/userErrors';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function Home() {
  const auth = useAuth();
  const [showAuth, setShowAuth]               = useState(false);
  const [showWizard, setShowWizard]           = useState(false);
  const [showSplash, setShowSplash]           = useState(true);
  const [showProfile, setShowProfile]         = useState(false);
  const [showDashboard, setShowDashboard]     = useState(false);
  const [dashboardInitialNav, setDashboardInitialNav] = useState<DashboardNavTab | undefined>();
  const [currentProject, setCurrentProject]   = useState<ProjectData | null>(null);
  const [showDebug, setShowDebug]             = useState(false);
  const [debugData, setDebugData]             = useState<DebugSnapshot | null>(null);
  const [pendingJoinCategory, setPendingJoinCategory] = useState<string | null>(null);
  const [pendingJoinSlug, setPendingJoinSlug] = useState<string | null>(null);
  const [planLimitMessage, setPlanLimitMessage] = useState<string | null>(null);
  const [projectCreateError, setProjectCreateError] = useState<string | null>(null);
  const [restoringProject, setRestoringProject] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('makeBigSplashSeen')) {
      setShowSplash(false);
    }
  }, []);

  const finishSplash = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('makeBigSplashSeen', '1');
    }
    setShowSplash(false);
  }, []);

  const applyRestoredProject = useCallback((parsed: ProjectData, contact: string) => {
    setCurrentProject(parsed);
    setShowWizard(false);
    saveActiveProject(contact, parsed);
    if (projectNeedsSync(parsed)) {
      ensureProjectOnline(parsed, contact).then((result) => {
        if (result.ok && result.project) {
          setCurrentProject(result.project);
          saveActiveProject(contact, result.project);
        }
      });
    }
  }, []);

  /* ── Restore project when session is ready (local + server) ── */
  useEffect(() => {
    if (auth.isLoading) return;
    let contact = auth.user?.contact;
    if (!contact) {
      try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        if (u?.isLoggedIn) contact = u.contact;
      } catch { /* ignore */ }
    }
    if (!contact) return;

    let cancelled = false;
    setRestoringProject(true);
    restoreUserProject(contact).then((parsed) => {
      if (!cancelled && parsed) applyRestoredProject(parsed, contact!);
    }).finally(() => {
      if (!cancelled) setRestoringProject(false);
    });

    return () => {
      cancelled = true;
    };
  }, [auth.user, auth.isLoading, applyRestoredProject]);

  /* ── Deep link: /?join=project-slug from shared public pages ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const joinSlug = new URLSearchParams(window.location.search).get('join');
    if (!joinSlug) return;

    const run = async () => {
      try {
        const res = await fetch(`/api/public/p/${encodeURIComponent(joinSlug)}`);
        const data = await res.json();
        if (!data.success || !data.data?.project) return;
        const p = data.data.project;
        if (!auth.user) {
          setPendingJoinSlug(joinSlug);
          setShowAuth(true);
          return;
        }
        setCurrentProject({
          mode: 'join',
          categoryId: p.categoryId || 'all',
          name: p.name,
          description: p.desc || '',
          category: '',
          skills: p.roles || [],
          deadline: '',
          vision: '',
          teamSize: 0,
          salaryMin: p.salaryMin || 0,
          salaryMax: p.salaryMax || 0,
          salaryCurrency: p.currency || 'INR',
          slug: p.slug,
          id: p.id,
        } as ProjectData);
        setShowDashboard(true);
        window.history.replaceState({}, '', '/');
      } catch {
        /* ignore */
      }
    };
    run();
  }, [auth.user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!auth.user || !pendingJoinSlug) return;
    const slug = pendingJoinSlug;
    setPendingJoinSlug(null);
    fetch(`/api/public/p/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        const p = data.data?.project;
        if (!p) return;
        setCurrentProject({
          mode: 'join',
          categoryId: p.categoryId || 'all',
          name: p.name,
          description: p.desc || '',
          category: '',
          skills: p.roles || [],
          deadline: '',
          vision: '',
          teamSize: 0,
          salaryMin: p.salaryMin || 0,
          salaryMax: p.salaryMax || 0,
          salaryCurrency: p.currency || 'INR',
          slug: p.slug,
          id: p.id,
        } as ProjectData);
        setShowDashboard(true);
      });
  }, [auth.user, pendingJoinSlug]);

  /* ── After sign-in, resume any pending join intent ── */
  useEffect(() => {
    if (auth.user && pendingJoinCategory) {
      setCurrentProject({
        mode: 'join',
        categoryId: pendingJoinCategory,
        name: '',
        description: '',
        category: '',
        skills: [],
        deadline: '',
        vision: '',
        teamSize: 0,
        salaryMin: 0,
        salaryMax: 0,
        salaryCurrency: 'INR',
      } as ProjectData);
      setShowDashboard(true);
      setPendingJoinCategory(null);
    }
  }, [auth.user, pendingJoinCategory]);

  const handleStartProject = () => {
    if (!auth.checkAuth()) {
      setShowAuth(true);
      return;
    }
    setShowWizard(true);
  };

  const handleJoinProject = () => {
    if (!auth.checkAuth()) {
      setShowAuth(true);
      return;
    }
    setCurrentProject({
      mode: 'join',
      categoryId: 'all',
      name: '',
      description: '',
      category: '',
      skills: [],
      deadline: '',
      vision: '',
      teamSize: 0,
      salaryMin: 0,
      salaryMax: 0,
      salaryCurrency: 'INR',
    } as ProjectData);
    setShowDashboard(true);
  };

  const persistProject = useCallback(
    (p: ProjectData) => {
      setCurrentProject(p);
      const contact = auth.user?.contact;
      if (contact) saveActiveProject(contact, p);
      else localStorage.setItem('makeBigActiveProject', JSON.stringify(p));
    },
    [auth.user?.contact]
  );

  const handleOpenYourProject = async (section?: DashboardNavTab) => {
    if (
      !currentProject?.name ||
      (currentProject.mode !== 'create' && currentProject.mode !== 'member')
    ) {
      return;
    }
    let p = currentProject;
    if (auth.user?.contact && projectNeedsSync(p)) {
      const result = await ensureProjectOnline(p, auth.user.contact);
      if (result.ok && result.project) {
        persistProject(result.project);
        p = result.project;
      }
    }
    setDashboardInitialNav(section);
    setShowDashboard(true);
  };

  const handleSignIn = async (contact: string) => {
    const normalized = contact.trim().toLowerCase();

    if (isSupabaseConfigured) {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;
      await auth.login(
        sessionUser?.user_metadata?.name || normalized.split('@')[0] || 'User',
        normalized,
        sessionUser?.user_metadata?.skills || [],
        sessionUser?.user_metadata?.hobbies || [],
        sessionUser?.user_metadata?.college || '',
        sessionUser?.user_metadata?.graduationYear || ''
      );
      const restored = await restoreUserProject(normalized);
      if (restored) applyRestoredProject(restored, normalized);
      return;
    }

    const user = await apiGetUser(normalized);
    const fallbackName = normalized.includes('@') ? normalized.split('@')[0] : normalized;

    await auth.login(
      user?.name || fallbackName,
      normalized,
      user?.skills || [],
      user?.hobbies || [],
      (user as { college?: string } | null)?.college || '',
      (user as { graduationYear?: string } | null)?.graduationYear || ''
    );
    const restored = await restoreUserProject(normalized);
    if (restored) applyRestoredProject(restored, normalized);
  };

  const handleSignUp = async (
    name: string,
    contact: string,
    skills: string[],
    hobbies: string[],
    college: string,
    graduationYear: string
  ) => {
    const normalized = contact.trim().toLowerCase();
    await auth.login(name, normalized, skills, hobbies, college, graduationYear);
    const restored = await restoreUserProject(normalized);
    if (restored) applyRestoredProject(restored, normalized);
  };

  const handleWizardComplete = async (data: ProjectData) => {
    let savedProject: ProjectData = { ...data };
    setProjectCreateError(null);

    if (auth.user && data.mode === 'create') {
      try {
        const created = await apiCreateProject({
          name: data.name,
          desc: data.description,
          categoryId: data.categoryId,
          projectPurpose: data.projectPurpose,
          roles: data.skills,
          salaryMin: data.salaryMin,
          salaryMax: data.salaryMax,
          currency: data.salaryCurrency || 'INR',
          ownerContact: auth.user.contact,
          city: data.city,
          state: data.state,
        });

        const published = await apiPublishProject(created.id);
        savedProject = {
          ...data,
          id: published?.id || created.id,
          slug: (published as any)?.slug || (created as any)?.slug,
        };
      } catch (e) {
        if (e instanceof PlanLimitError) {
          setPlanLimitMessage(e.message);
          return;
        }
        setProjectCreateError(getErrorMessage(e, 'project'));
        return;
      }
    }

    persistProject(savedProject);
    setShowWizard(false);

    if (auth.user?.contact && projectNeedsSync(savedProject)) {
      const result = await ensureProjectOnline(savedProject, auth.user.contact);
      if (result.ok && result.project) persistProject(result.project);
    }

    setShowDashboard(false);
  };

  const handleCheckDebug = async () => {
    const localStorage_user = localStorage.getItem('user');
    const localStorage_profile = localStorage.getItem('makeBigProfile');
    const health = await apiCheckHealth();

    setDebugData({
      timestamp: new Date().toISOString(),
      backend_health: health ? 'Connected' : 'Not connected',
      localStorage_user: localStorage_user ? JSON.parse(localStorage_user) : null,
      localStorage_profile: localStorage_profile ? JSON.parse(localStorage_profile) : null,
      currentUser: auth.user,
      currentProject: currentProject,
    });
    setShowDebug(true);
  };

  const handleJoinedProject = (project: ProjectData) => {
    setCurrentProject(project);
    if (auth.user?.contact) saveActiveProject(auth.user.contact, project);
    setShowDashboard(false);
  };

  const hasActiveWorkspace =
    Boolean(
      currentProject?.name &&
      (currentProject.mode === 'create' || currentProject.mode === 'member')
    );

  /* ── Public feed: clicking Join when logged out → open AuthModal ── */
  const handlePublicJoinClick = (project: BrowseProject) => {
    if (!auth.checkAuth()) {
      setShowAuth(true);
      return;
    }
    setCurrentProject({
      mode: 'join',
      categoryId: project.categoryId || 'all',
      name: project.name || '',
      description: project.desc || '',
      category: '',
      skills: project.roles || [],
      deadline: '',
      vision: '',
      teamSize: 0,
      salaryMin: project.salaryMin || 0,
      salaryMax: project.salaryMax || 0,
      salaryCurrency: project.currency || 'INR',
      id: project.id,
      slug: project.slug,
    } as ProjectData);
    setShowDashboard(true);
    setPendingJoinCategory(null);
  };

  if (showSplash) {
    return <SplashScreen onComplete={finishSplash} />;
  }

  /* ── Routing ── */
  if (showDashboard && currentProject && currentProject.mode === 'join') {
    return (
      <JoinDashboard
        user={auth.user}
        preferredCategoryId={currentProject.categoryId}
        highlightSlug={currentProject.slug}
        onJoinedProject={handleJoinedProject}
        onClose={() => {
          setShowDashboard(false);
          setDashboardInitialNav(undefined);
        }}
        onLogout={() => {
          auth.logout();
          setShowDashboard(false);
          setDashboardInitialNav(undefined);
          setCurrentProject(null);
          clearSessionActiveProject();
        }}
      />
    );
  }

  if (showDashboard && currentProject && (currentProject.mode === 'create' || currentProject.mode === 'member')) {
    return (
      <DashboardNew
        project={currentProject}
        user={auth.user}
        initialNav={dashboardInitialNav}
        onProjectUpdate={persistProject}
        onClose={() => {
          setShowDashboard(false);
          setDashboardInitialNav(undefined);
        }}
        onLogout={() => {
          auth.logout();
          setShowDashboard(false);
          setDashboardInitialNav(undefined);
          setCurrentProject(null);
          clearSessionActiveProject();
        }}
      />
    );
  }

  if (auth.user && restoringProject && !hasActiveWorkspace) {
    return (
      <div className="min-h-screen bg-[#f3f2ef] flex items-center justify-center">
        <p className="text-sm text-[#666]">Loading your project…</p>
      </div>
    );
  }

  /* Signed in + has a project → app shell with bottom nav (not on public front page) */
  if (auth.user && hasActiveWorkspace) {
    return (
      <>
        <AppShell
          user={auth.user}
          userProfile={auth.profile}
          currentProject={currentProject}
          onProfileSaved={() => auth.refreshProfile()}
          onProjectUpdate={persistProject}
          onStartProject={handleStartProject}
          onJoinProject={handleJoinProject}
          onOpenYourProject={handleOpenYourProject}
          onLogout={() => {
            auth.logout();
            setCurrentProject(null);
            clearSessionActiveProject();
            setShowDashboard(false);
          }}
          onPublicJoinClick={handlePublicJoinClick}
        />
        <AuthModal
          isOpen={showAuth}
          onClose={() => setShowAuth(false)}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
        />
        <ProjectWizardNew
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          onComplete={handleWizardComplete}
        />
        {planLimitMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl border border-[#d9d9d9] p-6 max-w-md w-full shadow-xl">
              <h3 className="text-lg font-bold text-[#1d2226] mb-2">Upgrade to create more projects</h3>
              <p className="text-sm text-[#666] mb-5">{planLimitMessage}</p>
              <div className="flex gap-3">
                <a
                  href="/pricing"
                  className="flex-1 text-center py-2.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182]"
                >
                  View pricing
                </a>
                <button
                  type="button"
                  onClick={() => setPlanLimitMessage(null)}
                  className="flex-1 py-2.5 rounded-full border border-[#d9d9d9] text-sm font-semibold text-[#666] hover:bg-[#f3f2ef]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {projectCreateError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl border border-red-200 p-6 max-w-md w-full shadow-xl">
              <h3 className="text-lg font-bold text-[#1d2226] mb-2">Project creation failed</h3>
              <p className="text-sm text-[#666] mb-5">{projectCreateError}</p>
              <button
                type="button"
                onClick={() => setProjectCreateError(null)}
                className="w-full py-2.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182]"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  /* Public marketing front — logged out, or signed in before create/join */
  return (
    <div className="bg-[#f3f2ef] min-h-screen">
      <Navbar
        user={auth.user}
        profileImage={auth.profile?.profileImage}
        onAuthClick={() => setShowAuth(true)}
        onProfileClick={() => setShowProfile(true)}
        onLogout={() => {
          auth.logout();
          setCurrentProject(null);
          clearSessionActiveProject();
          setShowDashboard(false);
        }}
        onProjectClick={() => {
          if (hasActiveWorkspace) {
            setShowDashboard(true);
          } else {
            handleStartProject();
          }
        }}
      />

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
      />

      {auth.user && (
        <UserProfilePanel
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
          user={auth.user}
          onSaved={async () => {
            await auth.refreshProfile();
            setShowProfile(false);
          }}
        />
      )}

      <ProjectWizardNew
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={handleWizardComplete}
      />

      {planLimitMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl border border-[#d9d9d9] p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-[#1d2226] mb-2">Upgrade to create more projects</h3>
            <p className="text-sm text-[#666] mb-5">{planLimitMessage}</p>
            <div className="flex gap-3">
              <a
                href="/pricing"
                className="flex-1 text-center py-2.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182]"
              >
                View pricing
              </a>
              <button
                type="button"
                onClick={() => setPlanLimitMessage(null)}
                className="flex-1 py-2.5 rounded-full border border-[#d9d9d9] text-sm font-semibold text-[#666] hover:bg-[#f3f2ef]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {projectCreateError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl border border-red-200 p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-[#1d2226] mb-2">Project creation failed</h3>
            <p className="text-sm text-[#666] mb-5">{projectCreateError}</p>
            <button
              type="button"
              onClick={() => setProjectCreateError(null)}
              className="w-full py-2.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182]"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <MarketingHomepage
        isSignedIn={!!auth.user}
        onStartProject={handleStartProject}
        onRequireAuth={() => setShowAuth(true)}
        onJoinProject={handlePublicJoinClick}
        onCheckDebug={handleCheckDebug}
        showDebug={showDebug}
        debugData={debugData}
        onCloseDebug={() => setShowDebug(false)}
      />
    </div>
  );
}
