'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Profile, User } from '@/lib/types';
import { useAuth } from '@/lib/hooks/useAuth';
import { apiGetPublicProfile, apiUpsertUser } from '@/lib/api';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { WIZARD_CATEGORIES } from '@/lib/constants';
import {
  formatPortfolioHref,
  parsePortfolioLinks,
  type ProfileBadge,
  type ProfileProjectHistory,
  type PublicProfilePayload,
} from '@/lib/profilePublic';
import { formatSalaryBand } from '@/lib/utils';
import { getErrorMessage } from '@/lib/userErrors';
import { StarRating } from '@/components/StarRating';
import { FriendRequestButton } from '@/components/app/FriendRequestButton';
import { VerifiedSkillsSection } from '@/components/skillVerification/VerifiedSkillsSection';
import { ReputationPanel } from '@/components/ecosystem/ReputationPanel';

const MAX_IMAGE_BYTES = 900_000;
const FIELD =
  'w-full bg-white text-[#1d2226] border border-[#d9d9d9] rounded-lg px-3 py-2 text-sm placeholder:text-[#999] focus:outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20 [color-scheme:light]';
const draftKey = (contact: string) => `makeBigProfileDraft:${contact}`;

interface ProfessionalProfileProps {
  user: User;
  isOwnProfile?: boolean;
  variant?: 'page' | 'panel';
  onClose?: () => void;
  onSaved?: () => void;
  onLogout?: () => void;
}

function categoryLabel(id?: string) {
  if (!id) return 'Project';
  return WIZARD_CATEGORIES.find((c) => c.id === id)?.title || id.replace(/-/g, ' ');
}

function statusLabel(status?: string) {
  if (!status) return '';
  return status.replace(/-/g, ' ');
}

