'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { clientApiUrl } from '@/lib/apiBase';
import { getAuthHeadersAsync } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';

interface MentorRow {
  contact: string;
  name: string;
  title: string;
  organization: string;
  expertise: string[];
  bio: string;
  sessionMinutes: number;
  city: string;
}

export default function MentorsPage() {
  const auth = useAuth();
  const [mentors, setMentors] = useState<MentorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(clientApiUrl('/api/mentors'));
        const data = await res.json();
        if (data.success) {
          setMentors(data.data?.mentors || []);
        } else {
          setLoadError(data.error || 'Could not load mentors');
        }
      } catch {
        setLoadError('Could not reach mentor service — try again in a moment.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const requestSession = async (mentorContact: string) => {
    if (!auth.user?.contact) {
      setMessage('Sign in to request a mentor session.');
      return;
    }
    setRequesting(mentorContact);
    setMessage(null);
    try {
      const res = await fetch(clientApiUrl('/api/mentors/request'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeadersAsync()),
        },
        credentials: 'include',
        body: JSON.stringify({
          mentorContact,
          message: 'Interested in a 30-min mentorship session via Make Big.',
        }),
      });
      const data = await res.json();
      setMessage(data.success ? 'Request sent — mentor will respond on platform.' : data.error || 'Could not send request');
    } catch {
      setMessage('Request failed — try again.');
    } finally {
      setRequesting(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <Navbar
        variant="landing"
        user={auth.user}
        profileImage={auth.profile?.profileImage}
        onAuthClick={() => { window.location.href = '/?auth=signin'; }}
        onProfileClick={() => { window.location.href = '/profile'; }}
        onLogout={() => auth.logout()}
        onProjectClick={() => { window.location.href = '/'; }}
      />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/" className="text-sm text-[#0A66C2] font-semibold hover:underline">
          ← Home
        </Link>
        <h1 className="text-3xl font-bold text-[#1d2226] mt-4">Mentor marketplace</h1>
        <p className="text-[#666] mt-2">
          Professors, alumni, and industry mentors offering 30-minute sessions for student teams.
        </p>

        {message && (
          <p className="mt-4 text-sm bg-[#EEF3FB] border border-[#0A66C2]/20 rounded-xl px-4 py-3 text-[#1d2226]">
            {message}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-[#666]">Loading mentors…</p>
        ) : loadError ? (
          <div className="mt-8 bg-white border border-red-200 rounded-2xl p-8 text-center">
            <p className="font-semibold text-[#1d2226]">Could not load mentors</p>
            <p className="text-sm text-[#666] mt-1">{loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded-full bg-[#0A66C2] text-white text-sm font-semibold"
            >
              Retry
            </button>
          </div>
        ) : mentors.length === 0 ? (
          <div className="mt-8 bg-white border border-dashed border-[#d9d9d9] rounded-2xl p-10 text-center">
            <p className="font-semibold text-[#1d2226]">Mentors coming soon</p>
            <p className="text-sm text-[#666] mt-1">
              Alumni and faculty can list themselves here. Check back shortly.
            </p>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {mentors.map((m) => (
              <li
                key={m.contact}
                className="bg-white border border-[#e0e0e0] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div>
                  <Link
                    href={`/u/${encodeURIComponent(m.contact)}`}
                    className="font-bold text-[#1d2226] hover:text-[#0A66C2]"
                  >
                    {m.name}
                  </Link>
                  <p className="text-sm text-[#0A66C2] mt-0.5">
                    {m.title}
                    {m.organization ? ` · ${m.organization}` : ''}
                  </p>
                  {m.bio && <p className="text-sm text-[#666] mt-2 line-clamp-3">{m.bio}</p>}
                  {m.expertise?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {m.expertise.slice(0, 4).map((e) => (
                        <span
                          key={e}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF3FB] text-[#0A66C2]"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-[#999] mt-2">
                    {m.sessionMinutes || 30} min session{m.city ? ` · ${m.city}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={requesting === m.contact}
                  onClick={() => void requestSession(m.contact)}
                  className="shrink-0 px-4 py-2.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182] disabled:opacity-50"
                >
                  {requesting === m.contact ? 'Sending…' : 'Request session'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
