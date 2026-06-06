export type ViolationType =
  | 'tab_switch'
  | 'window_blur'
  | 'minimize'
  | 'fullscreen_exit'
  | 'copy'
  | 'paste'
  | 'right_click'
  | 'selection';

export type ProctoringEventType =
  | 'face_present'
  | 'no_face'
  | 'multiple_faces'
  | 'looking_away'
  | 'frequent_disappearance'
  | 'excessive_head_movement';

export interface IntegrityInput {
  violations: Array<{ type: string }>;
  proctoringLogs: Array<{ type: string }>;
  webcamConsent: boolean;
}

export interface IntegrityResult {
  score: number;
  flags: string[];
  suspicious: boolean;
}

const VIOLATION_PENALTY: Record<string, number> = {
  tab_switch: 5,
  window_blur: 5,
  minimize: 5,
  fullscreen_exit: 8,
  copy: 10,
  paste: 10,
  right_click: 6,
  selection: 4,
};

const PROCTOR_PENALTY: Record<string, number> = {
  no_face: 3,
  multiple_faces: 20,
  looking_away: 4,
  frequent_disappearance: 15,
  excessive_head_movement: 8,
};

const PROCTOR_FLAGS: Record<string, string> = {
  no_face: 'no_face_detected',
  multiple_faces: 'multiple_faces',
  looking_away: 'looking_away',
  frequent_disappearance: 'frequent_disappearance',
  excessive_head_movement: 'excessive_movement',
};

/** Compute integrity score 0–100 from violations and proctoring logs. */
export function calculateIntegrityScore(input: IntegrityInput): IntegrityResult {
  let score = 100;
  const flags: string[] = [];

  for (const v of input.violations) {
    score -= VIOLATION_PENALTY[v.type] ?? 3;
  }

  const noFaceCount = input.proctoringLogs.filter((l) => l.type === 'no_face').length;
  for (const log of input.proctoringLogs) {
    if (log.type === 'no_face') {
      score -= PROCTOR_PENALTY.no_face;
      if (noFaceCount >= 3) flags.push(PROCTOR_FLAGS.no_face);
    } else {
      score -= PROCTOR_PENALTY[log.type] ?? 0;
      const flag = PROCTOR_FLAGS[log.type];
      if (flag) flags.push(flag);
    }
  }

  if (!input.webcamConsent) {
    score = Math.min(score, 85);
    flags.push('no_webcam_consent');
  }

  score = Math.round(Math.max(0, Math.min(100, score)));
  const uniqueFlags = [...new Set(flags)];
  const suspicious =
    uniqueFlags.length >= 2 ||
    score < 60 ||
    input.violations.length >= 3 ||
    input.proctoringLogs.some((l) => l.type === 'multiple_faces');

  return { score, flags: uniqueFlags, suspicious };
}

export const AUTO_SUBMIT_VIOLATION_COUNT = 3;
