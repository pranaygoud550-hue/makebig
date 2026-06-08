'use client';

import { useId, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface SpotlightOverlayProps {
  targetSelector: string;
  visible: boolean;
  onBackdropClick?: () => void;
  children: React.ReactNode;
}

export function SpotlightOverlay({
  targetSelector,
  visible,
  onBackdropClick,
  children,
}: SpotlightOverlayProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const maskId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!visible) return;

    const update = () => {
      const el = document.querySelector(targetSelector);
      if (el) setRect(el.getBoundingClientRect());
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const interval = window.setInterval(update, 300);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      window.clearInterval(interval);
    };
  }, [targetSelector, visible]);

  if (!visible || !mounted) return null;

  const pad = 12;
  const spotlight = rect
    ? {
        x: Math.max(rect.left - pad, 8),
        y: Math.max(rect.top - pad, 8),
        w: rect.width + pad * 2,
        h: rect.height + pad * 2,
      }
    : null;

  const cardStyle: React.CSSProperties = spotlight
    ? {
        position: 'fixed',
        left: Math.min(spotlight.x, window.innerWidth - 340),
        top: Math.min(spotlight.y + spotlight.h + 16, window.innerHeight - 280),
        zIndex: 10001,
        maxWidth: 320,
      }
    : {
        position: 'fixed',
        left: '50%',
        top: '55%',
        transform: 'translateX(-50%)',
        zIndex: 10001,
        maxWidth: 320,
      };

  return createPortal(
    <div className="fixed inset-0 z-[10000]" role="dialog" aria-modal="true">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            {spotlight && (
              <rect
                x={spotlight.x}
                y={spotlight.y}
                width={spotlight.w}
                height={spotlight.h}
                rx={16}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.75)"
          mask={`url(#${maskId})`}
          className="backdrop-blur-sm"
        />
      </svg>

      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close tour backdrop"
        onClick={onBackdropClick}
      />

      {spotlight && (
        <div
          className="pointer-events-none fixed rounded-2xl ring-2 ring-indigo-400/80 shadow-[0_0_40px_rgba(99,102,241,0.4)]"
          style={{
            left: spotlight.x,
            top: spotlight.y,
            width: spotlight.w,
            height: spotlight.h,
          }}
        />
      )}

      <div style={cardStyle} className="pointer-events-auto">
        {children}
      </div>
    </div>,
    document.body
  );
}
