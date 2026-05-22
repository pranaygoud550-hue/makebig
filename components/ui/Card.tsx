'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hoverable = false, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'bg-slate-800/50 border border-slate-700/50 rounded-xl p-6',
        'backdrop-blur-sm transition-all duration-200',
        hoverable && 'hover:border-sky-400/50 hover:shadow-lg hover:shadow-sky-400/10',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
