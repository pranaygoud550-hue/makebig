'use client';

import type { RefObject } from 'react';

interface TestProctorShellProps {
  skillName: string;
  ready: boolean;
  consentGiven: boolean;
  webcamActive: boolean;
  fullscreenActive: boolean;
  violationCount: number;
  integrityHint: number;
  warning: string;
  videoRef: RefObject<HTMLVideoElement>;
  onSetup: () => void;
  settingUp: boolean;
  children: React.ReactNode;
}

export function TestProctorShell({
  skillName,
  ready,
  consentGiven,
  webcamActive,
  fullscreenActive,
  violationCount,
  integrityHint,
  warning,
  videoRef,
  onSetup,
  settingUp,
  children,
}: TestProctorShellProps) {
  if (!ready) {
    return (
      <div className="rounded-2xl border border-[#e0e0e0] bg-[#fafcff] p-5 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-[#1d2226]">Proctored verification</h3>
          <p className="text-sm text-[#666] mt-1">
            Before starting the <strong>{skillName}</strong> test, you must enter fullscreen and
            enable your webcam. We monitor tab switches, copy/paste, and face presence to protect
            skill verification integrity. By continuing, you consent to this monitoring.
          </p>
        </div>
        <ul className="text-xs text-[#666] space-y-1 list-disc pl-4">
          <li>3 tab/window violations → auto-submit</li>
          <li>Final score = 70% test + 30% integrity</li>
          <li>Copy, paste, and right-click are disabled during the test</li>
        </ul>
        {warning && <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{warning}</p>}
        <button
          type="button"
          onClick={onSetup}
          disabled={settingUp}
          className="w-full py-2.5 bg-[#0A66C2] text-white rounded-xl font-semibold text-sm hover:bg-[#004182] disabled:opacity-50"
        >
          {settingUp ? 'Setting up…' : 'I consent — enter fullscreen & start test'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 select-none" data-proctor-active>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e8f4fc] bg-[#fafcff] px-3 py-2 text-xs">
        <span className={`font-semibold ${fullscreenActive ? 'text-green-700' : 'text-red-600'}`}>
          {fullscreenActive ? '● Fullscreen' : '○ Not fullscreen'}
        </span>
        <span className={`font-semibold ${webcamActive ? 'text-green-700' : 'text-amber-700'}`}>
          {webcamActive ? '● Webcam' : '○ Webcam off'}
        </span>
        <span className="text-[#666]">Integrity ~{integrityHint}%</span>
        {violationCount > 0 && (
          <span className="text-red-600 font-semibold">Violations: {violationCount}/3</span>
        )}
      </div>

      {webcamActive && consentGiven && (
        <div className="flex justify-end">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-24 h-18 rounded-lg border border-[#d9d9d9] object-cover mirror"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>
      )}

      {warning && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠️ {warning}
        </p>
      )}

      {children}
    </div>
  );
}
