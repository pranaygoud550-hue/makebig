'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AUTO_SUBMIT_VIOLATION_COUNT } from '@/lib/skillVerification/integrity';

export interface ProctorState {
  ready: boolean;
  sessionId: string | null;
  violationCount: number;
  integrityHint: number;
  webcamActive: boolean;
  fullscreenActive: boolean;
  consentGiven: boolean;
  warning: string;
  autoSubmitTriggered: boolean;
}

interface UseTestProctoringOptions {
  skillId: string;
  contact?: string;
  enabled: boolean;
  onAutoSubmit: () => void;
}

async function logViolation(sessionId: string, type: string, message: string) {
  const res = await fetch(`/api/skills/sessions/${sessionId}/violations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, message }),
  });
  const data = await res.json();
  return data.success ? data.data : null;
}

async function logProctoring(
  sessionId: string,
  type: string,
  metadata?: Record<string, unknown>
) {
  await fetch(`/api/skills/sessions/${sessionId}/proctoring`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, metadata }),
  });
}

function sampleFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): { brightness: number; motion: number; regions: number } {
  const ctx = canvas.getContext('2d');
  if (!ctx || video.videoWidth === 0) return { brightness: 0, motion: 0, regions: 0 };

  canvas.width = 160;
  canvas.height = 120;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0;
  let skinRegions = 0;
  let prevBright = 0;
  let motionSum = 0;

  for (let i = 0; i < img.data.length; i += 16) {
    const r = img.data[i];
    const g = img.data[i + 1];
    const b = img.data[i + 2];
    const bright = (r + g + b) / 3;
    sum += bright;
    if (r > 60 && g > 40 && b > 20 && r > g && r > b) skinRegions += 1;
    motionSum += Math.abs(bright - prevBright);
    prevBright = bright;
  }

  const samples = img.data.length / 16;
  return {
    brightness: sum / samples,
    motion: motionSum / samples,
    regions: skinRegions > 8 ? Math.min(3, Math.floor(skinRegions / 40)) : skinRegions > 2 ? 1 : 0,
  };
}

export function useTestProctoring({
  skillId,
  contact,
  enabled,
  onAutoSubmit,
}: UseTestProctoringOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevSampleRef = useRef<{ brightness: number; motion: number } | null>(null);
  const motionStreakRef = useRef(0);
  const noFaceStreakRef = useRef(0);
  const autoSubmittedRef = useRef(false);

  const [state, setState] = useState<ProctorState>({
    ready: false,
    sessionId: null,
    violationCount: 0,
    integrityHint: 100,
    webcamActive: false,
    fullscreenActive: false,
    consentGiven: false,
    warning: '',
    autoSubmitTriggered: false,
  });

  const startSession = useCallback(
    async (webcamConsent: boolean) => {
      const res = await fetch('/api/skills/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, contact: contact || '', webcamConsent }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not start session');
      setState((s) => ({
        ...s,
        sessionId: data.data.sessionId,
        consentGiven: webcamConsent,
        ready: false,
      }));
      return data.data.sessionId as string;
    },
    [skillId, contact]
  );

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setState((s) => ({ ...s, fullscreenActive: true }));
      return true;
    } catch {
      setState((s) => ({ ...s, warning: 'Fullscreen is required for this test.' }));
      return false;
    }
  }, []);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState((s) => ({ ...s, webcamActive: true }));
      return true;
    } catch {
      setState((s) => ({
        ...s,
        warning: 'Webcam access declined — integrity score may be reduced.',
        webcamActive: false,
      }));
      return false;
    }
  }, []);

  const setupProctor = useCallback(async () => {
    setState((s) => ({ ...s, warning: '' }));
    await startSession(true);
    await enterFullscreen();
    await startWebcam();
    setState((s) => ({ ...s, ready: true }));
  }, [startSession, enterFullscreen, startWebcam]);

  const handleViolation = useCallback(
    async (type: string, message: string) => {
      const sessionId = state.sessionId;
      if (!sessionId || !enabled) return;

      const result = await logViolation(sessionId, type, message);
      const count = result?.violationCount ?? state.violationCount + 1;
      const penalty = type === 'fullscreen_exit' ? 8 : 5;

      setState((s) => ({
        ...s,
        violationCount: count,
        integrityHint: Math.max(0, s.integrityHint - penalty),
        warning:
          count === 1
            ? 'Warning: Leave the test window again and your test may auto-submit.'
            : count === 2
              ? 'Final warning: One more violation will auto-submit your test.'
              : s.warning,
      }));

      if (result?.autoSubmit && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        setState((s) => ({ ...s, autoSubmitTriggered: true }));
        onAutoSubmit();
      }
    },
    [state.sessionId, state.violationCount, enabled, onAutoSubmit]
  );

  useEffect(() => {
    if (!enabled || !state.ready || !state.sessionId) return;

    const onVisibility = () => {
      if (document.hidden) {
        handleViolation('tab_switch', 'Tab hidden or switched');
        logProctoring(state.sessionId!, 'looking_away', { reason: 'document_hidden' });
      }
    };

    const onBlur = () => handleViolation('window_blur', 'Window lost focus');
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      handleViolation('copy', 'Copy blocked');
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      handleViolation('paste', 'Paste blocked');
    };
    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      handleViolation('right_click', 'Right click blocked');
    };
    const onSelect = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-proctor-allow-select]')) return;
      e.preventDefault();
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        setState((s) => ({ ...s, fullscreenActive: false }));
        handleViolation('fullscreen_exit', 'Exited fullscreen');
      } else {
        setState((s) => ({ ...s, fullscreenActive: true }));
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContext);
    document.addEventListener('selectstart', onSelect);
    document.addEventListener('fullscreenchange', onFullscreen);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('selectstart', onSelect);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, [enabled, state.ready, state.sessionId, handleViolation]);

  useEffect(() => {
    if (!enabled || !state.ready || !state.sessionId || !state.webcamActive) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const sample = sampleFrame(video, canvas);
      const sessionId = state.sessionId!;

      if (sample.brightness < 25) {
        noFaceStreakRef.current += 1;
        if (noFaceStreakRef.current >= 2) {
          logProctoring(sessionId, 'no_face', { brightness: sample.brightness });
          setState((s) => ({ ...s, integrityHint: Math.max(0, s.integrityHint - 3) }));
        }
      } else {
        noFaceStreakRef.current = 0;
        logProctoring(sessionId, 'face_present', { brightness: sample.brightness });
      }

      if (sample.regions >= 2) {
        logProctoring(sessionId, 'multiple_faces', { regions: sample.regions });
        setState((s) => ({ ...s, integrityHint: Math.max(0, s.integrityHint - 5) }));
      }

      if (prevSampleRef.current) {
        const motionDelta = Math.abs(sample.motion - prevSampleRef.current.motion);
        if (motionDelta > 18) {
          motionStreakRef.current += 1;
          if (motionStreakRef.current >= 4) {
            logProctoring(sessionId, 'excessive_head_movement', { motion: motionDelta });
            motionStreakRef.current = 0;
          }
        } else {
          motionStreakRef.current = 0;
        }
      }
      prevSampleRef.current = sample;

      if (noFaceStreakRef.current >= 5) {
        logProctoring(sessionId, 'frequent_disappearance', { streak: noFaceStreakRef.current });
        noFaceStreakRef.current = 0;
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [enabled, state.ready, state.sessionId, state.webcamActive]);

  useEffect(() => {
    return () => {
      const video = videoRef.current;
      const stream = video?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    state,
    setupProctor,
    enterFullscreen,
    AUTO_SUBMIT_VIOLATION_COUNT,
  };
}
