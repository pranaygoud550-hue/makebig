'use client';

import { useEffect, useState } from 'react';

const PROMPT_KEY = 'makebig_push_prompt_dismissed';

export function PushNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'unsupported'>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(PROMPT_KEY)) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === 'granted') return;
    setVisible(true);
  }, []);

  const enable = async () => {
    setStatus('loading');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setStatus('unsupported');
        return;
      }
      await navigator.serviceWorker.register('/service-worker.js');
      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch('/api/push/vapid-public-key');
      const { publicKey } = await keyRes.json();
      if (!publicKey) {
        setStatus('unsupported');
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const token = localStorage.getItem('makebig_token');
      await fetch('/api/users/me/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      setStatus('done');
      localStorage.setItem(PROMPT_KEY, '1');
      setTimeout(() => setVisible(false), 1500);
    } catch {
      setStatus('unsupported');
    }
  };

  const dismiss = () => {
    localStorage.setItem(PROMPT_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-auto md:max-w-sm md:ml-4 z-[90] bg-white dark:bg-gray-900 border border-[#e0e0e0] dark:border-gray-700 rounded-2xl shadow-xl p-4 animate-slideInRight">
      <p className="font-semibold text-[#1d2226] dark:text-white text-sm">Enable notifications?</p>
      <p className="text-xs text-[#666] dark:text-gray-400 mt-1">
        Get alerts for messages, join approvals, and standup reminders.
      </p>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => void enable()}
          disabled={status === 'loading'}
          className="flex-1 py-2 bg-[#0A66C2] text-white text-xs font-semibold rounded-full"
        >
          {status === 'done' ? 'Enabled ✓' : status === 'loading' ? 'Enabling…' : 'Enable'}
        </button>
        <button type="button" onClick={dismiss} className="px-3 py-2 text-xs text-[#666]">
          Not now
        </button>
      </div>
      {status === 'unsupported' && (
        <p className="text-[10px] text-amber-700 mt-2">Push not available — add VAPID keys on the server.</p>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
