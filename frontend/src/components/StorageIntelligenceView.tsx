import React, { useEffect, useState } from 'react';
import {
  getStorageTierAnalysis,
  applyStorageTiering,
  setSingleFileTier,
  getPredictionRecommendations,
  getPrefetchMetrics,
  evaluatePredictionModel,
  getDeduplicationAnalytics,
  getCompressionAnalytics,
  compressSingleFile,
  bulkCompressColdFiles,
} from '../services/api';
import type {
  StorageTierAnalysis,
  PrefetchedFileItem,
  PrefetchTelemetryMetrics,
  PredictionEvaluationResponse,
  DeduplicationAnalytics,
  CompressionAnalytics,
} from '../services/api';

type IntelligenceTab = 'tiering' | 'prediction' | 'dedup' | 'compression';

export const StorageIntelligenceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<IntelligenceTab>('tiering');

  // Tiering state
  const [tierData, setTierData] = useState<StorageTierAnalysis | null>(null);
  const [tierLoading, setTierLoading] = useState<boolean>(true);
  const [tierOptimizing, setTierOptimizing] = useState<boolean>(false);
  const [tierMessage, setTierMessage] = useState<string | null>(null);

  // Prediction state
  const [predictions, setPredictions] = useState<PrefetchedFileItem[]>([]);
  const [metrics, setMetrics] = useState<PrefetchTelemetryMetrics | null>(null);
  const [evalResult, setEvalResult] = useState<PredictionEvaluationResponse | null>(null);
  const [predLoading, setPredLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);

  // Deduplication state
  const [dedupData, setDedupData] = useState<DeduplicationAnalytics | null>(null);
  const [dedupLoading, setDedupLoading] = useState<boolean>(true);

  // Compression state
  const [compData, setCompData] = useState<CompressionAnalytics | null>(null);
  const [compLoading, setCompLoading] = useState<boolean>(true);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [compMessage, setCompMessage] = useState<string | null>(null);

  // Load Tiering Data
  const loadTiering = async () => {
    try {
      setTierLoading(true);
      const data = await getStorageTierAnalysis();
      setTierData(data);
    } catch (err: unknown) {
      console.error('Failed to load storage tier analysis:', err);
    } finally {
      setTierLoading(false);
    }
  };

  // Load Prediction Data
  const loadPredictions = async () => {
    try {
      setPredLoading(true);
      const [predRes, metricsRes] = await Promise.all([
        getPredictionRecommendations(6),
        getPrefetchMetrics(),
      ]);
      setPredictions(predRes.recommended_files);
      setMetrics(metricsRes);
    } catch (err: unknown) {
      console.error('Failed to load predictions:', err);
    } finally {
      setPredLoading(false);
    }
  };

  // Load Deduplication Data
  const loadDedup = async () => {
    try {
      setDedupLoading(true);
      const data = await getDeduplicationAnalytics();
      setDedupData(data);
    } catch (err: unknown) {
      console.error('Failed to load deduplication analytics:', err);
    } finally {
      setDedupLoading(false);
    }
  };

  // Load Compression Data
  const loadCompression = async () => {
    try {
      setCompLoading(true);
      const data = await getCompressionAnalytics();
      setCompData(data);
    } catch (err: unknown) {
      console.error('Failed to load compression analytics:', err);
    } finally {
      setCompLoading(false);
    }
  };

  // Lazy load data for the active tab only
  useEffect(() => {
    if (activeTab === 'tiering' && !tierData) {
      loadTiering();
    } else if (activeTab === 'prediction' && predictions.length === 0 && !metrics) {
      loadPredictions();
    } else if (activeTab === 'dedup' && !dedupData) {
      loadDedup();
    } else if (activeTab === 'compression' && !compData) {
      loadCompression();
    }
  }, [activeTab]);

  const refreshActiveTab = () => {
    if (activeTab === 'tiering') loadTiering();
    else if (activeTab === 'prediction') loadPredictions();
    else if (activeTab === 'dedup') loadDedup();
    else if (activeTab === 'compression') loadCompression();
  };

  const handleApplyAllTiering = async () => {
    try {
      setTierOptimizing(true);
      const res = await applyStorageTiering();
      setTierMessage(`Successfully optimized ${res.transitioned_count} files, saving $${res.monthly_savings_usd.toFixed(4)}/month!`);
      await loadTiering();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      setTierMessage(`Error applying tier optimization: ${msg}`);
    } finally {
      setTierOptimizing(false);
    }
  };

  const handleSetFileTier = async (fileId: string, newTier: string) => {
    try {
      await setSingleFileTier(fileId, newTier);
      await loadTiering();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      alert(`Failed to set file tier: ${msg}`);
    }
  };

  const handleRunEvaluation = async () => {
    try {
      setEvaluating(true);
      const res = await evaluatePredictionModel();
      setEvalResult(res);
      setMetrics(res.metrics);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      alert(`Failed to run prediction evaluation: ${msg}`);
    } finally {
      setEvaluating(false);
    }
  };

  const handleCompressFile = async (fileId: string) => {
    try {
      setCompressing(true);
      const res = await compressSingleFile(fileId);
      setCompMessage(`Compressed file: saved ${res.ratio_percent}% storage!`);
      await loadCompression();
      await loadDedup();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      alert(`Failed to compress file: ${msg}`);
    } finally {
      setCompressing(false);
    }
  };

  const handleBulkCompressCold = async () => {
    try {
      setCompressing(true);
      const res = await bulkCompressColdFiles();
      setCompMessage(`Successfully compressed ${res.compressed_files_count} cold files, saving ${formatBytes(res.total_bytes_saved)}!`);
      await loadCompression();
      await loadDedup();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      setCompMessage(`Error during bulk compression: ${msg}`);
    } finally {
      setCompressing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'STANDARD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Standard
          </span>
        );
      case 'STANDARD_IA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-amber-950/40 text-amber-300 border border-amber-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Std-IA
          </span>
        );
      case 'GLACIER_IR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950/40 text-cyan-300 border border-cyan-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            Glacier-IR
          </span>
        );
      case 'DEEP_ARCHIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-purple-950/40 text-purple-300 border border-purple-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            Deep Archive
          </span>
        );
      default:
        return <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-zinc-300">{tier}</span>;
    }
  };

  return (
    <div className="flex-1 p-5 space-y-5 overflow-y-auto bg-[#09090b]">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm font-semibold text-zinc-100">Storage Optimization Engines</h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-zinc-900 text-zinc-400 border border-zinc-700">
              4 Engines Running
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            CAS Fingerprinting • Adaptive Gzip • 128 KB Guarded Multi-Tier • Markov Access Prefetch
          </p>
        </div>

        {/* Tab Switcher & Refresh */}
        <div className="flex items-center gap-2 self-start lg:self-auto font-mono text-xs">
          <div className="inline-flex p-0.5 rounded-md bg-zinc-900 border border-zinc-800">
            <button
              onClick={() => setActiveTab('tiering')}
              className={`px-3 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                activeTab === 'tiering'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Tiering &amp; Economics
            </button>
            <button
              onClick={() => setActiveTab('prediction')}
              className={`px-3 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                activeTab === 'prediction'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Markov Prefetch
            </button>
            <button
              onClick={() => setActiveTab('dedup')}
              className={`px-3 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                activeTab === 'dedup'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              CAS Deduplication
            </button>
            <button
              onClick={() => setActiveTab('compression')}
              className={`px-3 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                activeTab === 'compression'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Adaptive Compression
            </button>
          </div>

          <button
            onClick={refreshActiveTab}
            title="Refresh metrics"
            className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ======================= TAB 1: STORAGE TIERING ======================= */}
      {activeTab === 'tiering' && (
        <div className="space-y-4">
          {tierMessage && (
            <div className="p-3 rounded-md bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 font-mono text-xs flex items-center justify-between">
              <span>{tierMessage}</span>
              <button onClick={() => setTierMessage(null)} className="text-zinc-500 hover:text-zinc-300 ml-2">&times;</button>
            </div>
          )}

          {tierLoading ? (
            <div className="h-48 flex flex-col items-center justify-center text-zinc-500 font-mono text-xs gap-2">
              <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
              <p>Evaluating 128 KB minimum billable boundaries and access history...</p>
            </div>
          ) : !tierData ? (
            <div className="p-8 text-center text-zinc-500 font-mono text-xs">Failed to load tiering analysis.</div>
          ) : (
            <>
              {/* Cost Economics Highlight Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
                <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1">
                  <span className="text-[10px] uppercase text-zinc-500 block">Baseline (Un-tiered S3)</span>
                  <p className="text-xl font-bold text-zinc-100 tabular-nums">${tierData.baseline_monthly_cost_usd.toFixed(4)} <span className="text-[11px] font-normal text-zinc-500">/ mo</span></p>
                  <p className="text-[10px] text-zinc-500">All objects held in S3 Standard active storage</p>
                </div>

                <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1">
                  <span className="text-[10px] uppercase text-zinc-500 block">Current Invoiced Rate</span>
                  <p className="text-xl font-bold text-zinc-100 tabular-nums">${tierData.current_monthly_cost_usd.toFixed(4)} <span className="text-[11px] font-normal text-zinc-500">/ mo</span></p>
                  <p className="text-[10px] text-zinc-500">Live storage class allocation invoice</p>
                </div>

                <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-2">
                  <div>
                    <span className="text-[10px] uppercase text-emerald-400 block font-bold">Guarded Monthly Savings</span>
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-bold text-emerald-300 tabular-nums">${tierData.potential_monthly_savings_usd.toFixed(4)}</p>
                      <span className="text-xs font-semibold text-emerald-400">({tierData.savings_percentage}% saved)</span>
                    </div>
                  </div>
                  <button
                    onClick={handleApplyAllTiering}
                    disabled={tierOptimizing || tierData.pending_recommendations_count === 0}
                    className="w-full py-1.5 px-3 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors shadow-sm disabled:opacity-50"
                  >
                    {tierOptimizing ? 'Optimizing S3 Classes...' : `Apply Recommended Transitions (${tierData.pending_recommendations_count})`}
                  </button>
                </div>
              </div>

              {/* S3 Storage Classes Distribution */}
              <div className="p-4 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-3 font-mono">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  AWS S3 Storage Class Allocation Matrix
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                  {tierData.tier_breakdown.map((t) => (
                    <div key={t.tier} className="p-3 rounded bg-zinc-900 border border-zinc-800 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-zinc-200">{t.label}</span>
                          <span className="text-[10px] text-zinc-400">${t.rate_per_gb_mo}/GB</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 line-clamp-2">{t.description}</p>
                      </div>
                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">{t.file_count} files ({formatBytes(t.total_bytes)})</span>
                        <span className="font-semibold text-zinc-200">{t.percent_of_storage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations Table */}
              <div className="bg-[#0c0d0e] border border-zinc-800 rounded-md overflow-hidden font-mono">
                <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Lifecycle Transition Recommendations
                    </h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Evaluated using idle days, retrieval frequency, and AWS 128 KB minimum billable boundary check
                    </p>
                  </div>
                  <button onClick={loadTiering} className="p-1 px-2 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs">
                    Refresh
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900/70 text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800 select-none">
                      <tr>
                        <th className="py-2.5 px-3.5">Filename</th>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3">Idle</th>
                        <th className="py-2.5 px-3">Accesses</th>
                        <th className="py-2.5 px-3">Current</th>
                        <th className="py-2.5 px-3">Recommended</th>
                        <th className="py-2.5 px-3.5">Cost Rationale</th>
                        <th className="py-2.5 px-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70 text-zinc-300">
                      {tierData.recommendations.map((rec) => {
                        const needsOpt = rec.current_tier !== rec.recommended_tier;
                        return (
                          <tr key={rec.file_id} className={`hover:bg-zinc-900/60 ${needsOpt ? 'bg-zinc-900/30' : ''}`}>
                            <td className="py-2 px-3.5 font-medium text-zinc-200 truncate max-w-[180px]">{rec.original_filename}</td>
                            <td className="py-2 px-3 text-zinc-400 tabular-nums">{formatBytes(rec.size)}</td>
                            <td className="py-2 px-3 text-zinc-400">{rec.days_unaccessed}d</td>
                            <td className="py-2 px-3">{rec.access_count}</td>
                            <td className="py-2 px-3">{getTierBadge(rec.current_tier)}</td>
                            <td className="py-2 px-3">{getTierBadge(rec.recommended_tier)}</td>
                            <td className="py-2 px-3.5 text-zinc-400 text-[11px] max-w-xs">{rec.reason}</td>
                            <td className="py-2 px-3.5 text-right whitespace-nowrap">
                              {needsOpt ? (
                                <button
                                  onClick={() => handleSetFileTier(rec.file_id, rec.recommended_tier)}
                                  className="px-2 py-1 text-xs font-medium rounded bg-zinc-100 hover:bg-white text-zinc-950 transition-colors shadow-sm"
                                >
                                  Migrate
                                </button>
                              ) : (
                                <select
                                  value={rec.current_tier}
                                  onChange={(e) => handleSetFileTier(rec.file_id, e.target.value)}
                                  className="px-2 py-1 text-xs rounded bg-zinc-900 border border-zinc-700 text-zinc-300 focus:outline-none"
                                >
                                  <option value="STANDARD">Standard</option>
                                  <option value="STANDARD_IA">Standard-IA</option>
                                  <option value="GLACIER_IR">Glacier IR</option>
                                  <option value="DEEP_ARCHIVE">Deep Archive</option>
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ======================= TAB 2: PREDICTIVE PREFETCHING ======================= */}
      {activeTab === 'prediction' && (
        <div className="space-y-4 font-mono">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1">
              <span className="text-[10px] uppercase text-zinc-500 block">Cache Hit Rate</span>
              <p className="text-2xl font-bold text-emerald-400 tabular-nums">{metrics ? metrics.hit_rate_percentage : 0}%</p>
              <p className="text-[10px] text-zinc-500">Markov prefetch accuracy</p>
            </div>
            <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1">
              <span className="text-[10px] uppercase text-zinc-500 block">Hits vs Misses</span>
              <p className="text-xl font-bold text-zinc-100 tabular-nums">
                {metrics ? metrics.total_hits : 0} <span className="text-xs font-normal text-emerald-400">Hits</span> / {metrics ? metrics.total_misses : 0} <span className="text-xs font-normal text-zinc-500">Misses</span>
              </p>
              <p className="text-[10px] text-zinc-500">Out of {metrics ? metrics.total_predictions : 0} predictions</p>
            </div>
            <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1">
              <span className="text-[10px] uppercase text-zinc-500 block">Cumulative Latency Saved</span>
              <p className="text-xl font-bold text-emerald-400 tabular-nums">
                {metrics ? metrics.total_time_saved_ms : 0} <span className="text-xs font-normal text-zinc-400">ms</span>
              </p>
              <p className="text-[10px] text-zinc-500">~{metrics ? metrics.estimated_seconds_saved : 0}s saved TTFB</p>
            </div>
            <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase text-zinc-500 block">Sequence Evaluation</span>
                <p className="text-[10px] text-zinc-400 mt-0.5">Cross-validate session history</p>
              </div>
              <button
                onClick={handleRunEvaluation}
                disabled={evaluating}
                className="mt-2 py-1 px-3 rounded-md text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors disabled:opacity-50"
              >
                {evaluating ? 'Evaluating...' : 'Run Benchmark'}
              </button>
            </div>
          </div>

          {/* Academic Evaluation Results */}
          {evalResult && (
            <div className="p-4 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-2">
              <span className="text-xs font-bold uppercase text-zinc-300 block">
                Offline Sequence Cross-Validation ({evalResult.total_evaluated_events} transition pairs)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase">Top-1 Accuracy</span>
                  <p className="text-xl font-bold text-zinc-100 mt-0.5 tabular-nums">{evalResult.precision_at_1}%</p>
                </div>
                <div className="p-3 rounded bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase">Top-3 (Top-K) Recall</span>
                  <p className="text-xl font-bold text-emerald-400 mt-0.5 tabular-nums">{evalResult.recall_at_3}%</p>
                </div>
                <div className="p-3 rounded bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase">Model Type</span>
                  <p className="text-xs font-bold text-zinc-200 mt-0.5">First-Order Markov Chain (Laplace)</p>
                </div>
              </div>
            </div>
          )}

          {/* Warmed Prefetch Queue */}
          <div className="bg-[#0c0d0e] border border-zinc-800 rounded-md p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase text-zinc-300">Warmed S3 Presigned URL Prefetch Queue</h3>
            {predLoading ? (
              <div className="h-32 flex flex-col items-center justify-center text-zinc-500 gap-2">
                <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs">Computing transition probability matrix...</p>
              </div>
            ) : predictions.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded">
                No access predictions generated yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {predictions.map((p) => (
                  <div key={p.file_id} className="p-3 rounded bg-zinc-900 border border-zinc-800 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                          {Math.round(p.confidence * 100)}% prob
                        </span>
                        <span className="text-[11px] text-zinc-500 tabular-nums">{formatBytes(p.size)}</span>
                      </div>
                      <h4 className="text-xs font-medium text-zinc-200 truncate">{p.original_filename}</h4>
                      <p className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5">{p.reason}</p>
                    </div>
                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500">{p.storage_tier}</span>
                      <a
                        href={p.prefetch_url || `http://localhost:8000${p.stream_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors"
                      >
                        Pre-Warmed URL
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= TAB 3: CAS DEDUPLICATION ======================= */}
      {activeTab === 'dedup' && (
        <div className="space-y-4 font-mono">
          {dedupLoading ? (
            <div className="h-48 flex flex-col items-center justify-center text-zinc-500 text-xs gap-2">
              <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
              <p>Scanning cryptographic CAS SHA-256 reference counters...</p>
            </div>
          ) : !dedupData ? (
            <div className="p-8 text-center text-zinc-500 text-xs">Failed to load deduplication analytics.</div>
          ) : (
            <>
              {/* Highlight Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1">
                  <span className="text-[10px] uppercase text-zinc-500 block">Deduplication Ratio</span>
                  <p className="text-2xl font-bold text-zinc-100 mt-1 tabular-nums">{dedupData.deduplication_ratio}&times;</p>
                  <p className="text-[10px] text-zinc-500">Logical volume vs S3 physical volume</p>
                </div>

                <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1">
                  <span className="text-[10px] uppercase text-zinc-500 block">Storage Footprint Saved</span>
                  <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">{formatBytes(dedupData.bytes_saved_by_dedup)}</p>
                  <p className="text-[10px] text-zinc-500">{dedupData.savings_percentage}% space reduction</p>
                </div>

                <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1">
                  <span className="text-[10px] uppercase text-zinc-500 block">Unique Physical Blobs</span>
                  <p className="text-xl font-bold text-zinc-100 mt-1 tabular-nums">
                    {dedupData.total_physical_objects} <span className="text-xs font-normal text-zinc-400">S3 blobs</span>
                  </p>
                  <p className="text-[10px] text-zinc-500">Backing {dedupData.total_logical_files} logical files</p>
                </div>

                <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1">
                  <span className="text-[10px] uppercase text-zinc-500 block">Monthly Invoiced Cost Saved</span>
                  <p className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">${dedupData.monthly_cost_saved_usd.toFixed(4)}</p>
                  <p className="text-[10px] text-zinc-500">Direct S3 storage savings</p>
                </div>
              </div>

              {/* Deduplication Mechanism Explainer */}
              <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <h3 className="text-xs font-bold text-zinc-200">
                      Content-Addressable Storage (CAS) Pipeline
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-400 max-w-2xl">
                    Every uploaded payload is fingerprinted via SHA-256. When duplicate content is uploaded across tenants or directories, the platform links the record to existing S3 backing blocks, updating reference counters and bypassing cloud upload bandwidth entirely.
                  </p>
                </div>
                <button
                  onClick={loadDedup}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-200 shrink-0 transition-colors"
                >
                  Refresh Hashes
                </button>
              </div>

              {/* Deduplicated Files Table */}
              <div className="bg-[#0c0d0e] border border-zinc-800 rounded-md overflow-hidden">
                <div className="p-3.5 border-b border-zinc-800">
                  <h3 className="text-xs font-bold uppercase text-zinc-300">Single-Instance CAS Fingerprints</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Physical S3 objects shared across multiple user instances with reference counting</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900/70 text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800 select-none">
                      <tr>
                        <th className="py-2.5 px-3.5">Filename</th>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3">SHA-256 Digest</th>
                        <th className="py-2.5 px-3">Ref Count</th>
                        <th className="py-2.5 px-3.5 text-right">Bandwidth Saved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70 text-zinc-300">
                      {dedupData.deduplicated_files.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-zinc-500">
                            No duplicate files detected. Upload identical payloads across folders or accounts to observe single-instance deduplication.
                          </td>
                        </tr>
                      ) : (
                        dedupData.deduplicated_files.map((item) => (
                          <tr key={item.file_id} className="hover:bg-zinc-900/60">
                            <td className="py-2 px-3.5 font-medium text-zinc-200">{item.original_filename}</td>
                            <td className="py-2 px-3 text-zinc-400 tabular-nums">{formatBytes(item.size)}</td>
                            <td className="py-2 px-3 text-zinc-400">{item.content_hash.substring(0, 16)}...</td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700">
                                {item.reference_count}&times; references
                              </span>
                            </td>
                            <td className="py-2 px-3.5 text-right text-emerald-400 font-bold tabular-nums">
                              +{formatBytes(item.bandwidth_saved_bytes)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ======================= TAB 4: ADAPTIVE COMPRESSION ======================= */}
      {activeTab === 'compression' && (
        <div className="space-y-4 font-mono">
          {compMessage && (
            <div className="p-3 rounded-md bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs flex items-center justify-between">
              <span>{compMessage}</span>
              <button onClick={() => setCompMessage(null)} className="text-zinc-500 hover:text-zinc-300 ml-2">&times;</button>
            </div>
          )}

          {compLoading ? (
            <div className="h-48 flex flex-col items-center justify-center text-zinc-500 text-xs gap-2">
              <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
              <p>Scanning compressible text, JSON, and source code files...</p>
            </div>
          ) : !compData ? (
            <div className="p-8 text-center text-zinc-500 text-xs">Failed to load compression analytics.</div>
          ) : (
            <>
              {/* Highlight Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1">
                  <span className="text-[10px] uppercase text-zinc-500 block">Total Volume Saved</span>
                  <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">{formatBytes(compData.net_bytes_saved)}</p>
                  <p className="text-[10px] text-zinc-500">{compData.overall_compression_pct}% space compaction</p>
                </div>

                <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1">
                  <span className="text-[10px] uppercase text-zinc-500 block">Compressed Objects</span>
                  <p className="text-xl font-bold text-zinc-100 mt-1 tabular-nums">
                    {compData.compressed_files_count} <span className="text-xs font-normal text-zinc-400">files</span>
                  </p>
                  <p className="text-[10px] text-zinc-500">Lossless Gzip level 6</p>
                </div>

                <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 space-y-1">
                  <span className="text-[10px] uppercase text-zinc-500 block">Eligible Candidates</span>
                  <p className="text-xl font-bold text-zinc-100 mt-1 tabular-nums">{compData.compressible_candidates_count}</p>
                  <p className="text-[10px] text-zinc-500">Text, JSON, CSV, PDF formats</p>
                </div>

                <div className="p-3.5 rounded-md bg-[#0c0d0e] border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase text-zinc-500 block">Bulk Compaction</span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Compress all uncompressed cold files</p>
                  </div>
                  <button
                    onClick={handleBulkCompressCold}
                    disabled={compressing}
                    className="mt-2 py-1 px-3 rounded-md text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors disabled:opacity-50"
                  >
                    {compressing ? 'Compressing...' : 'Bulk Compress Cold Files'}
                  </button>
                </div>
              </div>

              {/* Candidates & Active Compressed Lists */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Candidates */}
                <div className="bg-[#0c0d0e] border border-zinc-800 rounded-md p-3.5 space-y-3">
                  <h3 className="text-xs font-bold uppercase text-zinc-300">
                    Compressible Candidates ({compData.candidates.length})
                  </h3>
                  <div className="divide-y divide-zinc-800 max-h-72 overflow-y-auto">
                    {compData.candidates.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-6 text-center">No uncompressed text or data files found.</p>
                    ) : (
                      compData.candidates.map((c) => (
                        <div key={c.file_id} className="py-2 flex items-center justify-between gap-3 text-xs">
                          <div className="truncate">
                            <p className="font-medium text-zinc-200 truncate">{c.original_filename}</p>
                            <p className="text-[10px] text-zinc-500 tabular-nums">{formatBytes(c.size)} • {c.mime_type}</p>
                          </div>
                          <button
                            onClick={() => handleCompressFile(c.file_id)}
                            disabled={compressing}
                            className="px-2 py-1 text-[11px] font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 shrink-0 transition-colors"
                          >
                            Compress
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Compressed Assets */}
                <div className="bg-[#0c0d0e] border border-zinc-800 rounded-md p-3.5 space-y-3">
                  <h3 className="text-xs font-bold uppercase text-zinc-300">
                    Active Compressed Assets ({compData.compressed_items.length})
                  </h3>
                  <div className="divide-y divide-zinc-800 max-h-72 overflow-y-auto">
                    {compData.compressed_items.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-6 text-center">No compressed assets yet.</p>
                    ) : (
                      compData.compressed_items.map((ci) => (
                        <div key={ci.file_id} className="py-2 flex items-center justify-between gap-3 text-xs">
                          <div className="truncate">
                            <p className="font-medium text-zinc-200 truncate">{ci.original_filename}</p>
                            <p className="text-[10px] text-zinc-500 tabular-nums">
                              {formatBytes(ci.original_size)} &rarr; <span className="text-emerald-400 font-semibold">{formatBytes(ci.compressed_size)}</span>
                            </p>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 shrink-0 tabular-nums">
                            -{ci.ratio_percent}%
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
