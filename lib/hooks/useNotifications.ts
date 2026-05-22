'use client';

import { useState, useEffect, useCallback } from 'react';
import { createApiSocket } from '@/lib/realtime';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const API =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:5001';

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/users/${userId}/notifications`);
      const data = await res.json();
      if (data.success) {
        setNotifications(
          (data.data.notifications || []).map((n: Record<string, unknown>) => ({
            id: String(n.id || n._id),
            type: String(n.type || ''),
            title: String(n.title || ''),
            message: String(n.message || ''),
            read: Boolean(n.read),
            createdAt: String(n.createdAt || ''),
          }))
        );
      }
    } catch {
      /* API offline */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!userId) return;
    let socket: Awaited<ReturnType<typeof createApiSocket>> = null;
    let cancelled = false;

    createApiSocket().then((s) => {
      if (cancelled || !s) return;
      socket = s;
      s.on('new_notification', (notif: AppNotification) => {
        setNotifications((prev) => [notif, ...prev]);
      });
    });

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [userId]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    try {
      await fetch(`${API}/api/users/${userId}/notifications/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* ignore */
    }
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, loading, unreadCount, fetchNotifications, markAllRead };
}
