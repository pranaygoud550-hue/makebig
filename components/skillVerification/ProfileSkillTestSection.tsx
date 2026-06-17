'use client';

import { useMemo, useState } from 'react';
import type { VerifiedSkill } from '@/lib/types';
import type { SkillGradeResult } from '@/lib/skillVerification/types';
import { SkillVerificationFlow } from '@/components/skillVerification/SkillVerificationFlow';
import { useSkillCatalog } from '@/lib/skillVerification/useSkillCatalog';
import { VerifiedSkillsSection } from '@/components/skillVerification/VerifiedSkillsSection';

interface ProfileSkillTestSectionProps {
  contact: string;
  verifiedSkills?: VerifiedSkill[];
  skillTestStatus?: 'pending' | 'completed';
  pendingSkillIds?: string[];
  isOwnProfile?: boolean;
  onUpdated?: () => void;
}

export function ProfileSkillTestSection({
  contact,
  verifiedSkills = [],
  skillTestStatus = 'pending',
  pendingSkillIds = [],
  isOwnProfile = false,
  onUpdated,
}: ProfileSkillTestSectionProps) {
  const { skills: catalogSkills, loading: catalogLoading } = useSkillCatalog();
  const [showModal, setShowModal] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const hasVerified = verifiedSkills.length > 0;
  const needsTest = isOwnProfile && (skillTestStatus === 'pending' || pendingSkillIds.length > 0 || !hasVerified);

  const defaultSelected = useMemo(() => {
    const pending = pendingSkillIds.filter(Boolean);
    if (pending.length) return pending;
    return catalogSkills
      .filter((s) => !verifiedSkills.some((v) => v.skillId === s.id))
      .slice(0, 1)
      .map((s) => s.id);
  }, [pendingSkillIds, catalogSkills, verifiedSkills]);

  const openTestModal = () => {
    setSelectedIds(defaultSelected);
    setPickerOpen(true);
    setShowModal(true);
  };

  const toggleId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleComplete = (_results: SkillGradeResult[]) => {
    setShowModal(false);
    setPickerOpen(true);
    onUpdated?.();
  };

  if (!isOwnProfile && !hasVerified) return null;

  return (
    <>
      <section className="bg-white rounded-2xl border border-[#e0e0e0] p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold text-[#666] uppercase tracking-wide">
              Skill verification
            </h2>
            {isOwnProfile && (
              <p className="text-sm text-[#666] mt-1">
                {hasVerified
                  ? 'Your verified scores appear below. You can take more tests anytime.'
                  : skillTestStatus === 'pending'
                    ? 'You skipped the test at signup — take it when you are ready.'
                    : 'Prove your skills with a short proctored test — badges show on your profile.'}
              </p>
            )}
          </div>
          {needsTest && (
            <button
              type="button"
              onClick={openTestModal}
              className="shrink-0 px-4 py-2 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182]"
            >
              {hasVerified ? 'Take another test' : 'Take skill test'}
            </button>
          )}
        </div>

        {hasVerified ? (
          <VerifiedSkillsSection verifiedSkills={verifiedSkills} compact />
        ) : isOwnProfile ? (
          <div className="rounded-xl border border-dashed border-[#d9d9d9] bg-[#fafafa] px-4 py-6 text-center">
            <p className="text-sm font-medium text-[#1d2226]">No verified skills yet</p>
            <p className="text-xs text-[#666] mt-1">
              {pendingSkillIds.length
                ? `${pendingSkillIds.length} skill${pendingSkillIds.length !== 1 ? 's' : ''} waiting for verification`
                : 'Tap “Take skill test” when you are ready'}
            </p>
          </div>
        ) : null}
      </section>

      {showModal && (
        pickerOpen ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-[#e0e0e0] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-[#1d2226]">Choose skills to verify</h3>
                  <p className="text-sm text-[#666] mt-1">
                    Fullscreen proctored exam — 10 MCQ then 2 coding problems for dev skills.
                  </p>
                </div>
                {catalogLoading ? (
                  <p className="text-sm text-[#999]">Loading skills…</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {catalogSkills.map((s) => {
                      const already = verifiedSkills.some((v) => v.skillId === s.id);
                      const checked = selectedIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer ${
                            already
                              ? 'opacity-50 border-[#e8e8e8] bg-[#f8f8f8]'
                              : checked
                                ? 'border-[#0A66C2] bg-[#EEF3FB]'
                                : 'border-[#e0e0e0] hover:bg-[#fafafa]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={already}
                            onChange={() => toggleId(s.id)}
                            className="mt-1"
                          />
                          <span>
                            <span className="text-sm font-semibold text-[#1d2226] block">
                              {s.name}
                              {already ? ' ✓ verified' : ''}
                            </span>
                            <span className="text-xs text-[#666]">{s.description}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-sm font-semibold text-[#666] border border-[#d9d9d9] rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={selectedIds.length === 0}
                    onClick={() => setPickerOpen(false)}
                    className="flex-1 py-2.5 bg-[#0A66C2] text-white rounded-xl font-semibold text-sm disabled:opacity-50"
                  >
                    Start fullscreen exam →
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <SkillVerificationFlow
            skillIds={selectedIds}
            contact={contact}
            onComplete={handleComplete}
            onBack={() => setPickerOpen(true)}
            onSkip={() => setShowModal(false)}
            skipLabel="Close for now"
          />
        )
      )}
    </>
  );
}
