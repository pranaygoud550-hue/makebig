'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ExamFullscreenPortalProps {
  active: boolean;
  children: React.ReactNode;
}

/** Renders proctored exam above all modals — true fullscreen exam surface. */
export function ExamFullscreenPortal({ active, children }: ExamFullscreenPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  if (!active || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex flex-col bg-[#0d1117] text-[#e6edf3] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Skill verification exam"
    >
      {children}
    </div>,
    document.body
  );
}
