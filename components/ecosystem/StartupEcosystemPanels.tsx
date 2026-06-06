'use client';

import { useEffect, useState } from 'react';
import { ProjectTimeline } from '@/components/ecosystem/ProjectTimeline';
import { ProjectHealthMeter } from '@/components/ecosystem/ProjectHealthMeter';
import { ActivityHeatmap } from '@/components/ecosystem/ActivityHeatmap';
import { StartupReadinessDashboard } from '@/components/startupReadiness/StartupReadinessDashboard';
import type { JourneyStageId } from '@/lib/ecosystem/journey';
import type { HealthScore } from '@/lib/ecosystem/health';
import type { StartupReadinessScores } from '@/lib/startupReadiness/types';
import { JOURNEY_STAGES } from '@/lib/ecosystem/constants';

interface StartupEcosystemPanelsProps {
  projectId: string;
  isOwner?: boolean;
}

export function StartupEcosystemPanels({ projectId, isOwner }: StartupEcosystemPanelsProps) {
  const [journey, setJourney] = useState<{
    currentStage: JourneyStageId;
    completionPercent: number;
    nextMilestone?: string;
    lastUpdated?: string;
  } | null>(null);
  const [health, setHealth] = useState<HealthScore | null>(null);
  const [readiness, setReadiness] = useState<StartupReadinessScores | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editStage, setEditStage] = useState<JourneyStageId>('idea');
  const [editPct, setEditPct] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([
      fetch(`/api/projects/${projectId}/journey`).then((r) => r.json()),
      fetch(`/api/projects/${projectId}/health`).then((r) => r.json()),
      fetch(`/api/projects/${projectId}/readiness`).then((r) => r.json()),
    ]).then(([j, h, r]) => {
      if (j.success) {
        setJourney(j.data.journey);
        setEditStage(j.data.journey.currentStage);
        setEditPct(j.data.journey.completionPercent);
      }
      if (h.success) setHealth(h.data);
      if (r.success) setReadiness(r.data);
    });
  };

  useEffect(() => {
    if (projectId) load();
  }, [projectId]);

  const saveJourney = async () => {
    const token = localStorage.getItem('makebig_token');
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/journey`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          currentStage: editStage,
          completionPercent: editPct,
          note: editNote || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setJourney(data.data.journey);
        setEditNote('');
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {journey && (
        <ProjectTimeline
          currentStage={journey.currentStage}
          completionPercent={journey.completionPercent}
          nextMilestone={journey.nextMilestone}
          lastUpdated={journey.lastUpdated}
        />
      )}

      {isOwner && (
        <div className="bg-[#EEF3FB] rounded-2xl border border-[#0A66C2]/20 p-4 space-y-3">
          <p className="text-xs font-bold text-[#0A66C2] uppercase">Update journey</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <select
              value={editStage}
              onChange={(e) => setEditStage(e.target.value as JourneyStageId)}
              className="border border-[#d9d9d9] rounded-xl px-3 py-2 text-sm bg-white"
            >
              {JOURNEY_STAGES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              max={100}
              value={editPct}
              onChange={(e) => setEditPct(Number(e.target.value))}
              className="border border-[#d9d9d9] rounded-xl px-3 py-2 text-sm"
              placeholder="Completion %"
            />
          </div>
          <textarea
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="Milestone update (optional)"
            className="w-full border border-[#d9d9d9] rounded-xl px-3 py-2 text-sm"
            rows={2}
          />
          <button
            type="button"
            onClick={saveJourney}
            disabled={saving}
            className="px-4 py-2 bg-[#0A66C2] text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save milestone'}
          </button>
        </div>
      )}

      {health && (
        <>
          <ProjectHealthMeter health={health} />
          {health.heatmap.length > 0 && <ActivityHeatmap heatmap={health.heatmap} />}
        </>
      )}

      {readiness && <StartupReadinessDashboard scores={readiness} />}
    </div>
  );
}
