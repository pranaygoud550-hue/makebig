'use client';

import { useEffect, useState } from 'react';
import { ReputationSection } from '@/components/ecosystem/ReputationSection';
import type { ReputationState } from '@/lib/ecosystem/reputation';

export function ReputationPanel({ contact }: { contact: string }) {
  const [rep, setRep] = useState<ReputationState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contact) {
      setLoading(false);
      return;
    }
    fetch(`/api/users/${encodeURIComponent(contact)}/reputation`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setRep(json.data);
      })
      .finally(() => setLoading(false));
  }, [contact]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#e0e0e0] bg-white p-5 animate-pulse h-32" />
    );
  }

  if (!rep) {
    return (
      <section className="rounded-2xl border border-dashed border-[#d9d9d9] bg-[#fafcff] p-5">
        <h3 className="text-sm font-bold text-[#1d2226]">Founder Reputation</h3>
        <p className="text-xs text-[#666] mt-1">
          Complete projects, tasks, and collaborations to earn Explorer → Visionary levels and badges.
        </p>
      </section>
    );
  }

  return <ReputationSection reputation={rep} />;
}
