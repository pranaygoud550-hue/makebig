'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGetProjectInvites, apiAcceptInvite, apiDeclineInvite, apiGetJoinRequests, apiApproveJoinRequest, apiDeclineJoinRequest } from '@/lib/api';
import { ProjectData, User } from '@/lib/types';

interface RequestsViewProps {
  project: ProjectData;
  user: User | null;
}

interface InviteRow {
  id: string;
  senderContact: string;
  receiverContact: string;
  role: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  createdAt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:  'text-amber-700 bg-amber-50 border-amber-200',
  accepted: 'text-green-700 bg-green-50 border-green-200',
  declined: 'text-red-700 bg-red-50 border-red-200',
};

interface JoinRequestRow {
  contact: string;
  role: string;
  requestedAt?: string;
}

export function RequestsView({ project, user }: RequestsViewProps) {
  const [invites, setInvites]         = useState<InviteRow[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequestRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [actionId, setActionId]       = useState<string | null>(null);
  const [filter, setFilter]           = useState<'all' | 'pending' | 'accepted' | 'declined'>('all');

  const fetchInvites = useCallback(async () => {
    if (!project.id) return;
    setLoading(true);
    const [list, requests] = await Promise.all([
      apiGetProjectInvites(project.id),
      apiGetJoinRequests(project.id),
    ]);
    setInvites(list as InviteRow[]);
    setJoinRequests(requests);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { fetchInvites(); }, [fetchInvites]);

  const handleAccept = async (id: string) => {
    setActionId(id);
    await apiAcceptInvite(id);
    setInvites(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'accepted' } : inv));
    setActionId(null);
  };

  const handleDecline = async (id: string) => {
    setActionId(id);
    await apiDeclineInvite(id);
    setInvites(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'declined' } : inv));
    setActionId(null);
  };

  const displayed = filter === 'all' ? invites : invites.filter(i => i.status === filter);
  const counts = {
    pending:  invites.filter(i => i.status === 'pending').length,
    accepted: invites.filter(i => i.status === 'accepted').length,
    declined: invites.filter(i => i.status === 'declined').length,
  };

  return (
    <div className="h-full flex flex-col bg-white">

      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[#e0e0e0]">
        <h2 className="text-xl font-bold text-[#1d2226]">Requests & Invites</h2>
        <p className="text-sm text-[#666] mt-0.5">
          All invitations sent for <span className="font-semibold text-[#0A66C2]">{project.name}</span>
        </p>

        {/* Stats row */}
        <div className="flex gap-3 mt-4">
          {(['all', 'pending', 'accepted', 'declined'] as const).map(f => {
            const count = f === 'all' ? invites.length : counts[f];
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  filter === f
                    ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                    : 'bg-white text-[#666] border-[#d9d9d9] hover:border-[#0A66C2]/40'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  filter === f ? 'bg-white/20 text-white' : 'bg-[#f3f2ef] text-[#666]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {joinRequests.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-[#1d2226] mb-3">Join requests (need your approval)</h3>
            <div className="space-y-3">
              {joinRequests.map((req) => {
                const busy = actionId === req.contact;
                return (
                  <div key={req.contact} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
                    <p className="font-semibold text-sm text-[#1d2226]">{req.contact}</p>
                    <p className="text-xs text-[#666] mt-0.5">Wants to join as {req.role || 'member'}</p>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          setActionId(req.contact);
                          await apiApproveJoinRequest(project.id!, req.contact);
                          setJoinRequests((prev) => prev.filter((r) => r.contact !== req.contact));
                          setActionId(null);
                        }}
                        className="px-3 py-1.5 rounded-full bg-[#0A66C2] text-white text-xs font-semibold disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          setActionId(req.contact);
                          await apiDeclineJoinRequest(project.id!, req.contact);
                          setJoinRequests((prev) => prev.filter((r) => r.contact !== req.contact));
                          setActionId(null);
                        }}
                        className="px-3 py-1.5 rounded-full border border-[#d9d9d9] text-xs font-semibold text-[#666] disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-[#f3f2ef] rounded-xl p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl mb-3">{filter === 'pending' ? '⏳' : filter === 'accepted' ? '✅' : filter === 'declined' ? '❌' : '📭'}</p>
            <p className="font-semibold text-[#1d2226]">
              {filter === 'all' ? 'No invites yet' : `No ${filter} invites`}
            </p>
            <p className="text-sm text-[#666] mt-1">
              {filter === 'all'
                ? 'Go to "Invite People" to start sending invites to talent.'
                : `There are no ${filter} invites for this project.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(inv => {
              const isOwnerInvite = inv.senderContact === (user?.contact || '');
              const isBusy = actionId === inv.id;
              return (
                <div
                  key={inv.id}
                  className="bg-[#f3f2ef] border border-[#e0e0e0] rounded-xl px-4 py-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-sm text-[#1d2226]">
                          {isOwnerInvite ? inv.receiverContact : inv.senderContact}
                        </p>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_COLORS[inv.status] || STATUS_COLORS.pending}`}>
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#666]">
                        {isOwnerInvite ? 'You invited as' : 'Wants to join as'} <span className="font-medium">{inv.role || 'member'}</span>
                      </p>
                      {inv.message && (
                        <p className="text-xs text-[#888] italic mt-1 line-clamp-2">&quot;{inv.message}&quot;</p>
                      )}
                      {inv.createdAt && (
                        <p className="text-[10px] text-[#bbb] mt-1">
                          {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>

                    {/* Accept / Decline only for pending invites where user is the receiver */}
                    {inv.status === 'pending' && !isOwnerInvite && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          disabled={isBusy}
                          onClick={() => handleAccept(inv.id)}
                          className="px-3 py-1.5 bg-[#0A66C2] text-white rounded-full text-xs font-semibold hover:bg-[#004182] disabled:opacity-50 transition-all"
                        >
                          {isBusy ? '…' : 'Accept'}
                        </button>
                        <button
                          disabled={isBusy}
                          onClick={() => handleDecline(inv.id)}
                          className="px-3 py-1.5 border border-[#d9d9d9] text-[#666] rounded-full text-xs font-semibold hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-all"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
