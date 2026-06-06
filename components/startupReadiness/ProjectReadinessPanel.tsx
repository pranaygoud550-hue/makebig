'use client';

import { useEffect, useState } from 'react';
import { StartupReadinessDashboard } from '@/components/startupReadiness/StartupReadinessDashboard';
import type { StartupReadinessScores } from '@/lib/startupReadiness/types';

interface ProjectReadinessPanelProps {
  projectId: string;
}

export function ProjectReadinessPanel({ projectId }: ProjectReadinessPanelProps) {
  const [scores, setScores] = useState<StartupReadinessScores | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}/readiness`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setScores(json.data);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#e0e0e0] p-5 animate-pulse h-48" />
    );
  }

  if (!scores) return null;

  return <StartupReadinessDashboard scores={scores} />;
}
