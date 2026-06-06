'use client';

import { useEffect, useState } from 'react';
import { INVITE_ROLE_TYPES } from '@/lib/ecosystem/constants';

interface InviteRow {
  id: string;
  role?: string;
  message?: string;
  status: string;
  projectName?: string;
  receiverContact?: string;
  createdAt?: string;
}

export function CollaborationInvitesPanel() {
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [received, setReceived] = useState<InviteRow[]>([]);
  const [sent, setSent] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('makebig_token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/invites/received', { headers }).then((r) => r.json()),
      fetch('/api/invites/sent', { headers }).then((r) => r.json()),
    ]).then(([rec, snt]) => {
      if (rec.success) setReceived(rec.data.invites || []);
      if (snt.success) setSent(snt.data.invites || []);
    }).finally(() => setLoading(false));
  }, []);

  const list = tab === 'received' ? received : sent;

  return (
    <section className="bg-white rounded-2xl border border-[#e0e0e0] p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-[#1d2226]">Collaboration Invitations</h2>
        <p className="text-xs text-[#666] mt-0.5">
          Founder → invite talent · Roles: {INVITE_ROLE_TYPES.slice(0, 4).join(', ')}…
        </p>
      </div>

      <div className="flex gap-2">
        {(['received', 'sent'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${
              tab === t ? 'bg-[#0A66C2] text-white' : 'bg-[#f3f2ef] text-[#666]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[#999]">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-[#999]">No {tab} invitations</p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {list.map((inv) => (
            <li key={inv.id} className="border border-[#eef3fb] rounded-xl px-3 py-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-[#1d2226]">{inv.projectName}</span>
                <span className={`text-[10px] font-bold uppercase ${
                  inv.status === 'accepted' ? 'text-green-600' :
                  inv.status === 'pending' ? 'text-amber-600' : 'text-[#999]'
                }`}>{inv.status}</span>
              </div>
              {inv.role && <p className="text-xs text-[#0A66C2] mt-0.5">{inv.role}</p>}
              {inv.message && <p className="text-xs text-[#666] mt-1 italic">&ldquo;{inv.message}&rdquo;</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
