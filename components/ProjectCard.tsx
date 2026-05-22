'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Project } from '@/lib/types';
import { formatSalaryBand } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  onSelect?: () => void;
  variant?: 'default' | 'compact';
}

export function ProjectCard({
  project,
  onSelect,
  variant = 'default',
}: ProjectCardProps) {
  if (variant === 'compact') {
    return (
      <Card hoverable onClick={onSelect} className="cursor-pointer">
        <h4 className="font-semibold text-slate-50">{project.name}</h4>
        <p className="text-xs text-slate-400 mt-1">{project.desc}</p>
        <div className="flex flex-wrap gap-1 mt-3">
          {project.roles.slice(0, 2).map((role) => (
            <span
              key={role}
              className="text-xs bg-sky-400/20 text-sky-400 px-2 py-1 rounded"
            >
              {role}
            </span>
          ))}
        </div>
        <p className="text-xs font-semibold text-sky-400 mt-3">
          {formatSalaryBand(project.salaryMin, project.salaryMax, project.currency)}
        </p>
      </Card>
    );
  }

  return (
    <Card hoverable onClick={onSelect}>
      <h4 className="text-xl font-bold text-sky-400">{project.name}</h4>
      <p className="text-slate-300 text-sm mt-2">{project.desc}</p>

      <div className="mt-4 space-y-2">
        <div>
          <p className="text-xs text-slate-400 font-semibold">Roles Needed:</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {project.roles.map((role) => (
              <span
                key={role}
                className="text-xs bg-slate-700 text-slate-200 px-3 py-1 rounded-full"
              >
                {role}
              </span>
            ))}
          </div>
        </div>

        <p className="text-sm font-semibold text-sky-400 pt-2">
          {formatSalaryBand(project.salaryMin, project.salaryMax, project.currency)}
        </p>
      </div>

      {onSelect && (
        <Button size="sm" className="w-full mt-4">
          View Details
        </Button>
      )}
    </Card>
  );
}
