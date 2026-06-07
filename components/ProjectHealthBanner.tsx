'use client';

import { useEffect, useState } from 'react';
import { getAuthHeadersAsync } from '@/lib/api';
import { getApiOrigin } from '@/lib/apiBase';

interface ProjectHealthBannerProps {
  projectId?: string;
  projectName?: string;
}

export function ProjectHealthBanner({ projectId, projectName }: ProjectHealthBannerProps) {
  const [showInactive, setShowInactive] = useState(false);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const headers = await getAuthHeadersAsync();
      const [projRes, healthRes] = await Promise.all([
        fetch(`${getApiOrigin()}/api/projects/${projectId}`, { headers }),
        fetch(`/api/projects/${projectId}/health`),
      ]);
      const proj = await projRes.json();
      const health = await healthRes.json();
      if (health.success) setHealthScore(health.data?.score ?? null);
      const p = proj.data?.project || proj.data;
      if (p?.inactivePromptAt && !p?.inactiveConfirmedAt) setShowInactive(true);
    })();
  }, [projectId]);

  const confirmActive = async () => {
    if (!projectId) return;
    setBusy(true);
    const headers = await getAuthHeadersAsync();
    await fetch(`${getApiOrigin()}/api/projects/${projectId}/confirm-active`, {
      method: 'POST',
      headers,
    });
    setShowInactive(false);
    setBusy(false);
  };

  const archive = async () => {
    if (!projectId) return;
    setBusy(true);
    const headers = await getAuthHeadersAsync();
    await fetch(`${getApiOrigin()}/api/projects/${projectId}/archive`, {
      method: 'POST',
      headers,
    });
    setShowInactive(false);
    setBusy(false);
  };

  if (!showInactive && (healthScore === null || healthScore >= 40)) return null;

  return (
    <div className="space-y-2">
      {healthScore !== null && healthScore < 40 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          ⚠️ <strong>{projectName}</strong> health score is {healthScore}. Check in with your team this week.
        </div>
      )}
      {showInactive && (
        <div className="bg-white dark:bg-gray-800 border border-[#e0e0e0] dark:border-gray-700 rounded-xl px-4 py-4">
          <p className="font-semibold text-[#1d2226] dark:text-white">Is this project still active?</p>
          <p className="text-sm text-[#666] dark:text-gray-400 mt-1">
            We haven&apos;t seen team activity in over a week.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmActive()}
              className="px-4 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full"
            >
              Yes, still active
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void archive()}
              className="px-4 py-2 border border-[#d9d9d9] text-sm font-semibold rounded-full"
            >
              Archive project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
