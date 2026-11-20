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

  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const handleDownload = async (fileId: string, filename: string, selectLocation = true) => {
    setDownloadingFileId(fileId);
    try {
      await downloadFileStream(fileId, filename, {
        selectLocation,
        onStatusChange: (status) => {
          if (status === 'complete' || status === 'cancelled') {
            setDownloadingFileId(null);
          }
        },
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to download file');
    } finally {
      setDownloadingFileId(null);
    }
  };

  return (
    <div className="flex-1 p-5 space-y-4 overflow-y-auto bg-[#09090b]">
      <div className="pb-2 border-b border-zinc-800">
        <h1 className="text-sm font-semibold text-zinc-100">Shared Objects</h1>
        <p className="text-xs text-zinc-400 font-mono">RBAC-delegated cross-tenant access records</p>
      </div>

      {error && (
        <div className="p-2.5 rounded-md bg-rose-950/40 border border-rose-800/80 text-rose-300 font-mono text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-zinc-500 font-mono text-xs space-y-2">
          <div className="w-5 h-5 mx-auto border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
          <p>Querying share tenancy records...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center rounded-md bg-zinc-900/20 border border-zinc-800/80 space-y-2 font-mono">
          <svg className="w-8 h-8 text-zinc-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="text-xs text-zinc-300">No delegated shares found</p>
          <p className="text-[11px] text-zinc-500">When colleagues grant read/write access to files, they will appear here</p>
        </div>
      ) : (
        <div className="bg-[#0c0d0e] border border-zinc-800 rounded-md overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/70 text-zinc-400 font-mono text-[11px] uppercase tracking-wider select-none">
                <th className="py-2.5 px-3.5">Filename</th>
                <th className="py-2.5 px-3.5">Granted By</th>
                <th className="py-2.5 px-3.5">Permission</th>
                <th className="py-2.5 px-3.5 hidden md:table-cell">Size</th>
                <th className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {items.map((item) => (
                <tr key={item.share_id} className="hover:bg-zinc-900/70 transition-colors">
                  <td className="py-2 px-3.5 font-medium text-zinc-200">
                    <span className="truncate max-w-xs">{item.file.original_filename}</span>
                  </td>
                  <td className="py-2 px-3.5 text-zinc-300">
                    <div className="font-mono">
                      <p className="text-xs text-zinc-200">{item.owner.full_name}</p>
                      <p className="text-[10px] text-zinc-500">{item.owner.email}</p>
                    </div>
                  </td>
                  <td className="py-2 px-3.5">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 text-[10px] font-mono uppercase font-semibold">
                      {item.permission}
                    </span>
                  </td>
                  <td className="py-2 px-3.5 text-zinc-300 font-mono text-xs tabular-nums hidden md:table-cell">
                    {formatBytes(item.file.size)}
                  </td>
                  <td className="py-2 px-3.5 text-right">
                    <button
                      onClick={() => handleDownload(item.file.id, item.file.original_filename, true)}
                      disabled={downloadingFileId === item.file.id}
                      title="Download (Pick target directory)"
                      className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {downloadingFileId === item.file.id ? (
                        <>
                          <span className="w-3 h-3 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></span>
                          <span>Streaming...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>Save As...</span>
                        </>
                      )}
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
