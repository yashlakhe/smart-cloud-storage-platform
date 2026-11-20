import React, { useState, useEffect, useCallback } from 'react';
import type { FileRecord, ShareRecord } from '../services/api';
import { listFileShares, revokeShare, shareFile } from '../services/api';

interface ShareModalProps {
  file: FileRecord;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ file, onClose }) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [permission, setPermission] = useState<'read' | 'write'>('read');
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchShares = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listFileShares(file.id);
      setShares(data);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, [file.id]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      await shareFile(file.id, recipientEmail, permission);
      setSuccess(`Access granted to ${recipientEmail}`);
      setRecipientEmail('');
      await fetchShares();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to share file');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    try {
      await revokeShare(shareId);
      await fetchShares();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to revoke share');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#121215] border border-zinc-700 rounded-lg p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-zinc-100">Access Control &amp; Sharing</h3>
            <p className="text-[11px] font-mono text-zinc-400 truncate max-w-xs">{file.original_filename}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-2.5 rounded-md bg-rose-950/40 border border-rose-800/80 text-rose-300 font-mono text-[11px]">
            {error}
          </div>
        )}
        {success && (
          <div className="p-2.5 rounded-md bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 font-mono text-[11px]">
            {success}
          </div>
        )}

        {/* Share Form */}
        <form onSubmit={handleShare} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Recipient Email
            </label>
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="colleague@domain.com"
              className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-xs text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:border-zinc-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Permission Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPermission('read')}
                className={`py-1.5 px-3 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                  permission === 'read'
                    ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Read (Download)
              </button>
              <button
                type="button"
                onClick={() => setPermission('write')}
                className={`py-1.5 px-3 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                  permission === 'write'
                    ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Write (Read &amp; Edit)
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-1.5 px-3 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors shadow-sm disabled:opacity-50"
          >
            {submitting ? 'Granting...' : 'Grant RBAC Permission'}
          </button>
        </form>

        {/* Existing Shares */}
        <div className="space-y-2 pt-2 border-t border-zinc-800 font-mono">
          <div className="text-[11px] uppercase tracking-wider text-zinc-400">
            Active Tenant Shares ({shares.length})
          </div>
          {loading ? (
            <p className="text-xs text-zinc-500">Querying shares...</p>
          ) : shares.length === 0 ? (
            <p className="text-[11px] text-zinc-500">Object is private to owner only.</p>
          ) : (
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {shares.map((s) => (
                <div
                  key={s.id}
                  className="p-2 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-[11px] text-zinc-300">
                      User: {s.shared_with_user_id.slice(0, 8)}...
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] uppercase font-semibold">
                      {s.permission}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRevoke(s.id)}
                    className="text-rose-400 hover:text-rose-300 text-xs font-medium hover:underline"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
