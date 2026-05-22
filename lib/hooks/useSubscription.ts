'use client';

import { useCallback, useEffect, useState } from 'react';
import { PlanTier } from '@/lib/plans';
import { getPlanForContact } from '@/lib/subscription';

export function useSubscription(contact?: string) {
  const [plan, setPlan] = useState<PlanTier>('free');
  const [loading, setLoading] = useState(Boolean(contact));

  const refresh = useCallback(async () => {
    if (!contact) {
      setPlan('free');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const tier = await getPlanForContact(contact);
      setPlan(tier);
    } catch {
      setPlan('free');
    } finally {
      setLoading(false);
    }
  }, [contact]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { plan, loading, isPro: plan === 'pro', refresh };
}
