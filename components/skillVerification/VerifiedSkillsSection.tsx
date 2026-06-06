'use client';

import type { VerifiedSkill } from '@/lib/types';
import { SkillBadgeChip } from '@/components/skillVerification/SkillBadgeChip';

interface VerifiedSkillsSectionProps {
  verifiedSkills?: VerifiedSkill[];
  compact?: boolean;
}

export function VerifiedSkillsSection({ verifiedSkills = [], compact }: VerifiedSkillsSectionProps) {
  if (!verifiedSkills.length) return null;

  return (
    <section className={compact ? '' : 'bg-white rounded-2xl border border-[#e0e0e0] p-5'}>
      {!compact && (
        <h2 className="text-xs font-bold text-[#666] uppercase tracking-wide mb-3">
          Verified skills
        </h2>
      )}
      <ul className="space-y-2">
        {verifiedSkills.map((s) => (
          <li
            key={s.skillId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#eef3fb] bg-[#fafcff] px-3 py-2"
          >
            <div>
              <p className="text-sm font-semibold text-[#1d2226]">{s.skillName}</p>
              {!compact && (
                <p className="text-[11px] text-[#666]">
                  Test {s.testScore ?? s.score}% · Integrity {s.integrityScore ?? 100}% · MCQ {s.mcqScore}%
                </p>
              )}
            </div>
            <SkillBadgeChip
              badge={s.badge}
              label={s.badgeLabel}
              icon={s.badgeIcon}
              score={s.score}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
