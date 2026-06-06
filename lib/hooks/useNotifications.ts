'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createApiSocket } from '@/lib/realtime';
import { getAuthHeadersAsync, getAuthToken } from '@/lib/api';
import { getApiOrigin } from '@/lib/apiBase';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  userId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

const RENDER_API = getApiOrigin();

function getJwtPayload(): { userId: string | null; contact: string | null } {
  const token = getAuthToken();
  if (!token) return { userId: null, contact: null };
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      userId: typeof payload.userId === 'string' ? payload.userId : null,
      contact: typeof payload.contact === 'string' ? payload.contact.toLowerCase().trim() : null,
    };
  } catch {
    return { userId: null, contact: null };
  }
}

export function normalizeNotification(n: Record<string, unknown>): AppNotification {
  return {
    id: String(n.id || n._id || ''),
    type: String(n.type || ''),
    title: String(n.title || ''),
    message: String(n.message || ''),
    read: Boolean(n.read ?? n.isRead),
    createdAt: String(n.createdAt || ''),
    userId: n.userId ? String(n.userId) : undefined,
    actionUrl: n.actionUrl ? String(n.actionUrl) : undefined,
    metadata:
      n.metadata && typeof n.metadata === 'object'
        ? (n.metadata as Record<string, unknown>)
        : undefined,
  };
}

function isForUser(
  notif: AppNotification,
  effectiveUserId: string,
  fallbackUserId?: string,
  authContact?: string | null
) {
  if (!notif.userId) return true;
  if (notif.userId === effectiveUserId) return true;
  if (fallbackUserId && notif.userId === fallbackUserId) return true;
  if (authContact && notif.userId === authContact) return true;
  return false;
}

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const jwt = useMemo(() => getJwtPayload(), [userId]);
  const effectiveUserId = jwt.userId || userId || jwt.contact || '';

  const fetchNotifications = useCallback(async () => {
    if (!effectiveUserId && !jwt.contact) return;
    setLoading(true);
    try {
      const headers = await getAuthHeadersAsync();

      // Primary: Vercel + Mongo (same JWT as OTP sign-in, no Render CORS)
      const localRes = await fetch('/api/users/me/notifications', { headers, cache: 'no-store' });
      if (localRes.ok) {
        const data = await localRes.json();
        if (data.success) {
          setNotifications(
            (data.data.notifications || []).map((n: Record<string, unknown>) =>
              normalizeNotification(n)
            )
          );
          return;
        }
      }

      // Fallback: Render API
      const res = await fetch(`${RENDER_API}/api/users/${effectiveUserId}/notifications`, {
        headers,
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setNotifications(
          (data.data.notifications || []).map((n: Record<string, unknown>) =>
            normalizeNotification(n)
          )
        );
      }
    } catch {
      /* API offline */
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, jwt.contact]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!effectiveUserId) return;
    let socket: Awaited<ReturnType<typeof createApiSocket>> = null;
    let cancelled = false;

    const onNotification = (raw: Record<string, unknown>) => {
      const notif = normalizeNotification(raw);
      if (!isForUser(notif, effectiveUserId, userId, jwt.contact)) return;
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
    };

    createApiSocket().then((s) => {
      if (cancelled || !s) return;
      socket = s;
      s.on('notification_received', onNotification);
    });

    return () => {
      cancelled = true;
      socket?.off('notification_received', onNotification);
      socket?.disconnect();
    };
  }, [effectiveUserId, userId, jwt.contact]);

  const markAllRead = useCallback(async () => {
    if (!effectiveUserId && !jwt.contact) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const headers = await getAuthHeadersAsync();
      const localRes = await fetch('/api/users/me/notifications/read', {
        method: 'PATCH',
        headers,
      });
      if (localRes.ok) return;

      await fetch(`${RENDER_API}/api/users/${effectiveUserId}/notifications/read`, {
        method: 'PATCH',
        headers,
      });
    } catch {
      /* ignore */
    }
  }, [effectiveUserId, jwt.contact]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, loading, unreadCount, fetchNotifications, markAllRead };
}
