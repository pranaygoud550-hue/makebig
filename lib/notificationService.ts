import Notification from '@/backend/models/Notification.js';
import { findUserByContact } from '@/lib/userUpsert.js';
import { connectMongoServer } from '@/lib/mongoServer';
import type { AuthContact } from '@/lib/verifyAuthToken';

function toClientNotification(doc: Record<string, unknown>) {
  return {
    id: String(doc._id || doc.id || ''),
    userId: doc.userId ? String(doc.userId) : undefined,
    projectId: doc.projectId,
    type: doc.type,
    title: doc.title,
    message: doc.message,
    read: Boolean(doc.isRead ?? doc.read),
    actionUrl: doc.actionUrl,
    metadata: doc.metadata,
    createdAt: doc.createdAt,
  };
}

async function resolveNotificationUserId(auth: AuthContact): Promise<string | null> {
  if (auth.userId) return auth.userId;
  const user = await findUserByContact(auth.contact);
  return user?._id?.toString() || null;
}

export async function listNotificationsForAuth(auth: AuthContact) {
  const connected = await connectMongoServer();
  if (!connected) {
    return { ok: false as const, status: 503, error: 'Database unavailable — check MONGODB_URI on Vercel' };
  }

  const userId = await resolveNotificationUserId(auth);
  if (!userId) {
    return { ok: true as const, notifications: [] as ReturnType<typeof toClientNotification>[] };
  }

  const notifications = await Notification.find({
    $or: [{ userId }, { userId: auth.contact }],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return {
    ok: true as const,
    notifications: notifications.map((n) =>
      toClientNotification(n as unknown as Record<string, unknown>)
    ),
  };
}

export async function markNotificationsReadForAuth(auth: AuthContact) {
  const connected = await connectMongoServer();
  if (!connected) {
    return { ok: false as const, status: 503, error: 'Database unavailable' };
  }

  const userId = await resolveNotificationUserId(auth);
  if (!userId) {
    return { ok: true as const };
  }

  await Notification.updateMany(
    {
      isRead: false,
      $or: [{ userId }, { userId: auth.contact }],
    },
    { $set: { isRead: true } }
  );

  return { ok: true as const };
}
