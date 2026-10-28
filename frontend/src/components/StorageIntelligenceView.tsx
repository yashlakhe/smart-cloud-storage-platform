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
    } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
      console.error('Failed to load compression analytics:', err);
    } finally {
      setCompLoading(false);
    }
  };

  // Lazy load data for the active tab only (cached on tab switch)
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
    } catch (err: any) {
      setTierMessage(`Error applying tier optimization: ${err.message}`);
    } finally {
      setTierOptimizing(false);
    }
  };

  const handleSetFileTier = async (fileId: string, newTier: string) => {
    try {
      await setSingleFileTier(fileId, newTier);
      await loadTiering();
    } catch (err: any) {
      alert(`Failed to set file tier: ${err.message}`);
    }
  };

  const handleRunEvaluation = async () => {
    try {
      setEvaluating(true);
      const res = await evaluatePredictionModel();
      setEvalResult(res);
      setMetrics(res.metrics);
    } catch (err: any) {
      alert(`Failed to run prediction evaluation: ${err.message}`);
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
    } catch (err: any) {
      alert(`Failed to compress file: ${err.message}`);
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
    } catch (err: any) {
      setCompMessage(`Error during bulk compression: ${err.message}`);
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
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Standard</span>;
      case 'STANDARD_IA':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Standard-IA</span>;
      case 'GLACIER_IR':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Glacier IR</span>;
      case 'DEEP_ARCHIVE':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">Deep Archive</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-700 text-zinc-300">{tier}</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Storage Intelligence Hub
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Autonomous Optimization
                </span>
              </h1>
              <p className="text-sm text-zinc-400 mt-0.5">
                Cloud Economics Tiering • Markov Prefetching • CAS Deduplication • Adaptive Compression
              </p>
            </div>
          </div>
        </div>

        {/* 4-Way Tab Switcher & Refresh */}
        <div className="flex items-center gap-2.5 self-start lg:self-auto">
          <div className="inline-flex p-1 rounded-xl bg-zinc-900 border border-zinc-800 overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('tiering')}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'tiering'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tiering & Cost
          </button>
          <button
            onClick={() => setActiveTab('prediction')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'prediction'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Predictive Prefetch
          </button>
          <button
            onClick={() => setActiveTab('dedup')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'dedup'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            CAS Deduplication
          </button>
          <button
            onClick={() => setActiveTab('compression')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'compression'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Adaptive Compression
          </button>
        </div>
          <button
            onClick={refreshActiveTab}
            title="Refresh active tab metrics"
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer shadow-sm shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ======================= TAB 1: STORAGE TIERING ======================= */}
      {activeTab === 'tiering' && (
        <div className="space-y-6">
          {tierMessage && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">{tierMessage}</span>
              </div>
              <button onClick={() => setTierMessage(null)} className="text-zinc-500 hover:text-zinc-300">
                &times;
              </button>
            </div>
          )}

          {tierLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-500 gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm">Analyzing cloud storage lifecycle & cost models...</p>
            </div>
          ) : !tierData ? (
            <div className="p-8 text-center text-zinc-500">Failed to load tiering analysis.</div>
          ) : (
            <>
              {/* Cost Economics Highlight Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm relative overflow-hidden">
                  <p className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Baseline Cost (All Standard)</p>
                  <p className="text-2xl font-bold text-white mt-2">${tierData.baseline_monthly_cost_usd.toFixed(4)} <span className="text-xs font-normal text-zinc-500">/ mo</span></p>
                  <p className="text-xs text-zinc-500 mt-1">If all files remain in un-tiered S3 Standard</p>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm relative overflow-hidden">
                  <p className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Current Monthly Cost</p>
                  <p className="text-2xl font-bold text-white mt-2">${tierData.current_monthly_cost_usd.toFixed(4)} <span className="text-xs font-normal text-zinc-500">/ mo</span></p>
                  <p className="text-xs text-zinc-500 mt-1">Reflects currently assigned storage classes</p>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-900/80 to-zinc-900 border border-emerald-500/30 backdrop-blur-sm relative overflow-hidden shadow-lg shadow-emerald-950/20">
                  <p className="text-xs font-semibold tracking-wider uppercase text-emerald-400">Optimized Potential Savings</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-2xl font-bold text-emerald-300">${tierData.potential_monthly_savings_usd.toFixed(4)}</p>
                    <span className="text-sm font-semibold text-emerald-400">({tierData.savings_percentage}% saved)</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    {tierData.pending_recommendations_count} files pending tier optimization
                  </p>
                  <button
                    onClick={handleApplyAllTiering}
                    disabled={tierOptimizing || tierData.pending_recommendations_count === 0}
                    className="mt-3 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all duration-150 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
                  >
                    {tierOptimizing ? 'Optimizing...' : `Apply All Optimizations (${tierData.pending_recommendations_count})`}
                  </button>
                </div>
              </div>

              {/* S3 Storage Classes Distribution */}
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-4">
                  Storage Tier Distribution & Rate Matrix
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {tierData.tier_breakdown.map((t) => (
                    <div key={t.tier} className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-white">{t.label}</span>
                          <span className="text-xs font-mono text-indigo-400">${t.rate_per_gb_mo}/GB</span>
                        </div>
                        <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{t.description}</p>
                      </div>
                      <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                        <span className="text-zinc-400">{t.file_count} files ({formatBytes(t.total_bytes)})</span>
                        <span className="font-semibold text-zinc-300">{t.percent_of_storage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations Table */}
              <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
                <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white">Intelligent Lifecycle Recommendations</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Evaluated using idle duration, retrieval count, and AWS minimum billable size constraints (128 KB)
                    </p>
                  </div>
                  <button onClick={loadTiering} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs">
                    Refresh
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-950/60 text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                      <tr>
                        <th className="py-3.5 px-4">Filename</th>
                        <th className="py-3.5 px-3">Size</th>
                        <th className="py-3.5 px-3">Idle Days</th>
                        <th className="py-3.5 px-3">Accesses</th>
                        <th className="py-3.5 px-3">Current</th>
                        <th className="py-3.5 px-3">Recommended</th>
                        <th className="py-3.5 px-4">Rationale</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                      {tierData.recommendations.map((rec) => {
                        const needsOpt = rec.current_tier !== rec.recommended_tier;
                        return (
                          <tr key={rec.file_id} className={`hover:bg-zinc-800/30 ${needsOpt ? 'bg-indigo-950/10' : ''}`}>
                            <td className="py-3 px-4 font-medium text-white truncate max-w-[180px]">{rec.original_filename}</td>
                            <td className="py-3 px-3 text-xs text-zinc-400">{formatBytes(rec.size)}</td>
                            <td className="py-3 px-3 text-xs text-zinc-400">{rec.days_unaccessed}d</td>
                            <td className="py-3 px-3 text-xs font-mono">{rec.access_count}</td>
                            <td className="py-3 px-3">{getTierBadge(rec.current_tier)}</td>
                            <td className="py-3 px-3">{getTierBadge(rec.recommended_tier)}</td>
                            <td className="py-3 px-4 text-xs text-zinc-400 max-w-xs">{rec.reason}</td>
                            <td className="py-3 px-4 text-right">
                              {needsOpt ? (
                                <button
                                  onClick={() => handleSetFileTier(rec.file_id, rec.recommended_tier)}
                                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                                >
                                  Apply
                                </button>
                              ) : (
                                <select
                                  value={rec.current_tier}
                                  onChange={(e) => handleSetFileTier(rec.file_id, e.target.value)}
                                  className="px-2 py-1 text-xs rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300"
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <p className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Prefetch Cache Hit Rate</p>
              <p className="text-3xl font-extrabold text-indigo-400 mt-2">{metrics ? metrics.hit_rate_percentage : 0}%</p>
              <p className="text-xs text-zinc-500 mt-1">Accuracy of predictive warming</p>
            </div>
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <p className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Cache Hits vs Misses</p>
              <p className="text-2xl font-bold text-white mt-2">
                {metrics ? metrics.total_hits : 0} <span className="text-sm font-normal text-emerald-400">Hits</span> / {metrics ? metrics.total_misses : 0} <span className="text-sm font-normal text-zinc-500">Misses</span>
              </p>
              <p className="text-xs text-zinc-500 mt-1">Total {metrics ? metrics.total_predictions : 0} predictions</p>
            </div>
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <p className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Total Latency Saved</p>
              <p className="text-2xl font-bold text-emerald-400 mt-2">
                {metrics ? metrics.total_time_saved_ms : 0} <span className="text-sm font-normal text-zinc-400">ms</span>
              </p>
              <p className="text-xs text-zinc-500 mt-1">~{metrics ? metrics.estimated_seconds_saved : 0}s saved</p>
            </div>
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Sequence Benchmark</p>
                <p className="text-xs text-zinc-500 mt-1">Cross-validation on logs</p>
              </div>
              <button
                onClick={handleRunEvaluation}
                disabled={evaluating}
                className="mt-3 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {evaluating ? 'Evaluating...' : 'Run Model Evaluation'}
              </button>
            </div>
          </div>

          {/* Academic Evaluation Results */}
          {evalResult && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/30 to-purple-950/20 border border-indigo-500/30 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-300">
                Offline Sequence Cross-Validation Results ({evalResult.total_evaluated_events} transitions)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <span className="text-xs text-zinc-400 uppercase">Precision@1</span>
                  <p className="text-2xl font-extrabold text-white mt-1">{evalResult.precision_at_1}%</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <span className="text-xs text-zinc-400 uppercase">Recall@3</span>
                  <p className="text-2xl font-extrabold text-emerald-400 mt-1">{evalResult.recall_at_3}%</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <span className="text-xs text-zinc-400 uppercase">Model</span>
                  <p className="text-sm font-bold text-white mt-1">Hybrid Markov-Spatial (v1.0)</p>
                </div>
              </div>
            </div>
          )}

          {/* Warmed Prefetch Queue */}
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">AI Up Next & Warmed Prefetch Queue</h3>
            {predLoading ? (
              <div className="h-40 flex flex-col items-center justify-center text-zinc-500 gap-2">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs">Computing Markov transition probabilities...</p>
              </div>
            ) : predictions.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                No file predictions available yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {predictions.map((p) => (
                <div key={p.file_id} className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                        {Math.round(p.confidence * 100)}% match
                      </span>
                      <span className="text-xs text-zinc-500">{formatBytes(p.size)}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-white truncate">{p.original_filename}</h4>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{p.reason}</p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-zinc-800/60 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{p.storage_tier}</span>
                    <a
                      href={p.prefetch_url || `http://localhost:8000${p.stream_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      Prefetched (0ms)
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
        <div className="space-y-6">
          {dedupLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-500 gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm">Calculating cryptographic CAS hash single-instance storage...</p>
            </div>
          ) : !dedupData ? (
            <div className="p-8 text-center text-zinc-500">Failed to load deduplication analytics.</div>
          ) : (
            <>
              {/* Highlight Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                  <p className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Deduplication Ratio</p>
                  <p className="text-3xl font-extrabold text-indigo-400 mt-2">{dedupData.deduplication_ratio}&times;</p>
                  <p className="text-xs text-zinc-500 mt-1">Logical vs. physical S3 storage efficiency</p>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                  <p className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Storage Footprint Saved</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-2">{formatBytes(dedupData.bytes_saved_by_dedup)}</p>
                  <p className="text-xs text-zinc-500 mt-1">{dedupData.savings_percentage}% storage reduction</p>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                  <p className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Single-Instance Objects</p>
                  <p className="text-2xl font-bold text-white mt-2">
                    {dedupData.total_physical_objects} <span className="text-sm font-normal text-zinc-400">S3 objects</span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Serving {dedupData.total_logical_files} logical user files</p>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                  <p className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Monthly S3 Cost Saved</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-2">${dedupData.monthly_cost_saved_usd.toFixed(4)}</p>
                  <p className="text-xs text-zinc-500 mt-1">Direct single-instance AWS savings</p>
                </div>
              </div>

              {/* Deduplication Mechanism Explainer */}
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                    Content-Addressable Storage (CAS) Pipeline Active
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                    Every uploaded file is cryptographically fingerprinted using SHA-256. When identical files are uploaded across users or folders, the platform performs an instant zero-byte link to existing S3 backing blocks, eliminating upload transfer time and duplicate storage costs.
                  </p>
                </div>
                <button
                  onClick={loadDedup}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white shrink-0 transition-colors"
                >
                  Refresh Fingerprints
                </button>
              </div>

              {/* Deduplicated Files Table */}
              <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
                <div className="p-5 border-b border-zinc-800">
                  <h3 className="text-base font-semibold text-white">Deduplicated Objects & Bandwidth Savings</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Physical S3 objects shared across multiple user instances with reference counting</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-950/60 text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                      <tr>
                        <th className="py-3 px-4">Filename</th>
                        <th className="py-3 px-3">Size</th>
                        <th className="py-3 px-3">SHA-256 Fingerprint</th>
                        <th className="py-3 px-3">Instances</th>
                        <th className="py-3 px-4 text-right">Bandwidth Saved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                      {dedupData.deduplicated_files.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-zinc-500">
                            No duplicate files uploaded yet. Upload the same file across multiple folders or users to observe instant CAS deduplication.
                          </td>
                        </tr>
                      ) : (
                        dedupData.deduplicated_files.map((item) => (
                          <tr key={item.file_id} className="hover:bg-zinc-800/30">
                            <td className="py-3 px-4 font-medium text-white">{item.original_filename}</td>
                            <td className="py-3 px-3 text-xs text-zinc-400">{formatBytes(item.size)}</td>
                            <td className="py-3 px-3 text-xs font-mono text-indigo-400">{item.content_hash.substring(0, 16)}...</td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {item.reference_count}&times; references
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-emerald-400 text-xs font-bold">
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
        <div className="space-y-6">
          {compMessage && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-between animate-fadeIn">
              <span className="text-sm font-medium">{compMessage}</span>
              <button onClick={() => setCompMessage(null)} className="text-zinc-500 hover:text-zinc-300">&times;</button>
            </div>
          )}

          {compLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-500 gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm">Scanning compressible text, code, and dataset files...</p>
            </div>
          ) : !compData ? (
            <div className="p-8 text-center text-zinc-500">Failed to load compression analytics.</div>
          ) : (
            <>
              {/* Highlight Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                  <p className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Total Compression Savings</p>
                  <p className="text-3xl font-extrabold text-emerald-400 mt-2">{formatBytes(compData.net_bytes_saved)}</p>
                  <p className="text-xs text-zinc-500 mt-1">{compData.overall_compression_pct}% space reduction</p>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                  <p className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Compressed Assets</p>
                  <p className="text-2xl font-bold text-white mt-2">
                    {compData.compressed_files_count} <span className="text-sm font-normal text-zinc-400">files</span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Lossless gzip cold compression</p>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                  <p className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Eligible Candidates</p>
                  <p className="text-2xl font-bold text-indigo-400 mt-2">{compData.compressible_candidates_count}</p>
                  <p className="text-xs text-zinc-500 mt-1">Uncompressed text, PDF, JSON, CSV files</p>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Cold-Tier Policy</p>
                    <p className="text-xs text-zinc-500 mt-1">Compress all files in IA / Glacier</p>
                  </div>
                  <button
                    onClick={handleBulkCompressCold}
                    disabled={compressing}
                    className="mt-3 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {compressing ? 'Compressing...' : 'Bulk Compress Cold Files'}
                  </button>
                </div>
              </div>

              {/* Compressed Files and Candidates Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Candidates */}
                <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                      Compressible Candidates ({compData.candidates.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-zinc-800/60 max-h-80 overflow-y-auto">
                    {compData.candidates.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-6 text-center">No uncompressed text or data files found.</p>
                    ) : (
                      compData.candidates.map((c) => (
                        <div key={c.file_id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                          <div className="truncate">
                            <p className="font-semibold text-white truncate">{c.original_filename}</p>
                            <p className="text-zinc-500">{formatBytes(c.size)} • {c.mime_type}</p>
                          </div>
                          <button
                            onClick={() => handleCompressFile(c.file_id)}
                            disabled={compressing}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
                          >
                            Compress
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Compressed Assets */}
                <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                    Active Compressed Assets ({compData.compressed_items.length})
                  </h3>
                  <div className="divide-y divide-zinc-800/60 max-h-80 overflow-y-auto">
                    {compData.compressed_items.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-6 text-center">No compressed assets yet.</p>
                    ) : (
                      compData.compressed_items.map((ci) => (
                        <div key={ci.file_id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                          <div className="truncate">
                            <p className="font-semibold text-white truncate">{ci.original_filename}</p>
                            <p className="text-zinc-500">
                              {formatBytes(ci.original_size)} &rarr; <span className="text-emerald-400 font-semibold">{formatBytes(ci.compressed_size)}</span>
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shrink-0">
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
