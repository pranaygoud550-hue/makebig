'use client';

import { useEffect } from 'react';
import { useNotifications } from '@/lib/hooks/useNotifications';

const NOTIF_ICON: Record<string, string> = {
  join: '🙋',
  invite: '📩',
  task: '✅',
  system: '⚙️',
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface NotificationsViewProps {
  userId?: string;
}

export function NotificationsView({ userId }: NotificationsViewProps) {
  const { notifications, loading, fetchNotifications, markAllRead } =
    useNotifications(userId);

  useEffect(() => {
    if (userId) markAllRead();
  }, [userId, markAllRead]);

  if (!userId) {
    return (
      <div className="bg-white rounded-2xl border border-[#e0e0e0] p-8 text-center text-sm text-[#666]">
        Sign in to see notifications.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e0e0e0] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e0e0e0]">
        <p className="text-sm font-bold text-[#1d2226]">Notifications</p>
        <button
          type="button"
          onClick={fetchNotifications}
          className="text-xs text-[#0A66C2] hover:underline font-medium"
        >
          Refresh
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#f0f0f0]">
        {loading && (
          <div className="px-4 py-6 text-center text-sm text-[#999]">Loading…</div>
        )}
        {!loading && notifications.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-[#999]">
            <p className="text-2xl mb-2">🔔</p>
            <p>No notifications yet</p>
          </div>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex gap-3 px-4 py-3 hover:bg-[#f8f9fa] ${!n.read ? 'bg-[#EEF3FB]' : ''}`}
          >
            <span className="text-xl shrink-0 mt-0.5">
              {NOTIF_ICON[n.type] || '📢'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1d2226]">{n.title}</p>
              <p className="text-xs text-[#666] mt-0.5">{n.message}</p>
              <p className="text-[10px] text-[#999] mt-1">{timeAgo(n.createdAt)}</p>
            </div>
            {!n.read && (
              <span className="w-2 h-2 bg-[#0A66C2] rounded-full shrink-0 mt-1.5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
