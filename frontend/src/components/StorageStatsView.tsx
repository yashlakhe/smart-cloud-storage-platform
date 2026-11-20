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
    <div className="flex-1 p-5 space-y-4 overflow-y-auto bg-[#09090b] font-mono">
      <div className="pb-2 border-b border-zinc-800">
        <h1 className="text-sm font-semibold text-zinc-100 font-sans">Storage Allocation Metrics</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Real-time object volume and MIME category distribution</p>
      </div>

      {error && (
        <div className="p-2.5 rounded-md bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-zinc-500 text-xs space-y-2">
          <div className="w-5 h-5 mx-auto border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
          <p>Computing storage metrics across partitions...</p>
        </div>
      ) : stats && (
        <div className="space-y-4">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1">
              <span className="text-[10px] uppercase text-zinc-500 block">Total Volume Used</span>
              <p className="text-xl font-bold text-zinc-100 tabular-nums">{formatBytes(stats.total_bytes_used)}</p>
              <p className="text-[10px] text-zinc-500">Persisted across cloud object storage</p>
            </div>

            <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1">
              <span className="text-[10px] uppercase text-zinc-500 block">Total Objects</span>
              <p className="text-xl font-bold text-zinc-100 tabular-nums">{stats.total_files}</p>
              <p className="text-[10px] text-zinc-500">Indexed with SHA-256 integrity</p>
            </div>

            <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1">
              <span className="text-[10px] uppercase text-zinc-500 block">Directories</span>
              <p className="text-xl font-bold text-zinc-100 tabular-nums">{stats.total_folders}</p>
              <p className="text-[10px] text-zinc-500">Hierarchical B-Tree nodes</p>
            </div>
          </div>

          {/* Storage Distribution Breakdown */}
          <div className="p-4 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-3">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              MIME Category Distribution
            </h3>

            {/* Distribution Bar */}
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden flex">
              <div style={{ width: `${getPercent(stats.categories.documents)}%` }} className="bg-emerald-500" title="Documents" />
              <div style={{ width: `${getPercent(stats.categories.images)}%` }} className="bg-cyan-500" title="Images" />
              <div style={{ width: `${getPercent(stats.categories.media)}%` }} className="bg-blue-500" title="Media" />
              <div style={{ width: `${getPercent(stats.categories.code)}%` }} className="bg-amber-500" title="Code" />
              <div style={{ width: `${getPercent(stats.categories.archives)}%` }} className="bg-purple-500" title="Archives" />
              <div style={{ width: `${getPercent(stats.categories.other)}%` }} className="bg-zinc-400" title="Other" />
            </div>

            {/* Category Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-zinc-300">Documents</span>
                </div>
                <span className="text-zinc-400 tabular-nums">{formatBytes(stats.categories.documents)}</span>
              </div>
              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  <span className="text-zinc-300">Images</span>
                </div>
                <span className="text-zinc-400 tabular-nums">{formatBytes(stats.categories.images)}</span>
              </div>
              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-zinc-300">Media</span>
                </div>
                <span className="text-zinc-400 tabular-nums">{formatBytes(stats.categories.media)}</span>
              </div>
              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-zinc-300">Code &amp; Config</span>
                </div>
                <span className="text-zinc-400 tabular-nums">{formatBytes(stats.categories.code)}</span>
              </div>
              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span className="text-zinc-300">Archives</span>
                </div>
                <span className="text-zinc-400 tabular-nums">{formatBytes(stats.categories.archives)}</span>
              </div>
              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  <span className="text-zinc-300">Other</span>
                </div>
                <span className="text-zinc-400 tabular-nums">{formatBytes(stats.categories.other)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
