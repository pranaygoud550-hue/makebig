'use client';

import { useEffect } from 'react';

/** Push history when a panel opens; browser back closes it instead of leaving the page. */
export function useSheetHistory(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ panel: true }, '');

    const onPopState = () => {
      onClose();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isOpen, onClose]);
}
