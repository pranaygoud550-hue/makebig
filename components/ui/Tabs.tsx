'use client';

import { cn } from '@/lib/utils';

interface TabsProps {
  tabs: Array<{
    id: string;
    label: string;
  }>;
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-2 border-b border-slate-700', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'px-4 py-2 border-b-2 transition-colors duration-200 font-medium text-sm',
            activeTab === tab.id
              ? 'border-sky-400 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
