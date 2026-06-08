import { ProjectData } from '@/lib/types';

export interface DashboardTask {
  id: string;
  title: string;
  status: string;
}

export interface NextAction {
  id: string;
  icon: string;
  title: string;
  detail: string;
  cta: string;
  suggestedMode: 'assistant' | 'agent';
  onClick: () => void;
}

interface BuildHandlers {
  onAddTask: () => void;
  onOpenAI: (mode: 'assistant' | 'agent') => void;
  onNavigate: (tab: 'invite' | 'team' | 'feed') => void;
}

export function buildNextActions(
  project: ProjectData,
  tasks: DashboardTask[],
  teamMemberCount: number,
  githubConnected: boolean,
  handlers: BuildHandlers
): NextAction[] {
  const actions: NextAction[] = [];
  const done = tasks.filter((t) => t.status === 'done').length;
  const open = tasks.filter((t) => t.status !== 'done').length;

  if (tasks.length === 0) {
    actions.push({
      id: 'first-task',
      icon: '📋',
      title: 'Add your first task',
      detail: 'Break your idea into one concrete step your team can ship this week.',
      cta: 'Add task',
      suggestedMode: 'assistant',
      onClick: handlers.onAddTask,
    });
  } else if (open > 0 && done === 0) {
    actions.push({
      id: 'move-task',
      icon: '▶️',
      title: 'Move a task to In Progress',
      detail: `You have ${open} open task${open === 1 ? '' : 's'} — pick one and start.`,
      cta: 'View board',
      suggestedMode: 'assistant',
      onClick: handlers.onAddTask,
    });
  }

  if (teamMemberCount <= 1) {
    actions.push({
      id: 'invite',
      icon: '👥',
      title: 'Invite a co-founder',
      detail: 'Solo founders move slower. Send an invite to someone with complementary skills.',
      cta: 'Invite people',
      suggestedMode: 'assistant',
      onClick: () => handlers.onNavigate('invite'),
    });
  }

  if (!githubConnected) {
    actions.push({
      id: 'github',
      icon: '🐙',
      title: 'Connect your GitHub repo',
      detail: 'Link your code so the Assistant can read your README and suggest what to build next.',
      cta: 'Connect below ↓',
      suggestedMode: 'assistant',
      onClick: () => {
        document.getElementById('connect-github')?.scrollIntoView({ behavior: 'smooth' });
      },
    });
  }

  if (!project.description?.trim() || project.description.length < 40) {
    actions.push({
      id: 'pitch',
      icon: '✍️',
      title: 'Sharpen your project pitch',
      detail: 'Run the setup agent to write your description, roles, and first tasks.',
      cta: 'Open Agent mode',
      suggestedMode: 'agent',
      onClick: () => handlers.onOpenAI('agent'),
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'standup',
      icon: '☀️',
      title: 'Post a team update',
      detail: 'Share progress in Project Feed so momentum stays visible.',
      cta: 'Open feed',
      suggestedMode: 'assistant',
      onClick: () => handlers.onNavigate('feed'),
    });
  }

  return actions.slice(0, 4);
}
