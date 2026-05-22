'use client';

import { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BaseInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement>, BaseInputProps {
  as?: 'input';
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement>, BaseInputProps {
  as: 'select';
  children?: ReactNode;
}

type InputProps = TextInputProps | SelectInputProps;

const fieldCls =
  'w-full px-4 py-2.5 bg-white border border-[#d9d9d9] rounded-lg text-[#1d2226] placeholder-[#aaa] focus:outline-none focus:border-[#0A66C2] focus:ring-2 focus:ring-[#0A66C2]/20 transition-all text-sm';

export function Input(props: InputProps) {
  const { label, error, helperText, className, ...rest } = props;
  const isSelect = 'as' in props && props.as === 'select';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-[#1d2226] mb-1.5">
          {label}
        </label>
      )}
      {isSelect ? (
        <select
          className={cn(fieldCls, error && 'border-red-400', className)}
          {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {(rest as any).children}
        </select>
      ) : (
        <input
          className={cn(fieldCls, error && 'border-red-400', className)}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {helperText && !error && <p className="text-[#666] text-xs mt-1">{helperText}</p>}
    </div>
  );
}
