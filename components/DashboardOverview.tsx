'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProjectData, User } from '@/lib/types';
import { apiCheckHealth, getAuthHeadersAsync, apiGetSmartTasks, type SmartTaskSuggestion } from '@/lib/api';
import { getErrorMessage } from '@/lib/userErrors';
import { ensureProjectOnline } from '@/lib/ensureProjectOnline';
import { isValidMongoId } from '@/lib/projectMappers';
import { useToast } from '@/lib/context/ToastContext';
import { getInitials } from '@/lib/utils';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { connectProjectRoom } from '@/lib/realtime';
import Link from 'next/link';
import { StartupEcosystemPanels } from '@/components/ecosystem/StartupEcosystemPanels';
import { isProjectOwner } from '@/lib/projectOwnership';
import { ConnectGitHubCard } from '@/components/ConnectGitHubCard';
import { markOnboardingTasks } from '@/components/app/OnboardingChecklist';

interface DashboardOverviewProps {
  project: ProjectData;
  user: User | null;
  onProjectUpdate?: (project: ProjectData) => void;
  /** Called from parent's floating FAB */
  externalShowNewTask?: boolean;
  onExternalTaskClose?: () => void;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  assignee?: string;
  createdBy?: string;
  createdAt?: string;
}

interface TeamMember { contact: string; role: string; }

function normalizeTask(raw: Record<string, unknown>): Task {
  const status = raw.status as string;
  return {
    id: String(raw.id || raw._id || ''),
    title: String(raw.title || ''),
    description: String(raw.description || ''),
    status:
      status === 'completed'
        ? 'done'
        : (['todo', 'in-progress', 'done'].includes(status)
            ? (status as Task['status'])
            : 'todo'),
    priority: (['high', 'medium', 'low'].includes(String(raw.priority))
      ? raw.priority
      : 'medium') as Task['priority'],
    assignee: String(raw.assignee || ''),
    createdBy: String(raw.createdBy || raw.created_by || ''),
    createdAt: String(raw.createdAt || raw.created_at || ''),
  };
}

const API =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:5001';

const COLUMNS: { key: Task['status']; label: string; accent: string; dot: string }[] = [
  { key: 'todo',        label: 'To Do',       accent: 'bg-[#f3f2ef] text-[#666]',  dot: 'bg-[#aaa]'     },
  { key: 'in-progress', label: 'In Progress',  accent: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400'  },
  { key: 'done',        label: 'Done',         accent: 'bg-green-50 text-green-700', dot: 'bg-green-500'  },
];

const PRIORITY_CLS = {
  high:   'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  low:    'bg-green-50 text-green-600 border-green-200',
};

const AVATAR_COLORS = ['bg-[#0A66C2]', 'bg-purple-500', 'bg-teal-500', 'bg-rose-500', 'bg-amber-500'];

/* ── SVG Health Ring ── */
function HealthRing({ pct, health }: { pct: number; health: 'on-track' | 'at-risk' | 'overdue' }) {
  const R = 38;
  const circ = 2 * Math.PI * R;
  const offset = circ - (pct / 100) * circ;
  const color = health === 'on-track' ? '#22c55e' : health === 'at-risk' ? '#f59e0b' : '#ef4444';
  return (
    <svg width="96" height="96" viewBox="0 0 100 100" className="shrink-0">
      <circle cx="50" cy="50" r={R} fill="none" stroke="#e5e7eb" strokeWidth="10" />
      <circle
        cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="50" y="47" textAnchor="middle" fontSize="18" fontWeight="800" fill="#1d2226">{pct}%</text>
      <text x="50" y="61" textAnchor="middle" fontSize="9" fill="#999">done</text>
    </svg>
  );
}

/* ── Droppable column wrapper ── */
function DroppableCol({ id, isOver, children }: { id: string; isOver: boolean; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`flex-1 p-3 space-y-2 min-h-[220px] rounded-xl transition-all ${isOver ? 'bg-[#EEF3FB]/60 ring-2 ring-[#0A66C2]/20' : ''}`}>
      {children}
    </div>
  );
}

