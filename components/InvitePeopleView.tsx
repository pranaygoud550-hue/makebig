'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiSendInvite, apiGetProjectInvites, apiSearchUsers } from '@/lib/api';
import { getErrorMessage } from '@/lib/userErrors';
import { ProjectData, User } from '@/lib/types';

interface InvitePeopleViewProps {
  project: ProjectData;
  user: User | null;
}

interface SentInvite {
  id: string;
  receiverContact: string;
  role: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  createdAt?: string;
}

interface TalentUser {
  id: string;
  name: string;
  contact: string;
  skills?: string[];
  college?: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  accepted: 'bg-green-50 text-green-700 border-green-200',
  declined: 'bg-red-50 text-red-700 border-red-200',
};

export function InvitePeopleView({ project, user }: InvitePeopleViewProps) {
  const [tab, setTab]                   = useState<'search' | 'sent'>('search');
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<TalentUser[]>([]);
  const [searching, setSearching]       = useState(false);
  const [sentInvites, setSentInvites]   = useState<SentInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  /* direct-input invite */
  const [contactInput, setContactInput] = useState('');
  const [roleInput, setRoleInput]       = useState('');
  const [msgInput, setMsgInput]         = useState('');
  const [sending, setSending]           = useState(false);
  const [sendSuccess, setSendSuccess]   = useState('');
  const [sendError, setSendError]       = useState('');

  const fetchSentInvites = useCallback(async () => {
    if (!project.id) return;
    setLoadingInvites(true);
    const list = await apiGetProjectInvites(project.id);
    setSentInvites(list as SentInvite[]);
    setLoadingInvites(false);
  }, [project.id]);

  useEffect(() => { fetchSentInvites(); }, [fetchSentInvites]);

  /* debounced search */
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const users = await apiSearchUsers(searchQuery);
      setSearchResults(
        (users as TalentUser[]).filter(u => u.contact !== user?.contact)
      );
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, user?.contact]);

  const sendInvite = async (contact: string, role?: string, message?: string) => {
    if (!project.id) return;
    setSending(true); setSendSuccess(''); setSendError('');
    try {
      const result = await apiSendInvite(project.id, contact, role || 'member', message);
      if (result) {
        setSendSuccess(`Invite sent to ${contact}`);
        setContactInput(''); setRoleInput(''); setMsgInput('');
        fetchSentInvites();
      } else {
        setSendError('Could not send invite — check the contact and try again');
      }
    } catch (e) {
      setSendError(getErrorMessage(e, 'join'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">

      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[#e0e0e0]">
        <h2 className="text-xl font-bold text-[#1d2226]">Invite People</h2>
        <p className="text-sm text-[#666] mt-0.5">
          Grow your team for <span className="font-semibold text-[#0A66C2]">{project.name}</span>
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {(['search', 'sent'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                tab === t
                  ? 'bg-[#0A66C2] text-white'
                  : 'text-[#666] hover:bg-[#f3f2ef]'
              }`}
            >
              {t === 'search' ? '🔍 Find & Invite' : `📬 Sent (${sentInvites.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── SEARCH TAB ── */}
        {tab === 'search' && (
          <div className="p-6 space-y-6">

            {/* Direct contact invite */}
            <div className="bg-[#f3f2ef] rounded-2xl p-5 space-y-3">
              <p className="text-sm font-semibold text-[#1d2226]">Invite by email or phone</p>
              <input
                type="text"
                value={contactInput}
                onChange={e => setContactInput(e.target.value)}
                placeholder="Enter email or 10-digit phone number"
                className="w-full px-4 py-2.5 bg-white border border-[#d9d9d9] rounded-lg text-sm text-[#1d2226] placeholder-[#aaa] focus:outline-none focus:border-[#0A66C2] focus:ring-2 focus:ring-[#0A66C2]/20"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={roleInput}
                  onChange={e => setRoleInput(e.target.value)}
                  placeholder="Role (e.g. Designer)"
                  className="px-4 py-2.5 bg-white border border-[#d9d9d9] rounded-lg text-sm text-[#1d2226] placeholder-[#aaa] focus:outline-none focus:border-[#0A66C2] focus:ring-2 focus:ring-[#0A66C2]/20"
                />
                <input
                  type="text"
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  placeholder="Short message (optional)"
                  className="px-4 py-2.5 bg-white border border-[#d9d9d9] rounded-lg text-sm text-[#1d2226] placeholder-[#aaa] focus:outline-none focus:border-[#0A66C2] focus:ring-2 focus:ring-[#0A66C2]/20"
                />
              </div>

              {sendSuccess && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  ✓ {sendSuccess}
                </p>
              )}
              {sendError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {sendError}
                </p>
              )}

              <button
                disabled={!contactInput.trim() || sending}
                onClick={() => sendInvite(contactInput.trim(), roleInput, msgInput)}
                className="px-5 py-2 bg-[#0A66C2] text-white rounded-full text-sm font-semibold hover:bg-[#004182] disabled:opacity-40 transition-all"
              >
                {sending ? 'Sending…' : 'Send Invite →'}
              </button>
            </div>

            {/* Search registered users */}
            <div>
              <p className="text-sm font-semibold text-[#1d2226] mb-2">Search registered members</p>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or skill…"
                className="w-full px-4 py-2.5 bg-white border border-[#d9d9d9] rounded-lg text-sm text-[#1d2226] placeholder-[#aaa] focus:outline-none focus:border-[#0A66C2] focus:ring-2 focus:ring-[#0A66C2]/20"
              />

              {searching && (
                <div className="mt-3 space-y-2">
                  {[1,2].map(i => (
                    <div key={i} className="bg-[#f3f2ef] rounded-xl p-4 animate-pulse h-16" />
                  ))}
                </div>
              )}

              {!searching && searchResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {searchResults.map(u => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between bg-[#f3f2ef] hover:bg-white border border-[#e0e0e0] hover:border-[#0A66C2]/30 rounded-xl px-4 py-3 transition-all"
                    >
                      <div>
                        <p className="font-semibold text-sm text-[#1d2226]">{u.name}</p>
                        <p className="text-xs text-[#666]">{u.contact}</p>
                        {(u.skills || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(u.skills || []).slice(0,3).map(s => (
                              <span key={s} className="text-[10px] px-2 py-0.5 bg-[#EEF3FB] text-[#0A66C2] rounded-full border border-[#0A66C2]/20">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => sendInvite(u.contact, 'member', `Join our project "${project.name}"`)}
                        className="ml-3 shrink-0 px-3 py-1.5 bg-[#0A66C2] text-white rounded-full text-xs font-semibold hover:bg-[#004182] transition-all"
                      >
                        Invite
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <p className="mt-4 text-center text-sm text-[#999]">No registered users found for &quot;{searchQuery}&quot;</p>
              )}
            </div>
          </div>
        )}

        {/* ── SENT INVITES TAB ── */}
        {tab === 'sent' && (
          <div className="p-6">
            {loadingInvites ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-[#f3f2ef] rounded-xl p-4 animate-pulse h-16" />
                ))}
              </div>
            ) : sentInvites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-4xl mb-3">📭</p>
                <p className="font-semibold text-[#1d2226]">No invites sent yet</p>
                <p className="text-sm text-[#666] mt-1">
                  Use the &quot;Find & Invite&quot; tab to start growing your team.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sentInvites.map(inv => (
                  <div
                    key={inv.id}
                    className="flex items-start justify-between bg-[#f3f2ef] border border-[#e0e0e0] rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-sm text-[#1d2226]">{inv.receiverContact}</p>
                      <p className="text-xs text-[#666]">Role: {inv.role || 'member'}</p>
                      {inv.message && (
                        <p className="text-xs text-[#999] italic mt-0.5">&quot;{inv.message}&quot;</p>
                      )}
                      {inv.createdAt && (
                        <p className="text-[10px] text-[#bbb] mt-1">
                          Sent {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 ml-3 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${STATUS_BADGE[inv.status] || STATUS_BADGE.pending}`}>
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
