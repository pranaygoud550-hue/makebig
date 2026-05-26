'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { apiAICofounder } from '@/lib/api';
import { getErrorMessage } from '@/lib/userErrors';
import { getApiBase } from '@/lib/apiBase';
import { ProjectData, User } from '@/lib/types';

interface AICofounderProps {
  project: ProjectData;
  user: User | null;
  ownerContact?: string;
}

type ActionId = 'suggest-tasks' | 'draft-dm' | 'generate-pitch' | 'check-health' | 'custom';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: ActionId;
  devMode?: boolean;
  ts: number;
}

const QUICK_ACTIONS: {
  id: ActionId;
  icon: string;
  label: string;
  subtitle: string;
  accent: string;
}[] = [
  {
    id: 'check-health',
    icon: '🔍',
    label: 'Project health check',
    subtitle: 'Am I stalling or on track?',
    accent: 'border-purple-200 bg-purple-50 hover:border-purple-400',
  },
  {
    id: 'suggest-tasks',
    icon: '🗂',
    label: 'Suggest tasks',
    subtitle: 'What should we work on next?',
    accent: 'border-blue-200 bg-blue-50 hover:border-blue-400',
  },
  {
    id: 'generate-pitch',
    icon: '🚀',
    label: 'Generate pitch',
    subtitle: 'Write our project story',
    accent: 'border-orange-200 bg-orange-50 hover:border-orange-400',
  },
  {
    id: 'draft-dm',
    icon: '✉️',
    label: 'Draft an invite DM',
    subtitle: 'Recruit a specific person',
    accent: 'border-green-200 bg-green-50 hover:border-green-400',
  },
];

/* ── Markdown-lite renderer ── */
function RenderMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;

        // Bold **text**
        const parseBold = (s: string) => {
          const parts = s.split(/(\*\*[^*]+\*\*)/g);
          return parts.map((p, j) =>
            p.startsWith('**') && p.endsWith('**')
              ? <strong key={j} className="font-bold text-[#1d2226]">{p.slice(2, -2)}</strong>
              : <span key={j}>{p}</span>
          );
        };

        // Bullet points
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-[#0A66C2] mt-0.5 shrink-0">•</span>
              <span className="text-[#1d2226]">{parseBold(line.slice(2))}</span>
            </div>
          );
        }

        // Horizontal rule
        if (line.trim() === '---') {
          return <hr key={i} className="border-[#e0e0e0] my-2" />;
        }

        // Italic _text_
        if (line.startsWith('_') && line.endsWith('_') && line.length > 2) {
          return <p key={i} className="text-xs text-[#999] italic">{line.slice(1, -1)}</p>;
        }

        return <p key={i} className="text-[#1d2226]">{parseBold(line)}</p>;
      })}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="text-xs text-[#999] hover:text-[#0A66C2] transition-colors px-2 py-1 rounded-lg hover:bg-[#f3f2ef]"
    >
      {copied ? '✓ Copied' : '⎘ Copy'}
    </button>
  );
}

/* ── DM context modal ── */
function DMContextModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (ctx: { targetName: string; targetSkill: string; targetRole: string }) => void;
  onClose: () => void;
}) {
  const [targetName,  setTargetName]  = useState('');
  const [targetSkill, setTargetSkill] = useState('');
  const [targetRole,  setTargetRole]  = useState('');
  const cls = 'w-full px-4 py-2.5 bg-white border border-[#d9d9d9] rounded-lg text-sm text-[#1d2226] placeholder-[#aaa] focus:outline-none focus:border-[#0A66C2] focus:ring-2 focus:ring-[#0A66C2]/20';

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#e0e0e0] shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h3 className="font-bold text-[#1d2226]">Who are you inviting?</h3>
          <p className="text-xs text-[#666] mt-0.5">The AI will personalise the DM for this person.</p>
        </div>
        <div className="space-y-3">
          <input type="text" placeholder="Their name (optional)" value={targetName} onChange={e => setTargetName(e.target.value)} className={cls} />
          <input type="text" placeholder="Their main skill (e.g. React, Video editing)" value={targetSkill} onChange={e => setTargetSkill(e.target.value)} className={cls} />
          <input type="text" placeholder="Role you need (e.g. Frontend Dev, Designer)" value={targetRole} onChange={e => setTargetRole(e.target.value)} className={cls} />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 border border-[#d9d9d9] text-[#666] rounded-full text-sm font-semibold hover:bg-[#f3f2ef]">
            Cancel
          </button>
          <button
            onClick={() => onSubmit({ targetName: targetName || 'the person', targetSkill: targetSkill || 'their skills', targetRole: targetRole || 'team member' })}
            disabled={!targetSkill.trim()}
            className="flex-1 py-2 bg-[#0A66C2] text-white rounded-full text-sm font-bold hover:bg-[#004182] disabled:opacity-40 transition-all"
          >
            Generate DM
          </button>
        </div>
      </div>
    </div>
  );
}

