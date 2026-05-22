'use client';

import { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { getInitials } from '@/lib/utils';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface TeamMember {
  contact: string;
  role: string;
  status?: string;
  joinedAt?: string;
}

interface TeamMembersViewProps {
  projectId?: string;
  onInvite?: () => void;
}

const AVATAR_COLORS = [
  'bg-[#0A66C2]', 'bg-purple-500', 'bg-teal-500',
  'bg-rose-500', 'bg-amber-500', 'bg-indigo-500',
];

const API =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:5001';

export function TeamMembersView({ projectId, onInvite }: TeamMembersViewProps) {
  const [team, setTeam]       = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TeamMember | null>(null);
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

    const socket: Socket = io(API, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('join_room', `project_${projectId}`);

    socket.on('member_status_changed', payload => {
      if (payload.projectId !== projectId || payload.status !== 'joined') return;
      setTeam(prev => {
        if (prev.some(m => m.contact === payload.memberContact)) return prev;
        return [...prev, {
          contact: payload.memberContact,
          role: payload.role || 'member',
          status: 'active',
          joinedAt: new Date().toISOString(),
        }];
      });
    });

    return () => { socket.disconnect(); };
  }, [projectId]);

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
              <div
                key={m.contact}
                title={m.contact}
                className={`w-9 h-9 rounded-full border-2 border-white ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-bold`}
              >
                {getInitials(m.contact)}
              </div>
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

      {/* Two-column: list + detail */}
      {!loading && team.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Member list */}
          <div className="lg:col-span-2 space-y-3">
            {team.map((m, i) => (
              <button
                key={m.contact}
                onClick={() => setSelected(prev => prev?.contact === m.contact ? null : m)}
                className={`w-full text-left bg-white border rounded-xl p-4 transition-all hover:shadow-sm ${
                  selected?.contact === m.contact
                    ? 'border-[#0A66C2] ring-1 ring-[#0A66C2]/20'
                    : 'border-[#e0e0e0] hover:border-[#0A66C2]/40'
                }`}
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
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Active
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-1">
            {selected ? (
              <div className="bg-white border border-[#e0e0e0] rounded-xl p-6 sticky top-24 space-y-5">
                <div className="text-center">
                  <div className={`w-20 h-20 rounded-full ${AVATAR_COLORS[team.findIndex(m => m.contact === selected.contact) % AVATAR_COLORS.length]} flex items-center justify-center text-white text-3xl font-bold mx-auto`}>
                    {getInitials(selected.contact)}
                  </div>
                  <p className="font-bold text-[#1d2226] mt-3">{selected.contact}</p>
                  <p className="text-sm text-[#666] capitalize mt-0.5">{selected.role}</p>
                  <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
                  </span>
                </div>

                {selected.joinedAt && (
                  <div className="border-t border-[#f0f0f0] pt-4">
                    <p className="text-xs text-[#999] font-semibold uppercase tracking-wide mb-1">Joined on</p>
                    <p className="text-sm text-[#1d2226]">
                      {new Date(selected.joinedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                )}

                <div className="border-t border-[#f0f0f0] pt-4 space-y-2">
                  <button
                    onClick={() => {/* navigate to messages */}}
                    className="w-full py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#004182] transition-all"
                  >
                    💬 Send Message
                  </button>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-full py-2 border border-[#d9d9d9] text-[#666] text-sm font-semibold rounded-full hover:bg-[#f3f2ef] transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-dashed border-[#d9d9d9] rounded-xl p-8 text-center">
                <p className="text-3xl mb-2">👆</p>
                <p className="text-sm text-[#999]">Click a member to see their details</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
