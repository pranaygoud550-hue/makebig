/**
 * Socket.io Real-time Integration
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { isSupabaseConfigured, supabase } from './supabase';
import { getAuthHeadersAsync, getAuthTokenAsync, apiSendProjectMessage } from './api';
import { getApiOrigin } from './apiBase';
import { devLog } from './devLog';

function messageId(message) {
  return String(message?.id || message?._id || '');
}

function appendUniqueMessage(prev, message) {
  const id = messageId(message);
  if (!id || prev.some((m) => messageId(m) === id)) return prev;
  return [message, ...prev];
}

/**
 * Custom Hook: useProjectSocket
 * Manages socket connection for a project room (`project_${projectId}` on server).
 */
export function useProjectSocket(projectId, userId, userName, userContact, token) {
  const [messages, setMessages] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  const handleIncomingMessage = useCallback((message) => {
    if (!message) return;
    devLog('[socket] new_message received', messageId(message), message);
    setMessages((prev) => appendUniqueMessage(prev, message));
  }, []);

  useEffect(() => {
    if (!projectId) return;

    if (isSupabaseConfigured) {
      const channel = supabase.channel(`project:${projectId}`, {
        config: { presence: { key: userId || userContact || userName } },
      });
      socketRef.current = { connected: true, channel, disconnect: () => supabase.removeChannel(channel) };

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const users = Object.values(state).flat().map((u) => ({
            userId: u.userId,
            userName: u.userName,
            userContact: u.userContact,
          }));
          setActiveUsers(users);
        })
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          if (payload.userId === userId) return;
          if (payload.isTyping) {
            setTypingUsers((prev) =>
              prev.some((u) => u.userId === payload.userId) ? prev : [...prev, payload]
            );
          } else {
            setTypingUsers((prev) => prev.filter((u) => u.userId !== payload.userId));
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `project_id=eq.${projectId}`,
          },
          ({ new: row }) => {
            handleIncomingMessage({
              id: row.id,
              senderId: row.sender_id,
              senderName: row.sender_name,
              senderContact: row.sender_contact,
              content: row.content,
              createdAt: row.created_at,
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activities',
            filter: `project_id=eq.${projectId}`,
          },
          ({ new: row }) => {
            setActivities((prev) => [
              {
                id: row.id,
                type: row.type,
                description: row.description,
                createdAt: row.created_at,
              },
              ...prev,
            ]);
          }
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ userId, userName, userContact, onlineAt: new Date().toISOString() });
          }
        });

      return () => {
        supabase.removeChannel(channel);
        socketRef.current = null;
      };
    }

    let cancelled = false;

    async function connect() {
      const authToken = token || (await getAuthTokenAsync());
      if (!authToken || cancelled) {
        devLog('[socket] no auth token — skipping connect');
        return;
      }

      const apiUrl = getApiOrigin();
      devLog('[socket] connecting to', apiUrl, 'project', projectId);

      const socket = io(apiUrl, {
        auth: { token: authToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
      });

      socketRef.current = socket;

      const joinRoom = () => {
        devLog('[socket] join_project → room project_' + projectId);
        socket.emit('join_project', {
          projectId,
          userId,
          userName,
          userContact,
        });
      };

      socket.on('connect', () => {
        devLog('[socket] connected', socket.id);
        setIsConnected(true);
        joinRoom();
      });

      socket.io.on('reconnect', () => {
        devLog('[socket] reconnected — rejoining room');
        joinRoom();
      });

      socket.on('disconnect', () => {
        devLog('[socket] disconnected');
        setIsConnected(false);
      });

      socket.on('new_message', handleIncomingMessage);
      socket.on('newMessage', handleIncomingMessage);

      socket.on('active_users', (users) => {
        setActiveUsers(users);
      });

      socket.on('user_joined', (data) => {
        devLog('[socket] user_joined', data.userName);
      });

      socket.on('user_left', (data) => {
        devLog('[socket] user_left', data.userName);
      });

      socket.on('user_typing', (data) => {
        if (data.isTyping && data.userId !== userId) {
          setTypingUsers((prev) =>
            prev.some((u) => u.userId === data.userId) ? prev : [...prev, data]
          );
        } else if (!data.isTyping) {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        }
      });

      socket.on('project_changed', (data) => {
        devLog('[socket] project_changed', data);
      });

      socket.on('activity_created', (activity) => {
        setActivities((prev) => [activity, ...prev]);
      });

      const pushActivity = (type, description) => {
        setActivities((prev) => [
          {
            id: `${type}-${Date.now()}`,
            type,
            description,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      };

      socket.on('task_created', ({ task }) => {
        if (task?.title) pushActivity('task_created', `Task "${task.title}" was created`);
      });
      socket.on('task_updated', ({ task }) => {
        if (task?.title) pushActivity('task_updated', `Task "${task.title}" moved to ${task.status}`);
      });
      socket.on('task_deleted', ({ taskId }) => {
        pushActivity('task_deleted', `Task removed (${taskId})`);
      });
      socket.on('member_status_changed', (data) => {
        if (data.memberName && data.status) {
          pushActivity('member_joined', `${data.memberName} status: ${data.status}`);
        }
      });

      socket.on('notification_received', (notification) => {
        devLog('[socket] notification_received', notification);
      });

      socket.on('error', (error) => {
        console.error('[socket] error', error);
      });

      socket.on('connect_error', (error) => {
        console.error('[socket] connect_error', error.message);
        setIsConnected(false);
      });
    }

    connect();

    return () => {
      cancelled = true;
      if (socketRef.current && !isSupabaseConfigured) {
        socketRef.current.emit('leave_project', {
          projectId,
          userId,
          userName,
        });
        socketRef.current.off('new_message', handleIncomingMessage);
        socketRef.current.off('newMessage', handleIncomingMessage);
        socketRef.current.disconnect();
      }
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [projectId, userId, userName, userContact, token, handleIncomingMessage]);

  const sendMessage = async (content, type = 'text') => {
    const trimmed = String(content || '').trim();
    if (!trimmed) return { ok: false, error: 'Empty message' };

    if (socketRef.current?.connected && !isSupabaseConfigured) {
      devLog('[socket] send_message via socket');
      socketRef.current.emit('send_message', {
        projectId,
        senderId: userId,
        senderName: userName,
        content: trimmed,
        type,
      });
      return { ok: true };
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('messages').insert({
        project_id: projectId,
        sender_id: userId,
        sender_name: userName,
        sender_contact: userContact,
        content: trimmed,
      });
      if (error) {
        console.error('Supabase message error:', error);
        return { ok: false, error: error.message };
      }
      return { ok: true };
    }

    try {
      devLog('[socket] send_message via REST fallback');
      const result = await apiSendProjectMessage(projectId, trimmed);
      if (!result.ok) {
        return { ok: false, error: result.error || 'Could not send message' };
      }
      if (result.message) {
        handleIncomingMessage(result.message);
      }
      return { ok: true };
    } catch (e) {
      console.error('sendMessage error:', e);
      return { ok: false, error: 'Could not send message' };
    }
  };

  const emitTyping = (isTyping) => {
    if (isSupabaseConfigured) {
      socketRef.current?.channel?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { projectId, userId, userName, isTyping },
      });
      return;
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('user_typing', {
        projectId,
        userId,
        userName,
        isTyping,
      });
    }
  };

  const sendNotification = (toUserId, type, title, message, actionUrl = null) => {
    if (isSupabaseConfigured) {
      supabase.from('notifications').insert({
        user_contact: toUserId,
        type,
        title,
        message,
        metadata: { actionUrl },
      });
      return;
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('send_notification', {
        toUserId,
        type,
        title,
        message,
        actionUrl,
      });
    }
  };

  const updateProject = (updatedFields) => {
    if (isSupabaseConfigured) {
      supabase.from('projects').update(updatedFields).eq('id', projectId);
      return;
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('project_updated', {
        projectId,
        updatedFields,
        updatedBy: userId,
        updatedByName: userName,
      });
    }
  };

  return {
    socket: socketRef.current,
    messages,
    activeUsers,
    typingUsers,
    activities,
    sendMessage,
    emitTyping,
    sendNotification,
    updateProject,
    isConnected,
  };
}

export default useProjectSocket;
