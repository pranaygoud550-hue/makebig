'use client';

import { useEffect, useState } from 'react';
import { ReputationSection } from '@/components/ecosystem/ReputationSection';
import type { ReputationState } from '@/lib/ecosystem/reputation';

export function ReputationPanel({ contact }: { contact: string }) {
  const [rep, setRep] = useState<ReputationState | null>(null);

  useEffect(() => {
    if (!contact) return;
    fetch(`/api/users/${encodeURIComponent(contact)}/reputation`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setRep(json.data);
      });
  }, [contact]);

  if (!rep) return null;
  return <ReputationSection reputation={rep} />;
}
