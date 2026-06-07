'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getAuthHeadersAsync } from '@/lib/api';
import { getErrorMessage } from '@/lib/userErrors';
import {
  streamAICofounder,
  estimateTokens,
  AI_CONTEXT_WINDOW,
  type StreamUsage,
} from '@/lib/aiCofounderStream';
import { getAICofounderStatusUrl } from '@/lib/aiCofounderUrls';
import { getApiOrigin } from '@/lib/apiBase';
import { useToast } from '@/lib/context/ToastContext';
import { ProjectData, User } from '@/lib/types';

interface AICofounderProps {
  project: ProjectData;
  user: User | null;
  ownerContact?: string;
}

type ActionId =
  | 'suggest-tasks'
  | 'draft-dm'
  | 'generate-pitch'
  | 'check-health'
  | 'validate-idea'
  | 'target-user'
  | 'build-first'
  | 'biggest-risk'
  | 'custom';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: ActionId;
  devMode?: boolean;
  streaming?: boolean;
  ts: number;
}

const QUICK_PROMPTS: { id: ActionId | 'pitch-deck'; label: string; icon: string }[] = [
  { id: 'pitch-deck', label: 'Generate pitch deck outline', icon: '📊' },
  { id: 'validate-idea', label: 'Validate my idea', icon: '💡' },
  { id: 'target-user', label: 'Who is my target user?', icon: '🎯' },
  { id: 'build-first', label: 'What should I build first?', icon: '🛠' },
  { id: 'biggest-risk', label: "What's my biggest risk?", icon: '⚠️' },
];

const PROJECT_TOOLS: {
  id: ActionId;
  icon: string;
  label: string;
}[] = [
  { id: 'check-health', icon: '🔍', label: 'Health check' },
  { id: 'suggest-tasks', icon: '🗂', label: 'Suggest tasks' },
  { id: 'generate-pitch', icon: '🚀', label: 'Pitch' },
  { id: 'draft-dm', icon: '✉️', label: 'Draft DM' },
];

const PROMPT_LABELS: Record<ActionId, string> = {
  'validate-idea': 'Validate my idea',
  'target-user': 'Who is my target user?',
  'build-first': 'What should I build first?',
  'biggest-risk': "What's my biggest risk?",
  'suggest-tasks': 'Suggest tasks',
  'draft-dm': 'Draft invite DM',
  'generate-pitch': 'Generate pitch',
  'check-health': 'Project health check',
  custom: 'Question',
};

function RobotIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v3h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1H3a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1V7a2 2 0 0 1 2-2h3V4a2 2 0 0 1 2-2zm-4 7v2h2V9H8zm8 0v2h2V9h-2zM8 15v2h8v-2H8z" />
    </svg>
  );
}

function RenderMarkdown({ text, dark }: { text: string; dark?: boolean }) {
  const lines = text.split('\n');
  const textCls = dark ? 'text-[#e6edf3]' : 'text-[#1d2226]';
  const mutedCls = dark ? 'text-[#8b949e]' : 'text-[#999]';
  const accentCls = dark ? 'text-[#58a6ff]' : 'text-[#0A66C2]';

  return (
    <div className={`space-y-1.5 text-sm leading-relaxed ${textCls}`}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;

        const parseBold = (s: string) => {
          const parts = s.split(/(\*\*[^*]+\*\*)/g);
          return parts.map((p, j) =>
            p.startsWith('**') && p.endsWith('**') ? (
              <strong key={j} className={`font-bold ${textCls}`}>
                {p.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{p}</span>
            )
          );
        };

        if (line.startsWith('• ') || line.startsWith('- ')) {
          return (
            <div key={i} className="flex gap-2 items-start">
              <span className={`${accentCls} mt-0.5 shrink-0`}>•</span>
              <span>{parseBold(line.slice(2))}</span>
            </div>
          );
        }

        if (line.trim() === '---') {
          return <hr key={i} className={dark ? 'border-[#30363d]' : 'border-[#e0e0e0] my-2'} />;
        }

        if (line.startsWith('_') && line.endsWith('_') && line.length > 2) {
          return (
            <p key={i} className={`text-xs italic ${mutedCls}`}>
              {line.slice(1, -1)}
            </p>
          );
        }

        return <p key={i}>{parseBold(line)}</p>;
      })}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="text-xs text-[#8b949e] hover:text-[#58a6ff] transition-colors px-2 py-1 rounded-lg hover:bg-[#21262d]"
    >
      {copied ? '✓ Copied' : '⎘ Copy'}
    </button>
  );
}

