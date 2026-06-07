'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getApiOrigin } from '@/lib/apiBase';
import { setAuthToken } from '@/lib/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError('OAuth is not configured');
      return;
    }

    let cancelled = false;

    const finish = async (email: string, name: string) => {
      const res = await fetch(`${getApiOrigin()}/api/users/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: email, name, oauth: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Account setup failed');
      }
      if (data.data?.token) setAuthToken(data.data.token);
      if (data.data?.user) {
        localStorage.setItem('user', JSON.stringify({ ...data.data.user, isLoggedIn: true }));
      }
      if (!cancelled) router.replace('/');
    };

    const handleSession = async (session: { user: { email?: string | null; user_metadata?: Record<string, string> } } | null) => {
      if (!session?.user) return;
      const email = session.user.email?.toLowerCase() || '';
      if (!email) {
        setError('No email on Google account');
        return;
      }
      const name =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        email.split('@')[0];
      try {
        await finish(email, name);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Sign in failed');
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) void handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void handleSession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f3f2ef] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-[#e0e0e0] p-8 text-center max-w-sm w-full">
        {error ? (
          <>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <a href="/" className="text-sm font-semibold text-[#0A66C2] hover:underline">
              Back to home
            </a>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-4 border-[#0A66C2] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-[#666]">Signing you in…</p>
          </>
        )}
      </div>
    </div>
  );
}
