'use client';

import { useState, useEffect, useRef } from 'react';
import { ProjectData } from '@/lib/types';
import { ensureProjectOnline } from '@/lib/ensureProjectOnline';
import { hasActiveWorkspace, projectNeedsSync, workspaceLabel } from '@/lib/projectWorkspace';
import { isValidMongoId } from '@/lib/projectMappers';
import { EmptyState } from '@/components/ui/EmptyState';

interface EmptyConfig {
  title: string;
  description: string;
  icon?: string;
  actions?: { label: string; onClick?: () => void; href?: string; variant?: 'primary' | 'secondary' }[];
}

interface ProjectWorkspaceGateProps {
  currentProject: ProjectData | null;
  userContact?: string;
  onOpenDashboard: () => void;
  onProjectSynced?: (project: ProjectData) => void;
  noProject: EmptyConfig;
  needsSync: EmptyConfig;
  children: React.ReactNode;
}

export function ProjectWorkspaceGate({
  currentProject,
  userContact,
  onOpenDashboard,
  onProjectSynced,
  noProject,
  needsSync,
  children,
}: ProjectWorkspaceGateProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const autoSyncStarted = useRef(false);

  const needsLink =
    currentProject &&
    hasActiveWorkspace(currentProject) &&
    (!isValidMongoId(currentProject.id) || projectNeedsSync(currentProject));

  const runSync = async () => {
    if (!userContact || !currentProject) return;
    setSyncing(true);
    setSyncError(null);
    setSyncHint(null);
    const result = await ensureProjectOnline(currentProject, userContact);
    setSyncing(false);
    if (result.ok && result.project) {
      setSyncHint(result.message);
      onProjectSynced?.(result.project);
    } else {
      setSyncError(result.message);
    }
  };

  useEffect(() => {
    if (!needsLink || !userContact || !currentProject) return;
    if (autoSyncStarted.current) return;
    autoSyncStarted.current = true;
    runSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync once per mount when link needed
  }, [needsLink, userContact, currentProject?.name]);

  if (!hasActiveWorkspace(currentProject)) {
    return (
      <EmptyState
        icon={noProject.icon || '📁'}
        title={noProject.title}
        description={noProject.description}
        actions={noProject.actions}
      />
    );
  }

  if (needsLink) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e0e0e0] dark:border-gray-700 p-8 text-center space-y-4 animate-fadeIn">
        <p className="text-2xl">{needsSync.icon || '🔗'}</p>
        <div>
          <p className="font-semibold text-[#1d2226] dark:text-white">{needsSync.title}</p>
          <p className="text-sm text-[#666] dark:text-gray-400 mt-1 max-w-md mx-auto">
            {syncing ? 'Connecting your project to the server…' : needsSync.description}
          </p>
          <p className="text-sm font-semibold text-[#0A66C2] dark:text-sky-400 mt-3">
            {workspaceLabel(currentProject)}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              autoSyncStarted.current = true;
              runSync();
            }}
            disabled={syncing}
            className="px-4 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#004182] disabled:opacity-50 active:scale-95 transition-transform"
          >
            {syncing ? 'Connecting…' : 'Retry connect'}
          </button>
          <button
            type="button"
            onClick={onOpenDashboard}
            className="px-4 py-2 border border-[#0A66C2] text-[#0A66C2] dark:text-sky-400 text-sm font-semibold rounded-full hover:bg-[#EEF3FB] dark:hover:bg-gray-700 active:scale-95 transition-transform"
          >
            Open dashboard
          </button>
        </div>
        {syncHint && (
          <p className="text-xs text-green-700 dark:text-green-400 max-w-sm mx-auto">{syncHint}</p>
        )}
        {syncError && (
          <div className="text-left max-w-md mx-auto space-y-2">
            <p className="text-xs text-red-600">{syncError}</p>
            {syncError.includes('API is not running') && (
              <p className="text-xs text-[#666] dark:text-gray-400 bg-[#f8f9fa] dark:bg-gray-900 border border-[#e0e0e0] dark:border-gray-600 rounded-lg p-3 font-mono">
                npm run api:dev
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
