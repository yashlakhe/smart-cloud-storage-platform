import React, { useState, useEffect, useCallback } from 'react';
import type { SharedWithMeItem } from '../services/api';
import { listSharedWithMe, downloadFileStream } from '../services/api';

export const SharedWithMe: React.FC = () => {
  const [items, setItems] = useState<SharedWithMeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShared = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listSharedWithMe();
      setItems(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load shared files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShared();
  }, [fetchShared]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      await downloadFileStream(fileId, filename);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Shared With Me</h1>
        <p className="text-xs text-slate-400">Files that other registered users have shared with you</p>
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
          <p className="text-xs">Loading shared files...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-300">No shared files yet</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When another user shares a file with your email, it will appear here with access permissions.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Shared By</th>
                <th className="py-3 px-4">Permission</th>
                <th className="py-3 px-4 hidden md:table-cell">Size</th>
                <th className="py-3 px-4 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.map((item) => (
                <tr key={item.share_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-200">
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </span>
                      <span className="truncate max-w-xs">{item.file.original_filename}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <div>
                      <p className="font-medium text-xs text-slate-200">{item.owner.full_name}</p>
                      <p className="text-[10px] text-slate-500">{item.owner.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] uppercase font-bold">
                      {item.permission}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-xs hidden md:table-cell">
                    {formatBytes(item.file.size)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDownload(item.file.id, item.file.original_filename)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-xs font-medium transition-all"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
