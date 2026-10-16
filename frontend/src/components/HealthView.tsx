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
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">System Infrastructure Health</h1>
        <p className="text-xs text-slate-400">Diagnostic status across backend, database, and cloud storage</p>
      </div>

      <div className="max-w-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-sm font-medium text-slate-200">Overall System Health</span>
          {loading ? (
            <span className="text-xs text-slate-400">Checking...</span>
          ) : error ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Disconnected
            </span>
          ) : (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(health?.status || '')}`}>
              {health?.status === 'healthy' ? 'Healthy' : 'Degraded (Safe Local Fallback)'}
            </span>
          )}
        </div>

        {health && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Connected Subsystems
            </h2>
            <div className="space-y-2">
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">FastAPI REST Core</p>
                  <p className="text-[11px] text-slate-500">FastAPI 0.141.1 • Python 3.13</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusBadge(health.services.backend)}`}>
                  {health.services.backend}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">PostgreSQL Relational DB</p>
                  <p className="text-[11px] text-slate-500">SQLAlchemy 2.0 • Psycopg 3</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusBadge(health.services.database)}`}>
                  {health.services.database}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">Amazon S3 Object Store</p>
                  <p className="text-[11px] text-slate-500">Boto3 Cloud Client with fallback</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusBadge(health.services.s3)}`}>
                  {health.services.s3}
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh System Health</span>
        </button>
      </div>
    </div>
  );
};
