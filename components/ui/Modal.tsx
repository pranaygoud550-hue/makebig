'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeButton?: boolean;
}

const sizeClasses = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-full w-11/12 h-5/6',
};

export function Modal({ isOpen, onClose, title, subtitle, children, size = 'md', closeButton = true }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        className={cn(
          'relative bg-white border border-[#d9d9d9] rounded-2xl shadow-2xl',
          'animate-slideUp max-h-[92vh] overflow-y-auto',
          sizeClasses[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {closeButton && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 z-10 w-8 h-8 flex items-center justify-center text-[#666] hover:text-[#1d2226] text-xl transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        )}

        {(title || subtitle) && (
          <div className="px-8 pt-8 pb-4 border-b border-[#e0e0e0]">
            {title && <h2 className="text-2xl font-bold text-[#1d2226] text-center">{title}</h2>}
            {subtitle && <p className="text-[#666] text-center text-sm mt-1">{subtitle}</p>}
          </div>
        )}

        <div className="px-8 py-6">{children}</div>
      </div>
    </div>
  );
}
