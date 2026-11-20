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
    { id: 'ALL', label: 'All Operations' },
    { id: 'UPLOAD', label: 'Ingestion (Upload)' },
    { id: 'DOWNLOAD', label: 'Retrieval (Download)' },
    { id: 'SHARE', label: 'RBAC Shares' },
    { id: 'DELETE', label: 'Deletions' },
    { id: 'FOLDER_CREATE', label: 'Directories' },
  ];

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    return (
      <span className="font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
        {act}
      </span>
    );
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
    <div className="flex-1 p-5 space-y-4 overflow-y-auto bg-[#09090b]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-zinc-100">Audit Trail &amp; Access Log</h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-700 text-zinc-400">
              {total} Logged Events
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Immutable chronological audit stream of storage, sharing, and tiering lifecycle events
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-mono transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-zinc-400' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh Log</span>
        </button>
      </div>

      {error && (
        <div className="p-2.5 rounded-md bg-rose-950/40 border border-rose-800/80 text-rose-300 font-mono text-xs">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 font-mono text-xs">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedAction(tab.id);
              setPage(0);
            }}
            className={`px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors cursor-pointer ${
              selectedAction === tab.id
                ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#0c0d0e] border border-zinc-800 rounded-md overflow-hidden font-mono">
        {loading && logs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs space-y-2">
            <div className="w-5 h-5 mx-auto border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
            <p>Querying audit records from PostgreSQL...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            No audit records match the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/70">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 hover:bg-zinc-900/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="shrink-0 mt-0.5 sm:mt-0">
                    {getActionBadge(log.action)}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-zinc-200 truncate">
                        {log.resource_name || log.action}
                      </span>
                      <span className="text-[10px] text-zinc-500 uppercase">
                        [{log.resource_type}]
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {log.details || `Executed ${log.action} on ${log.resource_type}`}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-zinc-500 whitespace-nowrap shrink-0">
                  <span>{formatExactDate(log.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {total > pageSize && (
          <div className="p-3 bg-zinc-900/70 border-t border-zinc-800 flex items-center justify-between text-xs">
            <span className="text-zinc-500">
              Range: {page * pageSize + 1} - {Math.min(total, (page + 1) * pageSize)} of {total} events
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-40 hover:text-white cursor-pointer"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * pageSize >= total}
                className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-40 hover:text-white cursor-pointer"
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
