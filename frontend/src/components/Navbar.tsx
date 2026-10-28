import React from 'react';
import { useAuth } from '../context/AuthContext';
import type { StorageStats } from '../services/api';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  stats: StorageStats | null;
  isSearching?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ searchQuery, onSearchChange, stats, isSearching = false }) => {
  const { user, logout } = useAuth();
  const [localQuery, setLocalQuery] = React.useState(searchQuery);

  React.useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (localQuery !== searchQuery) {
        onSearchChange(localQuery);
      }
    }, 220);
    return () => clearTimeout(handler);
  }, [localQuery, onSearchChange, searchQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value);
  };

  const handleClear = () => {
    setLocalQuery('');
    onSearchChange('');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isSearchActive = isSearching || localQuery !== searchQuery;

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 00-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        </div>
        <div className="hidden sm:block">
          <span className="font-bold text-white tracking-tight">Smart Cloud</span>
          <span className="text-xs px-2 py-0.5 ml-2 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">v0.1</span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          {isSearchActive ? (
            <svg
              className="w-4 h-4 text-blue-400 animate-spin absolute left-3.5 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          <input
            type="text"
            value={localQuery}
            onChange={handleChange}
            placeholder="Search files by name..."
            className={`w-full pl-10 pr-16 py-2 bg-slate-950/60 border rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-all ${
              isSearchActive
                ? 'border-blue-500/80 ring-1 ring-blue-500/40 shadow-sm shadow-blue-500/20'
                : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            }`}
          />
          {localQuery && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Right Controls: Storage Indicator + User Badge + Logout */}
      <div className="flex items-center gap-3">
        {stats && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
            </svg>
            <span>{formatBytes(stats.total_bytes_used)} used</span>
          </div>
        )}

        {/* User Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-blue-400">
            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-medium text-slate-200 leading-tight">{user?.full_name}</p>
            <p className="text-[10px] text-slate-400 leading-tight truncate max-w-[120px]">{user?.email}</p>
          </div>

          {/* Logout button */}
          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
