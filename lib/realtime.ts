'use client';

import io, { Socket } from 'socket.io-client';
import { apiCheckHealth } from './api';

const API =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:5001';

/** Connect only when Express API is up — avoids console errors during `next dev` only. */
export async function createApiSocket(): Promise<Socket | null> {
  try {
    const ok = await apiCheckHealth();
    if (!ok) return null;
    return io(API, {
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: 5000,
    });
  } catch {
    return null;
  }
}
