/** Inline script to prevent flash of wrong theme — safe for server layout (no 'use client'). */
export function themeInitScript() {
  return `(function(){try{var t=localStorage.getItem('makebig_theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
}
