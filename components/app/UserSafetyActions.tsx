'use client';

import { useState } from 'react';
import { apiBlockUser, apiReportUser } from '@/lib/api';
import { useToast } from '@/lib/context/ToastContext';

interface UserSafetyActionsProps {
  targetContact: string;
  viewerContact?: string;
}

const REASONS = [
  { id: 'spam', label: 'Spam / fake profile' },
  { id: 'inappropriate', label: 'Inappropriate content' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'other', label: 'Other' },
] as const;

export function UserSafetyActions({ targetContact, viewerContact }: UserSafetyActionsProps) {
  const { showToast } = useToast();
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]['id']>('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [blocking, setBlocking] = useState(false);

  if (!viewerContact || viewerContact.toLowerCase() === targetContact.toLowerCase()) {
    return null;
  }

  const submitReport = async () => {
    setSubmitting(true);
    try {
      await apiReportUser(targetContact, reason, details);
      showToast("Report submitted. We'll review within 24h.", 'success');
      setShowReport(false);
      setDetails('');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not submit report', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const blockUser = async () => {
    if (!window.confirm('Block this user? You will not see their projects in Explore.')) return;
    setBlocking(true);
    try {
      await apiBlockUser(targetContact);
      showToast('User blocked', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not block user', 'error');
    } finally {
      setBlocking(false);
    }
  };

  return (
    <div className="mt-8 pt-4 border-t border-[#f0f0f0] flex flex-wrap gap-4 justify-center">
      <button
        type="button"
        onClick={() => setShowReport(true)}
        className="text-xs text-[#999] hover:text-[#666] underline-offset-2 hover:underline"
      >
        Report user
      </button>
      <button
        type="button"
        onClick={() => void blockUser()}
        disabled={blocking}
        className="text-xs text-[#999] hover:text-red-600 underline-offset-2 hover:underline disabled:opacity-50"
      >
        {blocking ? 'Blocking…' : 'Block user'}
      </button>

      {showReport && (
        <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#e0e0e0] p-5 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-[#1d2226] mb-3">Report user</h3>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as typeof reason)}
              className="w-full px-3 py-2 border border-[#d9d9d9] rounded-lg text-sm mb-3"
            >
              {REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            {reason === 'other' && (
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Tell us more…"
                rows={3}
                className="w-full px-3 py-2 border border-[#d9d9d9] rounded-lg text-sm mb-3 resize-none"
              />
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowReport(false)}
                className="px-4 py-2 text-sm text-[#666] rounded-lg hover:bg-[#f3f2ef]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitReport()}
                disabled={submitting || (reason === 'other' && !details.trim())}
                className="px-4 py-2 text-sm font-semibold bg-[#0A66C2] text-white rounded-lg disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
