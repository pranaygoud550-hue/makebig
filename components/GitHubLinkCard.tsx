'use client';

import type { GitHubMeta } from '@/lib/aiLinkReaderStream';
import { timeAgo } from '@/lib/linkReaderUtils';

interface GitHubLinkCardProps {
  github: GitHubMeta;
}

export function GitHubLinkCard({ github }: GitHubLinkCardProps) {
  return (
    <div className="mb-3 rounded-xl border border-[#30363d] bg-[#0d1117] p-3 text-xs text-[#e6edf3]">
      <p className="font-bold text-sm">📦 {github.name}</p>
      <p className="text-[#8b949e] mt-1">
        ⭐ {github.stars.toLocaleString()} · 🍴 {github.forks.toLocaleString()} ·{' '}
        {github.language || 'Unknown'}
      </p>
      {github.lastCommitMessage && (
        <p className="text-[#8b949e] mt-1 truncate">
          Last commit: {github.lastCommitMessage}
          {github.lastCommitDate ? ` (${timeAgo(github.lastCommitDate)})` : ''}
        </p>
      )}
    </div>
  );
}
