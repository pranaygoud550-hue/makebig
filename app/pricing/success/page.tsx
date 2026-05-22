'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSubscription } from '@/lib/hooks/useSubscription';

export default function PricingSuccessPage() {
  const auth = useAuth();
  const { refresh, isPro } = useSubscription(auth.user?.contact);

  useEffect(() => {
    refresh();
    const t = setTimeout(refresh, 2000);
    return () => clearTimeout(t);
  }, [refresh]);

  return (
    <div className="min-h-screen bg-[#f3f2ef] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#d9d9d9] p-8 text-center shadow-lg">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-black text-[#1d2226] mb-2">Welcome to Pro</h1>
        <p className="text-sm text-[#666] mb-6">
          {isPro
            ? 'Your account is upgraded. Unlimited projects, AI tools, and priority matching are now unlocked.'
            : 'Payment received. Your plan may take a moment to activate — refresh if features are not unlocked yet.'}
        </p>
        <Link
          href="/"
          className="inline-flex px-6 py-2.5 rounded-full bg-[#0A66C2] text-white font-semibold text-sm hover:bg-[#004182] transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
