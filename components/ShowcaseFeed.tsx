'use client';

import { useEffect, useState } from 'react';
import { getAuthHeadersAsync } from '@/lib/api';
import { getApiOrigin } from '@/lib/apiBase';

interface ShowcaseItem {
  type: string;
  text: string;
  meta?: string;
  at?: string;
}

export function ShowcaseFeed() {
  const [items, setItems] = useState<ShowcaseItem[]>([]);

  const load = () => {
    fetch('/api/public/showcase-feed')
      .then((r) => r.json())
      .then((data) => setItems(data.items || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="py-10 bg-white dark:bg-gray-900 border-y border-[#e0e0e0] dark:border-gray-700">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-widest">Live activity</p>
            <h2 className="text-xl font-bold text-[#1d2226] dark:text-white">What&apos;s happening on Make Big</h2>
          </div>
          <span className="text-[10px] text-green-600 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Updates every minute
          </span>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((item, i) => (
            <div
              key={`${item.type}-${i}`}
              className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#f8f9fa] dark:bg-gray-800 border border-[#e8e8e8] dark:border-gray-700 animate-fadeIn"
            >
              <p className="text-sm text-[#1d2226] dark:text-gray-100 flex-1">{item.text}</p>
              {item.meta && (
                <span className="text-[10px] text-[#999] shrink-0">{item.meta}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
