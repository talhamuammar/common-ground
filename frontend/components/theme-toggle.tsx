'use client';

import { useTheme } from './theme-provider';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`relative inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-[#151515] dark:text-slate-300 dark:hover:bg-[#1f1f1f] dark:hover:text-white ${className}`}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          <Sun className="size-4 text-amber-400 transition-transform hover:rotate-45" strokeWidth={2} />
        ) : (
          <Moon className="size-4 text-slate-700 transition-transform hover:-rotate-12" strokeWidth={2} />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`group relative flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs backdrop-blur-xs transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-[#151515]/90 dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-[#1f1f1f] ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative flex size-4 items-center justify-center">
        {isDark ? (
          <Sun className="size-3.5 text-amber-400 transition-transform duration-200 group-hover:rotate-45" strokeWidth={2.2} />
        ) : (
          <Moon className="size-3.5 text-slate-600 transition-transform duration-200 group-hover:-rotate-12" strokeWidth={2.2} />
        )}
      </div>
      <span className="text-[11px] font-semibold tracking-wide">
        {isDark ? 'Light' : 'Dark'}
      </span>
    </button>
  );
}
