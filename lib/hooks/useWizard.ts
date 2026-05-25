'use client';

import { useState, useCallback } from 'react';
import { WizardState } from '@/lib/types';
import { WIZARD_SKILLS_MAP } from '@/lib/constants';

interface UseWizardReturn {
  state: WizardState;
  selectEntry: (mode: 'create' | 'join') => void;
  selectCategory: (id: string) => void;
  toggleSkill: (skill: string) => void;
  next: () => boolean;
  prev: () => void;
  reset: () => void;
  getAvailableSkills: () => string[];
  getAllSkills: () => string[];
  getWizardCopy: () => { title: string; subtitle: string } | null;
  validateStep: () => string | null;
}

const CREATE_COPY = [
  { title: 'What are you building?',    subtitle: 'Give your project a name, a one-line pitch, and a category.' },
  { title: 'What skills do you need?',  subtitle: 'Pick the roles you want teammates to fill, and set an optional deadline.' },
  { title: 'Review & Publish',          subtitle: "You're one tap away from going live." },
];

const JOIN_COPY = [
  { title: 'What can you bring?',  subtitle: 'Select your skills so we can match you with the right projects.' },
  { title: 'Explore & join', subtitle: 'Tap Join now — you are added instantly, no owner approval needed.' },
];

export function useWizard(): UseWizardReturn {
  const [state, setState] = useState<WizardState>({
    step: 1,
    entry: '',
    category: '',
    skills: [],
    quoteIndex: 0,
  });

  const getAvailableSkills = useCallback(() => {
    return WIZARD_SKILLS_MAP[state.category] || [];
  }, [state.category]);

  // All skills across all categories, deduplicated, for the Join skill picker
  const getAllSkills = useCallback((): string[] => {
    const all = Object.values(WIZARD_SKILLS_MAP).flat();
    return Array.from(new Set(all)).sort();
  }, []);

  const getWizardCopy = useCallback(() => {
    const copies = state.entry === 'join' ? JOIN_COPY : CREATE_COPY;
    return copies[state.step - 1] ?? null;
  }, [state.step, state.entry]);

  const selectEntry = useCallback((mode: 'create' | 'join') => {
    setState(prev => ({ ...prev, entry: mode, step: 1, category: '', skills: [] }));
  }, []);

  const selectCategory = useCallback((id: string) => {
    setState(prev => ({ ...prev, category: id, skills: [] }));
  }, []);

  const toggleSkill = useCallback((skill: string) => {
    setState(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
  }, []);

  // Validation only covers what the hook owns; component validates form fields
  const validateStep = useCallback((): string | null => {
    if (state.entry === 'create' && state.step === 1 && !state.category) {
      return 'Please select a category.';
    }
    if (state.entry === 'join' && state.step === 1 && state.skills.length === 0) {
      return 'Select at least one skill.';
    }
    return null;
  }, [state.step, state.entry, state.category, state.skills]);

  const next = useCallback((): boolean => {
    if (state.step < 3) {
      setState(prev => ({ ...prev, step: prev.step + 1 }));
      return true;
    }
    return false;
  }, [state.step]);

  const prev = useCallback(() => {
    if (state.step > 1) {
      setState(prev => ({ ...prev, step: prev.step - 1 }));
    } else {
      // Back from step 1 = back to mode picker
      setState(prev => ({ ...prev, entry: '', step: 1 }));
    }
  }, [state.step]);

  const reset = useCallback(() => {
    setState({ step: 1, entry: '', category: '', skills: [], quoteIndex: 0 });
  }, []);

  return {
    state,
    selectEntry,
    selectCategory,
    toggleSkill,
    next,
    prev,
    reset,
    getAvailableSkills,
    getAllSkills,
    getWizardCopy,
    validateStep,
  };
}
