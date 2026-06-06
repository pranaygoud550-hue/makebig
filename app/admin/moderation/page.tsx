'use client';

import { useCallback, useEffect, useState } from 'react';

interface FlaggedSession {
  sessionId: string;
  contact: string;
  skillId: string;
  status: string;
  testScore: number;
  integrityScore: number;
  finalScore: number;
  violationCount: number;
  proctorFlags: string[];
  suspicious: boolean;
  submittedAt?: string;
}

export default function AdminModerationPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [sessions, setSessions] = useState<FlaggedSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSessions = useCallback(async (key: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/moderation', {
        headers: { 'x-admin-key': key },
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Unauthorized');
        setAuthenticated(false);
        return;
      }
      setSessions(data.data.sessions);
      setAuthenticated(true);
    } catch {
      setError('Could not load moderation queue');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAction = async (sessionId: string, action: 'approve' | 'void') => {
    const res = await fetch('/api/admin/moderation', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify({ sessionId, action }),
    });
    const data = await res.json();
    if (data.success) {
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    }
  };

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('makebig_admin_key') : null;
    if (saved) {
      setAdminKey(saved);
      void loadSessions(saved);
    }
  }, [loadSessions]);

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <header className="bg-white border-b border-[#d9d9d9] px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#1d2226]">MakeBig Admin — Test Moderation</h1>
          <a href="/" className="text-sm text-[#0A66C2] font-semibold">
            ← Home
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {!authenticated && (
          <div className="bg-white rounded-2xl border border-[#e0e0e0] p-6 space-y-3">
            <p className="text-sm text-[#666]">Enter admin key to review flagged skill test sessions.</p>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Admin key"
              className="w-full border border-[#d9d9d9] rounded-xl px-3 py-2 text-sm"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem('makebig_admin_key', adminKey);
                void loadSessions(adminKey);
              }}
              className="px-4 py-2 bg-[#0A66C2] text-white rounded-xl text-sm font-semibold"
            >
              Sign in
            </button>
          </div>
        )}

        {authenticated && (
          <>
            <p className="text-sm text-[#666]">
              {loading ? 'Loading…' : `${sessions.length} flagged session(s) need review`}
            </p>
            <ul className="space-y-3">
              {sessions.map((s) => (
                <li
                  key={s.sessionId}
                  className="bg-white rounded-2xl border border-[#e0e0e0] p-4 space-y-2"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-bold text-[#1d2226]">{s.skillId}</p>
                      <p className="text-xs text-[#666]">{s.contact || 'anonymous'} · {s.status}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p>Test {s.testScore}% · Integrity {s.integrityScore}%</p>
                      <p className="font-bold">Final {s.finalScore}%</p>
                    </div>
                  </div>
                  <p className="text-xs text-amber-700">
                    Violations: {s.violationCount} · Flags: {(s.proctorFlags || []).join(', ') || 'none'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAction(s.sessionId, 'approve')}
                      className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction(s.sessionId, 'void')}
                      className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg"
                    >
                      Void
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {!loading && sessions.length === 0 && (
              <p className="text-sm text-[#999]">No flagged sessions — all clear.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
