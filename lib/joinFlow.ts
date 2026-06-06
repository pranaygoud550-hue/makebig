/** Join API — only treat as approved when the server explicitly marks joined. */
export function isJoinApproved(
  result: { pending?: boolean; joined?: boolean } | null | undefined
): boolean {
  return result?.joined === true;
}

export function joinRequestNotice(
  result: { message?: string; pending?: boolean } | null | undefined
): string {
  if (result?.message) return result.message;
  if (result?.pending) {
    return 'Join request sent — waiting for the project creator to approve';
  }
  return 'Join request sent — waiting for the project creator to approve';
}
