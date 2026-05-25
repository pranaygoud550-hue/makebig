'use client';

import { useEffect, useState, useRef } from 'react';
import { useProjectSocket } from '@/lib/useProjectSocket';
import { apiGetProjectMessages, getAuthToken } from '@/lib/api';
import { getInitials } from '@/lib/utils';
import { useProfileView } from '@/lib/context/ProfileViewContext';

interface MessagesViewProps {
  projectId: string;
  userId: string;
  userName: string;
  userContact: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

const AVATAR_COLORS = [
  'bg-purple-500', 'bg-teal-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500',
];

function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function MessagesView({ projectId, userId, userName, userContact }: MessagesViewProps) {
  const token = getAuthToken();
  const { openProfile } = useProfileView();
  const { messages, activeUsers, typingUsers, sendMessage, emitTyping, isConnected } =
    useProjectSocket(projectId, userId, userName, userContact, token);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(true);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);

  /* ── Load existing messages ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const stored = await apiGetProjectMessages(projectId);
      if (!cancelled) {
        setChatMessages(
          stored
            .map((m: Record<string, string>) => ({
              id: m.id || m._id || String(m.createdAt),
              senderId: m.senderId,
              senderName: m.senderName || 'User',
              content: m.content,
              createdAt: m.createdAt,
            }))
            .reverse()
        );
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  /* ── Incoming socket messages ── */
  useEffect(() => {
    if (!messages.length) return;
    const latest = messages[0] as Record<string, string>;
    const latestId = latest.id || latest._id;
    setChatMessages(prev => {
      if (prev.some(m => m.id === latestId)) return prev;
      return [...prev, {
        id: latestId,
        senderId: latest.senderId,
        senderName: latest.senderName,
        content: latest.content,
        createdAt: latest.createdAt,
      }];
    });
  }, [messages]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleInput = (val: string) => {
    setInput(val);
    emitTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 2000);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setChatMessages(prev => [...prev, {
      id: `local-${Date.now()}`,
      senderId: userId,
      senderName: userName,
      content: input.trim(),
      createdAt: new Date().toISOString(),
    }]);
    setInput('');
    emitTyping(false);
  };

  const typingLabel = typingUsers.length > 0
    ? `${typingUsers.map((u: { userName: string }) => u.userName).join(', ')} typing…`
    : null;

  return (
    <div className="flex flex-col h-full min-h-[70vh]">

      {/* Header */}
      <div className="bg-white rounded-t-xl border border-b-0 border-[#e0e0e0] px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1d2226]">Project Chat</h2>
            <p className="text-xs mt-0.5">
              {isConnected
                ? <span className="text-green-600 font-medium">● Live — {activeUsers.length} online</span>
                : <span className="text-amber-500">○ Connecting…</span>}
            </p>
          </div>

          {/* Online avatars */}
          {activeUsers.length > 0 && (
            <div className="flex -space-x-2">
              {activeUsers.slice(0, 4).map((u: { userId: string; userName: string }, i: number) => (
                <div
                  key={u.userId}
                  title={u.userName}
                  className={`w-8 h-8 rounded-full border-2 border-white ${colorForName(u.userName)} flex items-center justify-center text-white text-xs font-bold`}
                >
                  {getInitials(u.userName)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-[#f8f9fa] border-x border-[#e0e0e0] p-5 space-y-3">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-[#0A66C2] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-[#EEF3FB] flex items-center justify-center text-3xl mb-5">💬</div>
            <p className="text-[#1d2226] font-bold text-base">Start the conversation</p>
            <p className="text-sm text-[#666] mt-1.5 max-w-[240px] leading-relaxed">
              Your team chat is ready. Say hello — real-time messages are delivered instantly.
            </p>
            <div className="mt-5 flex gap-2 flex-wrap justify-center">
              {['👋 Hey team!', '🚀 Let\'s build!', '📋 Tasks assigned!'].map(quick => (
                <button
                  key={quick}
                  onClick={() => {
                    const inputEl = document.querySelector<HTMLInputElement>('.messages-input');
                    if (inputEl) { inputEl.value = quick; inputEl.focus(); inputEl.dispatchEvent(new Event('input', { bubbles: true })); }
                  }}
                  className="text-xs px-3 py-1.5 bg-white border border-[#d9d9d9] text-[#666] rounded-full hover:border-[#0A66C2] hover:text-[#0A66C2] transition-all"
                >
                  {quick}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map(msg => {
          const isOwn = msg.senderId === userId || msg.senderName === userName;
          const profileContact =
            msg.senderId?.includes('@') || /^\d{10}$/.test(String(msg.senderId || '').replace(/\D/g, '').slice(-10))
              ? msg.senderId
              : msg.senderName?.includes('@')
                ? msg.senderName
                : null;
          return (
            <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
              {!isOwn && (
                <button
                  type="button"
                  onClick={() => profileContact && openProfile(profileContact, msg.senderName)}
                  className={`w-8 h-8 rounded-full ${colorForName(msg.senderName)} flex items-center justify-center text-white text-xs font-bold shrink-0 self-end hover:ring-2 hover:ring-[#0A66C2]/30`}
                >
                  {getInitials(msg.senderName)}
                </button>
              )}
              <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isOwn && (
                  <button
                    type="button"
                    onClick={() => profileContact && openProfile(profileContact, msg.senderName)}
                    className="text-[10px] text-[#666] font-semibold mb-1 px-1 hover:text-[#0A66C2] hover:underline"
                  >
                    {msg.senderName}
                  </button>
                )}
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isOwn
                    ? 'bg-[#0A66C2] text-white rounded-br-sm'
                    : 'bg-white border border-[#e0e0e0] text-[#1d2226] rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
                <p className={`text-[10px] mt-1 px-1 ${isOwn ? 'text-right' : ''} text-[#999]`}>
                  {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}

        {typingLabel && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#e0e0e0] flex items-center justify-center text-[#999] text-xs">…</div>
            <div className="bg-white border border-[#e0e0e0] rounded-2xl rounded-bl-sm px-4 py-2.5">
              <p className="text-xs text-[#999] italic">{typingLabel}</p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="bg-white border border-t-0 border-[#e0e0e0] rounded-b-xl p-4">
        <div className="flex gap-3 items-end">
          <div className="w-8 h-8 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {getInitials(userName)}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={isConnected ? 'Write a message…' : 'Connecting to chat…'}
              disabled={!isConnected}
              className="messages-input flex-1 px-4 py-2 bg-[#f3f2ef] border border-[#d9d9d9] rounded-full text-sm text-[#1d2226] placeholder-[#999] focus:outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20 disabled:opacity-50 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!isConnected || !input.trim()}
              className="w-10 h-10 flex items-center justify-center bg-[#0A66C2] text-white rounded-full hover:bg-[#004182] disabled:opacity-40 transition-all text-base shrink-0"
              title="Send"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
