'use client';

import { useState, useCallback } from 'react';
import { projectPublicUrl } from '@/lib/site';

interface ShareProjectProps {
  slug: string;
  projectName: string;
  compact?: boolean;
}

export function ShareProject({ slug, projectName, compact }: ShareProjectProps) {
  const [copied, setCopied] = useState(false);
  const url = projectPublicUrl(slug);
  const text = encodeURIComponent(
    `We're building ${projectName} on Make Big — looking for co-founders & teammates. Join us:`
  );

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [url]);

  const shareLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer,width=600,height=600'
    );
  };

  const shareTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${text}`,
      '_blank',
      'noopener,noreferrer,width=600,height=400'
    );
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="px-3 py-1.5 text-xs font-semibold rounded-full border border-[#d9d9d9] text-[#666] hover:border-[#0A66C2] hover:text-[#0A66C2] transition-colors"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <button
          type="button"
          onClick={shareLinkedIn}
          className="px-3 py-1.5 text-xs font-semibold rounded-full bg-[#0A66C2] text-white hover:bg-[#004182] transition-colors"
        >
          Share on LinkedIn
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#0A66C2]/25 bg-gradient-to-br from-[#EEF3FB] to-white p-5">
      <p className="text-sm font-bold text-[#1d2226] mb-1">Recruit on LinkedIn & Twitter</p>
      <p className="text-xs text-[#666] mb-3">
        Share your public project page — it includes a preview card with your project name, skills, and location.
      </p>
      <p className="text-xs font-mono text-[#0A66C2] bg-white border border-[#d9d9d9] rounded-lg px-3 py-2 mb-3 truncate">
        {url.replace(/^https?:\/\//, '')}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="flex-1 min-w-[100px] py-2 text-xs font-semibold rounded-full border border-[#0A66C2] text-[#0A66C2] hover:bg-white transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy link'}
        </button>
        <button
          type="button"
          onClick={shareLinkedIn}
          className="flex-1 min-w-[100px] py-2 text-xs font-semibold rounded-full bg-[#0A66C2] text-white hover:bg-[#004182] transition-colors"
        >
          LinkedIn
        </button>
        <button
          type="button"
          onClick={shareTwitter}
          className="flex-1 min-w-[100px] py-2 text-xs font-semibold rounded-full bg-[#1d2226] text-white hover:bg-black transition-colors"
        >
          X / Twitter
        </button>
      </div>
    </div>
  );
}
