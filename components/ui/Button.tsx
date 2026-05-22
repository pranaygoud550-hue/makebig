'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  isLoading = false,
  fullWidth = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const base = 'font-semibold transition-all duration-200 rounded-full disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:   'bg-[#0A66C2] text-white hover:bg-[#004182] shadow-sm',
    secondary: 'bg-[#f3f2ef] text-[#1d2226] hover:bg-[#e8e8e8] border border-[#d9d9d9]',
    ghost:     'text-[#666] hover:text-[#1d2226] hover:bg-[#f3f2ef]',
    outline:   'border border-[#0A66C2] text-[#0A66C2] hover:bg-[#EEF3FB]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {isLoading ? 'Loading…' : children}
    </button>
  );
}
