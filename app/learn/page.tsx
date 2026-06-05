'use client';

import { useState, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { AuthModal } from '@/components/AuthModal';
import { ProjectWizardNew } from '@/components/ProjectWizardNew';
import { CoursesDashboard } from '@/components/CoursesDashboard';
import { useAuth } from '@/lib/hooks/useAuth';
import { ProjectData } from '@/lib/types';
import { saveActiveProject } from '@/lib/activeProjectStorage';
import {
  apiCreateProject,
  apiPublishProject,
  apiGetUser,
  PlanLimitError,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/userErrors';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function LearnPage() {
  const auth = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardInitialEntry] = useState<'create'>('create');
  const [wizardInitialCategory, setWizardInitialCategory] = useState<string | undefined>();
  const [wizardInitialSkills, setWizardInitialSkills] = useState<string[] | undefined>();

  const handleSignIn = useCallback(
    async (contact: string) => {
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
      } else {
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
      }
      setShowAuth(false);
    },
    [auth]
  );

  const handleSignUp = useCallback(
    async (
      name: string,
      contact: string,
      skills: string[],
      hobbies: string[],
      college: string,
      graduationYear: string
    ) => {
      await auth.login(name, contact.trim().toLowerCase(), skills, hobbies, college, graduationYear);
      setShowAuth(false);
    },
    [auth]
  );

  const handleStartProjectFromCourse = (categoryId: string, skills?: string[]) => {
    if (!auth.checkAuth()) {
      setShowAuth(true);
      return;
    }
    setWizardInitialCategory(categoryId);
    setWizardInitialSkills(skills?.length ? skills : undefined);
    setShowWizard(true);
  };

  const handleWizardComplete = async (data: ProjectData) => {
    setShowWizard(false);
    setWizardInitialCategory(undefined);
    setWizardInitialSkills(undefined);

    if (data.mode !== 'create' || !auth.user) return;

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
      saveActiveProject(auth.user.contact, {
        ...data,
        id: published?.id || created.id,
        slug: (published as { slug?: string })?.slug,
        mode: 'create',
      });
      window.location.href = '/';
    } catch (e) {
      alert(e instanceof PlanLimitError ? e.message : getErrorMessage(e, 'project'));
    }
  };

  return (
    <>
      <Navbar
        user={auth.user}
        profileImage={auth.profile?.profileImage}
        onAuthClick={() => setShowAuth(true)}
        onProfileClick={() => {
          window.location.href = '/profile';
        }}
        onLogout={() => auth.logout()}
        onProjectClick={() => {
          window.location.href = '/';
        }}
      />

      <CoursesDashboard
        userContact={auth.user?.contact}
        onRequireAuth={() => setShowAuth(true)}
        onStartProject={handleStartProjectFromCourse}
      />

      <AuthModal
        isOpen={showAuth}
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
          setWizardInitialCategory(undefined);
          setWizardInitialSkills(undefined);
        }}
        onComplete={handleWizardComplete}
      />
    </>
  );
}
