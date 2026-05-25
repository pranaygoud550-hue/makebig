'use client';

import io, { Socket } from 'socket.io-client';
import { apiCheckHealth, getAuthTokenAsync } from './api';

const API =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:5001';

export interface ProjectRoomUser {
  id?: string;
  name?: string;
  contact?: string;
}

/** Connect when Express API is up. Auth token is sent when available. */
export async function createApiSocket(): Promise<Socket | null> {
  try {
    const ok = await apiCheckHealth();
    if (!ok) return null;
    const token = await getAuthTokenAsync();
    return io(API, {
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 8,
      timeout: 8000,
    });
  } catch {
    return null;
  }
}

/** Join a project room after connect (or immediately if already connected). */
export function joinProjectRoom(
  socket: Socket,
  projectId: string,
  user: ProjectRoomUser = {}
) {
  const emitJoin = () => {
    socket.emit('join_project', {
      projectId,
      userId: user.id || user.contact || 'guest',
      userName: user.name || 'User',
      userContact: user.contact || '',
    });
  };

  if (socket.connected) emitJoin();
  else socket.on('connect', emitJoin);
}

/** One-shot helper: connect + join project room. */
export async function connectProjectRoom(
  projectId: string,
  user: ProjectRoomUser = {}
): Promise<Socket | null> {
  if (!projectId) return null;
  const socket = await createApiSocket();
  if (!socket) return null;
  joinProjectRoom(socket, projectId, user);
  return socket;
}
