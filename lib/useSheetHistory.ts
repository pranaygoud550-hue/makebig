'use client';

import { useEffect, useRef } from 'react';

/** Push history when a sheet opens; browser back closes it instead of leaving the page. */
export function useSheetHistory(isOpen: boolean, onClose: () => void) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      pushedRef.current = false;
      return;
    }

    window.history.pushState({ sheet: true }, '');
    pushedRef.current = true;

    const onPopState = () => {
      pushedRef.current = false;
      onClose();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isOpen, onClose]);
}
