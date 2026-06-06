import type { SkillBadgeLevel } from '@/lib/skillVerification/types';

interface SkillBadgeChipProps {
  badge: SkillBadgeLevel | string;
  label: string;
  icon: string;
  score?: number;
  size?: 'sm' | 'md';
}

const BADGE_STYLE: Record<string, string> = {
  expert: 'bg-amber-50 text-amber-900 border-amber-200',
  advanced: 'bg-yellow-50 text-yellow-900 border-yellow-200',
  intermediate: 'bg-slate-50 text-slate-800 border-slate-200',
  beginner: 'bg-orange-50 text-orange-900 border-orange-200',
  not_verified: 'bg-gray-50 text-gray-500 border-gray-200',
};

export function SkillBadgeChip({
  badge,
  label,
  icon,
  score,
  size = 'sm',
}: SkillBadgeChipProps) {
  const style = BADGE_STYLE[String(badge)] || BADGE_STYLE.not_verified;
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold border rounded-full ${
        size === 'md' ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-1'
      } ${style}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {typeof score === 'number' && <span className="opacity-70">· {score}</span>}
    </span>
  );
}
