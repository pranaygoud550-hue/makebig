'use client';

import { useEffect } from 'react';

const TAB_TITLES: Record<string, string> = {
  home: 'Home',
  explore: 'Explore Projects',
  posts: 'Posts',
  ai: 'AI Coder',
  notifications: 'Notifications',
  friends: 'Friends',
  project: 'Your Project',
};

export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title.includes('|') ? title : `${title} | Make Big`;
    return () => {
      document.title = prev;
    };
  }, [title]);
}

export function useTabPageTitle(activeTab: string) {
  usePageTitle(TAB_TITLES[activeTab] || 'Home');
}
