'use client';

import { useCallback, useState, useEffect } from 'react';
import { User, Profile } from '@/lib/types';
import {
  apiUpsertUser,
  apiGetProfile,
  apiUpsertProfile,
  clearAuthToken,
  setAuthToken,
  fetchSessionUser,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/userErrors';
import { clearSessionActiveProject } from '@/lib/activeProjectStorage';
import { isSupabaseConfigured, normalizeAuthContact, supabase } from '@/lib/supabase';

interface UseAuthReturn {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  login: (
    name: string,
    contact: string,
    skills?: string[],
    hobbies?: string[],
    college?: string,
    graduationYear?: string,
    verifiedSkills?: import('@/lib/types').VerifiedSkill[]
  ) => Promise<void>;
  logout: () => void;
  updateProfile: (profile: Profile) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  checkAuth: () => boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (contact: string) => {
    try {
      const data = await apiGetProfile(contact);
      if (data) setProfile(data);
    } catch (e) {
      console.error('Error loading profile:', e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const toUser = (sessionUser: {
      id: string;
      email?: string | null;
      phone?: string | null;
      user_metadata?: Record<string, unknown>;
    }): User => {
      const contact = normalizeAuthContact(sessionUser.email, sessionUser.phone);
      const metadata = sessionUser.user_metadata || {};
      return {
        id: sessionUser.id,
        name: (metadata.name as string) || contact.split('@')[0] || 'User',
        contact,
        isLoggedIn: true,
        skills: (metadata.skills as string[]) || [],
        hobbies: (metadata.hobbies as string[]) || [],
        college: (metadata.college as string) || '',
        graduationYear: (metadata.graduationYear as string) || '',
        city: (metadata.city as string) || '',
        state: (metadata.state as string) || '',
      };
    };

    async function restoreSession() {
      setIsLoading(true);
      try {
        if (isSupabaseConfigured) {
          const { data } = await supabase.auth.getSession();
          const session = data.session;
          if (!mounted) return;
          if (session?.access_token) {
            setAuthToken(session.access_token);
            const restoredUser = toUser(session.user);
            setUser(restoredUser);
            await loadProfile(restoredUser.contact);
          } else {
            setUser(null);
            setProfile(null);
          }
          return;
        }

        const sessionUser = await fetchSessionUser();
        if (!mounted) return;
        if (sessionUser) {
          setUser({ ...sessionUser, isLoggedIn: true });
          await loadProfile(sessionUser.contact);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (e) {
        console.error('Error restoring auth session:', e);
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    restoreSession();

    if (!isSupabaseConfigured) return () => { mounted = false; };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        setUser(null);
        setProfile(null);
        void clearAuthToken();
        return;
      }

      setAuthToken(session.access_token);
      const restoredUser = toUser(session.user);
      setUser(restoredUser);
      loadProfile(restoredUser.contact);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const login = useCallback(
    async (
      name: string,
      contact: string,
      skills: string[] = [],
      hobbies: string[] = [],
      college?: string,
      graduationYear?: string,
      verifiedSkills?: import('@/lib/types').VerifiedSkill[]
    ) => {
      const normalizedContact = contact.trim().toLowerCase();
      setError(null);

      try {
        if (isSupabaseConfigured) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.access_token) setAuthToken(data.session.access_token);
          if (data.session?.user) {
            await supabase.auth.updateUser({
              data: { name: name.trim(), skills, hobbies, college, graduationYear },
            });
          }
        }

        const result = await apiUpsertUser({
          name: name.trim() || normalizedContact.split('@')[0] || 'User',
          contact: normalizedContact,
          skills,
          hobbies,
          college,
          graduationYear,
          verifiedSkills,
        });

        if (!result?.user) {
          throw new Error('Could not save your account — try again');
        }

        const newUser: User = {
          ...result.user,
          id: result.user.id || normalizedContact,
          isLoggedIn: true,
          skills: result.user.skills || skills,
          verifiedSkills: result.user.verifiedSkills || verifiedSkills,
          hobbies,
          college,
          graduationYear,
        };

        setUser(newUser);
        await loadProfile(normalizedContact);
      } catch (e) {
        await clearAuthToken();
        setUser(null);
        const msg = getErrorMessage(e, 'auth');
        setError(msg);
        throw new Error(msg);
      }
    },
    [loadProfile]
  );

  const logout = useCallback(() => {
    if (isSupabaseConfigured) supabase.auth.signOut().catch(console.error);
    setUser(null);
    setProfile(null);
    if (typeof window !== 'undefined') sessionStorage.removeItem('makeBigProfileOpen');
    clearSessionActiveProject();
    void clearAuthToken();
  }, []);

  const checkAuth = useCallback(() => Boolean(user?.isLoggedIn), [user]);

  const updateProfile = useCallback(async (newProfile: Profile): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiUpsertProfile(newProfile);
      if (result) {
        setProfile(result);
        return true;
      }
      setError('Profile save failed — check your connection and try again');
      return false;
    } catch (e) {
      setError(getErrorMessage(e, 'profile'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.contact) await loadProfile(user.contact);
  }, [user?.contact, loadProfile]);

  return {
    user,
    profile,
    isLoading,
    error,
    login,
    logout,
    updateProfile,
    refreshProfile,
    checkAuth,
  };
}
