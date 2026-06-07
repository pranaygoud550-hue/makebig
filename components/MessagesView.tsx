'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { apiGetProjectMessages, apiSendProjectMessage, apiGetStandupToday, apiSubmitStandup } from '@/lib/api';
import { socketManager } from '@/lib/realtime';
import { getInitials } from '@/lib/utils';
import { useProfileView } from '@/lib/context/ProfileViewContext';
import { useToast } from '@/lib/context/ToastContext';
import { extractUrls } from '@/lib/linkReaderUtils';
import { queueAILink } from '@/lib/aiLinkPending';
import { markOnboardingStandup } from '@/components/app/OnboardingChecklist';
import { MessageSkeleton } from '@/components/ui/Skeleton';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '✅', '👀', '🎉', '💪', '🤔', '😅', '🙏', '💡'];

interface MessagesViewProps {
  projectId: string;
  userId: string;
  userName: string;
  userContact: string;
  onAskAIAboutLink?: (url: string) => void;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface TypingUser {
  userId: string;
  userName: string;
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
    id: String(m.id || m._id || m.createdAt),
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

function isAfter9amIST() {
  const hour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }).format(new Date()),
    10
  );
  return hour >= 9;
}

export function MessagesView({
  projectId,
  userId,
  userName,
  userContact,
  onAskAIAboutLink,
}: MessagesViewProps) {
  const { openProfile } = useProfileView();
  const socketRef = useRef<Socket | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeUsers, setActiveUsers] = useState<TypingUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showStandup, setShowStandup] = useState(false);
  const [standupDateLabel, setStandupDateLabel] = useState('');
  const [standupFormOpen, setStandupFormOpen] = useState(false);
  const [standupYesterday, setStandupYesterday] = useState('');
  const [standupToday, setStandupToday] = useState('');
  const [standupBlockers, setStandupBlockers] = useState('');
  const [standupSubmitting, setStandupSubmitting] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [readerIds, setReaderIds] = useState<string[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showToast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredMessages = searchQuery.trim()
    ? chatMessages.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : chatMessages;

  const highlightContent = (text: string) => {
    const q = searchQuery.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  const appendMessages = useCallback((incoming: ChatMessage[]) => {
    setChatMessages((prev) => mergeMessages(prev, incoming));
  }, []);

  const loadMessages = useCallback(async () => {
    const stored = await apiGetProjectMessages(projectId);
    return stored.map((m: Record<string, string>) => normalizeMessage(m));
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !isAfter9amIST()) return;
    let cancelled = false;
    (async () => {
      const standup = await apiGetStandupToday(projectId);
      if (cancelled || !standup) return;
      if (!standup.userSubmitted && !standup.userSkipped) {
        setStandupDateLabel(standup.dateLabel);
        setShowStandup(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const submitStandup = async (skip: boolean) => {
    setStandupSubmitting(true);
    try {
      const result = await apiSubmitStandup(projectId, skip
        ? { skip: true }
        : {
            yesterday: standupYesterday.trim(),
            today: standupToday.trim(),
            blockers: standupBlockers.trim() || 'None',
          });
      if (result?.message) {
        appendMessages([normalizeMessage(result.message as Record<string, string>)]);
      }
      if (!skip && userContact) markOnboardingStandup(userContact);
      setShowStandup(false);
      setStandupFormOpen(false);
    } catch {
      setSendError('Could not submit standup');
    } finally {
      setStandupSubmitting(false);
    }
  };

  /* Connect → join room → then load messages */
  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    const onConnect = () => {
      console.log('[MessagesView] socket connected');
      setIsConnected(true);
    };

    const onDisconnect = () => {
      console.log('[MessagesView] socket disconnected');
      setIsConnected(false);
    };

    const onNewMessage = (message: Record<string, string>) => {
      console.log('[MessagesView] new_message', message.id || message._id);
      appendMessages([normalizeMessage(message)]);
    };

    const onActiveUsers = (users: TypingUser[]) => {
      setActiveUsers(Array.isArray(users) ? users : []);
    };

    const onUserTyping = (data: { userId: string; userName: string; isTyping: boolean }) => {
      if (data.userId === userId) return;
      if (data.isTyping) {
        setTypingUsers((prev) =>
          prev.some((u) => u.userId === data.userId) ? prev : [...prev, data]
        );
      } else {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      }
    };

    const onMessagesSeen = (data: { readerIds?: string[] }) => {
      setReaderIds(Array.isArray(data.readerIds) ? data.readerIds : []);
    };

    (async () => {
      setLoading(true);
      setChatMessages([]);
      setIsConnected(false);

      const socket = await socketManager.joinProjectRoom(projectId, {
        userId,
        userName,
        userContact,
      });

      if (cancelled) return;

      if (!socket) {
        const msgs = await loadMessages();
        if (!cancelled) {
          appendMessages(msgs);
          setLoading(false);
        }
        return;
      }

      socketRef.current = socket;
      setIsConnected(socket.connected);

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('new_message', onNewMessage);
      socket.on('newMessage', onNewMessage);
      socket.on('active_users', onActiveUsers);
      socket.on('user_typing', onUserTyping);
      socket.on('messages_seen', onMessagesSeen);
      socket.emit('messages_read', { projectId });

      /* Wait briefly for join_project to complete before loading history */
      await new Promise((r) => setTimeout(r, socket.connected ? 150 : 400));

      const msgs = await loadMessages();
      if (!cancelled) {
        appendMessages(msgs);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      const socket = socketRef.current;
      if (socket) {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('new_message', onNewMessage);
        socket.off('newMessage', onNewMessage);
        socket.off('active_users', onActiveUsers);
        socket.off('user_typing', onUserTyping);
        socket.off('messages_seen', onMessagesSeen);
      }
      socketRef.current = null;
      socketManager.releaseProjectRoom(projectId, userId, userName);
    };
  }, [projectId, userId, userName, userContact, appendMessages, loadMessages]);

  /* Fallback poll when disconnected */
  useEffect(() => {
    if (isConnected) return;
    const interval = setInterval(async () => {
      const fresh = await loadMessages();
      appendMessages(fresh);
    }, 6000);
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

  const emitTyping = (isTyping: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('user_typing', {
        projectId,
        userId,
        userName,
        isTyping,
      });
    }
  };

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

    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', {
        projectId,
        senderId: userId,
        senderName: userName,
        content: text,
        type: 'text',
      });
      setInput('');
      emitTyping(false);
      return;
    }

    const result = await apiSendProjectMessage(projectId, text);
    if (!result.ok) {
      setSendError(result.error || 'Could not send message');
      return;
    }
    if (result.message) {
      appendMessages([normalizeMessage(result.message as Record<string, string>)]);
    }
    setInput('');
    emitTyping(false);
  };

  const typingLabel =
    typingUsers.length > 0
      ? `${typingUsers.map((u) => u.userName).join(', ')} typing…`
      : null;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const statusLabel = isConnected
    ? `● Live${activeUsers.length ? ` — ${activeUsers.length} online` : ''}`
    : '○ Reconnecting…';

  return (
    <div className="flex flex-col h-[calc(100dvh-10rem)] md:h-full min-h-[70vh] max-h-[85dvh] md:max-h-none">
      <div className="bg-white rounded-t-xl border border-b-0 border-[#e0e0e0] px-4 md:px-5 py-3 md:py-4 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base md:text-lg font-bold text-[#1d2226]">Project Chat</h2>
            <p className="text-xs mt-0.5">
              {isConnected ? (
                <span className="text-green-600 font-medium">{statusLabel}</span>
              ) : (
                <span className="text-amber-600 font-medium">{statusLabel}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
          {activeUsers.length > 0 && (
            <div className="flex -space-x-2">
              {activeUsers.slice(0, 4).map((u) => (
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
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="ml-2 w-9 h-9 rounded-full border border-[#d9d9d9] text-[#666] hover:border-[#0A66C2] shrink-0"
            title="Search messages"
          >
            🔍
          </button>
          </div>
        </div>
        {searchOpen && (
          <div className="mt-3">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages…"
              className="w-full px-3 py-2 border border-[#d9d9d9] rounded-lg text-sm"
            />
            {searchQuery.trim() && (
              <p className="text-[10px] text-[#999] mt-1">{filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f8f9fa] border-x border-[#e0e0e0] p-4 md:p-5 space-y-3 pb-24 md:pb-4">
        {showStandup && (
          <div className="sticky top-0 z-10 bg-gradient-to-r from-[#EEF3FB] to-white border border-[#0A66C2]/20 rounded-xl p-4 shadow-sm">
            <p className="text-sm font-bold text-[#1d2226]">
              🤖 Daily Standup — {standupDateLabel}
            </p>
            <ul className="text-xs text-[#666] mt-2 space-y-1 list-disc list-inside">
              <li>What did you work on yesterday?</li>
              <li>What will you do today?</li>
              <li>Any blockers?</li>
            </ul>

            {standupFormOpen && (
              <div className="mt-3 space-y-2">
                <input
                  value={standupYesterday}
                  onChange={(e) => setStandupYesterday(e.target.value)}
                  placeholder="Yesterday…"
                  className="w-full px-3 py-2 border border-[#d9d9d9] rounded-lg text-sm"
                />
                <input
                  value={standupToday}
                  onChange={(e) => setStandupToday(e.target.value)}
                  placeholder="Today…"
                  className="w-full px-3 py-2 border border-[#d9d9d9] rounded-lg text-sm"
                />
                <input
                  value={standupBlockers}
                  onChange={(e) => setStandupBlockers(e.target.value)}
                  placeholder="Blockers (optional)"
                  className="w-full px-3 py-2 border border-[#d9d9d9] rounded-lg text-sm"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              {!standupFormOpen ? (
                <button
                  type="button"
                  onClick={() => setStandupFormOpen(true)}
                  className="px-4 py-1.5 bg-[#0A66C2] text-white text-xs font-semibold rounded-full hover:bg-[#004182]"
                >
                  Submit Update
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void submitStandup(false)}
                  disabled={standupSubmitting || !standupToday.trim()}
                  className="px-4 py-1.5 bg-[#0A66C2] text-white text-xs font-semibold rounded-full hover:bg-[#004182] disabled:opacity-40"
                >
                  {standupSubmitting ? 'Sending…' : 'Send standup'}
                </button>
              )}
              <button
                type="button"
                onClick={() => void submitStandup(true)}
                disabled={standupSubmitting}
                className="px-4 py-1.5 border border-[#d9d9d9] text-[#666] text-xs font-semibold rounded-full hover:bg-[#f3f2ef]"
              >
                Skip Today
              </button>
            </div>
          </div>
        )}

        {loading && <MessageSkeleton />}

        {!loading && chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-[#EEF3FB] dark:bg-gray-800 flex items-center justify-center text-3xl mb-5">
              💬
            </div>
            <p className="text-[#1d2226] dark:text-white font-bold text-sm md:text-base">Your team chat</p>
            <p className="text-xs md:text-sm text-[#666] dark:text-gray-400 mt-1.5 max-w-[280px] leading-relaxed">
              Join a project to start messaging your team — or say hello to kick things off here.
            </p>
          </div>
        )}

        {chatMessages.map((msg) => {
          if (searchQuery.trim() && !filteredMessages.some((f) => f.id === msg.id)) return null;
          const isOwn = msg.senderId === userId || msg.senderName === userName;
          const otherActive = activeUsers.filter((u) => u.userId !== userId).length;
          const otherReaders = readerIds.filter(
            (id) => id !== userId && id !== userContact
          ).length;
          const seenByAll = isOwn && otherActive > 0 && otherReaders >= otherActive;
          const profileContact =
            msg.senderId?.includes('@') ||
            /^\d{10}$/.test(String(msg.senderId || '').replace(/\D/g, '').slice(-10))
              ? msg.senderId
              : msg.senderName?.includes('@')
                ? msg.senderName
                : null;
          return (
            <div
              key={msg.id}
              ref={(el) => { messageRefs.current[msg.id] = el; }}
              className={`flex gap-3 message-enter ${isOwn ? 'flex-row-reverse' : ''}`}
              onClick={() => {
                if (searchQuery.trim()) {
                  messageRefs.current[msg.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
            >
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
                  {searchQuery.trim() ? highlightContent(msg.content) : msg.content}
                </div>
                {extractUrls(msg.content).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const url = extractUrls(msg.content)[0];
                      if (onAskAIAboutLink) {
                        onAskAIAboutLink(url);
                      } else {
                        queueAILink({ url, projectId });
                      }
                    }}
                    className="mt-1 text-[10px] font-semibold text-[#0A66C2] hover:underline self-start"
                  >
                    🤖 Ask AI about this link
                  </button>
                )}
                {isOwn && (
                  <span className="text-[10px] text-[#999] mt-0.5 px-1 self-end">
                    {seenByAll ? '✓✓' : '✓'}
                  </span>
                )}
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

      <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-900 border border-t border-[#e0e0e0] dark:border-gray-700 rounded-b-xl p-3 md:p-4 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {sendError && <p className="text-xs text-red-600 mb-2 px-1">{sendError}</p>}
        <div className="flex gap-2 md:gap-3 items-end">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setEmojiOpen((o) => !o)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f3f2ef] dark:hover:bg-gray-800 text-lg active:scale-95 transition-transform"
              title="Emoji"
              aria-label="Insert emoji"
            >
              😊
            </button>
            {emojiOpen && (
              <div className="absolute bottom-11 left-0 z-20 bg-white dark:bg-gray-800 border border-[#e0e0e0] dark:border-gray-600 rounded-xl shadow-lg p-2 grid grid-cols-6 gap-1 animate-fadeIn">
                {QUICK_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className="text-lg p-1 hover:bg-[#f3f2ef] dark:hover:bg-gray-700 rounded active:scale-95"
                    onClick={() => {
                      setInput((prev) => prev + em);
                      setEmojiOpen(false);
                      textareaRef.current?.focus();
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => showToast('File attachments coming soon', 'info')}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f3f2ef] dark:hover:bg-gray-800 text-[#666] dark:text-gray-400 active:scale-95 transition-transform shrink-0"
            title="Attach file"
            aria-label="Attach file"
          >
            📎
          </button>
          <div className="flex-1 flex gap-2 items-end min-w-0">
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
              className="messages-input flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-[#d9d9d9] dark:border-gray-600 rounded-2xl text-sm text-[#1d2226] dark:text-white placeholder:text-[#999] focus:outline-none focus:border-[#0A66C2] focus:ring-2 focus:ring-[#0A66C2]/20 transition-all resize-none overflow-y-auto leading-5"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim()}
              className="w-10 h-10 flex items-center justify-center bg-[#0A66C2] text-white rounded-full hover:bg-[#004182] disabled:opacity-40 active:scale-95 transition-transform text-base shrink-0"
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
