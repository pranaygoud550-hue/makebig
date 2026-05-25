'use client';

import type { AppNotification } from '@/lib/hooks/useNotifications';
import { useProfileView } from '@/lib/context/ProfileViewContext';

const NOTIF_ICON: Record<string, string> = {
  join: '🙋',
  invite: '📩',
  task: '✅',
  system: '⚙️',
  post: '📝',
  like: '❤️',
  comment: '💬',
  message: '💬',
  activity: '👥',
  mention: '@',
  project_update: '📁',
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

function actorContactFromNotification(n: AppNotification): string | null {
  const m = n.metadata;
  if (!m) return null;
  const keys = ['authorContact', 'liker', 'commenter', 'memberContact', 'senderContact', 'rater'];
  for (const key of keys) {
    const val = m[key];
    if (typeof val === 'string' && val.trim()) return val.trim().toLowerCase();
  }
  return null;
}

interface NotificationsViewProps {
  userId?: string;
  notifications: AppNotification[];
  loading: boolean;
  fetchNotifications: () => void;
  markAllRead: () => void;
}

export function NotificationsView({
  userId,
  notifications,
  loading,
  fetchNotifications,
  markAllRead,
}: NotificationsViewProps) {
  const { openProfile } = useProfileView();

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
        <div className="flex items-center gap-3">
          {notifications.some((n) => !n.read) && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs text-[#666] hover:text-[#1d2226] font-medium"
            >
              Mark all read
            </button>
          )}
          <button
            type="button"
            onClick={fetchNotifications}
            className="text-xs text-[#0A66C2] hover:underline font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#f0f0f0]">
        {loading && (
          <div className="px-4 py-6 text-center text-sm text-[#999]">Loading…</div>
        )}
        {!loading && notifications.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-[#999]">
            <p className="text-2xl mb-2">🔔</p>
            <p>No notifications yet</p>
            <p className="text-xs mt-2 text-[#bbb]">
              Posts, likes, comments, invites, and team updates appear here.
            </p>
          </div>
        )}
        {notifications.map((n) => {
          const actor = actorContactFromNotification(n);
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                if (actor) openProfile(actor, actor);
              }}
              className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-[#f8f9fa] transition-colors ${
                !n.read ? 'bg-[#EEF3FB]' : ''
              }`}
            >
              <span className="text-xl shrink-0 mt-0.5">
                {NOTIF_ICON[n.type] || '📢'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1d2226]">{n.title}</p>
                <p className="text-xs text-[#666] mt-0.5">{n.message}</p>
                <p className="text-[10px] text-[#999] mt-1">{timeAgo(n.createdAt)}</p>
                {actor && (
                  <p className="text-[10px] text-[#0A66C2] mt-1 font-medium">Tap to view profile</p>
                )}
              </div>
              {!n.read && (
                <span className="w-2 h-2 bg-[#0A66C2] rounded-full shrink-0 mt-1.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
