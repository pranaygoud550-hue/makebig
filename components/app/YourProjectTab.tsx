'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProjectData } from '@/lib/types';
import { hasActiveWorkspace } from '@/lib/projectWorkspace';
import { StartupEcosystemPanels } from '@/components/ecosystem/StartupEcosystemPanels';
import { LeaveProjectModal } from '@/components/app/LeaveProjectModal';
import { apiLeaveProject } from '@/lib/api';
import type { LeaveReasonOption } from '@/lib/projectLeave';
import type { DashboardNavTab } from '@/components/DashboardNew';

interface YourProjectTabProps {
  currentProject: ProjectData | null;
  userContact?: string;
  onStartProject: () => void;
  onJoinProject: () => void;
  onOpenDashboard: (section?: DashboardNavTab) => void;
  onLeaveSuccess?: () => void;
  onShowToast?: (message: string, variant?: 'success' | 'error') => void;
}

const DASHBOARD_SHORTCUTS: { id: DashboardNavTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'team', label: 'Team', icon: '👥' },
  { id: 'messages', label: 'Messages', icon: '💬' },
  { id: 'feed', label: 'Project feed', icon: '📣' },
  { id: 'matches', label: 'Co-founders', icon: '🤝' },
  { id: 'activity', label: 'Activity', icon: '⚡' },
];

export function YourProjectTab({
  currentProject,
  userContact,
  onStartProject,
  onJoinProject,
  onOpenDashboard,
  onLeaveSuccess,
  onShowToast,
}: YourProjectTabProps) {
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const hasWorkspace = hasActiveWorkspace(currentProject);
  const isMember = currentProject?.mode === 'member';
  const canLeave = isMember && Boolean(currentProject?.id) && Boolean(userContact);

  const handleLeaveConfirm = async (payload: {
    reason?: LeaveReasonOption;
    reasonText?: string;
  }) => {
    if (!currentProject?.id) return;
    setLeaving(true);
    const result = await apiLeaveProject(currentProject.id, payload);
    setLeaving(false);

    if (!result.ok) {
      onShowToast?.(result.error || 'Could not leave project', 'error');
      return;
    }

    setShowLeaveModal(false);
    onShowToast?.(`You have left ${currentProject.name}`, 'success');
    onLeaveSuccess?.();
  };

  if (hasWorkspace) {
    const city = currentProject!.city;
    const state = currentProject!.state;

    return (
      <div className="space-y-4">
        <section className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
          <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-wide">Your project</p>
          <h2 className="text-xl font-bold text-[#1d2226] mt-1">{currentProject!.name}</h2>
          {(city || state) && (
            <p className="text-sm text-[#666] mt-1">
              📍 {[city, state].filter(Boolean).join(', ')}
            </p>
          )}
          {currentProject!.description && (
            <p className="text-sm text-[#666] mt-2 line-clamp-2">{currentProject!.description}</p>
          )}
          {currentProject!.slug && (
            <Link
              href={`/startup/${currentProject!.slug}`}
              className="inline-block mt-3 text-xs font-semibold text-[#0A66C2] hover:underline"
            >
              View public startup profile →
            </Link>
          )}
          <button
            type="button"
            onClick={() => onOpenDashboard('dashboard')}
            className="mt-4 w-full py-3 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#004182]"
          >
            Open project dashboard
          </button>

          {canLeave && (
            <button
              type="button"
              onClick={() => setShowLeaveModal(true)}
              className="mt-3 w-full py-2.5 text-sm font-semibold rounded-full border border-red-600 text-red-600 bg-white hover:bg-red-50 transition-colors"
            >
              Leave project
            </button>
          )}
        </section>

        {currentProject!.id && currentProject!.mode === 'create' && (
          <section>
            <p className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-2 px-1">
              Journey · Health · Readiness
            </p>
            <StartupEcosystemPanels projectId={currentProject!.id} isOwner />
          </section>
        )}

        <section>
          <p className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-2 px-1">
            Workspace shortcuts
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DASHBOARD_SHORTCUTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenDashboard(item.id)}
                className="flex flex-col items-center gap-1.5 p-3 bg-white border border-[#e0e0e0] rounded-xl hover:border-[#0A66C2] hover:bg-[#EEF3FB] transition-colors text-center"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-semibold text-[#1d2226]">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        <p className="text-xs text-center text-[#999] px-2">
          Use <strong>Home</strong>, <strong>Explore</strong>, and <strong>Posts</strong> in the bar below to browse the app. Open the dashboard anytime from here.
        </p>

        <LeaveProjectModal
          projectName={currentProject!.name}
          isOpen={showLeaveModal}
          loading={leaving}
          onCancel={() => setShowLeaveModal(false)}
          onConfirm={(payload) => void handleLeaveConfirm(payload)}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-dashed border-[#d9d9d9] p-10 text-center">
      <p className="text-2xl mb-2">📁</p>
      <p className="font-semibold text-[#1d2226]">No active project</p>
      <p className="text-sm text-[#666] mt-1">Start something new or join an existing team.</p>
      <div className="flex flex-wrap justify-center gap-2 mt-5">
        <button
          type="button"
          onClick={onStartProject}
          className="px-4 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#004182]"
        >
          Start a project
        </button>
        <button
          type="button"
          onClick={onJoinProject}
          className="px-4 py-2 border border-[#0A66C2] text-[#0A66C2] text-sm font-semibold rounded-full hover:bg-[#EEF3FB]"
        >
          Join a project
        </button>
      </div>
    </div>
  );
}
