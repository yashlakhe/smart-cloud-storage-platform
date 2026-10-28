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
    switch (action.toUpperCase()) {
      case 'UPLOAD':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          ),
        };
      case 'DOWNLOAD':
        return {
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          ),
        };
      case 'DELETE':
      case 'FOLDER_DELETE':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          ),
        };
      case 'SHARE':
        return {
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          ),
        };
      case 'REVOKE_SHARE':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          ),
        };
      case 'FOLDER_CREATE':
      case 'FOLDER_RENAME':
        return {
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          ),
        };
      default:
        return {
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
    }
  };

  const categoriesOrder = ['documents', 'images', 'media', 'code', 'archives', 'other'] as const;
  const categoryMeta: Record<string, { label: string; color: string; bg: string }> = {
    documents: { label: 'Documents', color: 'bg-rose-500', bg: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    images: { label: 'Images', color: 'bg-purple-500', bg: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    media: { label: 'Media & Video', color: 'bg-pink-500', bg: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
    code: { label: 'Code & Scripts', color: 'bg-emerald-500', bg: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    archives: { label: 'Archives', color: 'bg-amber-500', bg: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    other: { label: 'Other', color: 'bg-blue-500', bg: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-950">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">Storage Dashboard</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time storage analytics, tiering lifecycle, and user activity tracking
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh Metrics</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {loading && !data ? (
        <div className="p-16 text-center text-slate-500 space-y-3">
          <svg className="animate-spin h-7 w-7 mx-auto text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-xs font-medium">Aggregating storage telemetry & activity logs...</p>
        </div>
      ) : data && (
        <div className="space-y-6">
          {/* Storage Quota Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/30 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                  Storage Allocation & Quota
                </span>
                <div className="flex items-baseline gap-2.5">
                  <h2 className="text-3xl font-extrabold text-white tracking-tight">
                    {formatBytes(data.quota.total_bytes_used)}
                  </h2>
                  <span className="text-slate-400 text-sm font-medium">
                    of {formatBytes(data.quota.total_quota_bytes)} capacity used
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-right">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Remaining</p>
                  <p className="text-sm font-bold text-emerald-400">{formatBytes(data.quota.remaining_bytes)}</p>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-right">
                  <p className="text-[10px] text-blue-400 font-semibold uppercase">Utilization</p>
                  <p className="text-sm font-bold text-blue-300">{data.quota.percent_used.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* Quota Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
                <div
                  style={{ width: `${Math.max(1, Math.min(100, data.quota.percent_used))}%` }}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 rounded-full"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>0 B</span>
                <span>5 GB</span>
                <span>10 GB (Standard Cloud Quota)</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Total Files</span>
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{data.total_files}</p>
              <p className="text-[11px] text-slate-500">SHA-256 Verified</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Folders</span>
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{data.total_folders}</p>
              <p className="text-[11px] text-slate-500">Hierarchical Trees</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Shares Sent</span>
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{data.total_shares_given}</p>
              <p className="text-[11px] text-slate-500">Shared with Colleagues</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Incoming Shares</span>
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{data.total_shares_received}</p>
              <p className="text-[11px] text-slate-500">Accessible Files</p>
            </div>
          </div>

          {/* Category Distribution Breakdown */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              File Category Distribution
            </h3>

            {/* Distribution Color Bar */}
            <div className="h-3 rounded-full bg-slate-950 overflow-hidden flex border border-slate-800">
              {categoriesOrder.map((catKey) => {
                const item = data.categories[catKey];
                if (!item || item.bytes === 0) return null;
                return (
                  <div
                    key={catKey}
                    style={{ width: `${item.percent_of_used}%` }}
                    className={`${categoryMeta[catKey]?.color || 'bg-blue-500'} transition-all`}
                    title={`${categoryMeta[catKey]?.label}: ${formatBytes(item.bytes)} (${item.percent_of_used}%)`}
                  />
                );
              })}
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
              {categoriesOrder.map((catKey) => {
                const item = data.categories[catKey] || { bytes: 0, count: 0, percent_of_used: 0 };
                const meta = categoryMeta[catKey];
                return (
                  <div
                    key={catKey}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${meta.color}`} />
                      <span className="text-xs font-semibold text-slate-300">{meta.label}</span>
                    </div>
                    <p className="text-sm font-mono font-bold text-white">{formatBytes(item.bytes)}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{item.count} {item.count === 1 ? 'file' : 'files'}</span>
                      <span>{item.percent_of_used.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Storage Access Aging / Tiering (Bridge to Phase 7) */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Storage Access Patterns & Aging Tiers
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculated based on recency of access for predictive tiering optimization
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Automated Lifecycle
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.access_aging.map((tier) => (
                <div
                  key={tier.key}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{tier.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {tier.percent_of_used.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {tier.description}
                  </p>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white">{formatBytes(tier.bytes)}</span>
                    <span className="text-[11px] text-slate-500">{tier.count} files</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Recent Activity Stream
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Audit log of latest cloud operations</p>
              </div>

              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('activity')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>View full audit trail</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>

            {data.recent_activities.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No recent activity recorded yet. Upload a file to see audit events.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {data.recent_activities.map((act) => {
                  const badge = getActionBadge(act.action);
                  return (
                    <div key={act.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl border ${badge.bg} shrink-0`}>
                          {badge.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">
                            {act.resource_name || act.action}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {act.details || `Performed ${act.action} on ${act.resource_type}`}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap shrink-0">
                        {getRelativeTime(act.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
