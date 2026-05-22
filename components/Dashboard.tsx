'use client';

import { ReactNode } from 'react';

interface DashboardProps {
  children: ReactNode;
}

export function Dashboard({ children }: DashboardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-925">
      <div className="max-w-7xl mx-auto p-6">
        {children}
      </div>
    </div>
  );
}

interface DashboardSidebarProps {
  items: Array<{
    id: string;
    label: string;
    icon?: ReactNode;
  }>;
  activeItem: string;
  onItemClick: (id: string) => void;
}

export function DashboardSidebar({
  items,
  activeItem,
  onItemClick,
}: DashboardSidebarProps) {
  return (
    <aside className="w-64 bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 h-fit sticky top-24">
      <nav className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            className={`w-full text-left px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeItem === item.id
                ? 'bg-sky-400/20 text-sky-400 border border-sky-400/50'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-center gap-3">
              {item.icon && <span>{item.icon}</span>}
              {item.label}
            </div>
          </button>
        ))}
      </nav>
    </aside>
  );
}

interface DashboardMainProps {
  children: ReactNode;
}

export function DashboardMain({ children }: DashboardMainProps) {
  return (
    <main className="flex-1 ml-6">
      {children}
    </main>
  );
}
