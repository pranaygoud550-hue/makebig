'use client';

import { useEffect, useState } from 'react';
import { apiGetProjectActivities, getAuthToken } from '@/lib/api';
import { useProjectSocket } from '@/lib/useProjectSocket';

interface ActivityFeedProps {
  projectId?: string;
  userId?: string;
  userName?: string;
  userContact?: string;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  createdAt: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  message:         { icon: '💬', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  member_joined:   { icon: '🙋', color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
  member_left:     { icon: '👋', color: 'text-slate-500',  bg: 'bg-slate-50 border-slate-200' },
  task_created:    { icon: '✅', color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
  task_updated:    { icon: '🔄', color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
  task_deleted:    { icon: '🗑️', color: 'text-red-500',    bg: 'bg-red-50 border-red-200' },
  project_created: { icon: '🚀', color: 'text-[#0A66C2]', bg: 'bg-[#EEF3FB] border-[#0A66C2]/20' },
  project_published:{ icon: '📢', color: 'text-[#0A66C2]', bg: 'bg-[#EEF3FB] border-[#0A66C2]/20' },
};

function getConfig(type: string) {
  for (const [key, cfg] of Object.entries(TYPE_CONFIG)) {
    if (type.includes(key)) return cfg;
  }
  return { icon: '•', color: 'text-[#666]', bg: 'bg-[#f8f9fa] border-[#e0e0e0]' };
}

export function ActivityFeed({
  projectId,
  userId = '',
  userName = '',
  userContact = '',
}: ActivityFeedProps) {
  const token  = getAuthToken();
  const socket = useProjectSocket(projectId || '', userId, userName, userContact, token);

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading]       = useState(true);

  /* ── Initial load from MongoDB ── */
  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      const acts = await apiGetProjectActivities(projectId as string);
      if (!cancelled) {
        setActivities(acts.map((a: Record<string, string>) => ({
          id: a.id || a._id,
          type: a.type,
          description: a.description || a.type,
          createdAt: a.createdAt,
        })));
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [projectId]);

  /* ── Real-time: push new activity to top ── */
  useEffect(() => {
    if (!socket.activities?.length) return;
    const latest = socket.activities[0] as Record<string, string>;
    const id = latest.id || latest._id;
    setActivities(prev => {
      if (prev.some(a => a.id === id)) return prev;
      return [{ id, type: latest.type, description: latest.description, createdAt: latest.createdAt }, ...prev];
    });
  }, [socket.activities]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#1d2226]">Activity</h3>
        {activities.length > 0 && (
          <span className="text-xs text-[#0A66C2] font-semibold bg-[#EEF3FB] px-2 py-0.5 rounded-full">
            {activities.length}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center py-8 gap-2">
          <div className="w-6 h-6 border-4 border-[#0A66C2] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#999]">Loading activity…</p>
        </div>
      )}

      {!loading && activities.length === 0 && (
        <div className="text-center py-10 px-4">
          <div className="w-16 h-16 rounded-full bg-[#EEF3FB] flex items-center justify-center text-2xl mx-auto mb-4">⚡</div>
          <p className="text-sm font-bold text-[#1d2226]">No activity yet</p>
          <p className="text-xs text-[#999] mt-1.5 leading-relaxed max-w-[220px] mx-auto">
            Create a task, send a message, or invite a teammate — every action appears here in real time.
          </p>
        </div>
      )}

      <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
        {activities.map(a => {
          const cfg = getConfig(a.type);
          return (
            <div
              key={a.id}
              className={`flex gap-3 p-3 rounded-xl border ${cfg.bg} transition-all`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 font-bold border ${cfg.bg}`}>
                {cfg.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1d2226] leading-snug">{a.description}</p>
                <p className="text-[10px] text-[#999] mt-1">{timeAgo(a.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
