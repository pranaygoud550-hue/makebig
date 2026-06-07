'use client';

import type { AppNotification } from '@/lib/hooks/useNotifications';
import { useProfileView } from '@/lib/context/ProfileViewContext';
import { Skeleton } from '@/components/ui/Skeleton';

const NOTIF_ICON: Record<string, string> = {
  join: '🙋',
  join_request: '🙋',
  join_request_sent: '📤',
  join_approved_sent: '✅',
  invite: '📩',
  invite_sent: '📤',
  friend_request: '👋',
  friend_request_sent: '📤',
  friend_accepted_sent: '🤝',
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

function profileContactFromNotification(n: AppNotification): string | null {
  const m = n.metadata;
  if (!m) return null;

  if (m.direction === 'sent' && typeof m.targetContact === 'string' && m.targetContact.trim()) {
    return m.targetContact.trim().toLowerCase();
  }

  const keys = [
    'authorContact',
    'liker',
    'commenter',
    'memberContact',
    'senderContact',
    'rater',
    'requesterContact',
    'friendContact',
    'ownerContact',
  ];
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
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e0e0e0] dark:border-gray-700 overflow-hidden animate-fadeIn">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e0e0e0] dark:border-gray-700">
        <p className="text-sm font-bold text-[#1d2226] dark:text-white">Notifications</p>
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

      <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#f0f0f0] dark:divide-gray-700">
        {loading && (
          <div className="px-4 py-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && notifications.length === 0 && (
          <div className="px-4 py-12 text-center animate-fadeIn">
            <p className="text-4xl mb-3">🔔</p>
            <p className="font-semibold text-[#1d2226] dark:text-white">You&apos;re all caught up!</p>
            <p className="text-sm text-[#666] dark:text-gray-400 mt-2">No new notifications</p>
          </div>
        )}
        {notifications.map((n) => {
          const profileContact = profileContactFromNotification(n);
          const isSent = n.metadata?.direction === 'sent' || n.type.endsWith('_sent');
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                if (profileContact) openProfile(profileContact, profileContact);
              }}
              className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-[#f8f9fa] dark:hover:bg-gray-700/50 transition-colors toast-slide-in ${
                !n.read ? 'bg-[#EEF3FB] dark:bg-blue-950/30' : ''
              }`}
            >
              <span className="text-xl shrink-0 mt-0.5">
                {NOTIF_ICON[n.type] || '📢'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1d2226]">
                  {n.title}
                  {isSent && (
                    <span className="ml-1.5 text-[10px] font-medium text-[#666] uppercase tracking-wide">
                      You
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#666] mt-0.5">{n.message}</p>
                <p className="text-[10px] text-[#999] mt-1">{timeAgo(n.createdAt)}</p>
                {profileContact && (
                  <p className="text-[10px] text-[#0A66C2] mt-1 font-medium">
                    {isSent ? 'Tap to view their profile' : 'Tap to view profile'}
                  </p>
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
