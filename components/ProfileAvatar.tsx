'use client';

import { getInitials } from '@/lib/utils';

interface ProfileAvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-28 h-28 text-2xl',
};

export function ProfileAvatar({ name, imageUrl, size = 'md', className = '' }: ProfileAvatarProps) {
  const sz = SIZES[size];
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={`${sz} rounded-full object-cover border-2 border-white shadow-sm ${className}`}
      />
    );
  }
  return (
    <span
      className={`${sz} rounded-full bg-[#0A66C2] text-white font-bold flex items-center justify-center shrink-0 ${className}`}
    >
      {getInitials(name)}
    </span>
  );
}
