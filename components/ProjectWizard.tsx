'use client';

import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Card } from '@/components/ui/Card';
import { WIZARD_CATEGORIES, WIZARD_COPY } from '@/lib/constants';
import { useWizard } from '@/lib/hooks/useWizard';

interface ProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: any) => void;
}

export function ProjectWizard({ isOpen, onClose, onComplete }: ProjectWizardProps) {
  const wizard = useWizard();
  const { state } = wizard;

  if (!isOpen) return null;

  const copy = WIZARD_COPY[state.step - 1] || WIZARD_COPY[0];
  const isJoin = state.entry === 'join';
  const maxSteps = isJoin ? 6 : 7;

  const handleNext = () => {
    if (wizard.next()) {
      // State updated
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-sky-400/20 rounded-3xl shadow-2xl max-w-2xl w-11/12 max-h-[85vh] flex flex-col overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 text-2xl text-slate-400 hover:text-sky-400 transition-colors"
        >
          ✕
        </button>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Header */}
          <div>
            <p className="text-xs uppercase tracking-widest text-sky-400 font-bold">
              Make Big Creation Flow
            </p>
            <h2 className="text-3xl font-bold text-slate-50 mt-2">{copy.title}</h2>
            <p className="text-slate-400 mt-1">{copy.subtitle}</p>
          </div>

          {/* Progress Bar */}
          <ProgressBar current={state.step} total={maxSteps} />

          {/* Step 1: Choose Entry */}
          {state.step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                hoverable
                onClick={() => wizard.selectEntry('create')}
                className={state.entry === 'create' ? 'border-sky-400' : ''}
              >
                <h3 className="text-xl font-bold text-sky-400">Create Project</h3>
                <p className="text-slate-400 text-sm mt-2">
                  Start your own project and build your dream team.
                </p>
              </Card>
              <Card
                hoverable
                onClick={() => wizard.selectEntry('join')}
                className={state.entry === 'join' ? 'border-sky-400' : ''}
              >
                <h3 className="text-xl font-bold text-sky-400">Join Project</h3>
                <p className="text-slate-400 text-sm mt-2">
                  Find projects that need your skills and collaborate.
                </p>
              </Card>
            </div>
          )}

          {/* Step 2: Select Category */}
          {state.step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {WIZARD_CATEGORIES.map((cat) => (
                <Card
                  key={cat.id}
                  hoverable
                  onClick={() => wizard.selectCategory(cat.id)}
                  className={state.category === cat.id ? 'border-sky-400' : ''}
                >
                  <h4 className="font-semibold text-slate-50">{cat.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{cat.blurb}</p>
                </Card>
              ))}
            </div>
          )}

          {/* Step 3: Select Skills */}
          {state.step === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {wizard.getAvailableSkills().map((skill) => (
                <label
                  key={skill}
                  className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-sky-400 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={state.skills.includes(skill)}
                    onChange={() => wizard.toggleSkill(skill)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-300">{skill}</span>
                </label>
              ))}
            </div>
          )}

          {/* Step 4+: Project Details, Vision, Budget */}
          {state.step >= 4 && (
            <div className="space-y-4">
              {state.step === 4 && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Project Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter project name"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-50 placeholder-slate-400 focus:outline-none focus:border-sky-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      placeholder="Describe your project"
                      rows={3}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-50 placeholder-slate-400 focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-6 flex justify-between gap-4 bg-slate-950">
          {state.step > 1 && (
            <Button variant="outline" onClick={() => wizard.prev()}>
              ← Back
            </Button>
          )}
          <div className="flex-1" />
          {state.step < maxSteps && (
            <Button onClick={handleNext}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
