'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  apiAcceptFriendRequest,
  apiDeclineFriendRequest,
  apiGetFriendRequests,
  apiGetFriends,
  apiGetTalent,
  type FriendPerson,
} from '@/lib/api';
import { ProjectData } from '@/lib/types';
import { useProfileView } from '@/lib/context/ProfileViewContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { FriendRequestButton } from '@/components/app/FriendRequestButton';

interface FriendsViewProps {
  currentProject: ProjectData | null;
  userContact?: string;
  onInvite?: () => void;
}

export function FriendsView({ currentProject, userContact, onInvite }: FriendsViewProps) {
  const [friends, setFriends] = useState<FriendPerson[]>([]);
  const [incoming, setIncoming] = useState<FriendPerson[]>([]);
  const [outgoing, setOutgoing] = useState<FriendPerson[]>([]);
  const [searchResults, setSearchResults] = useState<FriendPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { openProfile } = useProfileView();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const loadSocial = useCallback(async () => {
    if (!userContact) {
      setFriends([]);
      setIncoming([]);
      setOutgoing([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [friendList, requests] = await Promise.all([
      apiGetFriends(),
      apiGetFriendRequests(),
    ]);
    setFriends(friendList);
    setIncoming(requests.incoming);
    setOutgoing(requests.outgoing);
    setLoading(false);
  }, [userContact]);

  useEffect(() => {
    loadSocial();
  }, [loadSocial]);

  useEffect(() => {
    if (debounced.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    apiGetTalent(debounced).then((list) => {
      if (cancelled) return;
      const mapped = (Array.isArray(list) ? list : [])
        .filter((t) => t.contact && t.contact !== userContact)
        .map((t) => ({
          contact: t.contact as string,
          name: t.name || t.contact,
          college: t.college,
          tagline: t.tagline,
          skills: t.skills,
        }));
      setSearchResults(mapped);
      setSearchLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [debounced, userContact]);

  const friendContacts = useMemo(
    () => new Set(friends.map((f) => f.contact.toLowerCase())),
    [friends]
  );

  const handleAccept = async (contact: string) => {
    setActionBusy(contact);
    await apiAcceptFriendRequest(contact);
    await loadSocial();
    setActionBusy(null);
  };

  const handleDecline = async (contact: string) => {
    setActionBusy(contact);
    await apiDeclineFriendRequest(contact);
    await loadSocial();
    setActionBusy(null);
  };

  if (!userContact) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-[#d9d9d9] p-10 text-center">
        <p className="font-semibold text-[#1d2226]">Sign in to add friends</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-[#1d2226]">Friends</h1>
        <p className="text-sm text-[#666] mt-0.5">
          Accept requests, connect with people, and search when you want to add someone new.
        </p>
      </header>

      {currentProject?.id && onInvite && (
        <div className="bg-[#EEF3FB] border border-[#0A66C2]/20 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-[#1d2226]">Have a project? Invite teammates from your dashboard.</p>
          <button
            type="button"
            onClick={onInvite}
            className="shrink-0 px-3 py-1.5 bg-[#0A66C2] text-white text-xs font-semibold rounded-full"
          >
            Open project
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : friends.length === 0 && incoming.length === 0 && outgoing.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Find your people"
          description="Connect with builders, designers and founders"
          actions={[{ label: 'Find people', onClick: () => searchInputRef.current?.focus() }]}
        />
      ) : (
        <>
          {incoming.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-[#1d2226]">Friend requests</h2>
              {incoming.map((p) => (
                <div
                  key={p.contact}
                  className="bg-white rounded-2xl border border-amber-200 p-4 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => openProfile(p.contact, p.name)}
                    className="text-left min-w-0 flex-1"
                  >
                    <p className="font-semibold text-[#1d2226]">{p.name}</p>
                    {p.college && <p className="text-xs text-[#666] mt-0.5">{p.college}</p>}
                  </button>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={actionBusy === p.contact}
                      onClick={() => void handleAccept(p.contact)}
                      className="px-3 py-1.5 bg-[#0A66C2] text-white text-xs font-semibold rounded-full disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy === p.contact}
                      onClick={() => void handleDecline(p.contact)}
                      className="px-3 py-1.5 border border-[#d9d9d9] text-[#666] text-xs font-semibold rounded-full disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {outgoing.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-[#1d2226]">Sent requests</h2>
              {outgoing.map((p) => (
                <div
                  key={p.contact}
                  className="bg-white rounded-2xl border border-[#e0e0e0] p-4 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => openProfile(p.contact, p.name)}
                    className="text-left"
                  >
                    <p className="font-semibold text-[#1d2226]">{p.name}</p>
                    <p className="text-xs text-amber-700 mt-0.5">Waiting for approval</p>
                  </button>
                </div>
              ))}
            </section>
          )}

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#1d2226] dark:text-white">Your friends</h2>
            {friends.length === 0 ? (
              <p className="text-sm text-[#666] dark:text-gray-400 px-1">No friends yet — search below to connect.</p>
            ) : (
              friends.map((p) => (
                <button
                  key={p.contact}
                  type="button"
                  onClick={() => openProfile(p.contact, p.name)}
                  className="w-full text-left bg-white rounded-2xl border border-[#e0e0e0] p-4 hover:border-[#0A66C2]/40 transition-colors"
                >
                  <p className="font-semibold text-[#1d2226]">{p.name}</p>
                  {p.tagline && (
                    <p className="text-sm text-[#666] mt-1 line-clamp-1">{p.tagline}</p>
                  )}
                  {p.college && <p className="text-xs text-[#0A66C2] mt-1">{p.college}</p>}
                </button>
              ))
            )}
          </section>
        </>
      )}

      <section className="space-y-3 pt-2 border-t border-[#e0e0e0]">
        <h2 className="text-sm font-bold text-[#1d2226]">Find people</h2>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666] text-sm">🔍</span>
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, skill, or college…"
            className="w-full pl-9 pr-4 py-3 rounded-full border border-[#d9d9d9] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30 focus:border-[#0A66C2]"
          />
        </div>
        {debounced.length > 0 && debounced.length < 2 && (
          <p className="text-xs text-[#666]">Type at least 2 characters to search.</p>
        )}
        {searchLoading && <p className="text-sm text-[#666]">Searching…</p>}
        {!searchLoading && debounced.length >= 2 && searchResults.length === 0 && (
          <p className="text-sm text-[#666]">No matches for &ldquo;{debounced}&rdquo;.</p>
        )}
        {searchResults.map((p) => (
          <div
            key={p.contact}
            className="bg-white rounded-2xl border border-[#e0e0e0] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <button
              type="button"
              onClick={() => openProfile(p.contact, p.name)}
              className="text-left min-w-0 flex-1"
            >
              <p className="font-semibold text-[#1d2226]">{p.name}</p>
              {p.college && <p className="text-xs text-[#666] mt-0.5">{p.college}</p>}
              {p.tagline && (
                <p className="text-sm text-[#666] mt-1 line-clamp-2">{p.tagline}</p>
              )}
            </button>
            <div className="shrink-0 flex flex-wrap gap-2 items-center">
              {!friendContacts.has(p.contact.toLowerCase()) && (
                <FriendRequestButton
                  targetContact={p.contact}
                  viewerContact={userContact}
                  onChanged={loadSocial}
                />
              )}
              {friendContacts.has(p.contact.toLowerCase()) && (
                <span className="px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200">
                  Friends
                </span>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
