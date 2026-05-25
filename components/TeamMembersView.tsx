'use client';

import { useState, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { getInitials } from '@/lib/utils';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { connectProjectRoom } from '@/lib/realtime';
import { useProfileView } from '@/lib/context/ProfileViewContext';

interface TeamMember {
  contact: string;
  role: string;
  status?: string;
  joinedAt?: string;
}

interface TeamMembersViewProps {
  projectId?: string;
  onInvite?: () => void;
  userId?: string;
  userName?: string;
  userContact?: string;
}

const AVATAR_COLORS = [
  'bg-[#0A66C2]', 'bg-purple-500', 'bg-teal-500',
  'bg-rose-500', 'bg-amber-500', 'bg-indigo-500',
];

const API =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:5001';

export function TeamMembersView({
  projectId,
  onInvite,
  userId,
  userName,
  userContact,
}: TeamMembersViewProps) {
  const [team, setTeam]       = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { openProfile } = useProfileView();
  const socketRef = useRef<Socket | null>(null);

  /* ── Load from MongoDB ── */
  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      try {
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('project_members')
            .select('*')
            .eq('project_id', projectId)
            .eq('status', 'joined');
          if (!cancelled && !error) {
            setTeam((data || []).map((m: any) => ({
              contact: m.contact,
              role: m.role,
              status: m.status,
              joinedAt: m.joined_at,
            })));
          }
        } else {
          const res  = await fetch(`${API}/api/projects/${projectId}/members`);
          const json = await res.json();
          if (!cancelled && json.success) setTeam(json.data.members || []);
        }
      } catch { /* API offline */ }
      finally   { if (!cancelled) setLoading(false); }
    })();

    return () => { cancelled = true; };
  }, [projectId]);

  /* ── Live socket: add new member instantly ── */
  useEffect(() => {
    if (!projectId) return;
    if (isSupabaseConfigured) {
      const channel = supabase
        .channel(`members:${projectId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'project_members',
          filter: `project_id=eq.${projectId}`,
        }, ({ new: row, eventType, old }) => {
          if (eventType === 'DELETE') {
            setTeam(prev => prev.filter(m => m.contact !== old.contact));
            return;
          }
          if (!row || row.status !== 'joined') return;
          setTeam(prev => {
            const next = {
              contact: row.contact,
              role: row.role || 'member',
              status: row.status,
              joinedAt: row.joined_at,
            };
            return prev.some(m => m.contact === row.contact)
              ? prev.map(m => m.contact === row.contact ? next : m)
              : [...prev, next];
          });
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }

    let socket: Socket | null = null;
    let cancelled = false;

    connectProjectRoom(projectId, {
      id: userId,
      name: userName,
      contact: userContact,
    }).then((s) => {
      if (cancelled || !s) return;
      socket = s;
      socketRef.current = s;

      s.on('member_status_changed', (payload) => {
        if (payload.projectId !== projectId || payload.status !== 'joined') return;
        const contact = payload.memberContact || payload.memberId;
        if (!contact) return;
        setTeam((prev) => {
          if (prev.some((m) => m.contact === contact)) return prev;
          return [
            ...prev,
            {
              contact,
              role: payload.role || 'member',
              status: 'active',
              joinedAt: new Date().toISOString(),
            },
          ];
        });
      });
    });

    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [projectId, userId, userName, userContact]);

  if (!projectId) {
    return (
      <div className="bg-white rounded-xl border border-[#e0e0e0] p-10 text-center">
        <p className="text-4xl mb-3">👥</p>
        <p className="text-[#666] text-sm">No project selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[#e0e0e0] px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1d2226]">Team Members</h2>
          <p className="text-sm text-[#666] mt-0.5">
            {loading ? 'Loading…' : team.length === 0
              ? 'No members yet'
              : `${team.length} member${team.length !== 1 ? 's' : ''} in your project`}
          </p>
        </div>
        {!loading && team.length > 0 && (
          <div className="flex -space-x-2">
            {team.slice(0, 5).map((m, i) => (
              <button
                key={m.contact}
                type="button"
                title={m.contact}
                onClick={() => openProfile(m.contact, m.contact)}
                className={`w-9 h-9 rounded-full border-2 border-white ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-bold hover:scale-105 transition-transform`}
              >
                {getInitials(m.contact)}
              </button>
            ))}
            {team.length > 5 && (
              <div className="w-9 h-9 rounded-full border-2 border-white bg-[#e0e0e0] flex items-center justify-center text-[#666] text-xs font-bold">
                +{team.length - 5}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl border border-[#e0e0e0] p-8 text-center">
          <div className="w-8 h-8 border-4 border-[#0A66C2] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#666]">Fetching team from database…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && team.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-[#d9d9d9] p-12 text-center">
          <div className="flex justify-center gap-1 mb-4 text-4xl">
            <span className="opacity-30">👤</span>
            <span className="opacity-60">👤</span>
            <span>👤</span>
          </div>
          <p className="text-[#1d2226] font-bold text-lg">Your team is empty</p>
          <p className="text-[#666] text-sm mt-1 max-w-xs mx-auto">
            Invite teammates to collaborate. They will appear here after they accept.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            {onInvite && (
              <button
                onClick={onInvite}
                className="px-6 py-2.5 bg-[#0A66C2] text-white text-sm font-bold rounded-full hover:bg-[#004182] transition-all"
              >
                ✉️ Invite your first teammate
              </button>
            )}
            <button
              onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => alert('Project link copied! Send it to your collaborators.'))}
              className="px-6 py-2.5 border border-[#d9d9d9] text-[#666] text-sm font-semibold rounded-full hover:border-[#0A66C2] hover:text-[#0A66C2] transition-all"
            >
              🔗 Copy project link
            </button>
          </div>
        </div>
      )}

      {/* Member list */}
      {!loading && team.length > 0 && (
        <div className="space-y-3">
          {team.map((m, i) => (
            <button
              key={m.contact}
              type="button"
              onClick={() => openProfile(m.contact, m.contact)}
              className="w-full text-left bg-white border border-[#e0e0e0] rounded-xl p-4 transition-all hover:shadow-sm hover:border-[#0A66C2]/40"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                  {getInitials(m.contact)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1d2226] truncate">{m.contact}</p>
                  <p className="text-xs text-[#666] capitalize mt-0.5">{m.role}</p>
                  {m.joinedAt && (
                    <p className="text-xs text-[#999] mt-0.5">
                      Joined {new Date(m.joinedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <span className="text-xs font-semibold text-[#0A66C2] shrink-0">View profile →</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
