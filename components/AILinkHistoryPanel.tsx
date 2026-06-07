'use client';

import { useState } from 'react';
import type { LinkHistoryEntry } from '@/lib/aiLinkReaderStream';
import { faviconUrl, getDomain, timeAgo } from '@/lib/linkReaderUtils';

interface AILinkHistoryPanelProps {
  links: LinkHistoryEntry[];
  loading: boolean;
  onReread: (entry: LinkHistoryEntry) => void;
}

export function AILinkHistoryPanel({ links, loading, onReread }: AILinkHistoryPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return <p className="text-sm text-[#8b949e] py-8 text-center">Loading link history…</p>;
  }

  if (!links.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <p className="text-3xl mb-3">🔗</p>
        <p className="font-semibold text-[#e6edf3]">No links read yet</p>
        <p className="text-sm text-[#8b949e] mt-1 max-w-xs">
          Paste a GitHub repo, competitor site, or article and get project-specific advice.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      {links.map((entry) => (
        <div
          key={entry.id}
          className="rounded-xl border border-[#30363d] bg-[#21262d] p-4"
        >
          <div className="flex items-start gap-2">
            <img
              src={faviconUrl(entry.url)}
              alt=""
              className="w-4 h-4 mt-0.5 rounded shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-[#e6edf3] truncate">
                🔗 {entry.title || getDomain(entry.url)}
              </p>
              <p className="text-[10px] text-[#6e7681] truncate">{getDomain(entry.url)}</p>
              {entry.question && (
                <p className="text-xs text-[#8b949e] mt-1 italic">&ldquo;{entry.question}&rdquo;</p>
              )}
              <p className="text-xs text-[#8b949e] mt-2">{entry.summary}…</p>
              <p className="text-[10px] text-[#6e7681] mt-1">{timeAgo(entry.readAt)}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-[#30363d] text-[#58a6ff] hover:bg-[#30363d]"
            >
              {expandedId === entry.id ? 'Hide' : 'View full response'}
            </button>
            <button
              type="button"
              onClick={() => onReread(entry)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d]"
            >
              Re-read
            </button>
          </div>
          {expandedId === entry.id && (
            <div className="mt-3 pt-3 border-t border-[#30363d] text-xs text-[#c9d1d9] whitespace-pre-wrap leading-relaxed">
              {entry.response}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
