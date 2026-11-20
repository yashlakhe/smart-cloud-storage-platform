import React, { useState, useEffect, useCallback } from 'react';
import type { HealthResponse } from '../services/api';
import { getHealthStatus } from '../services/api';

export const HealthView: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHealthStatus();
      setHealth(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Backend connection error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
      case 'connected':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60';
      case 'degraded':
      case 'unconfigured':
        return 'bg-amber-950/40 text-amber-300 border-amber-800/60';
      case 'disconnected':
      case 'error':
      default:
        return 'bg-rose-950/40 text-rose-300 border-rose-800/60';
    }
  };

  return (
    <div className="flex-1 p-5 space-y-4 overflow-y-auto bg-[#09090b]">
      <div className="pb-2 border-b border-zinc-800 font-mono">
        <h1 className="text-sm font-semibold text-zinc-100">Cluster Infrastructure Health</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Real-time status diagnostics across gateway, relational DB, and object store</p>
      </div>

      <div className="max-w-xl bg-[#0c0d0e] border border-zinc-800 rounded-md p-5 space-y-4 font-mono">
        <div className="flex items-center justify-between p-3 rounded bg-zinc-900 border border-zinc-800">
          <span className="text-xs font-medium text-zinc-200">Cluster Diagnostic State</span>
          {loading ? (
            <span className="text-xs text-zinc-500">Probing...</span>
          ) : error ? (
            <span className="px-2 py-0.5 rounded text-[11px] bg-rose-950/40 text-rose-400 border border-rose-800">
              Disconnected
            </span>
          ) : (
            <span className={`px-2 py-0.5 rounded text-[11px] border flex items-center gap-1.5 ${getStatusBadge(health?.status || '')}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {health?.status === 'healthy' ? 'Cluster Healthy' : 'Degraded (Safe Local Fallback)'}
            </span>
          )}
        </div>

        {health && (
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
              Subsystem Telemetry
            </span>
            <div className="space-y-1.5">
              <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-xs">
                <div>
                  <p className="font-medium text-zinc-200">FastAPI Gateway Core</p>
                  <p className="text-[10px] text-zinc-500">FastAPI 0.141.1 • Python 3.11</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold border ${getStatusBadge(health.services.backend)}`}>
                  {health.services.backend}
                </span>
              </div>

              <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-xs">
                <div>
                  <p className="font-medium text-zinc-200">PostgreSQL Relational DB</p>
                  <p className="text-[10px] text-zinc-500">SQLAlchemy 2.0 • Psycopg 3 • 5 Alembic Revisions</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold border ${getStatusBadge(health.services.database)}`}>
                  {health.services.database}
                </span>
              </div>

              <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-xs">
                <div>
                  <p className="font-medium text-zinc-200">Amazon S3 Object Store</p>
                  <p className="text-[10px] text-zinc-500">Boto3 Client (ap-southeast-2) with POSIX Fallback</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold border ${getStatusBadge(health.services.s3)}`}>
                  {health.services.s3}
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="w-full py-2 px-3 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Probe Subsystems</span>
        </button>
      </div>
    </div>
  );
};
