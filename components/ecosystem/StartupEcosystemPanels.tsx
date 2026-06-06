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

const fieldClass =
  'w-full border border-[#d9d9d9] rounded-xl px-3 py-2 text-sm bg-white text-[#1d2226] placeholder:text-[#999] focus:outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20';

export function StartupEcosystemPanels({ projectId, isOwner }: StartupEcosystemPanelsProps) {
  const [configured, setConfigured] = useState(false);
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
  const [editNextMilestone, setEditNextMilestone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([
      fetch(`/api/projects/${projectId}/journey`).then((r) => r.json()),
      fetch(`/api/projects/${projectId}/health`).then((r) => r.json()),
      fetch(`/api/projects/${projectId}/readiness`).then((r) => r.json()),
    ]).then(([j, h, r]) => {
      if (j.success) {
        setConfigured(Boolean(j.data.configured));
        setJourney(j.data.journey);
        setEditStage(j.data.journey?.currentStage || 'idea');
        setEditPct(j.data.journey?.completionPercent || 0);
        setEditNextMilestone(j.data.journey?.nextMilestone || '');
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
          nextMilestone: editNextMilestone.trim() || undefined,
          note: editNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigured(Boolean(data.data.configured));
        setJourney(data.data.journey);
        setEditNote('');
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  const showHealth =
    health &&
    (configured || health.score > 0 || health.heatmap.some((h) => h.count > 0));
  const showReadiness = readiness && (configured || readiness.overall > 0);

  return (
    <div className="space-y-5">
      {configured && journey ? (
        <ProjectTimeline
          currentStage={journey.currentStage}
          completionPercent={journey.completionPercent}
          nextMilestone={journey.nextMilestone}
          lastUpdated={journey.lastUpdated}
        />
      ) : (
        <section className="bg-white rounded-2xl border border-dashed border-[#d9d9d9] p-5 text-center">
          <p className="text-sm font-semibold text-[#1d2226]">Startup journey not started</p>
          <p className="text-xs text-[#666] mt-1 max-w-sm mx-auto">
            {isOwner
              ? 'Save your first milestone below to start tracking stages on your public profile.'
              : 'The founder has not published their journey timeline yet.'}
          </p>
        </section>
      )}

      {isOwner && (
        <div className="bg-[#EEF3FB] rounded-2xl border border-[#0A66C2]/20 p-4 space-y-3 [color-scheme:light]">
          <p className="text-xs font-bold text-[#0A66C2] uppercase">
            {configured ? 'Update journey' : 'Start your journey'}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <select
              value={editStage}
              onChange={(e) => setEditStage(e.target.value as JourneyStageId)}
              className={fieldClass}
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
              className={fieldClass}
              placeholder="Completion %"
            />
          </div>
          <input
            type="text"
            value={editNextMilestone}
            onChange={(e) => setEditNextMilestone(e.target.value)}
            className={fieldClass}
            placeholder="Next milestone (optional)"
          />
          <textarea
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="Milestone update (optional)"
            className={fieldClass}
            rows={2}
          />
          <button
            type="button"
            onClick={saveJourney}
            disabled={saving}
            className="px-4 py-2 bg-[#0A66C2] text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : configured ? 'Save milestone' : 'Start tracking'}
          </button>
        </div>
      )}

      {showHealth && (
        <>
          <ProjectHealthMeter health={health!} />
          {health!.heatmap.some((h) => h.count > 0) && (
            <ActivityHeatmap heatmap={health!.heatmap} />
          )}
        </>
      )}

      {showReadiness && <StartupReadinessDashboard scores={readiness!} />}
    </div>
  );
}
