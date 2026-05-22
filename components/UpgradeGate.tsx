'use client';

import Link from 'next/link';
import { PlanTier, isPro } from '@/lib/plans';

interface UpgradeGateProps {
  plan: PlanTier;
  feature: string;
  description: string;
  children: React.ReactNode;
}

export function UpgradeGate({ plan, feature, description, children }: UpgradeGateProps) {
  if (isPro(plan)) return <>{children}</>;

  return (
    <div className="max-w-lg mx-auto mt-8 p-8 rounded-2xl border border-[#d9d9d9] bg-gradient-to-br from-[#EEF3FB] to-white text-center shadow-sm">
      <div className="text-4xl mb-3">✨</div>
      <h3 className="text-xl font-bold text-[#1d2226] mb-2">{feature}</h3>
      <p className="text-sm text-[#666] mb-6 leading-relaxed">{description}</p>
      <Link
        href="/pricing"
        className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white bg-[#0A66C2] rounded-full hover:bg-[#004182] transition-colors"
      >
        Upgrade to Pro
      </Link>
      <p className="text-xs text-[#999] mt-4">Free plan includes 2 projects and unlimited team members</p>
    </div>
  );
}
