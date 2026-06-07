'use client';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#e5e7eb] dark:bg-gray-700 ${className}`}
      aria-hidden
    />
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e0e0e0] dark:border-gray-700 p-5 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-12 w-full" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-9 w-full rounded-full mt-2" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e0e0e0] dark:border-gray-700 p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[false, true, false].map((own, i) => (
        <div key={i} className={`flex gap-3 ${own ? 'flex-row-reverse' : ''}`}>
          {!own && <Skeleton className="w-8 h-8 rounded-full shrink-0" />}
          <Skeleton className={`h-12 ${own ? 'w-48' : 'w-56'} rounded-2xl`} />
        </div>
      ))}
    </div>
  );
}
