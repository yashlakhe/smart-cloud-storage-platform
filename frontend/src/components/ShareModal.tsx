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
      setSuccess(`File successfully shared with ${recipientEmail}`);
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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Share File</h3>
            <p className="text-xs text-slate-400 truncate max-w-xs">{file.original_filename}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            {success}
          </div>
        )}

        {/* Share Form */}
        <form onSubmit={handleShare} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Recipient Email
            </label>
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Permission Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPermission('read')}
                className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                  permission === 'read'
                    ? 'bg-blue-600/15 border-blue-500 text-blue-400 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Can View & Download
              </button>
              <button
                type="button"
                onClick={() => setPermission('write')}
                className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                  permission === 'write'
                    ? 'bg-blue-600/15 border-blue-500 text-blue-400 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Can View & Edit
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            {submitting ? 'Sharing...' : 'Grant Access'}
          </button>
        </form>

        {/* Existing Shares */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active Shares ({shares.length})
          </h4>
          {loading ? (
            <p className="text-xs text-slate-500">Loading shares...</p>
          ) : shares.length === 0 ? (
            <p className="text-xs text-slate-500">This file is currently private.</p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {shares.map((s) => (
                <div
                  key={s.id}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-[11px] text-slate-300">
                      User: {s.shared_with_user_id.slice(0, 8)}...
                    </span>
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] uppercase font-bold">
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
