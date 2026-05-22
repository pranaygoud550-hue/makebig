/**
 * Socket.io Real-time Integration Example
 * Add this to your React components to enable real-time features
 */

import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Custom Hook: useProjectSocket
 * Manages socket connection for a project
 */
export function useProjectSocket(projectId, userId, userName, userContact, token) {
  const [messages, setMessages] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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
            setTypingUsers((prev) => prev.some((u) => u.userId === payload.userId) ? prev : [...prev, payload]);
          } else {
            setTypingUsers((prev) => prev.filter((u) => u.userId !== payload.userId));
          }
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `project_id=eq.${projectId}`,
        }, ({ new: row }) => {
          setMessages((prev) => [{
            id: row.id,
            senderId: row.sender_id,
            senderName: row.sender_name,
            senderContact: row.sender_contact,
            content: row.content,
            createdAt: row.created_at,
          }, ...prev]);
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: `project_id=eq.${projectId}`,
        }, ({ new: row }) => {
          setActivities((prev) => [{
            id: row.id,
            type: row.type,
            description: row.description,
            createdAt: row.created_at,
          }, ...prev]);
        })
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

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

    // Initialize socket connection
    socketRef.current = io(apiUrl, {
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
    });

    // Connect event
    socketRef.current.on('connect', () => {
      console.log('✅ Connected to real-time server');

      // Join project room
      socketRef.current.emit('join_project', {
        projectId,
        userId,
        userName,
        userContact,
      });
    });

    // Receive messages
    socketRef.current.on('new_message', (message) => {
      setMessages((prev) => [message, ...prev]);
    });

    // Active users
    socketRef.current.on('active_users', (users) => {
      setActiveUsers(users);
    });

    // User joined
    socketRef.current.on('user_joined', (data) => {
      console.log(`👤 ${data.userName} joined`);
    });

    // User left
    socketRef.current.on('user_left', (data) => {
      console.log(`👤 ${data.userName} left`);
    });

    // Typing indicator
    socketRef.current.on('user_typing', (data) => {
      if (data.isTyping && data.userId !== userId) {
        setTypingUsers((prev) =>
          prev.some((u) => u.userId === data.userId)
            ? prev
            : [...prev, data]
        );
      } else if (!data.isTyping) {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      }
    });

    // Project changes
    socketRef.current.on('project_changed', (data) => {
      console.log('📝 Project updated:', data);
    });

    // Member status
    socketRef.current.on('member_status_changed', (data) => {
      console.log(`👥 ${data.memberName} status: ${data.status}`);
    });

    // Activity updates
    socketRef.current.on('activity_created', (activity) => {
      setActivities((prev) => [activity, ...prev]);
    });

    // Notifications
    socketRef.current.on('notification_received', (notification) => {
      console.log('🔔 Notification:', notification);
    });

    // Error handling
    socketRef.current.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    // Connection error
    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_project', {
          projectId,
          userId,
          userName,
        });
        socketRef.current.disconnect();
      }
    };
  }, [projectId, userId, userName, userContact, token]);

  // Send message
  const sendMessage = (content, type = 'text') => {
    if (isSupabaseConfigured) {
      supabase.from('messages').insert({
        project_id: projectId,
        sender_id: userId,
        sender_name: userName,
        sender_contact: userContact,
        content,
      }).then(({ error }) => {
        if (error) console.error('Supabase message error:', error);
      });
      return;
    }

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('send_message', {
        projectId,
        senderId: userId,
        senderName: userName,
        content,
        type,
      });
    }
  };

  // Typing indicator
  const emitTyping = (isTyping) => {
    if (isSupabaseConfigured) {
      socketRef.current?.channel?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { projectId, userId, userName, isTyping },
      });
      return;
    }

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('user_typing', {
        projectId,
        userId,
        userName,
        isTyping,
      });
    }
  };

  // Send notification
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

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('send_notification', {
        toUserId,
        type,
        title,
        message,
        actionUrl,
      });
    }
  };

  // Project update
  const updateProject = (updatedFields) => {
    if (isSupabaseConfigured) {
      supabase.from('projects').update(updatedFields).eq('id', projectId);
      return;
    }

    if (socketRef.current && socketRef.current.connected) {
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
    isConnected: socketRef.current?.connected || false,
  };
}

/**
 * Example Component: Real-time Chat
 */
export function ProjectChat({ projectId, userId, userName, userContact, token }) {
  const {
    messages,
    activeUsers,
    typingUsers,
    sendMessage,
    emitTyping,
    isConnected,
  } = useProjectSocket(projectId, userId, userName, userContact, token);

  const [input, setInput] = useState('');
  const typingTimeoutRef = useRef(null);

  const handleInputChange = (e) => {
    setInput(e.target.value);

    // Emit typing
    emitTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 2000);
  };

  const handleSendMessage = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
      emitTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Project Chat</h2>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm text-gray-600">
              {isConnected ? `${activeUsers.length} Online` : 'Offline'}
            </span>
          </div>
        </div>
        {/* Active Users */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {activeUsers.map((user) => (
            <div key={user.userId} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {user.userName}
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div key={message._id} className="flex gap-2">
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900">
                {message.senderName}
              </div>
              <div className="text-sm text-gray-700 bg-gray-100 p-2 rounded">
                {message.content}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(message.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="text-sm text-gray-500 italic">
            {typingUsers.map((u) => u.userName).join(', ')} is typing...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            disabled={!isConnected}
          />
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Example Component: Activity Feed
 */
export function ActivityFeed({ projectId, userId, userName, userContact, token }) {
  const { activities } = useProjectSocket(projectId, userId, userName, userContact, token);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-4">Activity Feed</h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity._id} className="text-sm border-l-4 border-blue-500 pl-4 py-2">
            <p className="font-semibold text-gray-900">{activity.description}</p>
            <p className="text-gray-500 text-xs">
              {new Date(activity.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default useProjectSocket;