export function ProfessionalProfile({
  user,
  isOwnProfile = true,
  variant = 'panel',
  onClose,
  onSaved,
  onLogout,
}: ProfessionalProfileProps) {
  const auth = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publicData, setPublicData] = useState<PublicProfilePayload | null>(null);

  const [name, setName] = useState(user.name);
  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [role, setRole] = useState<Profile['role']>('member');
  const [skills, setSkills] = useState<string[]>(user.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [profileImage, setProfileImage] = useState<string>('');
  const [availableForInvites, setAvailableForInvites] = useState(false);
  const [rateMin, setRateMin] = useState('');
  const [rateMax, setRateMax] = useState('');
  const [currency, setCurrency] = useState('INR');

  const loadProfile = async () => {
    setLoading(true);
    const data = await apiGetPublicProfile(user.contact);
    setPublicData(data);
    if (data?.profile) {
      setTagline(data.profile.tagline || '');
      setBio(data.profile.bio || '');
      setPortfolio(
        data.profile.portfolioLinks?.length
          ? data.profile.portfolioLinks.join('\n')
          : data.profile.portfolio || ''
      );
      setRole((data.profile.role as Profile['role']) || 'member');
      setSkills(
        data.profile.skills?.length ? data.profile.skills : data.user.skills || user.skills || []
      );
      setCategoryIds(data.profile.categoryIds || []);
      setProfileImage(data.profile.profileImage || '');
      setAvailableForInvites(Boolean(data.profile.availableForInvites));
      setRateMin(data.profile.rateMin != null ? String(data.profile.rateMin) : '');
      setRateMax(data.profile.rateMax != null ? String(data.profile.rateMax) : '');
      setCurrency(data.profile.currency || 'INR');
    } else {
      setSkills(user.skills || []);
    }
    setName(data?.user.name || user.name);
    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
    if (typeof window !== 'undefined') {
      const raw = sessionStorage.getItem(draftKey(user.contact));
      if (raw) {
        try {
          const d = JSON.parse(raw) as Record<string, unknown>;
          if (d.name) setName(String(d.name));
          if (d.tagline) setTagline(String(d.tagline));
          if (d.bio) setBio(String(d.bio));
          if (d.portfolio) setPortfolio(String(d.portfolio));
          if (d.editing) setEditing(true);
        } catch {
          /* ignore */
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.contact]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(
      draftKey(user.contact),
      JSON.stringify({
        name,
        tagline,
        bio,
        portfolio,
        editing,
      })
    );
  }, [user.contact, name, tagline, bio, portfolio, editing]);

  const handleImagePick = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (dataUrl.length > MAX_IMAGE_BYTES) {
        setError('Image is too large. Use a photo under ~700KB.');
        return;
      }
      setError(null);
      setProfileImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s || skills.includes(s)) return;
    setSkills([...skills, s]);
    setSkillInput('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiUpsertUser({
        name: name.trim() || user.name,
        contact: user.contact,
        skills,
        hobbies: user.hobbies || [],
        college: user.college,
        graduationYear: user.graduationYear,
        city: user.city,
        state: user.state,
      });

      const profile: Profile = {
        contact: user.contact,
        role,
        tagline: tagline.trim(),
        categoryIds,
        skills,
        rateMin: rateMin ? parseInt(rateMin, 10) : null,
        rateMax: rateMax ? parseInt(rateMax, 10) : null,
        currency,
        availableForInvites,
        bio: bio.trim(),
        portfolio: portfolio.trim(),
        profileImage,
      };

      const ok = await auth.updateProfile(profile);
      if (!ok) throw new Error('Profile save failed');
      await auth.refreshProfile();
      await loadProfile();
      onSaved?.();
      setEditing(false);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(draftKey(user.contact));
      }
    } catch (e) {
      setError(getErrorMessage(e, 'profile'));
    } finally {
      setSaving(false);
    }
  };

  const displayUser = publicData?.user || user;
  const avatar = profileImage || publicData?.profile?.profileImage || auth.profile?.profileImage;
  const displayTagline = tagline || publicData?.profile?.tagline;
  const displayBio = bio || publicData?.profile?.bio;
  const portfolioLinks = parsePortfolioLinks(portfolio || publicData?.profile?.portfolio);
  const badges = publicData?.badges || [];
  const projects = publicData?.projects || [];
  const canEdit = isOwnProfile;

  const shellClass =
    variant === 'page'
      ? 'min-h-screen bg-[#f3f2ef] w-full'
      : 'fixed inset-0 z-[60] flex flex-col bg-[#f3f2ef] w-full h-full';

  const cardClass =
    variant === 'page'
      ? 'w-full px-4 sm:px-6 lg:px-8 pb-16'
      : 'relative w-full h-full bg-[#f3f2ef] overflow-y-auto flex flex-col';

  return (
    <div className={shellClass}>
      {variant === 'page' && (
        <header className="bg-white border-b border-[#e0e0e0] sticky top-0 z-30">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <Link href="/" className="text-lg font-black text-[#0A66C2]">
              Make Big
            </Link>
            <Link href="/" className="text-sm text-[#666] hover:text-[#0A66C2]">
              ← Back
            </Link>
          </div>
        </header>
      )}

      <div className={cardClass}>
        <div className="h-28 sm:h-32 bg-gradient-to-r from-[#0A66C2] via-[#0A66C2] to-[#004182] relative shrink-0">
          {variant === 'panel' && onClose && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="md:hidden absolute top-4 left-4 z-10 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/90 text-[#0A66C2] text-sm font-semibold border border-[#e0e0e0] hover:bg-white shadow-sm"
              >
                <span aria-hidden>←</span> Back
              </button>
              <button
                type="button"
                onClick={onClose}
                className="hidden md:flex absolute top-6 right-6 z-10 px-3 py-1.5 rounded-full bg-white/90 text-[#1d2226] text-sm font-semibold border border-[#e0e0e0] hover:bg-white shadow-sm"
              >
                Close
              </button>
            </>
          )}
        </div>

        <div className={`flex-1 overflow-y-auto px-4 sm:px-6 pb-10 -mt-16 ${variant === 'page' ? 'pt-0' : ''}`}>
          {loading ? (
            <p className="text-center text-sm text-[#666] py-16">Loading profile…</p>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-[#e0e0e0] shadow-sm p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                  <div className="relative shrink-0 mx-auto sm:mx-0">
                    <ProfileAvatar name={name} imageUrl={avatar} size="xl" className="ring-4 ring-white" />
                    {editing && canEdit && (
                      <label className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#0A66C2] text-white flex items-center justify-center cursor-pointer shadow-md text-lg">
                        +
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImagePick(e.target.files?.[0] || null)}
                        />
                      </label>
                    )}
                  </div>
                  <div className="flex-1 text-center sm:text-left min-w-0">
                    {editing && canEdit ? (
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`${FIELD} text-2xl font-bold py-1.5`}
                      />
                    ) : (
                      <h1 className="text-2xl font-bold text-[#1d2226]">{name}</h1>
                    )}
                    <p className="text-sm text-[#666] mt-1">{displayUser.contact || user.contact}</p>
                    {!editing && (
                      <div className="mt-2 flex justify-center sm:justify-start">
                        <StarRating
                          value={publicData?.profile?.workRatingAvg || 0}
                          count={publicData?.profile?.workRatingCount}
                        />
                      </div>
                    )}
                    {displayTagline && !editing && (
                      <p className="text-sm text-[#1d2226] mt-2 font-medium">{displayTagline}</p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center sm:justify-start mt-2 text-xs text-[#666]">
                      {displayUser.college && <span>🎓 {displayUser.college}</span>}
                      {displayUser.graduationYear && <span>Class of {displayUser.graduationYear}</span>}
                      {(displayUser.city || displayUser.state) && (
                        <span>📍 {[displayUser.city, displayUser.state].filter(Boolean).join(', ')}</span>
                      )}
                    </div>
                  </div>
                </div>

                {canEdit && (
                  <div className="mt-5 flex flex-wrap gap-2 justify-center sm:justify-start">
                    {!editing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditing(true)}
                          className="px-5 py-2 rounded-full border-2 border-[#0A66C2] text-[#0A66C2] text-sm font-bold hover:bg-[#EEF3FB]"
                        >
                          Edit profile
                        </button>
                        {onLogout && (
                          <button
                            type="button"
                            onClick={onLogout}
                            className="px-5 py-2 rounded-full border border-[#d9d9d9] text-[#666] text-sm font-semibold hover:bg-[#f3f2ef]"
                          >
                            Sign out
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={saving}
                          className="px-5 py-2 rounded-full bg-[#0A66C2] text-white text-sm font-bold hover:bg-[#004182] disabled:opacity-50"
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(false);
                            loadProfile();
                          }}
                          className="px-5 py-2 rounded-full border border-[#d9d9d9] text-sm font-semibold text-[#666]"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {availableForInvites && !editing && (
                      <span className="px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200">
                        Open to collaborate
                      </span>
                    )}
                    {displayUser.plan === 'pro' && (
                      <span className="px-3 py-1.5 rounded-full bg-[#EEF3FB] text-[#0A66C2] text-xs font-semibold border border-[#0A66C2]/20">
                        Pro
                      </span>
                    )}
                    {!editing && canEdit && (
                      <Link
                        href={`/u/${encodeURIComponent(user.contact)}`}
                        className="px-3 py-1.5 rounded-full border border-[#d9d9d9] text-xs font-semibold text-[#666] hover:border-[#0A66C2] hover:text-[#0A66C2]"
                      >
                        View public profile
                      </Link>
                    )}
                  </div>
                )}

                {!canEdit && auth.user?.contact && (
                  <div className="mt-5 flex justify-center sm:justify-start">
                    <FriendRequestButton
                      targetContact={user.contact}
                      viewerContact={auth.user.contact}
                    />
                  </div>
                )}

                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              </div>

              {badges.length > 0 && (
                <section className="mt-4 bg-white rounded-2xl border border-[#e0e0e0] p-5">
                  <h2 className="text-xs font-bold text-[#666] uppercase tracking-wide mb-3">Badges</h2>
                  <div className="flex flex-wrap gap-2">
                    {badges.map((b: ProfileBadge) => (
                      <span
                        key={b.id}
                        title={b.description}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f8f9fa] border border-[#e0e0e0] text-xs font-semibold text-[#1d2226] hover:border-[#0A66C2]/30 transition-colors cursor-default"
                      >
                        <span aria-hidden>{b.icon}</span>
                        {b.label}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {publicData?.stats && (
                <section className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Projects led', value: publicData.stats.projectsLed },
                    { label: 'Teams joined', value: publicData.stats.projectsJoined },
                    { label: 'Tasks done', value: publicData.stats.tasksCompleted },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="bg-white rounded-xl border border-[#e0e0e0] p-3 text-center"
                    >
                      <p className="text-xl font-black text-[#0A66C2]">{s.value}</p>
                      <p className="text-[10px] text-[#666] font-medium mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </section>
              )}

              <div className="mt-4 space-y-4">
                {(editing || displayTagline) && (
                  <section className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
                    <h2 className="text-xs font-bold text-[#666] uppercase tracking-wide mb-2">Headline</h2>
                    {editing && canEdit ? (
                      <input
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder="Full-stack developer · Building for campus"
                        className={FIELD}
                      />
                    ) : (
                      <p className="text-sm text-[#1d2226]">{displayTagline}</p>
                    )}
                  </section>
                )}

                <section className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
                  <h2 className="text-xs font-bold text-[#666] uppercase tracking-wide mb-2">About</h2>
                  {editing && canEdit ? (
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={5}
                      placeholder="Your story, experience, and what you want to build with a team…"
                      className={`${FIELD} resize-none`}
                    />
                  ) : (
                    <p className="text-sm text-[#1d2226] leading-relaxed whitespace-pre-wrap">
                      {displayBio || (canEdit ? 'Add an about section to help teams and faculty understand your work.' : 'No bio yet.')}
                    </p>
                  )}
                </section>

                <VerifiedSkillsSection verifiedSkills={publicData?.user?.verifiedSkills} />

                <ReputationPanel contact={user.contact} />

                <section className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
                  <h2 className="text-xs font-bold text-[#666] uppercase tracking-wide mb-2">Skills</h2>
                  {editing && canEdit && (
                    <div className="flex gap-2 mb-3">
                      <input
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                        placeholder="Add skill"
                        className={`flex-1 ${FIELD}`}
                      />
                      <button type="button" onClick={addSkill} className="px-3 text-sm font-semibold text-[#0A66C2]">
                        Add
                      </button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF3FB] text-[#0A66C2]"
                      >
                        {s}
                        {editing && canEdit && (
                          <button
                            type="button"
                            className="ml-1 opacity-60 hover:opacity-100"
                            onClick={() => setSkills(skills.filter((x) => x !== s))}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                    {!skills.length && <p className="text-sm text-[#666]">No skills listed yet.</p>}
                  </div>
                </section>

                {(portfolioLinks.length > 0 || (editing && canEdit)) && (
                  <section className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
                    <h2 className="text-xs font-bold text-[#666] uppercase tracking-wide mb-2">
                      Portfolio &amp; links
                    </h2>
                    {editing && canEdit ? (
                      <textarea
                        value={portfolio}
                        onChange={(e) => setPortfolio(e.target.value)}
                        rows={3}
                        placeholder="One link per line — GitHub, LinkedIn, Behance, demo site…"
                        className={`${FIELD} resize-none font-mono`}
                      />
                    ) : (
                      <ul className="space-y-2">
                        {portfolioLinks.map((link) => (
                          <li key={link}>
                            <a
                              href={formatPortfolioHref(link)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-[#0A66C2] font-semibold hover:underline break-all"
                            >
                              {link.replace(/^https?:\/\//, '')} ↗
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}

                <section className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
                  <h2 className="text-xs font-bold text-[#666] uppercase tracking-wide mb-3">
                    Project history
                  </h2>
                  {projects.length === 0 ? (
                    <p className="text-sm text-[#666]">
                      {canEdit
                        ? 'Create or join a project — it will show here like a mini portfolio.'
                        : 'No projects yet.'}
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {projects.map((p: ProfileProjectHistory) => (
                        <li
                          key={p.id}
                          className="border border-[#e0e0e0] rounded-xl p-4 hover:border-[#0A66C2]/25 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {p.slug ? (
                                <Link
                                  href={`/p/${p.slug}`}
                                  className="font-semibold text-[#1d2226] hover:text-[#0A66C2] text-sm"
                                >
                                  {p.name}
                                </Link>
                              ) : (
                                <p className="font-semibold text-[#1d2226] text-sm">{p.name}</p>
                              )}
                              <p className="text-xs text-[#666] mt-0.5 capitalize">
                                {categoryLabel(p.categoryId)}
                                {p.city ? ` · ${p.city}` : ''}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                p.relation === 'owner'
                                  ? 'bg-[#EEF3FB] text-[#0A66C2]'
                                  : 'bg-[#f3f2ef] text-[#666]'
                              }`}
                            >
                              {p.relation === 'owner' ? 'Lead' : 'Member'}
                            </span>
                          </div>
                          {p.desc && <p className="text-xs text-[#666] mt-2 line-clamp-2">{p.desc}</p>}
                          <p className="text-[10px] text-[#999] mt-2 capitalize">{statusLabel(p.status)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {(user.hobbies?.length || 0) > 0 && (
                  <section className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
                    <h2 className="text-xs font-bold text-[#666] uppercase tracking-wide mb-2">Interests</h2>
                    <div className="flex flex-wrap gap-2">
                      {user.hobbies!.map((h) => (
                        <span key={h} className="text-xs px-2.5 py-1 rounded-full bg-[#f3f2ef] text-[#444]">
                          {h}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {editing && canEdit && (
                  <>
                    <section className="bg-white rounded-2xl border border-[#e0e0e0] p-5 space-y-3">
                      <h2 className="text-xs font-bold text-[#666] uppercase tracking-wide">Preferences</h2>
                      <label className="block text-sm text-[#666]">
                        Role
                        <select
                          value={role}
                          onChange={(e) => setRole(e.target.value as Profile['role'])}
                          className={`mt-1 ${FIELD}`}
                        >
                          <option value="member">Team member</option>
                          <option value="creator">Project creator</option>
                          <option value="both">Both</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={availableForInvites}
                          onChange={(e) => setAvailableForInvites(e.target.checked)}
                        />
                        Open to team invites
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={rateMin}
                          onChange={(e) => setRateMin(e.target.value)}
                          placeholder="Rate min (INR)"
                          className={FIELD}
                        />
                        <input
                          type="number"
                          value={rateMax}
                          onChange={(e) => setRateMax(e.target.value)}
                          placeholder="Rate max"
                          className={FIELD}
                        />
                      </div>
                    </section>
                    <section className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
                      <h2 className="text-xs font-bold text-[#666] uppercase tracking-wide mb-2">Focus areas</h2>
                      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                        {WIZARD_CATEGORIES.slice(0, 16).map((c) => {
                          const on = categoryIds.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() =>
                                setCategoryIds(on ? categoryIds.filter((id) => id !== c.id) : [...categoryIds, c.id])
                              }
                              className={`text-xs px-2 py-1 rounded-full border ${
                                on ? 'bg-[#0A66C2] text-white border-[#0A66C2]' : 'border-[#d9d9d9] text-[#666]'
                              }`}
                            >
                              {c.title}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
