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
    <header className="h-14 bg-[#0c0d0e] border-b border-zinc-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Brand & Cluster Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-zinc-100 shadow-sm">
            <svg className="w-4 h-4 text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-3-3v6" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-100">SmartCloud</span>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-zinc-800 text-[11px] font-mono text-zinc-500">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>ap-southeast-2</span>
          <span className="text-zinc-700">•</span>
          <span>CAS: SHA-256</span>
        </div>
      </div>

      {/* Global Search Bar (Developer Console Style) */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          {isSearchActive ? (
            <svg
              className="w-3.5 h-3.5 text-zinc-400 animate-spin absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg
              className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2"
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
            placeholder="Search files and folders..."
            className={`w-full pl-9 pr-14 py-1.5 bg-zinc-900/60 border rounded-md text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors ${
              isSearchActive
                ? 'border-zinc-500 ring-1 ring-zinc-500'
                : 'border-zinc-800 hover:border-zinc-700 focus:border-zinc-500'
            }`}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {localQuery ? (
              <button
                onClick={handleClear}
                className="text-zinc-400 hover:text-zinc-200 text-[11px] px-1 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Clear
              </button>
            ) : (
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-800/80 border border-zinc-700/60 rounded">
                /
              </kbd>
            )}
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {stats && (
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-400">
            <span className="text-zinc-500">Storage:</span>
            <span className="text-zinc-200 tabular-nums">{formatBytes(stats.total_bytes_used)}</span>
          </div>
        )}

        {/* User Account */}
        <div className="flex items-center gap-2 pl-3 border-l border-zinc-800">
          <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[11px] font-mono font-medium text-zinc-300">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden sm:block text-left text-xs leading-none">
            <div className="font-medium text-zinc-200 truncate max-w-[120px]">{user?.full_name || 'Engineer'}</div>
            <div className="text-[10px] font-mono text-zinc-500 truncate max-w-[120px] mt-0.5">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors ml-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