/* ── Draggable task card ── */
function SortableTaskCard({
  task,
  selected,
  onSelect,
  onMove,
  onDelete,
  moving,
  colKey,
}: {
  task: Task;
  selected: boolean;
  onSelect: () => void;
  onMove: (t: Task, s: Task['status']) => void;
  onDelete: (id: string) => void;
  moving: boolean;
  colKey: Task['status'];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const nextStatus: Record<Task['status'], Task['status']> = { 'todo': 'in-progress', 'in-progress': 'done', 'done': 'todo' };
  const nextLabel:  Record<Task['status'], string>         = { 'todo': '→ In Progress', 'in-progress': '→ Done', 'done': '↺ Reopen' };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border p-3 group transition-all cursor-grab active:cursor-grabbing select-none
        ${isDragging ? 'shadow-2xl border-[#0A66C2]/40 scale-105' : 'border-[#e0e0e0] hover:border-[#0A66C2]/40 hover:shadow-sm'}
        ${selected ? 'border-[#0A66C2]/50 shadow-sm' : ''}`}
      onClick={(e) => { if (!(e.target as HTMLElement).closest('button')) onSelect(); }}
    >
      {/* Drag handle indicator */}
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 shrink-0 flex flex-col gap-0.5 opacity-30 group-hover:opacity-60 transition-opacity"
        >
          {[0,1,2].map(i => <span key={i} className="block w-3 h-0.5 bg-[#999] rounded" />)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#1d2226] leading-snug">{task.title}</p>
          {task.description && (
            <p className="text-xs text-[#666] mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${PRIORITY_CLS[task.priority]}`}>
              {task.priority}
            </span>
            {task.assignee && (
              <span className="text-[10px] text-[#666] flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-[#0A66C2] text-white flex items-center justify-center text-[8px] font-bold">
                  {getInitials(task.assignee)}
                </span>
                {task.assignee.split('@')[0]}
              </span>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <div className="mt-2.5 pt-2.5 border-t border-[#f0f0f0] flex gap-2">
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onMove(task, nextStatus[colKey]); }}
            className="flex-1 text-[10px] font-semibold text-[#0A66C2] bg-[#EEF3FB] rounded-lg px-2 py-1.5 hover:bg-[#0A66C2] hover:text-white transition-all"
          >
            {moving ? '…' : nextLabel[colKey]}
          </button>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onDelete(task.id); }}
            className="text-[10px] font-semibold text-red-500 bg-red-50 rounded-lg px-2 py-1.5 hover:bg-red-500 hover:text-white transition-all"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function DashboardOverview({ project, user, onProjectUpdate, externalShowNewTask, onExternalTaskClose }: DashboardOverviewProps) {
  const { showToast } = useToast();
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' as Task['priority'], assignee: '' });
  const [savingTask, setSavingTask]   = useState(false);
  const [movingId, setMovingId]       = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeId, setActiveId]         = useState<string | null>(null);
  const [overColId, setOverColId]       = useState<string | null>(null);
  const [taskError, setTaskError]       = useState<string | null>(null);
  const [smartTasks, setSmartTasks]     = useState<SmartTaskSuggestion[]>([]);
  const [loadingSmartTasks, setLoadingSmartTasks] = useState(false);
  const [addingSmartId, setAddingSmartId] = useState<number | null>(null);

  /* ── Open from external FAB ── */
  useEffect(() => {
    if (externalShowNewTask) {
      setShowNewTask(true);
    }
  }, [externalShowNewTask]);

  /* ── Load ── */
  const load = useCallback(async () => {
    if (!project.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const headers = isSupabaseConfigured ? undefined : await getAuthHeadersAsync();
      const [tRes, mRes] = await Promise.all([
        isSupabaseConfigured
          ? supabase.from('project_tasks').select('*').eq('project_id', project.id).order('created_at', { ascending: true })
          : fetch(`${API}/api/projects/${project.id}/tasks`, { headers }),
        isSupabaseConfigured
          ? supabase.from('project_members').select('*').eq('project_id', project.id).eq('status', 'joined')
          : fetch(`${API}/api/projects/${project.id}/members`, { headers }),
      ]);
      if (isSupabaseConfigured) {
        const tData = tRes as { data: any[] | null; error: unknown };
        const mData = mRes as { data: any[] | null; error: unknown };
        if (!tData.error) {
          setTasks((tData.data || []).map((t: Record<string, unknown>) => normalizeTask(t)));
        }
        if (!mData.error) setMembers((mData.data || []).map((m: any) => ({ contact: m.contact, role: m.role })));
      } else {
        const [tData, mData] = await Promise.all([(tRes as Response).json(), (mRes as Response).json()]);
        if (tData.success) {
          setTasks((tData.data.tasks || []).map((t: Record<string, unknown>) => normalizeTask(t)));
        }
        if (mData.success) setMembers(mData.data.members || []);
        if (!headers?.Authorization && (tRes as Response).ok) {
          setTaskError('Sign in again to sync tasks with the server.');
        }
      }
    } catch { /* API down */ }
    finally { setLoading(false); }
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const fetchSmartTasks = async () => {
    if (!project.id) return;
    setLoadingSmartTasks(true);
    try {
      const openCount = tasks.filter((t) => t.status !== 'done').length;
      const doneCount = tasks.filter((t) => t.status === 'done').length;
      const completionPercent = tasks.length
        ? Math.round((doneCount / tasks.length) * 100)
        : 0;
      const { tasks: suggestions } = await apiGetSmartTasks(project.id, {
        projectName: project.name,
        description: project.description,
        teamSkills: members.map((m) => m.role),
        currentStage: 'idea',
        completionPercent,
        openTaskCount: openCount,
      });
      setSmartTasks(suggestions.slice(0, 5));
    } catch (e) {
      setTaskError(getErrorMessage(e, 'ai'));
    } finally {
      setLoadingSmartTasks(false);
    }
  };

  const addSmartTask = async (suggestion: SmartTaskSuggestion, index: number) => {
    if (!project.id) return;
    setAddingSmartId(index);
    try {
      const headers = await getAuthHeadersAsync();
      const res = await fetch(`${API}/api/projects/${project.id}/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: suggestion.title,
          description: suggestion.description,
          priority: suggestion.priority || 'medium',
          assignee: suggestion.suggestedAssignee || '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error || 'Failed');
      if (data.data?.task) {
        setTasks((p) => [...p, normalizeTask(data.data.task)]);
      }
      setSmartTasks((p) => p.filter((_, i) => i !== index));
    } catch (e) {
      setTaskError(getErrorMessage(e, 'tasks'));
    } finally {
      setAddingSmartId(null);
    }
  };

  useEffect(() => {
    if (!user?.contact || isValidMongoId(project.id)) return;
    let cancelled = false;
    ensureProjectOnline(project, user.contact).then((result) => {
      if (!cancelled && result.ok && result.project) {
        onProjectUpdate?.(result.project);
        setTaskError(null);
      } else if (!cancelled && !result.ok && result.reason === 'api_offline') {
        setTaskError(result.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.contact, project.name, project.id, onProjectUpdate]);

  useEffect(() => {
    if (isValidMongoId(project.id)) load();
  }, [project.id, load]);

  /* ── Socket ── */
  useEffect(() => {
    if (!project.id) return;
    if (isSupabaseConfigured) {
      const channel = supabase
        .channel(`dashboard:${project.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'project_tasks',
          filter: `project_id=eq.${project.id}`,
        }, () => load())
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'project_members',
          filter: `project_id=eq.${project.id}`,
        }, () => load())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }

    let socket: Awaited<ReturnType<typeof connectProjectRoom>> = null;
    let cancelled = false;

    connectProjectRoom(project.id, {
      id: user?.id,
      name: user?.name,
      contact: user?.contact,
    }).then((s) => {
      if (cancelled || !s) return;
      socket = s;

      socket.on('task_created', ({ task }: { task: Record<string, unknown> }) =>
        setTasks((p) => {
          const n = normalizeTask(task);
          return p.some((t) => t.id === n.id) ? p : [...p, n];
        })
      );
      socket.on('task_updated', ({ task }: { task: Record<string, unknown> }) =>
        setTasks((p) => p.map((t) => (t.id === String(task.id || task._id) ? normalizeTask(task) : t)))
      );
      socket.on('task_deleted', ({ taskId }: { taskId: string }) =>
        setTasks((p) => p.filter((t) => t.id !== taskId))
      );
      socket.on('member_status_changed', () => load());
      socket.on('project_changed', () => load());
      socket.on('agent_complete', () => load());
    });

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [project.id, load, user?.id, user?.name, user?.contact]);

  /* ── Create task ── */
  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;
    if (!isValidMongoId(project.id)) {
      setTaskError('Connect your project first (Posts tab → Connect project), or run: npm run api:dev');
      return;
    }
    const apiUp = await apiCheckHealth();
    if (!apiUp) {
      setTaskError('API is not running. Open a terminal and run: npm run api:dev');
      return;
    }
    setSavingTask(true);
    setTaskError(null);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('project_tasks')
          .insert({
            project_id: project.id,
            title: newTask.title.trim(),
            description: newTask.description,
            priority: newTask.priority,
            assignee: newTask.assignee,
            status: 'todo',
            created_by: user?.contact || '',
          })
          .select()
          .single();
        if (error) throw new Error(error.message);
        setTasks((p) => {
          const next = [...p, normalizeTask(data as Record<string, unknown>)];
          if (user?.contact && next.length >= 3) markOnboardingTasks(user.contact);
          return next;
        });
      } else {
        const headers = await getAuthHeadersAsync();
        if (!headers.Authorization) {
          setTaskError('You need to be signed in to add tasks. Log out and sign in again.');
          return;
        }
        const res = await fetch(`${API}/api/projects/${project.id}/tasks`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: newTask.title.trim(),
            description: newTask.description,
            priority: newTask.priority,
            assignee: newTask.assignee,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(getErrorMessage(data?.error || data?.message, 'task'));
        }
        const createdTask = normalizeTask(data.data.task as Record<string, unknown>);
        setTasks((p) => {
          const next = p.some((t) => t.id === createdTask.id) ? p : [...p, createdTask];
          if (user?.contact && next.length >= 3) markOnboardingTasks(user.contact);
          return next;
        });
      }
      setNewTask({ title: '', description: '', priority: 'medium', assignee: '' });
      setShowNewTask(false);
      onExternalTaskClose?.();
    } catch (e) {
      setTaskError(getErrorMessage(e, 'task'));
    } finally {
      setSavingTask(false);
    }
  };

  const closeTaskModal = () => { setShowNewTask(false); onExternalTaskClose?.(); };

  /* ── Move task ── */
  const moveTask = async (task: Task, newStatus: Task['status']) => {
    if (!project.id || movingId === task.id) return;
    setMovingId(task.id);
    setTasks(p => p.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('project_tasks').update({ status: newStatus }).eq('id', task.id);
        if (error) throw error;
      } else {
        const headers = await getAuthHeadersAsync();
        const res = await fetch(`${API}/api/projects/${project.id}/tasks/${task.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status: newStatus }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data?.error || 'Update failed');
        if (data.data?.task) {
          setTasks((p) =>
            p.map((t) => (t.id === task.id ? normalizeTask(data.data.task) : t))
          );
        }
      }
    } catch {
      setTasks(p => p.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    } finally { setMovingId(null); }
  };

  /* ── Delete task ── */
  const deleteTask = async (id: string) => {
    if (!project.id) return;
    setTasks(p => p.filter(t => t.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);
    if (isSupabaseConfigured) {
      await supabase.from('project_tasks').delete().eq('id', id);
    } else {
      const headers = await getAuthHeadersAsync();
      await fetch(`${API}/api/projects/${project.id}/tasks/${id}`, {
        method: 'DELETE',
        headers,
      });
    }
  };

  /* ── DnD sensors ── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragOver = (e: { over: { id: string } | null }) => {
    if (!e.over) { setOverColId(null); return; }
    const colMatch = COLUMNS.find(c => c.key === e.over!.id);
    if (colMatch) setOverColId(colMatch.key);
    else {
      const taskMatch = tasks.find(t => t.id === e.over!.id);
      setOverColId(taskMatch?.status ?? null);
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    setOverColId(null);
    const { active, over } = e;
    if (!over) return;
    const srcTask = tasks.find(t => t.id === active.id);
    if (!srcTask) return;
    const colTarget = COLUMNS.find(c => c.key === over.id);
    const taskTarget = tasks.find(t => t.id === over.id);
    const targetStatus = colTarget?.key ?? taskTarget?.status;
    if (targetStatus && targetStatus !== srcTask.status) moveTask(srcTask, targetStatus);
  };

  /* ── Stats ── */
  const done  = tasks.filter(t => t.status === 'done').length;
  const total = tasks.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  const inProg = tasks.filter(t => t.status === 'in-progress').length;
  const daysLeft = project.deadline
    ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / 86400000)
    : null;

  const health: 'on-track' | 'at-risk' | 'overdue' =
    daysLeft !== null && daysLeft <= 0 ? 'overdue'
    : (daysLeft !== null && daysLeft <= 7) || (total > 0 && pct < 30) ? 'at-risk'
    : 'on-track';

  const healthLabel  = { 'on-track': 'On Track', 'at-risk': 'At Risk', 'overdue': 'Overdue' };
  const healthColors = {
    'on-track': 'text-green-700 bg-green-50 border-green-200',
    'at-risk':  'text-amber-700 bg-amber-50 border-amber-200',
    'overdue':  'text-red-700   bg-red-50   border-red-200',
  };

  const iCls = 'w-full px-3 py-2 border border-[#d9d9d9] rounded-lg text-sm text-[#1d2226] placeholder-[#aaa] focus:outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20 bg-white transition-all';
  const activeTask = tasks.find(t => t.id === activeId);
  const isOwner = isProjectOwner(user?.contact, project.ownerContact);

  return (
    <div className="space-y-6">

      {/* Project header */}
      <div>
        <h2 className="text-2xl font-bold text-[#1d2226]">{project.name}</h2>
        <p className="text-[#666] text-sm mt-1">{project.description}</p>
        {project.slug && (
          <Link
            href={`/startup/${project.slug}`}
            className="inline-block mt-2 text-xs font-semibold text-[#0A66C2] hover:underline"
          >
            View public startup profile →
          </Link>
        )}
      </div>

      {project.id && (
        <StartupEcosystemPanels projectId={project.id} isOwner={isOwner} />
      )}

      {/* ── Health widget + stats ── */}
      <div className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
        <div className="flex flex-col sm:flex-row items-center gap-5">

          {/* Ring chart */}
          <HealthRing pct={pct} health={health} />

          {/* Right side */}
          <div className="flex-1 w-full space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-lg font-bold text-[#1d2226]">Project Health</p>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${healthColors[health]}`}>
                {health === 'overdue' ? '🔴' : health === 'at-risk' ? '🟡' : '🟢'} {healthLabel[health]}
              </span>
            </div>

            {/* Tasks breakdown */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-[#f8f9fa] border border-[#e8e8e8] p-3">
                <p className="text-xl font-black text-[#666]">{tasks.filter(t => t.status === 'todo').length}</p>
                <p className="text-[10px] text-[#999] uppercase tracking-wide mt-0.5">To Do</p>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                <p className="text-xl font-black text-amber-700">{inProg}</p>
                <p className="text-[10px] text-[#999] uppercase tracking-wide mt-0.5">In Progress</p>
              </div>
              <div className="rounded-xl bg-green-50 border border-green-100 p-3">
                <p className="text-xl font-black text-green-700">{done}</p>
                <p className="text-[10px] text-[#999] uppercase tracking-wide mt-0.5">Done</p>
              </div>
            </div>

            {/* Progress bar */}
            {total > 0 && (
              <div>
                <div className="flex justify-between text-xs text-[#999] mb-1">
                  <span>{done} of {total} tasks complete</span>
                  {daysLeft !== null && (
                    <span className={daysLeft <= 0 ? 'text-red-600 font-semibold' : daysLeft <= 7 ? 'text-amber-600 font-semibold' : ''}>
                      {daysLeft > 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)}d overdue`}
                    </span>
                  )}
                </div>
                <div className="h-2 bg-[#e5e7eb] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${health === 'on-track' ? 'bg-green-500' : health === 'at-risk' ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#f0f0f0]">
          {[
            { label: 'Team',     value: members.length || '—', icon: '👥' },
            { label: 'Deadline', value: project.deadline ? new Date(project.deadline).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '—', icon: '📅' },
            { label: 'Salary',   value: project.salaryMax ? `₹${(project.salaryMax / 1000).toFixed(0)}k/mo` : '—', icon: '💰' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-lg">{s.icon}</span>
              <div>
                <p className="text-sm font-bold text-[#1d2226]">{s.value}</p>
                <p className="text-[10px] text-[#999]">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {tasks.filter((t) => t.status !== 'done').length < 3 && project.id && (
        <div className="bg-gradient-to-r from-[#EEF3FB] to-white rounded-2xl border border-[#0A66C2]/20 p-5">
          <p className="font-bold text-[#1d2226]">🤖 Your task list looks light. Want AI suggestions?</p>
          <p className="text-xs text-[#666] mt-1">Get 5 specific next steps tailored to your project and team.</p>
          {smartTasks.length === 0 ? (
            <button
              type="button"
              onClick={() => void fetchSmartTasks()}
              disabled={loadingSmartTasks}
              className="mt-3 px-5 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#004182] disabled:opacity-50"
            >
              {loadingSmartTasks ? 'Thinking…' : 'Get suggestions'}
            </button>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {smartTasks.map((s, i) => (
                <div key={`${s.title}-${i}`} className="bg-white rounded-xl border border-[#e0e0e0] p-4">
                  <p className="text-sm font-semibold text-[#1d2226]">{s.title}</p>
                  <p className="text-xs text-[#666] mt-1 line-clamp-3">{s.description}</p>
                  {s.suggestedAssignee && (
                    <p className="text-[10px] text-[#0A66C2] mt-2">Suggested: {s.suggestedAssignee}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => void addSmartTask(s, i)}
                    disabled={addingSmartId === i}
                    className="mt-3 text-xs font-semibold text-[#0A66C2] hover:underline disabled:opacity-50"
                  >
                    {addingSmartId === i ? 'Adding…' : 'Add this task +'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {project.id && (
        <ConnectGitHubCard
          projectId={project.id}
          isOwner={isProjectOwner(project, user?.contact)}
          onError={setTaskError}
        />
      )}

      {/* ── Kanban Board with DnD ── */}
      <div className="bg-white rounded-2xl border border-[#e0e0e0] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e0e0e0]">
          <div>
            <h3 className="font-bold text-[#1d2226]">Task Board</h3>
            <p className="text-xs text-[#666] mt-0.5">
              {total > 0 ? `${total} tasks — drag to move between columns` : 'No tasks yet — add your first task'}
            </p>
          </div>
          <button
            onClick={() => setShowNewTask(true)}
            className="px-4 py-1.5 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#004182] transition-all"
          >
            + Add Task
          </button>
        </div>

        {taskError && (
          <div className="mx-5 mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {taskError}
          </div>
        )}

        {!project.id && (
          <div className="mx-5 mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            Publish your project first so tasks save to the server.
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-[#666] text-sm">Loading tasks…</div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver as never}
            onDragEnd={handleDragEnd}
          >
            <div className="p-4 overflow-x-auto">
              <div className="flex gap-4 min-w-max">
                {COLUMNS.map(col => {
                  const colTasks = tasks.filter(t => t.status === col.key);
                  return (
                    <div key={col.key} className="w-72 flex flex-col bg-[#f8f9fa] rounded-xl border border-[#e8e8e8]">
                      {/* Column header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e8e8]">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${col.accent}`}>
                            {col.label}
                          </span>
                          <span className="text-xs text-[#999] font-medium">{colTasks.length}</span>
                        </div>
                      </div>

                      <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        <DroppableCol id={col.key} isOver={overColId === col.key}>
                          {colTasks.length === 0 && (
                            <div className="text-center py-8 text-[#ccc] text-xs select-none">
                              Drop tasks here
                            </div>
                          )}
                          {colTasks.map(task => (
                            <SortableTaskCard
                              key={task.id}
                              task={task}
                              colKey={col.key}
                              selected={selectedTask?.id === task.id}
                              onSelect={() => setSelectedTask(p => p?.id === task.id ? null : task)}
                              onMove={moveTask}
                              onDelete={deleteTask}
                              moving={movingId === task.id}
                            />
                          ))}
                        </DroppableCol>
                      </SortableContext>

                      <button
                        onClick={() => setShowNewTask(true)}
                        className="m-3 mt-1 py-2 border border-dashed border-[#d9d9d9] text-[#999] hover:border-[#0A66C2] hover:text-[#0A66C2] rounded-xl text-xs transition-all"
                      >
                        + Add task
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Drag overlay — shows ghost card while dragging */}
            <DragOverlay>
              {activeTask ? (
                <div className="bg-white rounded-xl border-2 border-[#0A66C2] shadow-2xl p-3 w-64 rotate-2 opacity-95">
                  <p className="text-sm font-medium text-[#1d2226]">{activeTask.title}</p>
                  <span className={`mt-2 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border ${PRIORITY_CLS[activeTask.priority]}`}>
                    {activeTask.priority}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Team + Skills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
          <h3 className="font-semibold text-[#1d2226] mb-3">Team ({members.length})</h3>
          {members.length === 0 ? (
            <p className="text-sm text-[#999]">No members yet. Share your project so others can join.</p>
          ) : (
            <div className="space-y-2">
              {members.map((m, i) => (
                <div key={m.contact} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#f3f2ef] transition-colors">
                  <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-bold`}>
                    {getInitials(m.contact)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1d2226] truncate">{m.contact}</p>
                    <p className="text-xs text-[#666] capitalize">{m.role}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
            <h3 className="font-semibold text-[#1d2226] mb-3">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {project.skills.map(s => (
                <span key={s} className="px-3 py-1 bg-[#EEF3FB] border border-[#0A66C2]/20 text-[#0A66C2] rounded-full text-xs font-medium">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
            <h3 className="font-semibold text-[#1d2226] mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { icon: '📝', label: 'Create New Task',  fn: () => setShowNewTask(true) },
                { icon: '🔗', label: 'Share Project Link', fn: () => navigator.clipboard?.writeText(window.location.href).then(() => showToast('Link copied!', 'success')) },
              ].map(a => (
                <button key={a.label} onClick={a.fn}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#1d2226] border border-[#d9d9d9] rounded-xl hover:border-[#0A66C2] hover:bg-[#EEF3FB] hover:text-[#0A66C2] transition-all text-left">
                  <span>{a.icon}</span> {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── New Task Modal ── */}
      {showNewTask && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeTaskModal(); }}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-[#d9d9d9] shadow-2xl w-full max-w-md sm:mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0e0e0]">
              <h3 className="font-bold text-[#1d2226]">New Task</h3>
              <button onClick={closeTaskModal} className="text-[#666] hover:text-[#1d2226] text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f2ef]">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <input
                autoFocus
                type="text"
                value={newTask.title}
                onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleCreateTask()}
                placeholder="Task title…"
                className={iCls}
              />
              <textarea
                rows={2}
                value={newTask.description}
                onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                placeholder="Description (optional)"
                className={iCls + ' resize-none'}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#666] mb-1">Priority</label>
                  <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value as Task['priority'] }))} className={iCls}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#666] mb-1">Assign to</label>
                  <select value={newTask.assignee} onChange={e => setNewTask(p => ({ ...p, assignee: e.target.value }))} className={iCls}>
                    <option value="">Unassigned</option>
                    {members.map(m => <option key={m.contact} value={m.contact}>{m.contact.split('@')[0]}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-[#e0e0e0]">
              <button onClick={closeTaskModal} className="flex-1 py-2.5 border border-[#d9d9d9] text-[#666] font-semibold rounded-full hover:bg-[#f3f2ef] text-sm">Cancel</button>
              <button onClick={handleCreateTask} disabled={!newTask.title.trim() || savingTask}
                className="flex-1 py-2.5 bg-[#0A66C2] text-white font-semibold rounded-full hover:bg-[#004182] disabled:opacity-40 text-sm">
                {savingTask ? 'Creating…' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
