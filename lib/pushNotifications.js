/**
 * Web push notification delivery via web-push + VAPID keys.
 */
let webpush = null;

async function getWebPush() {
  if (webpush) return webpush;
  try {
    webpush = await import('web-push');
    const pub = process.env.VAPID_PUBLIC_KEY || '';
    const priv = process.env.VAPID_PRIVATE_KEY || '';
    if (pub && priv) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:support@makebig.co',
        pub,
        priv
      );
    }
    return webpush;
  } catch {
    return null;
  }
}

export function isPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function sendPushToSubscriptions(subscriptions, payload) {
  const wp = await getWebPush();
  if (!wp || !isPushConfigured()) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const body = JSON.stringify(payload);

  for (const sub of subscriptions || []) {
    if (!sub?.endpoint) continue;
    try {
      await wp.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        body
      );
      sent++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}

export async function sendPushToUser(User, contact, payload) {
  const user = await User.findOne({ contact: String(contact).toLowerCase() }).lean();
  if (!user?.pushSubscriptions?.length) return { sent: 0, failed: 0 };
  return sendPushToSubscriptions(user.pushSubscriptions, payload);
}
