import { useState, useEffect, useCallback } from 'react';
import { getHealthStatus } from './services/api';
import type { HealthResponse } from './services/api';

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHealthStatus();
      setHealth(data);
    } catch (err: unknown) {
      setHealth(null);
      setError(err instanceof Error ? err.message : 'Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
      case 'connected':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'degraded':
      case 'unconfigured':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'disconnected':
      case 'error':
      default:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 mb-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 00-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Smart Cloud Storage Platform
          </h1>
          <p className="text-slate-400 text-xs font-medium">
            Phase 1 — Development Infrastructure
          </p>
        </div>

        {/* Overall Status Card */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">Backend Connection</span>
          {loading ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping" />
              Loading...
            </span>
          ) : error ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Disconnected
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(health?.status || '')}`}>
              <span className={`w-2 h-2 rounded-full ${health?.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {health?.status === 'healthy' ? 'Healthy' : 'Degraded'}
            </span>
          )}
        </div>

        {/* Service Breakdown */}
        {health && (
          <div className="space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
              Infrastructure Services
            </h2>
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between">
                <span className="text-sm text-slate-300">FastAPI Backend</span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-medium border ${getStatusBadge(health.services.backend)}`}>
                  {health.services.backend}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between">
                <span className="text-sm text-slate-300">PostgreSQL Database</span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-medium border ${getStatusBadge(health.services.database)}`}>
                  {health.services.database}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between">
                <span className="text-sm text-slate-300">Amazon S3 Storage</span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-medium border ${getStatusBadge(health.services.s3)}`}>
                  {health.services.s3}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Connection Failure Details */}
        {error && (
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed">
            <p className="font-semibold mb-1">Backend Connection Error:</p>
            <p className="text-rose-400/90">{error}</p>
          </div>
        )}

        {/* Action Controls */}
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm transition-colors duration-150 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>Refreshing...</span>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Retry / Refresh Connection</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
