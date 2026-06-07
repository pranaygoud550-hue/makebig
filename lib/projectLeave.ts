export const LEAVE_REASON_OPTIONS = [
  'Not enough time to contribute',
  'Project direction changed',
  'Found a better opportunity',
  'Team communication issues',
  'Project is no longer active',
  'Personal reasons',
  'Other',
] as const;

export type LeaveReasonOption = (typeof LEAVE_REASON_OPTIONS)[number];

/** Display label for activity feed — never show raw "Other". */
export function formatLeaveReasonLabel(
  reason?: string | null,
  reasonText?: string | null
): string | null {
  const r = String(reason || '').trim();
  if (!r) return null;
  if (r === 'Other') {
    const text = String(reasonText || '').trim();
    return text || null;
  }
  return r;
}

export function leaveActivityLogLine(
  userName: string,
  reason?: string | null,
  reasonText?: string | null
): string {
  const label = formatLeaveReasonLabel(reason, reasonText);
  if (!label) return `${userName} left the project`;
  return `${userName} left the project — Reason: ${label}`;
}
