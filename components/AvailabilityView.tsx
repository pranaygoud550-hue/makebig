'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAuthHeadersAsync } from '@/lib/api';
import { clientApiUrl } from '@/lib/apiBase';
import { User } from '@/lib/types';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};
const SLOTS = ['morning', 'afternoon', 'evening'] as const;
const SLOT_LABELS = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };

type AvailabilityMap = Record<string, { morning?: boolean; afternoon?: boolean; evening?: boolean }>;

interface MemberAvail {
  name: string;
  contact: string;
  availability?: AvailabilityMap;
}

interface AvailabilityViewProps {
  projectId?: string;
  user: User;
}

function emptyAvailability(): AvailabilityMap {
  return Object.fromEntries(DAYS.map((d) => [d, { morning: false, afternoon: false, evening: false }]));
}

export function AvailabilityView({ projectId, user }: AvailabilityViewProps) {
  const [mine, setMine] = useState<AvailabilityMap>(() => emptyAvailability());
  const [team, setTeam] = useState<MemberAvail[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if ((user as User & { availability?: AvailabilityMap }).availability) {
      setMine({ ...emptyAvailability(), ...(user as User & { availability?: AvailabilityMap }).availability });
    }
  }, [user]);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const headers = await getAuthHeadersAsync();
      const res = await fetch(clientApiUrl(`/api/projects/${projectId}/team-availability`), {
        headers,
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) setTeam(data.data.members || []);
    })();
  }, [projectId]);

  const toggle = (day: string, slot: string) => {
    setMine((prev) => ({
      ...prev,
      [day]: { ...prev[day], [slot]: !prev[day]?.[slot as keyof AvailabilityMap[string]] },
    }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    const headers = await getAuthHeadersAsync();
    await fetch(clientApiUrl('/api/users/me/availability'), {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ availability: mine }),
    });
    setSaving(false);
    setSaved(true);
  };

  const overlapHints = useMemo(() => {
    const hints: string[] = [];
    for (const slot of SLOTS) {
      for (const day of DAYS) {
        const count =
          team.filter((m) => m.availability?.[day]?.[slot]).length +
          (mine[day]?.[slot] ? 1 : 0);
        if (count >= 3) {
          hints.push(`${count} members free ${DAY_LABELS[day]} ${SLOT_LABELS[slot].toLowerCase()}`);
        }
      }
    }
    return hints.slice(0, 4);
  }, [team, mine]);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-bold text-[#1d2226] dark:text-white">Team schedule</h2>
        <p className="text-sm text-[#666] dark:text-gray-400 mt-1">
          Set when you&apos;re free each week. We&apos;ll highlight overlap for meetings.
        </p>
      </header>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e0e0e0] dark:border-gray-700 p-4 overflow-x-auto">
        <p className="text-xs font-bold text-[#666] mb-3">Your availability</p>
        <table className="w-full text-xs min-w-[480px]">
          <thead>
            <tr>
              <th className="text-left py-1" />
              {SLOTS.map((s) => (
                <th key={s} className="text-center py-1 font-semibold text-[#666]">
                  {SLOT_LABELS[s]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => (
              <tr key={day}>
                <td className="py-2 font-semibold text-[#1d2226] dark:text-white">{DAY_LABELS[day]}</td>
                {SLOTS.map((slot) => (
                  <td key={slot} className="text-center py-2">
                    <button
                      type="button"
                      onClick={() => toggle(day, slot)}
                      className={`w-8 h-8 rounded-lg border transition-colors ${
                        mine[day]?.[slot]
                          ? 'bg-[#0A66C2] border-[#0A66C2] text-white'
                          : 'bg-[#f3f2ef] dark:bg-gray-700 border-[#e0e0e0] dark:border-gray-600'
                      }`}
                      aria-label={`${DAY_LABELS[day]} ${slot}`}
                    >
                      {mine[day]?.[slot] ? '✓' : ''}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="mt-4 px-4 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full disabled:opacity-50"
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save availability'}
        </button>
      </div>

      {overlapHints.length > 0 && (
        <div className="bg-[#EEF3FB] dark:bg-blue-950/30 border border-[#0A66C2]/20 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-[#0A66C2]">Best meeting windows</p>
          <ul className="text-sm text-[#666] dark:text-gray-300 mt-1 space-y-1">
            {overlapHints.map((h) => (
              <li key={h}>• {h}</li>
            ))}
          </ul>
        </div>
      )}

      {team.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#666] uppercase">Team overview</p>
          {team.map((m) => (
            <div
              key={m.contact}
              className="text-sm px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-[#e0e0e0] dark:border-gray-700"
            >
              <span className="font-semibold">{m.name || m.contact}</span>
              <span className="text-[#999] ml-2">
                {DAYS.filter((d) => SLOTS.some((s) => m.availability?.[d]?.[s])).length} slots set
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
