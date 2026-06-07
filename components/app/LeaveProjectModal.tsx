'use client';

import { useState } from 'react';
import { LEAVE_REASON_OPTIONS, type LeaveReasonOption } from '@/lib/projectLeave';

interface LeaveProjectModalProps {
  projectName: string;
  isOpen: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (payload: { reason?: LeaveReasonOption; reasonText?: string }) => void;
}

export function LeaveProjectModal({
  projectName,
  isOpen,
  loading = false,
  onCancel,
  onConfirm,
}: LeaveProjectModalProps) {
  const [reason, setReason] = useState<LeaveReasonOption | ''>('');
  const [reasonText, setReasonText] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({
      reason: reason || undefined,
      reasonText: reason === 'Other' ? reasonText.trim().slice(0, 200) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40">
      <div
        className="bg-white rounded-2xl border border-[#e0e0e0] p-6 max-w-md w-full shadow-xl"
        role="dialog"
        aria-labelledby="leave-project-title"
      >
        <h3 id="leave-project-title" className="text-lg font-bold text-[#1d2226]">
          Leave {projectName}?
        </h3>
        <p className="text-sm text-[#666] mt-2 leading-relaxed">
          You will lose access to the team workspace, messages, and tasks. This cannot be undone.
        </p>

        <div className="mt-4">
          <label htmlFor="leave-reason" className="block text-xs font-semibold text-[#666] mb-1.5">
            Why are you leaving? (optional)
          </label>
          <select
            id="leave-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value as LeaveReasonOption | '')}
            className="w-full px-3 py-2 bg-white border border-[#d9d9d9] rounded-lg text-sm text-[#1d2226] focus:outline-none focus:border-[#0A66C2]"
          >
            <option value="">Select a reason…</option>
            {LEAVE_REASON_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {reason === 'Other' && (
          <div className="mt-3">
            <input
              type="text"
              value={reasonText}
              maxLength={200}
              onChange={(e) => setReasonText(e.target.value.slice(0, 200))}
              placeholder="Tell us more (optional)"
              className="w-full px-3 py-2 bg-white border border-[#d9d9d9] rounded-lg text-sm text-[#1d2226] placeholder:text-[#999] focus:outline-none focus:border-[#0A66C2]"
            />
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full border border-[#d9d9d9] text-[#666] text-sm font-semibold hover:bg-[#f3f2ef] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Leaving…' : 'Leave project'}
          </button>
        </div>
      </div>
    </div>
  );
}
