'use client';

import { ThemeProvider } from '@/lib/context/ThemeContext';
import { ToastProvider } from '@/lib/context/ToastContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
