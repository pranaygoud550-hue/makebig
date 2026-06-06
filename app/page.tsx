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
import { projectNeedsSync, hasActiveWorkspace } from '@/lib/projectWorkspace';
import { AppShell } from '@/components/AppShell';
import { UserProfilePanel } from '@/components/app/UserProfilePanel';
import { MarketingHomepage, type DebugSnapshot } from '@/components/MarketingHomepage';
import { useAuth } from '@/lib/hooks/useAuth';
import { ProjectData } from '@/lib/types';
import { apiCreateProject, apiPublishProject, apiCheckHealth, apiGetUser, apiJoinProject, BrowseProject, PlanLimitError } from '@/lib/api';
import { WIZARD_CATEGORIES } from '@/lib/constants';
import { getErrorMessage } from '@/lib/userErrors';
import { profileReadyMessage } from '@/lib/profileComplete';
import { joinRequestNotice, isJoinApproved } from '@/lib/joinFlow';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { ProfileViewProvider } from '@/lib/context/ProfileViewContext';

export default function Home() {
  const auth = useAuth();
  const [showAuth, setShowAuth]               = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'signup'>('signin');
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
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinNotice, setJoinNotice] = useState<string | null>(null);
  const [wizardInitialEntry, setWizardInitialEntry] = useState<'create' | 'join' | undefined>();
  const [wizardInitialCategory, setWizardInitialCategory] = useState<string | undefined>();
  const [wizardInitialSkills, setWizardInitialSkills] = useState<string[] | undefined>();
  const [restoringProject, setRestoringProject] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('makeBigSplashSeen')) {
      setShowSplash(false);
    }
  }, []);

  const openAuth = useCallback((mode: 'signin' | 'signup' = 'signin') => {
    setAuthInitialMode(mode);
    setShowAuth(true);
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
    if (auth.isLoading || !auth.checkAuth()) return;
    const contact = auth.user?.contact;
    if (!contact) return;

    let cancelled = false;
    setRestoringProject(true);
    restoreUserProject(contact).then((parsed) => {
      if (!cancelled && parsed) applyRestoredProject(parsed, contact);
    }).finally(() => {
      if (!cancelled) setRestoringProject(false);
    });

    return () => {
      cancelled = true;
    };
  }, [auth.user, auth.isLoading, auth.checkAuth, applyRestoredProject]);

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
          openAuth('signup');
          return;
        }
        window.history.replaceState({}, '', '/');
        void handlePublicJoinClick({
          id: p.id,
          slug: p.slug,
          name: p.name,
          desc: p.desc || '',
          categoryId: p.categoryId || 'other',
          roles: p.roles || [],
          salaryMin: p.salaryMin || 0,
          salaryMax: p.salaryMax || 0,
          currency: p.currency || 'INR',
          ownerContact: p.ownerContact,
        } as BrowseProject);
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
        void handlePublicJoinClick({
          id: p.id,
          slug: p.slug,
          name: p.name,
          desc: p.desc || '',
          categoryId: p.categoryId || 'other',
          roles: p.roles || [],
          salaryMin: p.salaryMin || 0,
          salaryMax: p.salaryMax || 0,
          currency: p.currency || 'INR',
          ownerContact: p.ownerContact,
        } as BrowseProject);
      });
  }, [auth.user, pendingJoinSlug]);

  /* ── After sign-in, resume any pending join intent ── */
  useEffect(() => {
    if (auth.user && pendingJoinCategory) {
      setWizardInitialEntry('join');
      setShowWizard(true);
      setPendingJoinCategory(null);
    }
  }, [auth.user, pendingJoinCategory]);

  const requireProfileForAction = (): boolean => {
    const msg = profileReadyMessage(auth.user, auth.profile);
    if (!msg) return true;
    setJoinError(msg);
    setShowProfile(true);
    return false;
  };

  const handleStartProject = () => {
    if (!auth.checkAuth()) {
      openAuth('signup');
      return;
    }
    if (!requireProfileForAction()) return;
    setWizardInitialEntry('create');
    setWizardInitialCategory(undefined);
    setWizardInitialSkills(undefined);
    setShowWizard(true);
  };

  const handleJoinProject = () => {
    if (!auth.checkAuth()) {
      openAuth('signup');
      return;
    }
    if (!requireProfileForAction()) return;
    setWizardInitialEntry('join');
    setShowWizard(true);
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
    if (!hasActiveWorkspace(currentProject)) {
      return;
    }
    let p = currentProject!;
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
    if (data.mode === 'join') {
      setShowWizard(false);
      setWizardInitialEntry(undefined);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('makeBigActiveTab', 'explore');
      }
      return;
    }

    if (data.mode === 'member') {
      persistProject(data);
      setShowWizard(false);
      setWizardInitialEntry(undefined);
      setShowDashboard(false);
      return;
    }

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
          ownerContact: auth.user.contact,
          mode: 'create',
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
    setWizardInitialEntry(undefined);

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

  const handlePublicJoinClick = async (project: BrowseProject) => {
    if (!auth.checkAuth()) {
      openAuth('signup');
      return;
    }
    if (!auth.user) return;
    if (!requireProfileForAction()) return;

    setJoinError(null);
    setJoinNotice(null);
    try {
      const result = await apiJoinProject(
        project.id,
        auth.user.name,
        auth.user.skills?.[0] || 'member'
      );
      if (!result?.project) {
        setJoinError('Could not send join request — try again');
        return;
      }
      if (!isJoinApproved(result)) {
        setJoinNotice(joinRequestNotice(result));
        return;
      }
      const categoryTitle =
        WIZARD_CATEGORIES.find((c) => c.id === result.project.categoryId)?.title ||
        result.project.categoryId;
      handleJoinedProject({
        id: result.project.id,
        slug: result.project.slug,
        name: result.project.name,
        description: result.project.desc,
        categoryId: result.project.categoryId,
        category: categoryTitle,
        skills: result.project.roles || [],
        vision: '',
        mode: 'member',
        ownerContact: result.project.ownerContact,
        salaryMin: result.project.salaryMin,
        salaryMax: result.project.salaryMax,
        salaryCurrency: result.project.currency,
      });
    } catch (e) {
      setJoinError(getErrorMessage(e, 'join'));
    }
  };

  if (showSplash) {
    return <SplashScreen onComplete={finishSplash} />;
  }

  /* ── Routing ── */
  if (showDashboard && hasActiveWorkspace(currentProject)) {
    return (
      <ProfileViewProvider>
        <DashboardNew
        project={currentProject!}
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
      </ProfileViewProvider>
    );
  }

  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-[#f3f2ef] flex items-center justify-center">
        <p className="text-sm text-[#666]">Loading…</p>
      </div>
    );
  }

  if (auth.user && restoringProject) {
    return (
      <div className="min-h-screen bg-[#f3f2ef] flex items-center justify-center">
        <p className="text-sm text-[#666]">Loading your project…</p>
      </div>
    );
  }

  /* Signed in → same app (Home, Posts, Explore, etc.) for create and join */
  if (auth.user && auth.checkAuth()) {
    return (
      <ProfileViewProvider>
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
          initialMode={authInitialMode}
          onClose={() => setShowAuth(false)}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
        />
        <ProjectWizardNew
          isOpen={showWizard}
          initialEntry={wizardInitialEntry}
          initialCategory={wizardInitialCategory}
          initialSkills={wizardInitialSkills}
          onClose={() => {
            setShowWizard(false);
            setWizardInitialEntry(undefined);
            setWizardInitialCategory(undefined);
            setWizardInitialSkills(undefined);
          }}
          onComplete={handleWizardComplete}
        />
        {joinNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl border border-green-200 p-6 max-w-md w-full shadow-xl">
              <h3 className="text-lg font-bold text-[#1d2226] mb-2">Request sent</h3>
              <p className="text-sm text-[#666] mb-5">{joinNotice}</p>
              <button
                type="button"
                onClick={() => setJoinNotice(null)}
                className="w-full py-2.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182]"
              >
                OK
              </button>
            </div>
          </div>
        )}
        {joinError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl border border-red-200 p-6 max-w-md w-full shadow-xl">
              <h3 className="text-lg font-bold text-[#1d2226] mb-2">Could not join project</h3>
              <p className="text-sm text-[#666] mb-5">{joinError}</p>
              <button
                type="button"
                onClick={() => setJoinError(null)}
                className="w-full py-2.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182]"
              >
                OK
              </button>
            </div>
          </div>
        )}
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
      </ProfileViewProvider>
    );
  }

  /* Public marketing front — logged out, or signed in before create/join */
  return (
    <div className="bg-[#f3f2ef] min-h-screen">
      <Navbar
        user={auth.user}
        profileImage={auth.profile?.profileImage}
        onAuthClick={() => openAuth('signin')}
        onProfileClick={() => setShowProfile(true)}
        onLogout={() => {
          auth.logout();
          setCurrentProject(null);
          clearSessionActiveProject();
          setShowDashboard(false);
        }}
        onProjectClick={() => {
          if (hasActiveWorkspace(currentProject)) {
            setShowDashboard(true);
          } else {
            handleStartProject();
          }
        }}
      />

      <AuthModal
        isOpen={showAuth}
        initialMode={authInitialMode}
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
        initialEntry={wizardInitialEntry}
        initialCategory={wizardInitialCategory}
        initialSkills={wizardInitialSkills}
        onClose={() => {
          setShowWizard(false);
          setWizardInitialEntry(undefined);
          setWizardInitialCategory(undefined);
          setWizardInitialSkills(undefined);
        }}
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
        isSignedIn={false}
        onStartProject={handleStartProject}
        onRequireAuth={() => openAuth('signup')}
        onJoinProject={handlePublicJoinClick}
        onCheckDebug={handleCheckDebug}
        showDebug={showDebug}
        debugData={debugData}
        onCloseDebug={() => setShowDebug(false)}
      />
    </div>
  );
}
