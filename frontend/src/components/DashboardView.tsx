import React, { useState, useEffect, useCallback } from 'react';
import type { DashboardSummary } from '../services/api';
import { getDashboardSummary } from '../services/api';

interface DashboardViewProps {
  onNavigateToTab?: (tab: 'my-files' | 'shared' | 'activity' | 'storage') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToTab }) => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboardSummary();
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getRelativeTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSecs < 10) return 'Just now';
      if (diffSecs < 60) return `${diffSecs}s ago`;
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    return (
      <span className="font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
        {act}
      </span>
    );
  };

  const categoriesOrder = ['documents', 'images', 'media', 'code', 'archives', 'other'] as const;
  const categoryMeta: Record<string, { label: string; color: string; border: string }> = {
    documents: { label: 'Documents', color: 'bg-emerald-500', border: 'border-emerald-500' },
    images: { label: 'Images', color: 'bg-cyan-500', border: 'border-cyan-500' },
    media: { label: 'Media', color: 'bg-blue-500', border: 'border-blue-500' },
    code: { label: 'Code', color: 'bg-amber-500', border: 'border-amber-500' },
    archives: { label: 'Archives', color: 'bg-purple-500', border: 'border-purple-500' },
    other: { label: 'Other', color: 'bg-zinc-400', border: 'border-zinc-400' },
  };

  return (
    <div className="flex-1 p-5 space-y-5 overflow-y-auto bg-[#09090b]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-zinc-100">Overview &amp; Telemetry</h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-700 text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              CLUSTER ONLINE
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Node: AWS S3 (ap-southeast-2) • CAS Engine • Multi-Tier Lifecycle
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-zinc-400' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-rose-950/40 border border-rose-800/80 text-rose-300 font-mono text-xs">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="p-16 text-center text-zinc-500 font-mono text-xs space-y-2">
          <div className="w-5 h-5 mx-auto border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
          <p>Aggregating storage cluster metrics...</p>
        </div>
      ) : data && (
        <div className="space-y-4">
          {/* Capacity Allocation Panel */}
          <div className="p-4 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-3 font-mono">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
                  Aggregate Storage Volume
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-zinc-100 tabular-nums">
                    {formatBytes(data.quota.total_bytes_used)}
                  </span>
                  <span className="text-zinc-500 text-xs">
                    / {formatBytes(data.quota.total_quota_bytes)} quota
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-right">
                  <span className="text-[10px] text-zinc-500 block uppercase">Available</span>
                  <span className="text-xs font-semibold text-zinc-200 tabular-nums">{formatBytes(data.quota.remaining_bytes)}</span>
                </div>
                <div className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-right">
                  <span className="text-[10px] text-zinc-500 block uppercase">Utilization</span>
                  <span className="text-xs font-semibold text-zinc-200 tabular-nums">{data.quota.percent_used.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Linear Progress Bar */}
            <div className="space-y-1">
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden flex">
                <div
                  style={{ width: `${Math.max(1, Math.min(100, data.quota.percent_used))}%` }}
                  className="bg-zinc-200 transition-all duration-300 rounded-full"
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>0 GB</span>
                <span>5 GB</span>
                <span>10 GB Max</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1 font-mono">
              <span className="text-[10px] uppercase text-zinc-500 block">Total Objects</span>
              <p className="text-xl font-bold text-zinc-100 tabular-nums">{data.total_files}</p>
              <p className="text-[10px] text-zinc-500">SHA-256 Indexed</p>
            </div>

            <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1 font-mono">
              <span className="text-[10px] uppercase text-zinc-500 block">Directories</span>
              <p className="text-xl font-bold text-zinc-100 tabular-nums">{data.total_folders}</p>
              <p className="text-[10px] text-zinc-500">Recursive B-Tree</p>
            </div>

            <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1 font-mono">
              <span className="text-[10px] uppercase text-zinc-500 block">Outbound Shares</span>
              <p className="text-xl font-bold text-zinc-100 tabular-nums">{data.total_shares_given}</p>
              <p className="text-[10px] text-zinc-500">RBAC Delegated</p>
            </div>

            <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1 font-mono">
              <span className="text-[10px] uppercase text-zinc-500 block">Inbound Shares</span>
              <p className="text-xl font-bold text-zinc-100 tabular-nums">{data.total_shares_received}</p>
              <p className="text-[10px] text-zinc-500">Cross-Tenant Access</p>
            </div>
          </div>

          {/* Category Distribution Grid */}
          <div className="p-4 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-3 font-mono">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Payload MIME Classification Breakdown
            </div>

            {/* Segmented Distribution Bar */}
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden flex">
              {categoriesOrder.map((catKey) => {
                const item = data.categories[catKey];
                if (!item || item.bytes === 0) return null;
                return (
                  <div
                    key={catKey}
                    style={{ width: `${item.percent_of_used}%` }}
                    className={`${categoryMeta[catKey]?.color || 'bg-zinc-400'}`}
                    title={`${categoryMeta[catKey]?.label}: ${formatBytes(item.bytes)} (${item.percent_of_used}%)`}
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
              {categoriesOrder.map((catKey) => {
                const item = data.categories[catKey] || { bytes: 0, count: 0, percent_of_used: 0 };
                const meta = categoryMeta[catKey];
                return (
                  <div key={catKey} className="p-2.5 rounded bg-zinc-900 border border-zinc-800 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.color}`} />
                      <span className="text-[11px] text-zinc-300 font-medium">{meta.label}</span>
                    </div>
                    <p className="text-xs font-bold text-zinc-100 tabular-nums">{formatBytes(item.bytes)}</p>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>{item.count} items</span>
                      <span>{item.percent_of_used.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multi-Tier Access Aging Distribution */}
          <div className="p-4 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Storage Access Aging &amp; Multi-Tier S3 Tiers
                </span>
                <span className="text-[10px] text-zinc-500">
                  Access recency modeling with 128 KB billing penalty guard
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-700">
                Auto-Tiering Heuristic
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {data.access_aging.map((tier) => (
                <div key={tier.key} className="p-3 rounded bg-zinc-900 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">{tier.label}</span>
                    <span className="text-[10px] px-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {tier.percent_of_used.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    {tier.description}
                  </p>
                  <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-zinc-100 tabular-nums">{formatBytes(tier.bytes)}</span>
                    <span className="text-zinc-500 text-[10px]">{tier.count} files</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Audit Stream */}
          <div className="p-4 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  Audit Activity Stream
                </h3>
                <p className="text-[11px] text-zinc-500 font-mono">Latest cloud operations logged</p>
              </div>

              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('activity')}
                  className="text-xs text-zinc-400 hover:text-zinc-200 font-mono flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Full log &rarr;</span>
                </button>
              )}
            </div>

            {data.recent_activities.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs font-mono">
                No activity records logged. Upload a file to generate an audit event.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/70 border border-zinc-800 rounded bg-zinc-900/40">
                {data.recent_activities.map((act) => (
                  <div key={act.id} className="p-2.5 flex items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getActionBadge(act.action)}
                      <div className="min-w-0">
                        <span className="font-medium text-zinc-200 truncate">
                          {act.resource_name || act.action}
                        </span>
                        <span className="text-[10px] text-zinc-500 block truncate">
                          {act.details || `${act.action} on ${act.resource_type}`}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] text-zinc-500 whitespace-nowrap shrink-0">
                      {getRelativeTime(act.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
