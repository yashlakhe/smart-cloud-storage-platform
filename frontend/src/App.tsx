import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import type { ActiveTab } from './components/Sidebar';
import { FileManager } from './components/FileManager';
import { ShareModal } from './components/ShareModal';
import { SharedWithMe } from './components/SharedWithMe';
import { DashboardView } from './components/DashboardView';
import { StorageIntelligenceView } from './components/StorageIntelligenceView';
import { ActivityLogView } from './components/ActivityLogView';
import { HealthView } from './components/HealthView';

import type { FileRecord, Folder, StorageStats } from './services/api';

import {
  createFolder,
  deleteFile,
  deleteFolder,
  downloadFileStream,
  getStorageStats,
  listFiles,
  listFolders,
  renameFile,
  renameFolder,
  uploadFile,
} from './services/api';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('my-files');
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [shareTarget, setShareTarget] = useState<FileRecord | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);

  interface DownloadToastState {
    fileId: string;
    filename: string;
    status: 'downloading' | 'choosing_location' | 'saving' | 'complete' | 'cancelled';
    method?: 'picker' | 'browser';
  }

  interface UploadToastState {
    filename: string;
    status: 'uploading' | 'complete' | 'error';
    errorMsg?: string;
  }

  const [downloadToast, setDownloadToast] = useState<DownloadToastState | null>(null);
  const [uploadToast, setUploadToast] = useState<UploadToastState | null>(null);

  // Fetch folders and files in current folder
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedFolders, fetchedFiles, fetchedStats] = await Promise.all([
        listFolders(currentFolder ? currentFolder.id : null),
        listFiles(currentFolder ? currentFolder.id : null, searchQuery),
        getStorageStats(),
      ]);
      setFolders(fetchedFolders);
      setFiles(fetchedFiles);
      setStats(fetchedStats);
    } catch {
      // Ignore initial load network errors
    } finally {
      setLoading(false);
    }
  }, [currentFolder, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigate folder helper
  const handleNavigateFolder = (folder: Folder | null) => {
    setSearchQuery('');
    if (folder === null) {
      setCurrentFolder(null);
      setFolderPath([]);
      return;
    }
    const idx = folderPath.findIndex((f) => f.id === folder.id);
    if (idx >= 0) {
      setFolderPath(folderPath.slice(0, idx + 1));
    } else {
      setFolderPath([...folderPath, folder]);
    }
    setCurrentFolder(folder);
  };

  // Upload handler with live animation state and notifications
  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadingFileName(file.name);
    setUploadToast({
      filename: file.name,
      status: 'uploading',
    });

    try {
      await uploadFile(file, currentFolder ? currentFolder.id : null);
      setUploadToast({
        filename: file.name,
        status: 'complete',
      });
      await loadData();
      setTimeout(() => {
        setUploadToast((prev) => (prev?.status === 'complete' ? null : prev));
      }, 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadToast({
        filename: file.name,
        status: 'error',
        errorMsg: msg,
      });
      setTimeout(() => {
        setUploadToast(null);
      }, 5000);
    } finally {
      setIsUploading(false);
      setUploadingFileName(null);
    }
  };

  // Create folder handler
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName.trim(), currentFolder ? currentFolder.id : null);
      setNewFolderName('');
      setShowNewFolderModal(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create folder');
    }
  };

  // Download file handler with location selection and live feedback
  const handleDownload = async (file: FileRecord, selectLocation = true) => {
    setDownloadingFileId(file.id);
    setDownloadToast({
      fileId: file.id,
      filename: file.original_filename,
      status: 'downloading',
    });

    try {
      const result = await downloadFileStream(file.id, file.original_filename, {
        mimeType: file.mime_type,
        selectLocation,
        onStatusChange: (status) => {
          setDownloadToast((prev) =>
            prev && prev.fileId === file.id ? { ...prev, status } : prev
          );
        },
      });

      if (result.cancelled) {
        setDownloadToast({
          fileId: file.id,
          filename: file.original_filename,
          status: 'cancelled',
        });
        setTimeout(() => {
          setDownloadToast((prev) => (prev?.status === 'cancelled' ? null : prev));
        }, 2500);
      } else {
        setDownloadToast({
          fileId: file.id,
          filename: file.original_filename,
          status: 'complete',
          method: result.method,
        });
        setTimeout(() => {
          setDownloadToast((prev) => (prev?.status === 'complete' ? null : prev));
        }, 3500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      alert(`Download error: ${msg}`);
      setDownloadToast(null);
    } finally {
      setDownloadingFileId(null);
    }
  };

  // Rename file handler
  const handleRenameFile = async (file: FileRecord, newName: string) => {
    try {
      await renameFile(file.id, newName);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Rename failed');
    }
  };

  // Delete file handler
  const handleDeleteFile = async (file: FileRecord) => {
    try {
      await deleteFile(file.id);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // Rename folder handler
  const handleRenameFolder = async (folder: Folder, newName: string) => {
    try {
      await renameFolder(folder.id, newName);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Rename failed');
    }
  };

  // Delete folder handler
  const handleDeleteFolder = async (folder: Folder) => {
    try {
      await deleteFolder(folder.id);
      if (currentFolder?.id === folder.id) {
        handleNavigateFolder(null);
      } else {
        await loadData();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Top Navigation */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        stats={stats}
        isSearching={loading && !!searchQuery}
      />

      {/* Main Workspace: Sidebar + Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSearchQuery('');
          }}
          isUploading={isUploading}
          onOpenUpload={() => {
            if (isUploading) return;
            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleUpload(file);
            };
            input.click();
          }}
          onOpenNewFolder={() => setShowNewFolderModal(true)}
        />

        {/* Tab Content */}
        {activeTab === 'my-files' && (
          <FileManager
            currentFolder={currentFolder}
            folderPath={folderPath}
            folders={folders}
            files={files}
            searchQuery={searchQuery}
            loading={loading}
            onNavigateFolder={handleNavigateFolder}
            onUploadFile={handleUpload}
            onOpenShareModal={(f) => setShareTarget(f)}
            onDownloadFile={handleDownload}
            onRenameFile={handleRenameFile}
            onDeleteFile={handleDeleteFile}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            downloadingFileId={downloadingFileId}
            isUploading={isUploading}
            uploadingFileName={uploadingFileName}
          />
        )}

        {activeTab === 'shared' && <SharedWithMe />}

        {(activeTab === 'dashboard' || activeTab === 'storage') && (
          <DashboardView onNavigateToTab={(tab) => setActiveTab(tab)} />
        )}

        {activeTab === 'intelligence' && <StorageIntelligenceView />}

        {activeTab === 'activity' && <ActivityLogView />}

        {activeTab === 'health' && <HealthView />}
      </div>


      {/* Share Modal */}
      {shareTarget && (
        <ShareModal
          file={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Create New Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/20"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Status HUD: Upload & Download Notifications with Live Animations */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        {/* Upload Status Card */}
        {uploadToast && (
          <div className="pointer-events-auto bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 mt-0.5">
                {uploadToast.status === 'uploading' ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : uploadToast.status === 'complete' ? (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-white truncate">{uploadToast.filename}</p>
                  <button
                    onClick={() => setUploadToast(null)}
                    className="text-slate-400 hover:text-white text-xs ml-2"
                  >
                    ×
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {uploadToast.status === 'uploading' && 'Ingesting & generating CAS hash...'}
                  {uploadToast.status === 'complete' && 'Uploaded & verified successfully!'}
                  {uploadToast.status === 'error' && (uploadToast.errorMsg || 'Upload failed')}
                </p>

                {uploadToast.status === 'uploading' && (
                  <div className="mt-2.5 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                    <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 rounded-full w-full animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Download Status Card */}
        {downloadToast && (
          <div className="pointer-events-auto bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 mt-0.5">
                {downloadToast.status === 'downloading' || downloadToast.status === 'saving' ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : downloadToast.status === 'choosing_location' ? (
                  <svg className="w-5 h-5 text-amber-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                ) : downloadToast.status === 'complete' ? (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-white truncate">{downloadToast.filename}</p>
                  <button
                    onClick={() => setDownloadToast(null)}
                    className="text-slate-400 hover:text-white text-xs ml-2"
                  >
                    ×
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {downloadToast.status === 'downloading' && 'Fetching data from cloud storage...'}
                  {downloadToast.status === 'choosing_location' && 'Select save folder in file dialog...'}
                  {downloadToast.status === 'saving' && 'Writing file stream to disk...'}
                  {downloadToast.status === 'complete' &&
                    (downloadToast.method === 'picker'
                      ? 'Saved to your selected directory!'
                      : 'Saved to default downloads folder')}
                  {downloadToast.status === 'cancelled' && 'Download cancelled'}
                </p>

                {(downloadToast.status === 'downloading' || downloadToast.status === 'saving') && (
                  <div className="mt-2.5 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                    <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 rounded-full w-full animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Root: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm font-medium text-slate-400">Loading Smart Cloud Storage...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return <Dashboard />;
};

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
