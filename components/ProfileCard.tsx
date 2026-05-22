'use client';

import { Person } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatSalaryBand } from '@/lib/utils';

interface ProfileCardProps {
  person: Person;
  onInvite?: () => void;
  matchScore?: number;
}

export function ProfileCard({ person, onInvite, matchScore }: ProfileCardProps) {
  return (
    <Card hoverable className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-sky-400/20 border border-sky-400/40 flex items-center justify-center text-sky-400 font-bold">
              {person.initials}
            </div>
            <div>
              <h4 className="font-bold text-slate-50">{person.name}</h4>
              <p className="text-xs text-slate-400">{person.tagline}</p>
            </div>
          </div>
        </div>
        {matchScore !== undefined && (
          <div className="text-right">
            <p className="text-2xl font-bold text-sky-400">{matchScore}%</p>
            <p className="text-xs text-slate-400">match</p>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <div>
          <p className="text-xs text-slate-400 font-semibold">Skills:</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {person.skills.map((skill) => (
              <span
                key={skill}
                className="text-xs bg-slate-700 text-slate-200 px-2 py-0.5 rounded"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-400">
          <span className="text-sky-400 font-semibold">
            {formatSalaryBand(person.rateMin, person.rateMax, person.currency)}
          </span>
        </p>
      </div>

      {onInvite && (
        <Button size="sm" className="w-full mt-4" onClick={onInvite}>
          Invite
        </Button>
      )}
    </Card>
  );
}
