'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PLAN_FEATURES } from '@/lib/plans';
import { getAuthHeadersAsync } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { getErrorMessage } from '@/lib/userErrors';

function PricingContent() {
  const auth = useAuth();
  const { isPro } = useSubscription(auth.user?.contact);
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled') === '1';

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [interestLoading, setInterestLoading] = useState(false);
  const [interestDone, setInterestDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/stripe/status')
      .then((r) => r.json())
      .then((d) => setStripeReady(Boolean(d.configured)))
      .catch(() => setStripeReady(false));
  }, []);

  const recordInterest = async () => {
    if (!auth.user?.contact) {
      setError('Sign in to join the Pro waitlist.');
      return;
    }
    setInterestLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pricing/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: auth.user.contact, plan: 'pro' }),
      });
      if (!res.ok) throw new Error('Could not save your interest — try again');
      setInterestDone(true);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setInterestLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!auth.user?.contact) {
      setError('Sign in first to upgrade your account.');
      return;
    }

    const email = auth.user.contact.includes('@')
      ? auth.user.contact
      : undefined;

    if (!email) {
      setError('Upgrade requires an email address. Sign in with email to continue.');
      return;
    }

    setCheckoutLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeadersAsync();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.comingSoon) {
        await recordInterest();
        return;
      }

      throw new Error(data.error || 'Checkout unavailable');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <header className="bg-white border-b border-[#d9d9d9]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black text-[#0A66C2] tracking-tight">
            Make Big
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-[#666] hover:text-[#0A66C2]"
          >
            ← Back to app
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#0A66C2] uppercase tracking-wide mb-2">
            Simple pricing
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-[#1d2226] mb-3">
            Start free. Scale with Pro.
          </h1>
          <p className="text-[#666] max-w-xl mx-auto">
            Build your first project at no cost. Upgrade when you need AI tools,
            priority matching, and room to grow your team.
          </p>
          {isPro && (
            <p className="mt-4 inline-block px-4 py-1.5 rounded-full bg-green-50 text-green-700 text-sm font-semibold border border-green-200">
              You&apos;re on Pro — thanks for supporting Make Big
            </p>
          )}
          {canceled && (
            <p className="mt-4 text-sm text-amber-700">Checkout was canceled. You can try again anytime.</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Free */}
          <div className="bg-white rounded-2xl border border-[#d9d9d9] p-8 shadow-sm flex flex-col">
            <h2 className="text-lg font-bold text-[#1d2226]">{PLAN_FEATURES.free.label}</h2>
            <p className="mt-2">
              <span className="text-4xl font-black text-[#1d2226]">{PLAN_FEATURES.free.price}</span>
              <span className="text-[#666] text-sm ml-1">{PLAN_FEATURES.free.period}</span>
            </p>
            <ul className="mt-6 space-y-3 flex-1">
              {PLAN_FEATURES.free.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#444]">
                  <span className="text-green-600 shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/"
              className="mt-8 block text-center py-2.5 rounded-full border border-[#0A66C2] text-[#0A66C2] font-semibold text-sm hover:bg-[#EEF3FB] transition-colors"
            >
              {auth.user ? 'Continue with Free' : 'Get started free'}
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-white rounded-2xl border-2 border-[#0A66C2] p-8 shadow-lg relative flex flex-col">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#0A66C2] text-white text-xs font-bold rounded-full">
              Most popular
            </span>
            <h2 className="text-lg font-bold text-[#1d2226]">{PLAN_FEATURES.pro.label}</h2>
            <p className="mt-2">
              <span className="text-4xl font-black text-[#0A66C2]">{PLAN_FEATURES.pro.price}</span>
              <span className="text-[#666] text-sm ml-1">{PLAN_FEATURES.pro.period}</span>
            </p>
            <ul className="mt-6 space-y-3 flex-1">
              {PLAN_FEATURES.pro.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#444]">
                  <span className="text-[#0A66C2] shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>

            {isPro ? (
              <button
                type="button"
                disabled
                className="mt-8 w-full py-2.5 rounded-full bg-[#EEF3FB] text-[#0A66C2] font-semibold text-sm cursor-default"
              >
                Current plan
              </button>
            ) : stripeReady === false ? (
              <button
                type="button"
                onClick={recordInterest}
                disabled={interestLoading || interestDone}
                className="mt-8 w-full py-2.5 rounded-full bg-[#0A66C2] text-white font-semibold text-sm hover:bg-[#004182] disabled:opacity-60 transition-colors"
              >
                {interestDone
                  ? "You're on the list ✓"
                  : interestLoading
                    ? 'Saving…'
                    : 'Notify me at launch'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={checkoutLoading}
                className="mt-8 w-full py-2.5 rounded-full bg-[#0A66C2] text-white font-semibold text-sm hover:bg-[#004182] disabled:opacity-60 transition-colors"
              >
                {checkoutLoading ? 'Redirecting to checkout…' : 'Upgrade to Pro'}
              </button>
            )}

            {stripeReady === false && !interestDone && (
              <p className="text-xs text-center text-[#999] mt-2">Pro checkout coming soon — join the waitlist</p>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-6 text-center text-sm text-red-600">{error}</p>
        )}

        <p className="mt-10 text-center text-xs text-[#999] max-w-lg mx-auto">
          Payments are processed securely by Stripe. Cancel anytime from your Stripe customer portal.
          {!stripeReady && stripeReady !== null && ' Configure STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID to enable live checkout.'}
        </p>
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f2ef] flex items-center justify-center">Loading…</div>}>
      <PricingContent />
    </Suspense>
  );
}