const ACTION_LABEL: Record<ActionId, string> = {
  'suggest-tasks':  'Suggest tasks',
  'draft-dm':       'Draft invite DM',
  'generate-pitch': 'Generate pitch',
  'check-health':   'Project health check',
  'custom':         'Question',
};

export function AICofounder({ project, user, ownerContact }: AICofounderProps) {
  const [messages, setMessages]         = useState<ChatMessage[]>([]);
  const [input, setInput]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [showDMModal, setShowDMModal]   = useState(false);
  const [hasKey, setHasKey]             = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Check if API key is configured on first mount
  useEffect(() => {
    if (!project.id) return;
    fetch(`${getApiBase()}/ai/cofounder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : ''}` },
      body: JSON.stringify({ action: 'check-health', projectId: project.id }),
    })
      .then(r => r.json())
      .then(d => setHasKey(d.success ? !d.data?.devMode : false))
      .catch(() => setHasKey(false));
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendAction = useCallback(async (action: ActionId, context?: Record<string, string>, userLabel?: string) => {
    if (!project.id || loading) return;

    const userMsg: ChatMessage = {
      id:      Date.now().toString(),
      role:    'user',
      content: userLabel || ACTION_LABEL[action],
      action,
      ts:      Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const result = await apiAICofounder(action, project.id!, context, ownerContact);
      const assistantMsg: ChatMessage = {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: result.response,
        action,
        devMode: result.devMode,
        ts:      Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      const assistantMsg: ChatMessage = {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: getErrorMessage(e, 'ai'),
        action,
        devMode: false,
        ts:      Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  }, [project.id, loading, ownerContact]);

  const handleCustomSend = () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    sendAction('custom', { message: msg }, msg);
  };

  if (!project.id) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-4xl mb-3">🤖</p>
        <p className="font-semibold text-[#1d2226]">Publish your project to unlock AI</p>
        <p className="text-sm text-[#666] mt-1 max-w-xs">
          Complete the Create Project wizard and hit <strong>Publish</strong> — your AI co-founder will be ready immediately after.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f3f2ef] rounded-xl overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-white border-b border-[#e0e0e0] px-5 pt-5 pb-4 shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A66C2] to-purple-600 flex items-center justify-center text-white text-lg shrink-0">
            🤖
          </div>
          <div>
            <h2 className="font-bold text-[#1d2226] text-base leading-tight">AI Co-founder</h2>
            <p className="text-xs text-[#666] mt-0.5">
              Powered by Groq · Trained on your project context
            </p>
          </div>
          {hasKey === false && (
            <div className="ml-auto text-right">
              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
                Demo mode
              </span>
            </div>
          )}
          {hasKey === true && (
            <div className="ml-auto text-right">
              <span className="text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full">
                ✓ Groq live
              </span>
            </div>
          )}
        </div>

        {/* API key notice */}
        {hasKey === false && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
            <strong>Demo mode</strong> — add <code className="bg-amber-100 px-1 rounded font-mono">GROQ_API_KEY</code> in <code className="bg-amber-100 px-1 rounded font-mono">backend/.env</code> and restart the server. Free key at{' '}
            <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="underline font-semibold">console.groq.com</a>.
          </div>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div className="bg-white border-b border-[#e0e0e0] px-5 py-3 shrink-0">
        <p className="text-[10px] font-semibold text-[#999] uppercase tracking-widest mb-2">Quick actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUICK_ACTIONS.map(a => (
            <button
              key={a.id}
              disabled={loading}
              onClick={() => {
                if (a.id === 'draft-dm') { setShowDMModal(true); return; }
                sendAction(a.id);
              }}
              className={`text-left p-3 rounded-xl border-2 transition-all disabled:opacity-40 ${a.accent}`}
            >
              <span className="text-base">{a.icon}</span>
              <p className="font-bold text-[#1d2226] text-xs mt-1 leading-tight">{a.label}</p>
              <p className="text-[10px] text-[#666] mt-0.5 leading-tight">{a.subtitle}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Conversation ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0A66C2] to-purple-600 flex items-center justify-center text-3xl mb-4">
              🤖
            </div>
            <h3 className="font-bold text-[#1d2226]">Hi, I&apos;m your AI co-founder</h3>
            <p className="text-sm text-[#666] mt-2 max-w-xs leading-relaxed">
              I know your project inside-out. Pick a quick action above or ask me anything about{' '}
              <span className="font-semibold text-[#0A66C2]">{project.name}</span>.
            </p>
            <div className="mt-4 flex flex-col gap-2 w-full max-w-xs">
              {[
                'What should I do this week?',
                'How do I find my first users?',
                'What makes a good co-founder?',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="text-left px-4 py-2.5 bg-white border border-[#d9d9d9] rounded-xl text-sm text-[#666] hover:border-[#0A66C2] hover:text-[#0A66C2] transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            {msg.role === 'assistant' ? (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0A66C2] to-purple-600 flex items-center justify-center text-white text-sm shrink-0 mt-0.5">
                🤖
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                {user?.name?.slice(0, 2).toUpperCase() || 'ME'}
              </div>
            )}

            {/* Bubble */}
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              {msg.role === 'user' ? (
                <div className="bg-[#0A66C2] text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm font-medium">
                  {msg.content}
                </div>
              ) : (
                <div className="bg-white border border-[#e0e0e0] rounded-2xl rounded-tl-sm px-4 py-3 space-y-2 shadow-sm">
                  <RenderMarkdown text={msg.content} />

                  {msg.devMode && (
                    <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 mt-2">
                      Demo response — add GROQ_API_KEY in backend/.env and restart npm run dev
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-[#bbb]">
                      {msg.action ? ACTION_LABEL[msg.action] : 'Reply'}
                    </span>
                    <CopyButton text={msg.content} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0A66C2] to-purple-600 flex items-center justify-center text-white text-sm shrink-0">
              🤖
            </div>
            <div className="bg-white border border-[#e0e0e0] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#0A66C2] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-[#0A66C2] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-[#0A66C2] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="bg-white border-t border-[#e0e0e0] px-4 py-3 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCustomSend(); } }}
            placeholder="Ask anything about your project… (Enter to send)"
            rows={1}
            className="flex-1 px-4 py-2.5 bg-[#f3f2ef] border border-[#d9d9d9] rounded-xl text-sm text-[#1d2226] placeholder-[#999] focus:outline-none focus:border-[#0A66C2] resize-none max-h-28"
          />
          <button
            disabled={!input.trim() || loading}
            onClick={handleCustomSend}
            className="p-2.5 bg-[#0A66C2] text-white rounded-xl hover:bg-[#004182] disabled:opacity-40 transition-all shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-[#bbb] mt-1.5 text-center">
          AI can make mistakes. Review suggestions before acting on them.
        </p>
      </div>

      {/* ── DM Context Modal ── */}
      {showDMModal && (
        <DMContextModal
          onClose={() => setShowDMModal(false)}
          onSubmit={ctx => {
            setShowDMModal(false);
            sendAction('draft-dm', ctx, `Draft DM for ${ctx.targetSkill} as ${ctx.targetRole}`);
          }}
        />
      )}
    </div>
  );
}
