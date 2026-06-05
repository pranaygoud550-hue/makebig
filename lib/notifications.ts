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

export function normalizeNotification(n: Record<string, unknown>): AppNotification {
  const meta = n.metadata;
  return {
    id: String(n.id || ''),
    type: String(n.type || ''),
    title: String(n.title || ''),
    message: String(n.message || ''),
    read: Boolean(n.read ?? n.isRead),
    createdAt: String(n.createdAt || n.created_at || ''),
    userId: n.userId ? String(n.userId) : n.user_id ? String(n.user_id) : n.user_contact ? String(n.user_contact) : undefined,
    actionUrl: n.actionUrl ? String(n.actionUrl) : undefined,
    metadata: meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : undefined,
  };
}
