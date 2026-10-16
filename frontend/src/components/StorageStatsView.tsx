import React, { useState, useEffect, useCallback } from 'react';
import type { StorageStats } from '../services/api';
import { getStorageStats } from '../services/api';

export const StorageStatsView: React.FC = () => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStorageStats();
      setStats(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch storage stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPercent = (bytes: number) => {
    if (!stats || stats.total_bytes_used === 0) return 0;
    return Math.round((bytes / stats.total_bytes_used) * 100);
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Storage Analytics</h1>
        <p className="text-xs text-slate-400">Real-time object storage metrics and file categorization</p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <svg className="animate-spin h-6 w-6 mx-auto text-blue-500 mb-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-xs">Computing storage statistics...</p>
        </div>
      ) : stats && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Total Storage Used</span>
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{formatBytes(stats.total_bytes_used)}</p>
              <p className="text-[11px] text-slate-500">Persisted across cloud object storage</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Total Files</span>
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{stats.total_files}</p>
              <p className="text-[11px] text-slate-500">Tracked with SHA-256 integrity</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Folders</span>
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{stats.total_folders}</p>
              <p className="text-[11px] text-slate-500">Hierarchical database organization</p>
            </div>
          </div>

          {/* Storage Distribution Breakdown */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Category Distribution
            </h3>

            {/* Distribution Bar */}
            <div className="h-3 rounded-full bg-slate-950 overflow-hidden flex border border-slate-800">
              <div style={{ width: `${getPercent(stats.categories.documents)}%` }} className="bg-rose-500" title="Documents" />
              <div style={{ width: `${getPercent(stats.categories.images)}%` }} className="bg-purple-500" title="Images" />
              <div style={{ width: `${getPercent(stats.categories.media)}%` }} className="bg-pink-500" title="Media" />
              <div style={{ width: `${getPercent(stats.categories.code)}%` }} className="bg-emerald-500" title="Code" />
              <div style={{ width: `${getPercent(stats.categories.archives)}%` }} className="bg-amber-500" title="Archives" />
              <div style={{ width: `${getPercent(stats.categories.other)}%` }} className="bg-blue-500" title="Other" />
            </div>

            {/* Category Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-xs text-slate-300">Documents</span>
                </div>
                <span className="text-xs font-mono text-slate-400">{formatBytes(stats.categories.documents)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className="text-xs text-slate-300">Images</span>
                </div>
                <span className="text-xs font-mono text-slate-400">{formatBytes(stats.categories.images)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                  <span className="text-xs text-slate-300">Media</span>
                </div>
                <span className="text-xs font-mono text-slate-400">{formatBytes(stats.categories.media)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-slate-300">Code & Scripts</span>
                </div>
                <span className="text-xs font-mono text-slate-400">{formatBytes(stats.categories.code)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs text-slate-300">Archives</span>
                </div>
                <span className="text-xs font-mono text-slate-400">{formatBytes(stats.categories.archives)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs text-slate-300">Other</span>
                </div>
                <span className="text-xs font-mono text-slate-400">{formatBytes(stats.categories.other)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
