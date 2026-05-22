'use client';

import { InvitePerson } from '@/lib/types';
import { formatSalaryBand } from '@/lib/utils';

interface InviteCardProps {
  person: InvitePerson;
  matchScore: number;
  skillMatch: { exact: number; partial: number; skillScore: number };
  onInvite: () => void;
}

export function InviteCard({ person, matchScore, skillMatch, onInvite }: InviteCardProps) {
  const getMatchColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/20 border-green-500/50 text-green-400';
    if (score >= 60) return 'bg-sky-500/20 border-sky-500/50 text-sky-400';
    return 'bg-slate-500/20 border-slate-500/50 text-slate-400';
  };

  const skillNote =
    skillMatch.exact > 0
      ? `${skillMatch.exact} exact role match${skillMatch.exact > 1 ? 'es' : ''}${
          skillMatch.partial ? ` + ${skillMatch.partial} partial` : ''
        }`
      : skillMatch.partial > 0
        ? `${skillMatch.partial} partial skill match${skillMatch.partial > 1 ? 'es' : ''}`
        : 'Broad fit';

  return (
    <div className="p-4 border border-slate-700/50 bg-slate-800/30 rounded-lg hover:border-slate-600 transition-colors">
      <div className="flex justify-between items-start gap-3 mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-slate-50">{person.name}</h4>
          <p className="text-xs text-slate-400 mt-1">{person.tagline}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getMatchColor(matchScore)}`}>
          {matchScore}% fit
        </div>
      </div>

      <div className="space-y-1 mb-3">
        <p className="text-xs text-slate-400">
          <span className="text-sky-400">Skills:</span> {person.skills.slice(0, 3).join(', ')}
        </p>
        <p className="text-xs text-slate-400">
          <span className="text-sky-400">Rate:</span> {formatSalaryBand(person.rateMin, person.rateMax, person.currency)}
        </p>
        <p className="text-xs text-slate-400">
          <span className="text-sky-400">Match:</span> {skillNote}
        </p>
      </div>

      <button
        onClick={onInvite}
        className="w-full px-3 py-2 bg-sky-500/20 border border-sky-500/50 text-sky-400 rounded hover:bg-sky-500/30 transition-colors text-sm font-medium"
      >
        Invite
      </button>
    </div>
  );
}
