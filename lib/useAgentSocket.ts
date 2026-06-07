'use client';

import { useEffect, useRef, useCallback } from 'react';
import { connectProjectRoom } from '@/lib/realtime';
import type { AgentCompleteEvent, AgentStepEvent } from '@/lib/agentTypes';

interface UseAgentSocketOptions {
  projectId?: string;
  userId?: string;
  userName?: string;
  userContact?: string;
  enabled?: boolean;
  onStep?: (event: AgentStepEvent) => void;
  onComplete?: (event: AgentCompleteEvent) => void;
}

export function useAgentSocket({
  projectId,
  userId,
  userName,
  userContact,
  enabled = true,
  onStep,
  onComplete,
}: UseAgentSocketOptions) {
  const onStepRef = useRef(onStep);
  const onCompleteRef = useRef(onComplete);
  onStepRef.current = onStep;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!enabled || !projectId) return;

    let cancelled = false;
    let socket: Awaited<ReturnType<typeof connectProjectRoom>> = null;

    connectProjectRoom(projectId, {
      id: userId,
      name: userName,
      contact: userContact,
    }).then((s) => {
      if (cancelled || !s) return;
      socket = s;

      const handleStep = (data: AgentStepEvent) => {
        onStepRef.current?.(data);
      };
      const handleComplete = (data: AgentCompleteEvent) => {
        onCompleteRef.current?.(data);
      };

      socket.on('agent_step', handleStep);
      socket.on('agent_complete', handleComplete);
    });

    return () => {
      cancelled = true;
      socket?.off('agent_step');
      socket?.off('agent_complete');
      socket?.disconnect();
    };
  }, [projectId, userId, userName, userContact, enabled]);

  const joinRoom = useCallback(async () => {
    if (!projectId) return null;
    return connectProjectRoom(projectId, {
      id: userId,
      name: userName,
      contact: userContact,
    });
  }, [projectId, userId, userName, userContact]);

  return { joinRoom };
}
