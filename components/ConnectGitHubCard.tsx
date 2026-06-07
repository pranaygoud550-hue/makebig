'use client';

import { useEffect, useState } from 'react';
import {
  apiGetGithubCommits,
  apiUpdateProjectGithub,
  type GithubCommit,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/userErrors';
import { queueAILink } from '@/lib/aiLinkPending';
import { isSupabaseConfigured } from '@/lib/supabase';

const inputCls =
  'flex-1 px-4 py-2.5 bg-white border border-[#d9d9d9] rounded-lg text-sm text-[#1d2226] placeholder-[#999] focus:outline-none focus:border-[#0A66C2] focus:ring-2 focus:ring-[#0A66C2]/20';

interface ConnectGitHubCardProps {
  projectId: string;
  isOwner: boolean;
  onError?: (message: string) => void;
}

export function ConnectGitHubCard({ projectId, isOwner, onError }: ConnectGitHubCardProps) {
  const [githubUrl, setGithubUrl] = useState('');
  const [githubInput, setGithubInput] = useState('');
  const [commits, setCommits] = useState<GithubCommit[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCommits = async () => {
    setLoading(true);
    try {
      const data = await apiGetGithubCommits(projectId);
      setConnected(data.connected);
      setCommits(data.commits || []);
      if (data.repo) {
        setGithubUrl(`https://github.com/${data.repo.owner}/${data.repo.repo}`);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId || isSupabaseConfigured) return;
    void loadCommits();
  }, [projectId]);

  const connect = async () => {
    if (!githubInput.trim()) return;
    setSaving(true);
    try {
      await apiUpdateProjectGithub(projectId, githubInput.trim());
      setGithubUrl(githubInput.trim());
      setGithubInput('');
      await loadCommits();
    } catch (e) {
      onError?.(getErrorMessage(e, 'project'));
    } finally {
      setSaving(false);
    }
  };

  const askAI = () => {
    if (!githubUrl) return;
    queueAILink({
      url: githubUrl,
      projectId,
      question: 'What should our team focus on next based on this repo?',
    });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('makeBigActiveTab', 'ai');
    }
  };

  if (isSupabaseConfigured) return null;

  return (
    <div className="bg-gradient-to-br from-[#f6f8fa] to-white rounded-2xl border border-[#e0e0e0] p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#666]">Integrations</p>
          <h3 className="font-bold text-[#1d2226] text-lg mt-0.5">Connect GitHub</h3>
          <p className="text-xs text-[#666] mt-1 max-w-md leading-relaxed">
            <strong className="text-[#1d2226]">Code lives on GitHub.</strong> Strategy, tasks, and AI
            advice live on Make Big. Link your repo to show commits here and let your AI co-founder
            read your README.
          </p>
        </div>
        <span className="text-2xl" aria-hidden>
          🐙
        </span>
      </div>

      {!connected && isOwner ? (
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            value={githubInput}
            onChange={(e) => setGithubInput(e.target.value)}
            placeholder="https://github.com/you/your-repo"
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => void connect()}
            disabled={saving || !githubInput.trim()}
            className="px-5 py-2.5 bg-[#1d2226] text-white text-sm font-semibold rounded-lg hover:bg-black disabled:opacity-50 shrink-0"
          >
            {saving ? 'Connecting…' : 'Connect repo'}
          </button>
        </div>
      ) : !connected ? (
        <p className="text-xs text-[#666] mt-3">
          Project owner can connect a GitHub repo to track commits and power AI advice.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {githubUrl && (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-[#0A66C2] hover:underline"
              >
                {githubUrl.replace('https://', '')}
              </a>
              <button
                type="button"
                onClick={askAI}
                className="text-xs font-semibold px-3 py-1 rounded-full border border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#EEF3FB]"
              >
                🤖 Ask AI about this repo
              </button>
            </div>
          )}
          {loading ? (
            <p className="text-xs text-[#666]">Loading commits…</p>
          ) : commits.length === 0 ? (
            <p className="text-xs text-[#666]">No recent commits on the default branch.</p>
          ) : (
            <ul className="space-y-2">
              {commits.slice(0, 5).map((c) => (
                <li key={c.sha} className="text-xs border border-[#e8e8e8] rounded-lg p-3 bg-white">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#1d2226] hover:text-[#0A66C2] line-clamp-2"
                  >
                    {c.message}
                  </a>
                  <p className="text-[#999] mt-1">
                    {c.author}
                    {c.date ? ` · ${new Date(c.date).toLocaleDateString('en-IN')}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
