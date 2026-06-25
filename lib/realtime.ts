'use client';

import io, { Socket } from 'socket.io-client';
import { getApiOrigin } from './apiBase';
import { getAuthTokenAsync } from './api';
import { devLog } from './devLog';

export interface ProjectRoomUser {
  id?: string;
  name?: string;
  contact?: string;
}

type RoomUserPayload = {
  userId: string;
  userName: string;
  userContact: string;
};

/** Singleton socket manager — one connection reused across components. */
class SocketManager {
  private socket: Socket | null = null;
  private connectPromise: Promise<Socket | null> | null = null;
  private joinedProjectId: string | null = null;
  private joinUser: RoomUserPayload | null = null;

  private emitJoin(projectId: string, user: RoomUserPayload) {
    if (!this.socket) return;
    devLog('[realtime] join_project → room project_' + projectId);
    this.socket.emit('join_project', {
      projectId,
      userId: user.userId,
      userName: user.userName,
      userContact: user.userContact,
    });
  }

  async getSocket(): Promise<Socket | null> {
    const token = await getAuthTokenAsync();
    if (!token) {
      devLog('[realtime] no auth token');
      return null;
    }

    if (this.socket?.connected) return this.socket;
    if (this.socket && !this.socket.connected) return this.socket;

    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise<Socket | null>((resolve) => {
      const s = io(getApiOrigin(), {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 12,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      const rejoin = () => {
        if (this.joinedProjectId && this.joinUser) {
          this.emitJoin(this.joinedProjectId, this.joinUser);
        }
      };

      s.on('connect', () => {
        devLog('[realtime] connected', s.id);
        this.socket = s;
        rejoin();
        resolve(s);
      });

      s.io.on('reconnect', () => {
        devLog('[realtime] reconnected — rejoining room');
        rejoin();
      });

      s.on('connect_error', (err) => {
        console.error('[realtime] connect_error', err.message);
        this.socket = s;
        resolve(s);
      });

      this.socket = s;
    }).finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  /** Connect (if needed) and join project room. Returns the shared socket. */
  async joinProjectRoom(
    projectId: string,
    user: RoomUserPayload
  ): Promise<Socket | null> {
    if (!projectId) return null;

    this.joinedProjectId = projectId;
    this.joinUser = user;

    const socket = await this.getSocket();
    if (!socket) return null;

    const doJoin = () => this.emitJoin(projectId, user);
    if (socket.connected) doJoin();
    else socket.once('connect', doJoin);

    return socket;
  }

  leaveProjectRoom(projectId: string, userId: string, userName: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave_project', { projectId, userId, userName });
    }
    if (this.joinedProjectId === projectId) {
      this.joinedProjectId = null;
      this.joinUser = null;
    }
  }

  /** Detach listeners only — keeps singleton connection for other views. */
  releaseProjectRoom(projectId: string, userId: string, userName: string) {
    this.leaveProjectRoom(projectId, userId, userName);
  }
}

export const socketManager = new SocketManager();

/** Connect when Express API is up. Auth token is sent when available. */
export async function createApiSocket(): Promise<Socket | null> {
  return socketManager.getSocket();
}

/** Join a project room after connect (or immediately if already connected). */
export function joinProjectRoom(
  socket: Socket,
  projectId: string,
  user: ProjectRoomUser = {}
) {
  const payload: RoomUserPayload = {
    userId: user.id || user.contact || 'guest',
    userName: user.name || 'User',
    userContact: user.contact || '',
  };

  const emitJoin = () => {
    socket.emit('join_project', { projectId, ...payload });
  };

  if (socket.connected) emitJoin();
  else socket.once('connect', emitJoin);
}

/** One-shot helper: connect + join project room. */
export async function connectProjectRoom(
  projectId: string,
  user: ProjectRoomUser = {}
): Promise<Socket | null> {
  if (!projectId) return null;
  return socketManager.joinProjectRoom(projectId, {
    userId: user.id || user.contact || 'guest',
    userName: user.name || 'User',
    userContact: user.contact || '',
  });
}
