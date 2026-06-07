export function encodeReferralCode(contact: string): string {
  if (typeof window !== 'undefined') {
    return btoa(contact).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return Buffer.from(contact).toString('base64url');
}

export function decodeReferralCode(code: string): string {
  try {
    const pad = code.length % 4 ? '='.repeat(4 - (code.length % 4)) : '';
    const normalized = code.replace(/-/g, '+').replace(/_/g, '/') + pad;
    if (typeof window !== 'undefined') {
      return atob(normalized);
    }
    return Buffer.from(normalized, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

export function captureReferralFromUrl() {
  if (typeof window === 'undefined') return;
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (ref) sessionStorage.setItem('makebig_ref', ref);
}

export function consumeStoredReferral(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const ref = sessionStorage.getItem('makebig_ref');
  if (!ref) return undefined;
  const contact = decodeReferralCode(ref);
  return contact || undefined;
}
