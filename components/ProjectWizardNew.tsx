'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WIZARD_CATEGORIES } from '@/lib/constants';
import { useWizard } from '@/lib/hooks/useWizard';
import { getSkillMatchCount } from '@/lib/utils';
import { ProjectData, ProjectPurpose } from '@/lib/types';
import {
  PROJECT_PURPOSE_OPTIONS,
  showsSalaryForPurpose,
} from '@/lib/projectPurpose';
import { apiBrowseProjects, apiJoinProject, BrowseProject } from '@/lib/api';
import { getErrorMessage } from '@/lib/userErrors';
import { INDIAN_CITIES } from '@/lib/indianCities';

interface ProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: ProjectData) => void;
}

const iCls =
  'w-full px-4 py-2.5 bg-white border border-[#d9d9d9] rounded-lg text-[#1d2226] placeholder-[#aaa] text-sm focus:outline-none focus:border-[#0A66C2] focus:ring-2 focus:ring-[#0A66C2]/20 transition-all';

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-sm font-semibold text-[#1d2226]">
        {label}
        {optional && <span className="text-xs font-normal text-[#999]">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

function SkillChip({ skill, selected, onToggle }: { skill: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
        selected
          ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
          : 'bg-white text-[#666] border-[#d9d9d9] hover:border-[#0A66C2] hover:text-[#0A66C2]'
      }`}
    >
      {skill}
    </button>
  );
}

function CategoryTitle(id: string) {
  return WIZARD_CATEGORIES.find(c => c.id === id)?.title || id;
}

const CREATE_STEP_LABELS = ['What are you building?', 'Skills & Timeline', 'Review & Publish'];
const JOIN_STEP_LABELS   = ['What can you bring?', 'Pick a project', 'Send your intro'];

export function ProjectWizardNew({ isOpen, onClose, onComplete }: ProjectWizardProps) {
  const wizard = useWizard();
  const { state } = wizard;

  /* ── Create flow local state ── */
  const [projectName, setProjectName]   = useState('');
  const [projectDesc, setProjectDesc]   = useState('');
  const [deadline, setDeadline]         = useState('');
  const [createSalaryMin, setCreateSalaryMin] = useState('');
  const [createSalaryMax, setCreateSalaryMax] = useState('');
  const [createCurrency, setCreateCurrency]   = useState('INR');
  const [projectPurpose, setProjectPurpose] = useState<ProjectPurpose>('college');
  const [projectCity, setProjectCity]   = useState('');
  const [projectState, setProjectState] = useState('');
  const [cityInput, setCityInput]       = useState('');
  const [showCityDrop, setShowCityDrop] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);

  /* ── Join flow local state ── */
  const [joinRole, setJoinRole]           = useState('');
  const [joinExpectedSalary, setJoinExpectedSalary] = useState('');
  const [joinSalaryCurrency, setJoinSalaryCurrency] = useState('INR');
  const [browseProjects, setBrowseProjects] = useState<BrowseProject[]>([]);
  const [browseLoading, setBrowseLoading]   = useState(false);
  const [selectedProject, setSelectedProject] = useState<BrowseProject | null>(null);
  const [introMessage, setIntroMessage] = useState('');
  const [sending, setSending]           = useState(false);
  const [sendError, setSendError]       = useState('');
  const [joinSuccess, setJoinSuccess]   = useState(false);

  /* ── Shared ── */
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);

  const isJoin = state.entry === 'join';
  const stepLabels = isJoin ? JOIN_STEP_LABELS : CREATE_STEP_LABELS;
  const copy = wizard.getWizardCopy();
  const progress = state.entry === '' ? 0 : Math.round((state.step / 3) * 100);

  /* ── Fetch projects when Join step 2 is reached ── */
  useEffect(() => {
    if (isJoin && state.step === 2) {
      setBrowseLoading(true);
      apiBrowseProjects().then(list => {
        setBrowseProjects(list);
        setBrowseLoading(false);
      });
    }
  }, [isJoin, state.step]);

  /* ── Pre-fill intro message when project is selected ── */
  useEffect(() => {
    if (!selectedProject) return;
    const skillsStr = state.skills.slice(0, 3).join(', ');
    const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const userName = stored ? (JSON.parse(stored)?.name || 'there') : 'there';
    const joinPaid =
      showsSalaryForPurpose(
        (selectedProject as { projectPurpose?: ProjectPurpose }).projectPurpose
      ) ||
      ((selectedProject.salaryMax || 0) > 0);
    const salaryPart =
      joinPaid && joinExpectedSalary
        ? ` My expected compensation is ${joinSalaryCurrency} ${Number(joinExpectedSalary).toLocaleString('en-IN')}/month.`
        : '';
    setIntroMessage(`Hi, I'm ${userName}. I can contribute ${skillsStr || 'my skills'}.${salaryPart} I'd love to join "${selectedProject.name}".`);
  }, [selectedProject, state.skills, joinExpectedSalary, joinSalaryCurrency]);

  /* ── Close city dropdown on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setShowCityDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Reset when wizard closes ── */
  useEffect(() => {
    if (!isOpen) {
      wizard.reset();
      setProjectName(''); setProjectDesc(''); setDeadline('');
      setCreateSalaryMin(''); setCreateSalaryMax(''); setCreateCurrency('INR');
      setProjectCity(''); setProjectState(''); setCityInput(''); setShowCityDrop(false);
      setJoinRole(''); setJoinExpectedSalary(''); setJoinSalaryCurrency('INR');
      setSelectedProject(null); setIntroMessage('');
      setSendError(''); setSending(false); setJoinSuccess(false);
      setPublishing(false); setError('');
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Validation per step ── */
  const validate = useCallback((): boolean => {
    setError('');

    if (state.entry === 'create') {
      if (state.step === 1) {
        if (!projectName.trim()) { setError('Please enter a project name.'); return false; }
        if (!projectDesc.trim())  { setError('Please add a one-line description.'); return false; }
        const hookErr = wizard.validateStep();
        if (hookErr) { setError(hookErr); return false; }
      }
      if (state.step === 2) {
        if (state.skills.length === 0) { setError('Choose at least one skill.'); return false; }
      }
    }

    if (state.entry === 'join') {
      if (state.step === 1) {
        const hookErr = wizard.validateStep();
        if (hookErr) { setError(hookErr); return false; }
      }
      if (state.step === 2) {
        if (!selectedProject) { setError('Select a project to continue.'); return false; }
      }
    }

    return true;
  }, [state.entry, state.step, state.skills, projectName, projectDesc, selectedProject, wizard]);

  const handleNext = () => {
    if (!validate()) return;
    wizard.next();
    setError('');
  };

  /* ── CREATE: publish ── */
  const handlePublish = () => {
    setPublishing(true);
    const selectedCategory = WIZARD_CATEGORIES.find(c => c.id === state.category);

    if (typeof window !== 'undefined') {
      localStorage.setItem('pendingProjectExtras', JSON.stringify({
        vision: '',
        teamSize: null,
        promptedAt: new Date().toISOString(),
      }));
    }

    const paidRole = showsSalaryForPurpose(projectPurpose);
    const projectData: ProjectData = {
      name: projectName,
      description: projectDesc,
      categoryId: state.category,
      category: selectedCategory?.title || '',
      projectPurpose,
      skills: state.skills,
      deadline: deadline || undefined,
      vision: '',
      salaryMin: paidRole && createSalaryMin ? Number(createSalaryMin) : undefined,
      salaryMax: paidRole && createSalaryMax ? Number(createSalaryMax) : undefined,
      salaryCurrency: paidRole ? createCurrency : undefined,
      city: projectCity || undefined,
      state: projectState || undefined,
      mode: 'create',
    };

    onComplete(projectData);
    setPublishing(false);
  };

  /* ── JOIN: send intro ── */
  const handleSendIntro = async () => {
    if (!selectedProject?.id) return;
    setSendError('');
    setSending(true);

    const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const userName = stored ? (JSON.parse(stored)?.name || 'User') : 'User';

    try {
      await apiJoinProject(selectedProject.id, userName, joinRole || 'member');
      setJoinSuccess(true);
    } catch (e) {
      setSendError(getErrorMessage(e, 'join'));
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#f3f2ef] flex flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-[#d9d9d9] shadow-sm flex items-center justify-between px-6 py-3 flex-shrink-0">
        <span className="text-xl font-black text-[#0A66C2] tracking-tight">Make Big</span>

        {/* Step dots — only when mode is chosen */}
        {state.entry !== '' && !joinSuccess && (
          <div className="hidden sm:flex items-center gap-1.5">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="flex flex-col items-center gap-0.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    state.step > i + 1
                      ? 'bg-[#0A66C2] text-white'
                      : state.step === i + 1
                      ? 'bg-[#0A66C2] text-white ring-4 ring-[#0A66C2]/20'
                      : 'bg-[#e0e0e0] text-[#999]'
                  }`}>
                    {state.step > i + 1 ? '✓' : i + 1}
                  </div>
                  <span className={`text-[10px] font-medium whitespace-nowrap ${state.step === i + 1 ? 'text-[#0A66C2]' : 'text-[#999]'}`}>
                    {isJoin
                      ? (['Skills', 'Project', 'Intro'] as const)[i]
                      : (['Build', 'Skills', 'Publish'] as const)[i]}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`w-8 h-0.5 mb-3 transition-all ${state.step > i + 1 ? 'bg-[#0A66C2]' : 'bg-[#e0e0e0]'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        <button onClick={onClose} className="text-[#666] hover:text-[#1d2226] text-2xl font-light leading-none" aria-label="Close">
          ✕
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div className="h-1 bg-[#e0e0e0] flex-shrink-0">
        <div className="h-full bg-[#0A66C2] transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

          {/* ═══════════════════════════════════════════════
              MODE PICKER  (no entry chosen yet)
          ═══════════════════════════════════════════════ */}
          {state.entry === '' && (
            <>
              <div>
                <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-widest mb-1">Get started</p>
                <h2 className="text-2xl font-bold text-[#1d2226]">What would you like to do?</h2>
                <p className="text-[#666] text-sm mt-1">Choose a path to begin. You can always switch later.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'create', icon: '🚀', title: 'Create a project', desc: 'Post your idea and recruit the team you need to build it.' },
                  { key: 'join',   icon: '🤝', title: 'Join a project',   desc: 'Browse open projects and apply to one that fits your skills.' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => wizard.selectEntry(opt.key as 'create' | 'join')}
                    className="text-left p-6 rounded-xl border-2 border-[#d9d9d9] bg-white hover:border-[#0A66C2]/50 hover:bg-[#f8f9fa] transition-all"
                  >
                    <span className="text-3xl">{opt.icon}</span>
                    <h3 className="font-bold text-[#1d2226] mt-3">{opt.title}</h3>
                    <p className="text-sm text-[#666] mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════
              JOIN SUCCESS CONFIRMATION
          ═══════════════════════════════════════════════ */}
          {joinSuccess && (
            <div className="flex flex-col items-center text-center space-y-5 py-10">
              <div className="w-20 h-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center text-4xl">
                ✓
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#1d2226]">Application sent!</h2>
                <p className="text-[#666] mt-1 max-w-sm">
                  Your intro has been shared with the team behind <strong>{selectedProject?.name}</strong>. You&apos;ll hear back through the project chat.
                </p>
              </div>
              <div className="bg-[#EEF3FB] border border-[#0A66C2]/20 rounded-xl p-4 max-w-sm w-full text-left space-y-1">
                <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-wide">What happens next</p>
                <p className="text-sm text-[#1d2226]">The project creator will see your intro and can accept your join request from their dashboard.</p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2.5 border-2 border-[#0A66C2] text-[#0A66C2] font-semibold rounded-full hover:bg-[#EEF3FB] transition-all text-sm"
              >
                ← Back to explore
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              CREATE — STEP 1: What are you building?
          ═══════════════════════════════════════════════ */}
          {!isJoin && !joinSuccess && state.entry !== '' && state.step === 1 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-widest mb-1">Step 1 of 3</p>
                <h2 className="text-2xl font-bold text-[#1d2226]">{copy?.title}</h2>
                <p className="text-[#666] text-sm mt-1">{copy?.subtitle}</p>
              </div>

              <div className="bg-white border border-[#d9d9d9] rounded-2xl p-6 space-y-4">
                <Field label="Project name">
                  <input
                    type="text"
                    autoFocus
                    value={projectName}
                    onChange={e => { setProjectName(e.target.value); setError(''); }}
                    placeholder="e.g. Campus Food Delivery App"
                    className={iCls}
                  />
                </Field>
                <Field label="One-line description">
                  <input
                    type="text"
                    value={projectDesc}
                    onChange={e => { setProjectDesc(e.target.value); setError(''); }}
                    placeholder="e.g. Connect hostel students to local restaurants for same-day delivery"
                    className={iCls}
                  />
                </Field>
                <Field label="City" optional>
                  <div ref={cityRef} className="relative">
                    <input
                      type="text"
                      placeholder="Start typing your city…"
                      value={cityInput}
                      onChange={e => {
                        const val = e.target.value;
                        setCityInput(val);
                        if (!val.trim()) {
                          setProjectCity('');
                          setProjectState('');
                          setShowCityDrop(false);
                        } else {
                          setShowCityDrop(true);
                          // If typed text exactly matches a city, keep it selected
                          const exact = INDIAN_CITIES.find(c => c.city.toLowerCase() === val.toLowerCase());
                          if (exact) { setProjectCity(exact.city); setProjectState(exact.state); }
                          else { setProjectCity(''); setProjectState(''); }
                        }
                      }}
                      onFocus={() => cityInput.length >= 1 && setShowCityDrop(true)}
                      className={iCls}
                      autoComplete="off"
                    />
                    {projectCity && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-sm">✓</span>
                    )}
                    {showCityDrop && (() => {
                      const q = cityInput.toLowerCase().trim();
                      const filtered = INDIAN_CITIES.filter(c =>
                        c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)
                      ).slice(0, 8);
                      return filtered.length > 0 ? (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#d9d9d9] rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                          {filtered.map(c => (
                            <button
                              key={c.city}
                              type="button"
                              onMouseDown={e => {
                                e.preventDefault();
                                setProjectCity(c.city);
                                setProjectState(c.state);
                                setCityInput(`${c.city}, ${c.state}`);
                                setShowCityDrop(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-[#EEF3FB] transition-colors flex items-center justify-between"
                            >
                              <span className="text-sm font-medium text-[#1d2226]">{c.city}</span>
                              <span className="text-xs text-[#999]">{c.state}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#d9d9d9] rounded-xl shadow-xl p-3 text-sm text-[#999]">
                          No matching city — try a different spelling
                        </div>
                      );
                    })()}
                  </div>
                </Field>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#1d2226] mb-3">What kind of project is this?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
                  {PROJECT_PURPOSE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setProjectPurpose(opt.id);
                        if (!showsSalaryForPurpose(opt.id)) {
                          setCreateSalaryMin('');
                          setCreateSalaryMax('');
                        }
                        setError('');
                      }}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        projectPurpose === opt.id
                          ? 'border-[#0A66C2] bg-[#EEF3FB]'
                          : 'border-[#d9d9d9] bg-white hover:border-[#0A66C2]/50'
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <p className={`font-semibold text-sm mt-2 ${projectPurpose === opt.id ? 'text-[#0A66C2]' : 'text-[#1d2226]'}`}>
                        {opt.title}
                      </p>
                      <p className="text-[10px] text-[#666] mt-1">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#1d2226] mb-3">Category</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {WIZARD_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { wizard.selectCategory(cat.id); setError(''); }}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${
                        state.category === cat.id
                          ? 'border-[#0A66C2] bg-[#EEF3FB]'
                          : 'border-[#d9d9d9] bg-white hover:border-[#0A66C2]/50 hover:bg-[#f8f9fa]'
                      }`}
                    >
                      <p className={`font-semibold text-xs ${state.category === cat.id ? 'text-[#0A66C2]' : 'text-[#1d2226]'}`}>
                        {cat.title}
                      </p>
                      <p className="text-[10px] text-[#999] mt-0.5 line-clamp-1">{cat.blurb}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              CREATE — STEP 2: Skills & Timeline
          ═══════════════════════════════════════════════ */}
          {!isJoin && !joinSuccess && state.entry !== '' && state.step === 2 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-widest mb-1">Step 2 of 3</p>
                <h2 className="text-2xl font-bold text-[#1d2226]">{copy?.title}</h2>
                <p className="text-[#666] text-sm mt-1">
                  Skills for <strong>{CategoryTitle(state.category)}</strong>
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {wizard.getAvailableSkills().map(skill => (
                  <SkillChip
                    key={skill}
                    skill={skill}
                    selected={state.skills.includes(skill)}
                    onToggle={() => { wizard.toggleSkill(skill); setError(''); }}
                  />
                ))}
              </div>

              {state.skills.length > 0 && (
                <div className="p-3 bg-[#EEF3FB] border border-[#0A66C2]/20 rounded-xl text-xs text-[#0A66C2] font-medium">
                  {state.skills.length} skill{state.skills.length !== 1 ? 's' : ''} selected: {state.skills.join(', ')}
                </div>
              )}

              <div className="bg-white border border-[#d9d9d9] rounded-2xl p-5 space-y-4">
                <Field label="Project deadline" optional>
                  <input
                    type="date"
                    value={deadline}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setDeadline(e.target.value)}
                    className={iCls}
                  />
                </Field>

                {showsSalaryForPurpose(projectPurpose) ? (
                  <div className="border-t border-[#f0f0f0] pt-4">
                    <p className="text-sm font-semibold text-[#1d2226] mb-3">
                      Monthly salary / stipend
                      <span className="ml-2 text-xs font-normal text-[#999]">(employment &amp; internships)</span>
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-[#666] mb-1 block">Currency</label>
                        <select
                          value={createCurrency}
                          onChange={e => setCreateCurrency(e.target.value)}
                          className={iCls}
                        >
                          {['INR', 'USD', 'EUR', 'GBP'].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-[#666] mb-1 block">Min</label>
                        <input
                          type="number"
                          min={0}
                          value={createSalaryMin}
                          onChange={e => setCreateSalaryMin(e.target.value)}
                          placeholder="e.g. 5000"
                          className={iCls}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#666] mb-1 block">Max</label>
                        <input
                          type="number"
                          min={0}
                          value={createSalaryMax}
                          onChange={e => setCreateSalaryMax(e.target.value)}
                          placeholder="e.g. 15000"
                          className={iCls}
                        />
                      </div>
                    </div>
                    {(createSalaryMin || createSalaryMax) && (
                      <p className="mt-2 text-xs text-[#0A66C2] font-medium">
                        Offering: {createCurrency} {createSalaryMin ? Number(createSalaryMin).toLocaleString('en-IN') : '–'} – {createSalaryMax ? Number(createSalaryMax).toLocaleString('en-IN') : '–'} / month
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="border-t border-[#f0f0f0] pt-4 text-sm text-[#666] bg-[#f8f9fa] rounded-xl px-4 py-3">
                    No salary for this project type — teammates join for learning, portfolio, or passion.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              CREATE — STEP 3: Review & Publish
          ═══════════════════════════════════════════════ */}
          {!isJoin && !joinSuccess && state.entry !== '' && state.step === 3 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-widest mb-1">Step 3 of 3</p>
                <h2 className="text-2xl font-bold text-[#1d2226]">{copy?.title}</h2>
                <p className="text-[#666] text-sm mt-1">{copy?.subtitle}</p>
              </div>

              {/* Summary card */}
              <div className="bg-white border border-[#d9d9d9] rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-[#f8f9fa] border-b border-[#e0e0e0]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#666]">Project Summary</p>
                </div>
                <div className="divide-y divide-[#f0f0f0]">
                  <div className="flex justify-between items-start px-5 py-3 text-sm">
                    <span className="text-[#666] shrink-0 mr-4">Name</span>
                    <span className="font-semibold text-[#1d2226] text-right">{projectName}</span>
                  </div>
                  <div className="flex justify-between items-start px-5 py-3 text-sm">
                    <span className="text-[#666] shrink-0 mr-4">Description</span>
                    <span className="font-semibold text-[#1d2226] text-right">{projectDesc}</span>
                  </div>
                  <div className="flex justify-between items-start px-5 py-3 text-sm">
                    <span className="text-[#666] shrink-0 mr-4">Category</span>
                    <span className="font-semibold text-[#1d2226]">{CategoryTitle(state.category)}</span>
                  </div>
                  {projectCity && (
                    <div className="flex justify-between items-center px-5 py-3 text-sm">
                      <span className="text-[#666]">City</span>
                      <span className="font-semibold text-[#1d2226]">{projectCity}, {projectState}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-start px-5 py-3 text-sm">
                    <span className="text-[#666] shrink-0 mr-4">Skills needed</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {state.skills.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 bg-[#EEF3FB] text-[#0A66C2] rounded-full border border-[#0A66C2]/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  {deadline && (
                    <div className="flex justify-between items-center px-5 py-3 text-sm">
                      <span className="text-[#666]">Deadline</span>
                      <span className="font-semibold text-[#1d2226]">
                        {new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-5 py-3 text-sm">
                    <span className="text-[#666]">Project type</span>
                    <span className="font-semibold text-[#1d2226]">
                      {PROJECT_PURPOSE_OPTIONS.find((p) => p.id === projectPurpose)?.title}
                    </span>
                  </div>
                  {showsSalaryForPurpose(projectPurpose) && (createSalaryMin || createSalaryMax) ? (
                    <div className="flex justify-between items-center px-5 py-3 text-sm">
                      <span className="text-[#666]">Monthly salary</span>
                      <span className="font-semibold text-green-700">
                        {createCurrency} {createSalaryMin ? Number(createSalaryMin).toLocaleString('en-IN') : '–'} – {createSalaryMax ? Number(createSalaryMax).toLocaleString('en-IN') : '–'}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-semibold">Team size &amp; vision</p>
                <p className="mt-0.5 text-amber-700">
                  You can add team size and project vision from your dashboard after publishing.
                </p>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              JOIN — STEP 1: What can you bring?
          ═══════════════════════════════════════════════ */}
          {isJoin && !joinSuccess && state.step === 1 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-widest mb-1">Step 1 of 3</p>
                <h2 className="text-2xl font-bold text-[#1d2226]">{copy?.title}</h2>
                <p className="text-[#666] text-sm mt-1">{copy?.subtitle}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#1d2226] mb-2">
                  Your skills
                  <span className="ml-2 text-xs font-normal text-[#999]">({state.skills.length} selected)</span>
                </p>
                <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto">
                  {wizard.getAllSkills().map(skill => (
                    <SkillChip
                      key={skill}
                      skill={skill}
                      selected={state.skills.includes(skill)}
                      onToggle={() => { wizard.toggleSkill(skill); setError(''); }}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-white border border-[#d9d9d9] rounded-2xl p-5 space-y-4">
                <Field label="Your role / title" optional>
                  <input
                    type="text"
                    value={joinRole}
                    onChange={e => setJoinRole(e.target.value)}
                    placeholder="e.g. Frontend Developer, UI Designer, Video Editor"
                    className={iCls}
                  />
                </Field>

                <p className="text-xs text-[#666] bg-[#f8f9fa] rounded-xl px-4 py-3">
                  Salary is only shared when you apply to paid employment/internship roles (step 2).
                </p>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              JOIN — STEP 2: Pick a project
          ═══════════════════════════════════════════════ */}
          {isJoin && !joinSuccess && state.step === 2 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-widest mb-1">Step 2 of 3</p>
                <h2 className="text-2xl font-bold text-[#1d2226]">{copy?.title}</h2>
                <p className="text-[#666] text-sm mt-1">
                  {browseLoading ? 'Loading projects…' : `${browseProjects.length} projects open for applications`}
                </p>
              </div>

              {browseLoading ? (
                <div className="grid gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white border border-[#e0e0e0] rounded-xl p-4 animate-pulse">
                      <div className="h-3 w-24 bg-[#f0f0f0] rounded mb-2" />
                      <div className="h-5 w-1/2 bg-[#e8e8e8] rounded mb-2" />
                      <div className="h-4 w-full bg-[#f3f3f3] rounded" />
                    </div>
                  ))}
                </div>
              ) : browseProjects.length === 0 ? (
                <div className="bg-white border border-dashed border-[#d9d9d9] rounded-xl p-10 text-center">
                  <p className="text-3xl mb-2">·</p>
                  <p className="font-semibold text-[#1d2226]">No open projects right now</p>
                  <p className="text-sm text-[#666] mt-1">Check back soon, or create your own project.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {browseProjects.map(project => {
                    const matchCount = getSkillMatchCount(state.skills, project.roles || []);
                    const isSelected = selectedProject?.id === project.id;

                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => { setSelectedProject(project); setError(''); }}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-[#0A66C2] bg-[#EEF3FB]'
                            : 'border-[#d9d9d9] bg-white hover:border-[#0A66C2]/50 hover:bg-[#f8f9fa]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wide text-[#0A66C2] bg-[#EEF3FB] px-2 py-0.5 rounded-full border border-[#0A66C2]/20">
                                {CategoryTitle(project.categoryId || '')}
                              </span>
                              {matchCount > 0 && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  matchCount >= 3
                                    ? 'text-green-700 bg-green-50 border-green-200'
                                    : matchCount >= 1
                                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                                    : 'text-[#666] bg-[#f3f2ef] border-[#d9d9d9]'
                                }`}>
                                  {matchCount} skill{matchCount !== 1 ? 's' : ''} match
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-[#1d2226]">{project.name}</p>
                            {project.desc && (
                              <p className="text-xs text-[#666] mt-0.5 line-clamp-2">{project.desc}</p>
                            )}
                            {(project.roles || []).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {(project.roles || []).slice(0, 4).map(r => (
                                  <span
                                    key={r}
                                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                                      state.skills.some(s => s.toLowerCase() === r.toLowerCase())
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : 'bg-[#f3f2ef] text-[#666] border-[#e0e0e0]'
                                    }`}
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="text-right shrink-0 space-y-1">
                            {showsSalaryForPurpose(
                              (project as { projectPurpose?: ProjectPurpose }).projectPurpose
                            ) &&
                              project.salaryMax &&
                              project.salaryMax > 0 && (
                              <p className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                {project.currency || 'INR'} {Number(project.salaryMax).toLocaleString('en-IN')}/mo
                              </p>
                            )}
                            {(project.joinedCount ?? 0) > 0 && (
                              <p className="text-[10px] text-[#999]">{project.joinedCount} joined</p>
                            )}
                            {isSelected && (
                              <span className="text-[10px] font-bold text-[#0A66C2]">Selected ✓</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              JOIN — STEP 3: Send your intro
          ═══════════════════════════════════════════════ */}
          {isJoin && !joinSuccess && state.step === 3 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-widest mb-1">Step 3 of 3</p>
                <h2 className="text-2xl font-bold text-[#1d2226]">{copy?.title}</h2>
                <p className="text-[#666] text-sm mt-1">
                  Introducing yourself to <strong>{selectedProject?.name}</strong>
                </p>
              </div>

              {/* Project mini-card */}
              {selectedProject && (
                <div className="bg-white border border-[#e0e0e0] rounded-xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EEF3FB] flex items-center justify-center text-[#0A66C2] text-lg font-bold shrink-0">
                    {selectedProject.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1d2226] text-sm">{selectedProject.name}</p>
                    <p className="text-xs text-[#666]">{CategoryTitle(selectedProject.categoryId || '')}</p>
                  </div>
                </div>
              )}

              {selectedProject &&
                (showsSalaryForPurpose(
                  (selectedProject as { projectPurpose?: ProjectPurpose }).projectPurpose
                ) ||
                  (selectedProject.salaryMax || 0) > 0) && (
                <div className="bg-white border border-[#d9d9d9] rounded-2xl p-5 space-y-3">
                  <p className="text-sm font-semibold text-[#1d2226]">
                    Expected monthly salary
                    <span className="ml-2 text-xs font-normal text-[#999]">(paid role)</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-[#666] mb-1 block">Currency</label>
                      <select
                        value={joinSalaryCurrency}
                        onChange={e => setJoinSalaryCurrency(e.target.value)}
                        className={iCls}
                      >
                        {['INR', 'USD', 'EUR', 'GBP'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-[#666] mb-1 block">Amount / month</label>
                      <input
                        type="number"
                        min={0}
                        value={joinExpectedSalary}
                        onChange={e => setJoinExpectedSalary(e.target.value)}
                        placeholder="e.g. 10000"
                        className={iCls}
                      />
                    </div>
                  </div>
                </div>
              )}

              <Field label="Your intro message">
                <textarea
                  rows={5}
                  value={introMessage}
                  onChange={e => { setIntroMessage(e.target.value); setSendError(''); }}
                  className={iCls + ' resize-none'}
                  placeholder="Write a short intro…"
                />
                <p className="text-[10px] text-[#999] mt-1">You can edit this message. The team will receive it when you click Send.</p>
              </Field>

              {sendError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {sendError}
                </div>
              )}
            </div>
          )}

          {/* ── Shared error ── */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      {!joinSuccess && (
        <div className="bg-white border-t border-[#d9d9d9] px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0">
          {/* Back */}
          <div>
            {state.entry !== '' && (
              <button
                onClick={() => wizard.prev()}
                className="px-5 py-2 border border-[#0A66C2] text-[#0A66C2] font-semibold rounded-full hover:bg-[#EEF3FB] transition-all text-sm"
              >
                ← Back
              </button>
            )}
          </div>

          {/* Step counter + next/action */}
          <div className="flex items-center gap-3">
            {state.entry !== '' && (
              <span className="text-xs text-[#999]">{state.step} / 3</span>
            )}

            {/* Mode picker: no Next button — tile click selects + auto-advances */}
            {state.entry === '' && null}

            {/* Steps 1 & 2: Next */}
            {state.entry !== '' && state.step < 3 && (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-[#0A66C2] text-white font-semibold rounded-full hover:bg-[#004182] transition-all text-sm"
              >
                Next →
              </button>
            )}

            {/* Create step 3: Publish */}
            {!isJoin && state.step === 3 && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="px-6 py-2 bg-[#0A66C2] text-white font-semibold rounded-full hover:bg-[#004182] disabled:opacity-50 transition-all text-sm"
              >
                {publishing ? 'Publishing…' : 'Publish Project'}
              </button>
            )}

            {/* Join step 3: Send */}
            {isJoin && state.step === 3 && (
              <button
                onClick={handleSendIntro}
                disabled={sending || !introMessage.trim()}
                className="px-6 py-2 bg-[#0A66C2] text-white font-semibold rounded-full hover:bg-[#004182] disabled:opacity-50 transition-all text-sm"
              >
                {sending ? 'Sending…' : 'Send Intro →'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
