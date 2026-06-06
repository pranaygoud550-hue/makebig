'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  apiAcceptFriendRequest,
  apiDeclineFriendRequest,
  apiGetFriendStatus,
  apiSendFriendRequest,
  type FriendLinkStatus,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/userErrors';

interface FriendRequestButtonProps {
  targetContact: string;
  viewerContact?: string;
  onChanged?: () => void;
}

export function FriendRequestButton({
  targetContact,
  viewerContact,
  onChanged,
}: FriendRequestButtonProps) {
  const [status, setStatus] = useState<FriendLinkStatus>('none');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!viewerContact || !targetContact) {
      setStatus('none');
      setLoading(false);
      return;
    }
    setLoading(true);
    const next = await apiGetFriendStatus(targetContact);
    setStatus(next);
    setLoading(false);
  }, [targetContact, viewerContact]);

  useEffect(() => {
    load();
  }, [load]);

  if (!viewerContact || viewerContact.toLowerCase() === targetContact.toLowerCase()) {
    return null;
  }

  const run = async (action: () => Promise<boolean>) => {
    setBusy(true);
    setMessage(null);
    try {
      const ok = await action();
      if (!ok) setMessage('Could not update friend request — try again');
      else {
        await load();
        onChanged?.();
      }
    } catch (e) {
      setMessage(getErrorMessage(e, 'auth'));
    } finally {
      setBusy(false);
    }
  };

  let label = 'Add friend';
  let onClick: (() => void) | undefined = () => {
    void run(() => apiSendFriendRequest(targetContact));
  };
  let variant: 'primary' | 'muted' | 'success' = 'primary';
  let disabled = busy;

  if (loading) {
    label = '…';
    disabled = true;
    onClick = undefined;
  } else if (status === 'friends') {
    label = 'Friends';
    variant = 'success';
    disabled = true;
    onClick = undefined;
  } else if (status === 'pending_sent') {
    label = 'Request sent';
    variant = 'muted';
    disabled = true;
    onClick = undefined;
  } else if (status === 'pending_received') {
    label = busy ? '…' : 'Accept request';
    onClick = () => {
      void run(() => apiAcceptFriendRequest(targetContact));
    };
  }

  const classes =
    variant === 'success'
      ? 'bg-green-50 text-green-800 border-green-200'
      : variant === 'muted'
        ? 'bg-[#f3f2ef] text-[#666] border-[#d9d9d9]'
        : 'bg-[#0A66C2] text-white border-[#0A66C2] hover:bg-[#004182]';

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`px-5 py-2 rounded-full text-sm font-bold border transition-colors disabled:opacity-60 ${classes}`}
      >
        {label}
      </button>
      {status === 'pending_received' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => apiDeclineFriendRequest(targetContact))}
          className="block text-xs text-[#666] hover:text-[#0A66C2] font-semibold"
        >
          Decline
        </button>
      )}
      {message && <p className="text-xs text-red-600">{message}</p>}
    </div>
  );
}
