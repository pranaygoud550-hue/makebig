'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useProjectSocket } from '@/lib/useProjectSocket';
import { apiGetProjectMessages, getAuthTokenAsync } from '@/lib/api';
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

function normalizeMessage(m: Record<string, string>): ChatMessage {
  return {
    id: m.id || m._id || String(m.createdAt),
    senderId: m.senderId,
    senderName: m.senderName || 'User',
    content: m.content,
    createdAt: m.createdAt,
  };
}

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (!incoming.length) return prev;
  const ids = new Set(prev.map((m) => m.id));
  const merged = [...prev];
  for (const m of incoming) {
    if (!ids.has(m.id)) {
      merged.push(m);
      ids.add(m.id);
    }
  }
  return merged.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function MessagesView({ projectId, userId, userName, userContact }: MessagesViewProps) {
  const [token, setToken] = useState<string | null>(null);
  const { openProfile } = useProfileView();
  const { messages, activeUsers, typingUsers, sendMessage, emitTyping, isConnected } =
    useProjectSocket(projectId, userId, userName, userContact, token);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getAuthTokenAsync().then(setToken);
  }, []);

  const appendMessages = useCallback((incoming: ChatMessage[]) => {
    setChatMessages((prev) => mergeMessages(prev, incoming));
  }, []);

  const loadMessages = useCallback(async () => {
    const stored = await apiGetProjectMessages(projectId);
    return stored.map((m: Record<string, string>) => normalizeMessage(m));
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const msgs = await loadMessages();
      if (!cancelled) {
        appendMessages(msgs);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMessages, appendMessages]);

  /* Append socket messages immediately (no full refetch) */
  useEffect(() => {
    if (!messages.length) return;
    appendMessages(
      messages.map((m: Record<string, string>) => normalizeMessage(m))
    );
  }, [messages, appendMessages]);

  /* Poll only when socket is offline — merge new ids only */
  useEffect(() => {
    if (isConnected) return;
    const interval = setInterval(async () => {
      const fresh = await loadMessages();
      appendMessages(fresh);
    }, 5000);
    return () => clearInterval(interval);
  }, [isConnected, loadMessages, appendMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, typingUsers]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 20;
    const maxHeight = lineHeight * 3 + 16;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  };

  useEffect(() => {
    resizeTextarea();
  }, [input]);

  const handleInput = (val: string) => {
    setInput(val);
    emitTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 2000);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setSendError(null);
    const result = await sendMessage(text);
    if (result?.ok === false) {
      setSendError(result.error || 'Could not send message');
      return;
    }
    setInput('');
    emitTyping(false);
  };

  const typingLabel =
    typingUsers.length > 0
      ? `${typingUsers.map((u: { userName: string }) => u.userName).join(', ')} typing…`
      : null;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-[calc(100dvh-10rem)] md:h-full min-h-[70vh] max-h-[85dvh] md:max-h-none">
      {/* Header */}
      <div className="bg-white rounded-t-xl border border-b-0 border-[#e0e0e0] px-4 md:px-5 py-3 md:py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base md:text-lg font-bold text-[#1d2226]">Project Chat</h2>
            <p className="text-xs mt-0.5">
              {isConnected ? (
                <span className="text-green-600 font-medium">
                  ● Live — {activeUsers.length} online
                </span>
              ) : (
                <span className="text-[#666]">○ Connecting… messages sync every few seconds</span>
              )}
            </p>
          </div>
          {activeUsers.length > 0 && (
            <div className="flex -space-x-2">
              {activeUsers.slice(0, 4).map((u: { userId: string; userName: string }) => (
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
      <div className="flex-1 overflow-y-auto bg-[#f8f9fa] border-x border-[#e0e0e0] p-4 md:p-5 space-y-3 pb-24 md:pb-4">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-[#0A66C2] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-[#EEF3FB] flex items-center justify-center text-3xl mb-5">
              💬
            </div>
            <p className="text-[#1d2226] font-bold text-sm md:text-base">Start the conversation</p>
            <p className="text-xs md:text-sm text-[#666] mt-1.5 max-w-[240px] leading-relaxed">
              Your team chat is ready. Say hello — real-time messages are delivered instantly.
            </p>
          </div>
        )}

        {chatMessages.map((msg) => {
          const isOwn = msg.senderId === userId || msg.senderName === userName;
          const profileContact =
            msg.senderId?.includes('@') ||
            /^\d{10}$/.test(String(msg.senderId || '').replace(/\D/g, '').slice(-10))
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
              <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                <button
                  type="button"
                  onClick={() =>
                    !isOwn && profileContact && openProfile(profileContact, msg.senderName)
                  }
                  className={`text-[10px] font-semibold mb-1 px-1 ${
                    isOwn ? 'text-[#666] text-right' : 'text-[#666] hover:text-[#0A66C2] hover:underline'
                  }`}
                  disabled={isOwn}
                >
                  {isOwn ? 'You' : msg.senderName}
                  <span className="text-[#999] font-normal ml-1.5">{formatTime(msg.createdAt)}</span>
                </button>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isOwn
                      ? 'bg-[#0A66C2] text-white rounded-br-sm'
                      : 'bg-white border border-[#e0e0e0] text-[#1d2226] rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}

        {typingLabel && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#e0e0e0] flex items-center justify-center text-[#999] text-xs">
              …
            </div>
            <div className="bg-white border border-[#e0e0e0] rounded-2xl rounded-bl-sm px-4 py-2.5">
              <p className="text-xs text-[#999] italic">{typingLabel}</p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Sticky input bar */}
      <div className="sticky bottom-0 z-10 bg-white border border-t border-[#e0e0e0] rounded-b-xl p-3 md:p-4 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {sendError && <p className="text-xs text-red-600 mb-2 px-1">{sendError}</p>}
        <div className="flex gap-2 md:gap-3 items-end">
          <div className="w-8 h-8 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {getInitials(userName)}
          </div>
          <div className="flex-1 flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => handleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Write a message…"
              className="messages-input flex-1 px-4 py-2 bg-white border border-[#d9d9d9] rounded-2xl text-sm text-[#1d2226] placeholder:text-[#999] focus:outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20 transition-all resize-none overflow-y-auto leading-5"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim()}
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
