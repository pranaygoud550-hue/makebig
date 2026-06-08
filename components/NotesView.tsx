'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import {
  apiExtractTasksFromNotes,
  apiGetProjectNotes,
  apiSaveProjectNotes,
  type ExtractedTaskItem,
} from '@/lib/api';
import { getAuthHeadersAsync } from '@/lib/api';
import { socketManager } from '@/lib/realtime';
import { useToast } from '@/lib/context/ToastContext';
import { getApiOrigin } from '@/lib/apiBase';

interface NotesViewProps {
  projectId: string;
  userId: string;
  userName: string;
  userContact: string;
}

const API = getApiOrigin();

function formatSavedTime(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function NotesView({ projectId, userId, userName, userContact }: NotesViewProps) {
  const { showToast } = useToast();
  const socketRef = useRef<Socket | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef('');

  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [updatedByName, setUpdatedByName] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [loading, setLoading] = useState(true);
  const [extracted, setExtracted] = useState<ExtractedTaskItem[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [extracting, setExtracting] = useState(false);
  const [addingTasks, setAddingTasks] = useState(false);

  const loadNotes = useCallback(async () => {
    const note = await apiGetProjectNotes(projectId);
    if (note) {
      setContent(note.content || '');
      contentRef.current = note.content || '';
      setUpdatedByName(note.updatedByName || '');
      setUpdatedAt(note.updatedAt);
    }
    setLoading(false);
  }, [projectId]);

  const persistNotes = useCallback(
    async (text: string) => {
      setSaveState('saving');
      try {
        const saved = await apiSaveProjectNotes(projectId, text);
        if (saved) {
          setUpdatedByName(saved.updatedByName || userName);
          setUpdatedAt(saved.updatedAt);
          setIsDirty(false);
        }
        setSaveState('saved');
      } catch {
        setSaveState('idle');
        showToast('Could not save notes', 'error');
      }
    },
    [projectId, userName, showToast]
  );

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    let socket: Socket | null = null;

    const onNotesUpdated = (data: {
      content?: string;
      updatedBy?: string;
      updatedByName?: string;
      updatedAt?: string;
    }) => {
      if (data.updatedBy === userContact) return;
      if (typeof data.content === 'string') {
        setContent(data.content);
        contentRef.current = data.content;
        setIsDirty(false);
      }
      if (data.updatedByName) setUpdatedByName(data.updatedByName);
      if (data.updatedAt) setUpdatedAt(data.updatedAt);
      showToast(`Notes updated by ${data.updatedByName || 'teammate'}`, 'success');
    };

    (async () => {
      socket = await socketManager.joinProjectRoom(projectId, {
        userId,
        userName,
        userContact,
      });
      if (cancelled || !socket) return;
      socketRef.current = socket;
      socket.on('notes_updated', onNotesUpdated);
    })();

    return () => {
      cancelled = true;
      if (socket) socket.off('notes_updated', onNotesUpdated);
      socketRef.current = null;
      socketManager.releaseProjectRoom(projectId, userId, userName);
    };
  }, [projectId, userId, userName, userContact, showToast]);

  const scheduleSave = (text: string) => {
    setIsDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persistNotes(text);
    }, 3000);
  };

  const handleChange = (text: string) => {
    setContent(text);
    contentRef.current = text;
    setSaveState('idle');
    scheduleSave(text);
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (isDirty && contentRef.current) {
        void apiSaveProjectNotes(projectId, contentRef.current);
      }
    };
  }, [projectId, isDirty]);

  const handleExtract = async () => {
    if (!content.trim()) {
      showToast('Add some meeting notes first', 'error');
      return;
    }
    setExtracting(true);
    try {
      const { tasks } = await apiExtractTasksFromNotes(projectId, content);
      setExtracted(tasks);
      setSelected(Object.fromEntries(tasks.map((_, i) => [i, true])));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Extraction failed', 'error');
    } finally {
      setExtracting(false);
    }
  };

  const handleAddSelected = async () => {
    const toAdd = extracted.filter((_, i) => selected[i]);
    if (!toAdd.length) {
      showToast('Select at least one task', 'error');
      return;
    }
    setAddingTasks(true);
    try {
      const headers = await getAuthHeadersAsync();
      await Promise.all(
        toAdd.map((t) =>
          fetch(`${API}/api/projects/${projectId}/tasks`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              title: t.task,
              description: [t.assignee && `Assignee: ${t.assignee}`, t.dueDate && `Due: ${t.dueDate}`]
                .filter(Boolean)
                .join(' · '),
              priority: t.priority || 'medium',
              assignee: t.assignee || '',
            }),
          })
        )
      );
      showToast(`Added ${toAdd.length} task${toAdd.length > 1 ? 's' : ''}`, 'success');
      setExtracted([]);
      setSelected({});
    } catch {
      showToast('Could not create tasks', 'error');
    } finally {
      setAddingTasks(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-[#e0e0e0] p-4 md:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#1d2226]">Shared Project Notes</h2>
            <p className="text-xs text-[#666] mt-0.5">
              Meeting notes, ideas, and decisions — visible to the whole team.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleExtract()}
            disabled={extracting || !content.trim()}
            className="px-4 py-2 text-sm font-semibold rounded-full bg-[#EEF3FB] text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white disabled:opacity-40 transition-all"
          >
            {extracting ? 'Extracting…' : '🤖 Extract tasks from notes'}
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-[#666]">Loading notes…</div>
        ) : (
          <>
            <textarea
              value={content}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Paste meeting notes, brainstorm ideas, or jot down decisions…"
              className="w-full min-h-[320px] md:min-h-[420px] px-4 py-3 border border-[#d9d9d9] rounded-xl text-sm text-[#1d2226] placeholder:text-[#999] focus:outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20 resize-y leading-relaxed"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs text-[#666]">
              <span>
                {saveState === 'saving' && 'Saving…'}
                {saveState === 'saved' && updatedAt && `Saved ${formatSavedTime(updatedAt)}`}
                {saveState === 'idle' && isDirty && 'Unsaved changes — autosaving soon…'}
              </span>
              {updatedByName && (
                <span>Last edited by {updatedByName}</span>
              )}
            </div>
          </>
        )}
      </div>

      {extracted.length > 0 && (
        <div className="bg-white rounded-xl border border-[#e0e0e0] p-4 md:p-5">
          <h3 className="font-bold text-[#1d2226] mb-3">Extracted action items</h3>
          <div className="space-y-2">
            {extracted.map((t, i) => (
              <label
                key={`${t.task}-${i}`}
                className="flex items-start gap-3 p-3 rounded-lg border border-[#e8e8e8] hover:bg-[#f8f9fa] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={!!selected[i]}
                  onChange={(e) => setSelected((p) => ({ ...p, [i]: e.target.checked }))}
                  className="mt-1"
                />
                <span className="text-sm text-[#1d2226]">
                  {t.task}
                  {t.assignee && ` — ${t.assignee}`}
                  {t.dueDate && ` — by ${t.dueDate}`}
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void handleAddSelected()}
            disabled={addingTasks}
            className="mt-4 px-5 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#004182] disabled:opacity-50"
          >
            {addingTasks ? 'Adding…' : 'Add selected tasks'}
          </button>
        </div>
      )}
    </div>
  );
}
