import React, { useState, useEffect, useCallback } from 'react';
import type { ActivityLogItem } from '../services/api';
import { getActivityLogs } from '../services/api';

export const ActivityLogView: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const actionParam = selectedAction === 'ALL' ? undefined : selectedAction;
      const res = await getActivityLogs(pageSize, page * pageSize, actionParam);
      setLogs(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  }, [selectedAction, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filterTabs = [
    { id: 'ALL', label: 'All Activities' },
    { id: 'UPLOAD', label: 'Uploads' },
    { id: 'DOWNLOAD', label: 'Downloads' },
    { id: 'SHARE', label: 'Shares' },
    { id: 'DELETE', label: 'Deletions' },
    { id: 'FOLDER_CREATE', label: 'Folders' },
  ];

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'UPLOAD':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          label: 'Upload',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          ),
        };
      case 'DOWNLOAD':
        return {
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          label: 'Download',
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
          label: action === 'FOLDER_DELETE' ? 'Folder Delete' : 'Delete',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          ),
        };
      case 'SHARE':
        return {
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          label: 'Share',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          ),
        };
      case 'REVOKE_SHARE':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          label: 'Revoke Share',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          ),
        };
      case 'FOLDER_CREATE':
        return {
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          label: 'Create Folder',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          ),
        };
      case 'FOLDER_RENAME':
      case 'RENAME':
        return {
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          label: 'Rename',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
        };
      case 'MOVE':
        return {
          bg: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
          label: 'Move',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          ),
        };
      default:
        return {
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
          label: action,
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
    }
  };

  const formatExactDate = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-950">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">Audit & Activity Log</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {total} Total Events
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable chronological audit record of all storage and sharing events
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedAction(tab.id);
              setPage(0);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedAction === tab.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
        {loading && logs.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-3">
            <svg className="animate-spin h-7 w-7 mx-auto text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-xs font-medium">Loading audit trail...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-xs">
            No activity logs match the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {logs.map((log) => {
              const badge = getActionBadge(log.action);
              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-slate-850/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className={`p-2 rounded-xl border ${badge.bg} shrink-0 mt-0.5 sm:mt-0`}>
                      {badge.icon}
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white truncate">
                          {log.resource_name || log.action}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">
                          {log.resource_type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {log.details || `Performed ${log.action} on ${log.resource_type}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end text-[11px] text-slate-500 font-mono shrink-0 pl-11 sm:pl-0">
                    <span>{formatExactDate(log.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {total > pageSize && (
          <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Showing {page * pageSize + 1} - {Math.min(total, (page + 1) * pageSize)} of {total} events
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-white cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * pageSize >= total}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-white cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
