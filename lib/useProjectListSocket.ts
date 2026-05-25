'use client';

import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import type { BrowseProject } from './api';
import { isSupabaseConfigured, supabase } from './supabase';
import { createApiSocket } from './realtime';

export interface ProjectChangedPayload {
  projectId: string;
  status?: string;
  updatedFields?: Record<string, unknown>;
}

export interface ProjectListSocketHandlers {
  onCreated?: (project: BrowseProject) => void;
  onPublished?: (project: BrowseProject) => void;
  onChanged?: (payload: ProjectChangedPayload) => void;
}

/**
 * Subscribes to global project list events (not scoped to a project room).
 */
export function useProjectListSocket(handlers: ProjectListSocketHandlers) {
  const handlersRef = useRef<ProjectListSocketHandlers>(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('project-list')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'projects',
        }, ({ new: row }) => {
          const project = {
            id: row.id,
            categoryId: row.category_id,
            name: row.name,
            desc: row.description || '',
            roles: row.roles || [],
            salaryMin: row.salary_min || 0,
            salaryMax: row.salary_max || 0,
            currency: row.currency || 'INR',
            ownerContact: row.owner_contact,
            createdAt: row.created_at,
          } as BrowseProject;
          handlersRef.current.onCreated?.(project);
          if (row.status === 'published') handlersRef.current.onPublished?.(project);
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
        }, ({ new: row }) => {
          handlersRef.current.onChanged?.({
            projectId: row.id,
            status: row.status,
            updatedFields: row,
          });
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    let socket: Socket | null = null;
    let cancelled = false;

    createApiSocket().then((s) => {
      if (cancelled || !s) return;
      socket = s;

      const handleCreated = (project: BrowseProject) => {
        handlersRef.current.onCreated?.(project);
      };
      const handlePublished = (project: BrowseProject) => {
        handlersRef.current.onPublished?.(project);
      };
      const handleChanged = (payload: ProjectChangedPayload) => {
        handlersRef.current.onChanged?.(payload);
      };

      socket.on('project_created', handleCreated);
      socket.on('project_published', handlePublished);
      socket.on('project_changed', handleChanged);
    });

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, []);
}
