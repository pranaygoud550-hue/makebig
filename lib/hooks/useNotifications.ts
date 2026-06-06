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

const API = getApiOrigin();

function getJwtUserId(): string | null {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.userId === 'string' ? payload.userId : null;
  } catch {
    return null;
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

function isForUser(notif: AppNotification, effectiveUserId: string, fallbackUserId?: string) {
  if (!notif.userId) return true;
  if (notif.userId === effectiveUserId) return true;
  if (fallbackUserId && notif.userId === fallbackUserId) return true;
  return false;
}

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const effectiveUserId = useMemo(
    () => getJwtUserId() || userId || '',
    [userId]
  );

  const fetchNotifications = useCallback(async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    try {
      const headers = await getAuthHeadersAsync();
      const res = await fetch(`${API}/api/users/${effectiveUserId}/notifications`, {
        headers,
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
  }, [effectiveUserId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!effectiveUserId) return;
    let socket: Awaited<ReturnType<typeof createApiSocket>> = null;
    let cancelled = false;

    const onNotification = (raw: Record<string, unknown>) => {
      const notif = normalizeNotification(raw);
      if (!isForUser(notif, effectiveUserId, userId)) return;
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
  }, [effectiveUserId, userId]);

  const markAllRead = useCallback(async () => {
    if (!effectiveUserId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const headers = await getAuthHeadersAsync();
      await fetch(`${API}/api/users/${effectiveUserId}/notifications/read`, {
        method: 'PATCH',
        headers,
      });
    } catch {
      /* ignore */
    }
  }, [effectiveUserId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, loading, unreadCount, fetchNotifications, markAllRead };
}