function TokenMeter({ usage }: { usage: StreamUsage | null }) {
  const total = usage?.totalUsed ?? usage?.inputTokens ?? 0;
  const window = usage?.contextWindow ?? AI_CONTEXT_WINDOW;
  const percent = usage?.percent ?? Math.min(100, Math.round((total / window) * 100));

  return (
    <div className="px-4 py-2 border-t border-[#30363d] bg-[#161b22] shrink-0">
      <div className="flex items-center justify-between text-[10px] text-[#8b949e] mb-1">
        <span>Context window</span>
        <span>
          ~{(total / 1000).toFixed(1)}k / {(window / 1000).toFixed(0)}k tokens ({percent}%)
        </span>
      </div>
      <div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            percent > 80 ? 'bg-amber-500' : percent > 50 ? 'bg-[#58a6ff]' : 'bg-[#3fb950]'
          }`}
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>
    </div>
  );
}

function DMContextModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (ctx: { targetName: string; targetSkill: string; targetRole: string }) => void;
  onClose: () => void;
}) {
  const [targetName, setTargetName] = useState('');
  const [targetSkill, setTargetSkill] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const cls =
    'w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#58a6ff]';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#161b22] rounded-2xl border border-[#30363d] shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h3 className="font-bold text-[#e6edf3]">Who are you inviting?</h3>
          <p className="text-xs text-[#8b949e] mt-0.5">The AI will personalise the DM.</p>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Their name (optional)"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            className={cls}
          />
          <input
            type="text"
            placeholder="Their main skill"
            value={targetSkill}
            onChange={(e) => setTargetSkill(e.target.value)}
            className={cls}
          />
          <input
            type="text"
            placeholder="Role you need"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className={cls}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 border border-[#30363d] text-[#8b949e] rounded-full text-sm font-semibold hover:bg-[#21262d]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onSubmit({
                targetName: targetName || 'the person',
                targetSkill: targetSkill || 'their skills',
                targetRole: targetRole || 'team member',
              })
            }
            disabled={!targetSkill.trim()}
            className="flex-1 py-2 bg-[#0A66C2] text-white rounded-full text-sm font-bold hover:bg-[#004182] disabled:opacity-40"
          >
            Generate DM
          </button>
        </div>
      </div>
    </div>
  );
}

export function AICofounder({ project, user }: AICofounderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showDMModal, setShowDMModal] = useState(false);
  const [provider, setProvider] = useState<'anthropic' | 'groq' | 'demo' | null>(null);
  const [usage, setUsage] = useState<StreamUsage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { showToast } = useToast();

  const runPitchDeck = useCallback(async () => {
    if (!project.id || streaming) return;
    setStreaming(true);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: 'Generate pitch deck outline',
      ts: Date.now(),
    };
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: 'Building your 10-slide deck…', streaming: true, ts: Date.now() },
    ]);
    try {
      const headers = await getAuthHeadersAsync();
      const res = await fetch(`${getApiOrigin()}/api/ai/pitch-deck`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      const text = data.success ? data.data.text : data.error || 'Could not generate deck';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: text, streaming: false, action: 'generate-pitch' } : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: 'Pitch deck generation failed.', streaming: false } : m
        )
      );
    } finally {
      setStreaming(false);
    }
  }, [project.id, streaming]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  useEffect(() => {
    if (!project.id) return;
    (async () => {
      try {
        const res = await fetch(getAICofounderStatusUrl(), {
          headers: await getAuthHeadersAsync(),
        });
        const data = await res.json();
        if (data.success) {
          setProvider(data.data?.provider || 'demo');
        } else {
          setProvider('demo');
        }
      } catch {
        setProvider('demo');
      }
    })();
  }, [project.id]);

  const liveTokenEstimate = useMemo(() => {
    const convo = messages.reduce((s, m) => s + estimateTokens(m.content), 0);
    const systemEst = estimateTokens(project.name + (project.description || '')) + 400;
    const total = convo + systemEst;
    return {
      totalUsed: total,
      percent: Math.min(100, Math.round((total / AI_CONTEXT_WINDOW) * 100)),
      contextWindow: AI_CONTEXT_WINDOW,
    };
  }, [messages, project.name, project.description]);

  const displayUsage = usage?.totalUsed ? usage : liveTokenEstimate;

  const sendMessage = useCallback(
    async (
      action: ActionId,
      context?: Record<string, string>,
      userLabel?: string
    ) => {
      if (!project.id || streaming) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: userLabel || PROMPT_LABELS[action],
        action,
        ts: Date.now(),
      };

      const assistantId = `a-${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        action,
        streaming: true,
        ts: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const historyBefore = messages
        .filter((m) => !m.streaming && m.content.trim())
        .slice(-9)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        await streamAICofounder({
          projectId: project.id,
          messages: historyBefore,
          action: action === 'custom' ? 'custom' : action,
          context,
          signal: abortRef.current.signal,
          onDelta: (text) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + text } : m
              )
            );
          },
          onDone: (payload) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, streaming: false, devMode: payload.devMode }
                  : m
              )
            );
            if (payload.usage) setUsage(payload.usage);
            if (payload.provider) {
              setProvider(
                payload.provider as 'anthropic' | 'groq' | 'demo'
              );
            }
            setStreaming(false);
          },
          onError: (message) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: message,
                      streaming: false,
                      devMode: false,
                    }
                  : m
              )
            );
            setStreaming(false);
          },
        });
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: getErrorMessage(e, 'ai'),
                  streaming: false,
                }
              : m
          )
        );
        setStreaming(false);
      }
    },
    [project.id, streaming, messages]
  );

  const handleCustomSend = () => {
    const msg = input.trim();
    if (!msg || streaming) return;
    setInput('');
    sendMessage('custom', { message: msg }, msg);
  };

  const providerLabel =
    provider === 'anthropic'
      ? 'Claude'
      : provider === 'groq'
        ? 'Groq'
        : provider === 'demo'
          ? 'Demo'
          : '…';

  if (!project.id) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-[#0d1117] rounded-xl">
        <RobotIcon className="w-12 h-12 text-[#58a6ff] mb-3" />
        <p className="font-semibold text-[#e6edf3]">Publish your project to unlock AI</p>
        <p className="text-sm text-[#8b949e] mt-1 max-w-xs">
          Complete the wizard and hit <strong className="text-[#e6edf3]">Publish</strong> first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1117] rounded-xl overflow-hidden border border-[#30363d]">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#30363d] px-5 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A66C2] to-[#6e40c9] flex items-center justify-center text-white shrink-0">
            <RobotIcon />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-[#e6edf3] text-base">AI Co-founder</h2>
            <p className="text-xs text-[#8b949e] truncate">
              {provider === 'anthropic'
                ? 'Claude · streaming'
                : provider === 'groq'
                  ? 'Groq · streaming'
                  : 'Demo mode · add API key in .env'}
            </p>
          </div>
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
              provider === 'demo'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {provider === 'demo' ? 'Demo' : `✓ ${providerLabel}`}
          </span>
        </div>

        {provider === 'demo' && (
          <p className="mt-2 text-[10px] text-amber-400/90 leading-relaxed">
            Add <code className="text-amber-300">ANTHROPIC_API_KEY</code> or{' '}
            <code className="text-amber-300">GROQ_API_KEY</code> to .env and restart{' '}
            <code className="text-amber-300">npm run dev</code>.
          </p>
        )}
      </div>

      {/* Quick prompts */}
      <div className="bg-[#161b22] border-b border-[#30363d] px-4 py-3 shrink-0">
        <p className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-widest mb-2">
          Quick prompts
        </p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={streaming}
              onClick={() => {
                if (p.id === 'pitch-deck') {
                  void runPitchDeck();
                  return;
                }
                sendMessage(p.id as ActionId);
              }}
              className="text-left px-3 py-2.5 rounded-xl border border-[#30363d] bg-[#21262d] hover:border-[#58a6ff]/50 hover:bg-[#30363d] transition-all disabled:opacity-40"
            >
              <span className="text-sm">{p.icon}</span>
              <p className="text-xs font-semibold text-[#e6edf3] mt-1 leading-tight">{p.label}</p>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {PROJECT_TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={streaming}
              onClick={() => {
                if (t.id === 'draft-dm') {
                  setShowDMModal(true);
                  return;
                }
                sendMessage(t.id);
              }}
              className="text-[10px] font-medium px-2.5 py-1 rounded-full border border-[#30363d] text-[#8b949e] hover:text-[#58a6ff] hover:border-[#58a6ff]/40 disabled:opacity-40"
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#21262d] border border-[#30363d] flex items-center justify-center mb-4">
              <RobotIcon className="w-8 h-8 text-[#58a6ff]" />
            </div>
            <h3 className="font-bold text-[#e6edf3]">Hi, I&apos;m your AI co-founder</h3>
            <p className="text-sm text-[#8b949e] mt-2 max-w-xs">
              I remember our last 10 messages. Ask about{' '}
              <span className="text-[#58a6ff] font-medium">{project.name}</span>.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#58a6ff] shrink-0 mt-0.5">
                <RobotIcon />
              </div>
            )}

            <div
              className={`max-w-[82%] flex flex-col gap-1 ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              {msg.role === 'user' ? (
                <div className="bg-[#1f6feb] text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm font-medium shadow-sm">
                  {msg.content}
                </div>
              ) : (
                <div className="bg-[#21262d] border border-[#30363d] rounded-2xl rounded-tl-md px-4 py-3 shadow-sm w-full">
                  {msg.content ? (
                    <RenderMarkdown text={msg.content} dark />
                  ) : msg.streaming ? (
                    <span className="inline-flex gap-1 py-1">
                      <span className="w-2 h-2 bg-[#58a6ff] rounded-full animate-bounce" />
                      <span
                        className="w-2 h-2 bg-[#58a6ff] rounded-full animate-bounce"
                        style={{ animationDelay: '120ms' }}
                      />
                      <span
                        className="w-2 h-2 bg-[#58a6ff] rounded-full animate-bounce"
                        style={{ animationDelay: '240ms' }}
                      />
                    </span>
                  ) : null}

                  {msg.devMode && !msg.streaming && (
                    <p className="text-[10px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg mt-2">
                      Demo mode — add ANTHROPIC_API_KEY or GROQ_API_KEY
                    </p>
                  )}

                  {msg.content && !msg.streaming && (
                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#30363d]">
                      <span className="text-[10px] text-[#6e7681]">
                        {msg.action ? PROMPT_LABELS[msg.action] : 'Reply'}
                      </span>
                      <CopyButton text={msg.content} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-[#1f6feb] flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                {user?.name?.slice(0, 2).toUpperCase() || 'ME'}
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <TokenMeter usage={displayUsage} />

      {/* Input */}
      <div className="bg-[#161b22] border-t border-[#30363d] px-4 py-3 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCustomSend();
              }
            }}
            placeholder="Ask anything about your project…"
            rows={1}
            disabled={streaming}
            className="flex-1 px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#58a6ff] resize-none max-h-28 disabled:opacity-50"
          />
          <button
            type="button"
            disabled={!input.trim() || streaming}
            onClick={handleCustomSend}
            className="p-2.5 bg-[#1f6feb] text-white rounded-xl hover:bg-[#388bfd] disabled:opacity-40 transition-all shrink-0"
            aria-label="Send"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-[#6e7681] mt-1.5 text-center">
          AI can make mistakes · last 10 messages kept in context
        </p>
      </div>

      {showDMModal && (
        <DMContextModal
          onClose={() => setShowDMModal(false)}
          onSubmit={(ctx) => {
            setShowDMModal(false);
            sendMessage(
              'draft-dm',
              ctx,
              `Draft DM for ${ctx.targetSkill} as ${ctx.targetRole}`
            );
          }}
        />
      )}
    </div>
  );
}
