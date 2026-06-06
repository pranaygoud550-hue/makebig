'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface FeedItem {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  project: { name: string; slug: string; logoUrl?: string };
}

export function StartupJourneyFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/startup-feed?limit=15')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setItems(json.data.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <section className="py-10 bg-[#fafcff] border-y border-[#e0e0e0]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h2 className="text-xl font-bold text-[#1d2226] mb-4">Startup Journey Feed</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="bg-white rounded-xl border border-[#e0e0e0] px-4 py-3 flex gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-[#EEF3FB] flex items-center justify-center text-sm font-bold text-[#0A66C2] shrink-0">
                  {item.project.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#1d2226]">{item.description}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#999]">
                    <Link href={`/startup/${item.project.slug}`} className="text-[#0A66C2] font-semibold hover:underline">
                      {item.project.name}
                    </Link>
                    <span>·</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
