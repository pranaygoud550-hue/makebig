'use client';

import { useEffect } from 'react';
import { createApiSocket } from '@/lib/realtime';

interface RemovedFromProjectPayload {
  projectId?: string;
  projectName?: string;
  message?: string;
}

interface UseRemovedFromProjectOptions {
  userContact?: string;
  activeProjectId?: string | null;
  onRemoved: (payload: RemovedFromProjectPayload) => void;
}

/** Listen for owner-initiated removal and clear workspace. */
export function useRemovedFromProject({
  userContact,
  activeProjectId,
  onRemoved,
}: UseRemovedFromProjectOptions) {
  useEffect(() => {
    if (!userContact) return;

    let cancelled = false;
    let socket: Awaited<ReturnType<typeof createApiSocket>> = null;

    const handler = (payload: RemovedFromProjectPayload) => {
      if (payload.projectId && activeProjectId && payload.projectId !== activeProjectId) {
        return;
      }
      onRemoved(payload);
    };

    createApiSocket().then((s) => {
      if (cancelled || !s) return;
      socket = s;
      s.on('removed-from-project', handler);
    });

    return () => {
      cancelled = true;
      socket?.off('removed-from-project', handler);
      socket?.disconnect();
    };
  }, [userContact, activeProjectId, onRemoved]);
}
