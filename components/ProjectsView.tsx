'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ProjectData } from '@/lib/types';
import { apiGetProjects, BrowseProject } from '@/lib/api';
import { useProjectListSocket } from '@/lib/useProjectListSocket';

interface ProjectsViewProps {
  currentProject: ProjectData;
  ownerContact: string;
}

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryId: string;
  skills: string[];
  deadline?: string;
  vision: string;
  mode: 'create' | 'join' | 'member';
  status: string;
  progress: number;
  teamCount: number;
  invitesSent: number;
}

function mapApiProject(p: Record<string, unknown>, current: ProjectData): ProjectItem {
  const teamCount = Array.isArray(p.teamMembers) ? p.teamMembers.length : 0;
  const status = String(p.status || 'draft');
  const progress =
    status === 'published' ? 40 : status === 'in-progress' ? 65 : status === 'completed' ? 100 : 15;

  return {
    id: String(p.id || p._id),
    name: String(p.name || current.name),
    description: String(p.desc || p.description || current.description),
    category: current.category,
    categoryId: String(p.categoryId || current.categoryId),
    skills: (p.roles as string[]) || current.skills || [],
    deadline: current.deadline,
    vision: current.vision,
    mode: current.mode,
    status: status === 'published' ? 'active' : status,
    progress,
    teamCount: teamCount + 1,
    invitesSent: 0,
  };
}

export function ProjectsView({ currentProject, ownerContact }: ProjectsViewProps) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'progress' | 'deadline'>('recent');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const list = await apiGetProjects({ ownerContact });
      if (!cancelled) {
        const mapped = list.map((p) =>
          mapApiProject(p as unknown as Record<string, unknown>, currentProject)
        );
        if (currentProject.id && !mapped.some((m) => m.id === currentProject.id)) {
          mapped.unshift({
            id: currentProject.id,
            name: currentProject.name,
            description: currentProject.description,
            category: currentProject.category,
            categoryId: currentProject.categoryId,
            skills: currentProject.skills,
            deadline: currentProject.deadline,
            vision: currentProject.vision,
            mode: currentProject.mode,
            status: 'active',
            progress: 25,
            teamCount: 1,
            invitesSent: 0,
          });
        }
        setProjects(mapped);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ownerContact, currentProject]);

  useProjectListSocket({
    onCreated: (p: BrowseProject) => {
      if ((p.ownerContact || '').toLowerCase() !== (ownerContact || '').toLowerCase()) return;
      setProjects((prev) => {
        if (prev.some((x) => x.id === p.id)) return prev;
        return [
          mapApiProject(p as unknown as Record<string, unknown>, currentProject),
          ...prev,
        ];
      });
    },
    onPublished: (p: BrowseProject) => {
      if ((p.ownerContact || '').toLowerCase() !== (ownerContact || '').toLowerCase()) return;
      setProjects((prev) => {
        const updated = mapApiProject(
          p as unknown as Record<string, unknown>,
          currentProject
        );
        if (prev.some((x) => x.id === p.id)) {
          return prev.map((x) => (x.id === p.id ? updated : x));
        }
        return [updated, ...prev];
      });
    },
  });

  const sortedProjects = [...projects].sort((a, b) => {
    switch (sortBy) {
      case 'progress':
        return b.progress - a.progress;
      case 'deadline':
        if (!a.deadline || !b.deadline) return 0;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      default:
        return 0;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'published':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'completed':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'on-hold':
      case 'draft':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-50">My Projects</h2>
          <p className="text-slate-400 text-sm mt-1">
            {loading ? 'Loading...' : `${projects.length} projects from database`}
          </p>
        </div>
        <div className="flex gap-2">
          {(['recent', 'progress', 'deadline'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                sortBy === option
                  ? 'bg-sky-400 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {option === 'recent' ? 'Recent' : option === 'progress' ? 'Progress' : 'Deadline'}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-slate-500 text-sm">Fetching projects from MongoDB...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedProjects.map((project) => (
          <div
            key={project.id}
            className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-6 hover:border-sky-400/50 hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-50 group-hover:text-sky-400 transition-colors truncate">
                  {project.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{project.categoryId}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getStatusColor(project.status)}`}
              >
                {project.status}
              </span>
            </div>

            <p className="text-sm text-slate-400 mb-4 line-clamp-2">{project.description}</p>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400">Progress</span>
                <span className="text-xs font-bold text-sky-400">{project.progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-blue-400 transition-all duration-500"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-slate-700/50">
              <div className="text-center">
                <p className="text-lg font-bold text-sky-400">{project.teamCount}</p>
                <p className="text-xs text-slate-400">team</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-sky-400">{project.skills.length}</p>
                <p className="text-xs text-slate-400">roles</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {project.skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-1 bg-sky-400/10 border border-sky-400/30 text-sky-300 rounded text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!loading && projects.length === 0 && (
        <div className="text-center py-12 bg-slate-800/20 border border-dashed border-slate-700 rounded-lg">
          <p className="text-slate-400 mb-4">No projects in database yet</p>
          <Button className="mx-auto">Start New Project</Button>
        </div>
      )}
    </div>
  );
}
