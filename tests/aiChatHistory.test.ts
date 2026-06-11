import { describe, expect, it } from 'vitest';
import {
  getAIChatThreadKey,
  sanitizeStoredMessages,
  MAX_STORED_AI_MESSAGES,
} from '@/backend/ai/chatHistory.js';

describe('aiChatHistory', () => {
  it('builds thread keys for advisor and project chats', () => {
    expect(getAIChatThreadKey({ advisorMode: true })).toBe('advisor');
    expect(getAIChatThreadKey({ projectId: 'advisor' })).toBe('advisor');
    expect(getAIChatThreadKey({ projectId: '507f1f77bcf86cd799439011' })).toBe(
      'project:507f1f77bcf86cd799439011'
    );
    expect(getAIChatThreadKey({ projectId: '' })).toBe('');
  });

  it('sanitizes and caps stored messages', () => {
    const many = Array.from({ length: MAX_STORED_AI_MESSAGES + 5 }, (_, i) => ({
      id: `m-${i}`,
      role: 'user' as const,
      content: `msg ${i}`,
      ts: i,
    }));
    const stored = sanitizeStoredMessages(many);
    expect(stored).toHaveLength(MAX_STORED_AI_MESSAGES);
    expect(stored[0].content).toBe(`msg ${5}`);
    expect(stored[stored.length - 1].content).toBe(`msg ${MAX_STORED_AI_MESSAGES + 4}`);
  });

  it('drops empty and streaming-only rows', () => {
    const stored = sanitizeStoredMessages([
      { id: '1', role: 'user', content: '  ', ts: 1 },
      { id: '2', role: 'assistant', content: 'Hello', ts: 2 },
    ]);
    expect(stored).toHaveLength(1);
    expect(stored[0].content).toBe('Hello');
  });
});
