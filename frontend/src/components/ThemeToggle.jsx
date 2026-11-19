import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

/**
 * Modern theme toggle button for dashboard sidebars.
 * Features an accessible switch with sun/moon icons and smooth transitions.
 */
const ThemeToggle = ({ compact = false, className = '' }) => {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <div className={`theme-toggle-container ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        onClick={toggleTheme}
        className="w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 border border-slate-300/40 dark:border-white/10 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:hover:bg-slate-800/90 text-slate-700 dark:text-slate-200 shadow-xs"
      >
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg transition-transform duration-300 group-hover:scale-110 ${
            isDark ? 'bg-amber-400/10 text-amber-300' : 'bg-cyan-500/15 text-cyan-600'
          }`}>
            {isDark ? <Moon size={14} className="stroke-[2.2]" /> : <Sun size={14} className="stroke-[2.2]" />}
          </div>
          <span className="tracking-wide">
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>

        {/* Animated toggle pill track */}
        <div
          className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 flex items-center ${
            isDark ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center ${
              isDark ? 'translate-x-4' : 'translate-x-0'
            }`}
          >
            {isDark ? (
              <Moon size={9} className="text-slate-900 stroke-[2.5]" />
            ) : (
              <Sun size={9} className="text-amber-500 stroke-[2.5]" />
            )}
          </div>
        </div>
      </button>
    </div>
  );
};

export default ThemeToggle;
