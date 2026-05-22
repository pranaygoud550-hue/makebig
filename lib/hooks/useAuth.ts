'use client';

import { useCallback, useState, useEffect } from 'react';
import { User, Profile } from '@/lib/types';
import { apiUpsertUser, apiGetProfile, apiUpsertProfile, clearAuthToken, setAuthToken } from '@/lib/api';
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
    graduationYear?: string
  ) => Promise<void>;
  logout: () => void;
  updateProfile: (profile: Profile) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  checkAuth: () => boolean;
}

function readStoredUser(): User | null {
  if (typeof window === 'undefined' || isSupabaseConfigured) return null;
  try {
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    const parsed = JSON.parse(stored) as User;
    return parsed?.isLoggedIn ? parsed : null;
  } catch {
    return null;
  }
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (contact: string) => {
    try {
      const cached = localStorage.getItem('makeBigProfile');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.contact?.toLowerCase() === contact.toLowerCase()) {
            setProfile(parsed);
          }
        } catch (e) {
          // ignore
        }
      }

      const data = await apiGetProfile(contact);
      if (data) {
        setProfile(data);
        localStorage.setItem('makeBigProfile', JSON.stringify(data));
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    }
  }, []);

  // Supabase session is the source of truth for production auth.
  useEffect(() => {
    let mounted = true;

    const toUser = (sessionUser: {
      id: string;
      email?: string | null;
      phone?: string | null;
      user_metadata?: Record<string, any>;
    }): User => {
      const contact = normalizeAuthContact(sessionUser.email, sessionUser.phone);
      const metadata = sessionUser.user_metadata || {};
      return {
        id: sessionUser.id,
        name: metadata.name || contact.split('@')[0] || 'User',
        contact,
        isLoggedIn: true,
        skills: metadata.skills || [],
        hobbies: metadata.hobbies || [],
        college: metadata.college || '',
        graduationYear: metadata.graduationYear || '',
        city: metadata.city || '',
        state: metadata.state || '',
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
            loadProfile(restoredUser.contact);
          }
          return;
        }

        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.isLoggedIn) {
            setUser(parsed);
            loadProfile(parsed.contact);
          }
        }
      } catch (e) {
        console.error('Error restoring auth session:', e);
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
        clearAuthToken();
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
      graduationYear?: string
    ) => {
      const normalizedContact = contact.trim().toLowerCase();

      const optimisticUser: User = {
        id: normalizedContact,
        name: name.trim() || normalizedContact.split('@')[0] || 'User',
        contact: normalizedContact,
        isLoggedIn: true,
        skills,
        hobbies,
        college,
        graduationYear,
      };

      // Persist immediately so checkAuth() and UI work before upsert finishes
      setUser(optimisticUser);
      if (!isSupabaseConfigured) {
        localStorage.setItem('user', JSON.stringify(optimisticUser));
      }

      try {
        if (isSupabaseConfigured) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.access_token) setAuthToken(data.session.access_token);
          if (data.session?.user) {
            await supabase.auth.updateUser({
              data: { name: optimisticUser.name, skills, hobbies, college, graduationYear },
            });
          }
        }

        const result = await apiUpsertUser({
          name: optimisticUser.name,
          contact: normalizedContact,
          skills,
          hobbies,
          college,
          graduationYear,
        });

        const newUser: User = result?.user
          ? {
              ...result.user,
              id: result.user.id || normalizedContact,
              isLoggedIn: true,
              skills,
              hobbies,
              college,
              graduationYear,
            }
          : optimisticUser;

        setUser(newUser);
        if (!isSupabaseConfigured) localStorage.setItem('user', JSON.stringify(newUser));
        await loadProfile(normalizedContact);
      } catch (e) {
        console.error('Login upsert failed:', e);
        // Keep optimistic session — OTP already verified
      }
    },
    [loadProfile]
  );

  const logout = useCallback(() => {
    if (isSupabaseConfigured) supabase.auth.signOut().catch(console.error);
    setUser(null);
    setProfile(null);
    localStorage.removeItem('user');
    localStorage.removeItem('makeBigProfile');
    clearSessionActiveProject();
    clearAuthToken();
  }, []);

  const checkAuth = useCallback(() => {
    if (isSupabaseConfigured) return Boolean(user);
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.isLoggedIn === true;
      } catch {
        return false;
      }
    }
    return false;
  }, [user]);

  const updateProfile = useCallback(
    async (newProfile: Profile): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiUpsertProfile(newProfile);
        if (result) {
          setProfile(result);
          if (!isSupabaseConfigured) localStorage.setItem('makeBigProfile', JSON.stringify(result));
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
    },
    []
  );

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
