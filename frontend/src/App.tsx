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

  // Upload handler
  const handleUpload = async (file: File) => {
    try {
      await uploadFile(file, currentFolder ? currentFolder.id : null);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Upload failed');
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

  // Download file handler
  const handleDownload = async (file: FileRecord) => {
    try {
      await downloadFileStream(file.id, file.original_filename);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Download failed');
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
      />

      {/* Main Workspace: Sidebar + Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSearchQuery('');
          }}
          onOpenUpload={() => {
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
          />
        )}

        {activeTab === 'shared' && <SharedWithMe />}

        {(activeTab === 'dashboard' || activeTab === 'storage') && (
          <DashboardView onNavigateToTab={(tab) => setActiveTab(tab)} />
        )}

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
