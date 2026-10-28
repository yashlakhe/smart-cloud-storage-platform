import React, { useState } from 'react';
import type { FileRecord, Folder } from '../services/api';

interface FileManagerProps {
  currentFolder: Folder | null;
  folderPath: Folder[];
  folders: Folder[];
  files: FileRecord[];
  searchQuery: string;
  loading: boolean;
  onNavigateFolder: (folder: Folder | null) => void;
  onUploadFile: (file: File) => void;
  onOpenShareModal: (file: FileRecord) => void;
  onDownloadFile: (file: FileRecord, selectLocation?: boolean) => void;
  onRenameFile: (file: FileRecord, newName: string) => void;
  onDeleteFile: (file: FileRecord) => void;
  onRenameFolder: (folder: Folder, newName: string) => void;
  onDeleteFolder: (folder: Folder) => void;
  downloadingFileId?: string | null;
  isUploading?: boolean;
  uploadingFileName?: string | null;
}

export const FileManager: React.FC<FileManagerProps> = ({
  currentFolder,
  folderPath,
  folders,
  files,
  searchQuery,
  loading,
  onNavigateFolder,
  onUploadFile,
  onOpenShareModal,
  onDownloadFile,
  onRenameFile,
  onDeleteFile,
  onRenameFolder,
  onDeleteFolder,
  downloadingFileId = null,
  isUploading = false,
  uploadingFileName = null,
}) => {
  const [renameTarget, setRenameTarget] = useState<{ type: 'file' | 'folder'; item: FileRecord | Folder } | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'file' | 'folder'; item: FileRecord | Folder } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeDownloadMenuId, setActiveDownloadMenuId] = useState<string | null>(null);

  React.useEffect(() => {
    const handleClickOutside = () => setActiveDownloadMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getFileIcon = (mimeType: string, filename: string) => {
    const mt = mimeType.toLowerCase();
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    if (mt.startsWith('image/')) {
      return (
        <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </span>
      );
    }
    if (mt.startsWith('video/') || mt.startsWith('audio/')) {
      return (
        <span className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
      );
    }
    if (mt.includes('pdf')) {
      return (
        <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </span>
      );
    }
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
      return (
        <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </span>
      );
    }
    if (['ts', 'tsx', 'js', 'jsx', 'py', 'json', 'html', 'css'].includes(ext)) {
      return (
        <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </span>
      );
    }
    return (
      <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </span>
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        onUploadFile(e.dataTransfer.files[i]);
      }
    }
  };

  const handleStartRename = (type: 'file' | 'folder', item: FileRecord | Folder) => {
    setRenameTarget({ type, item });
    setRenameInput(type === 'file' ? (item as FileRecord).original_filename : (item as Folder).name);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameInput.trim()) return;

    if (renameTarget.type === 'file') {
      onRenameFile(renameTarget.item as FileRecord, renameInput.trim());
    } else {
      onRenameFolder(renameTarget.item as Folder, renameInput.trim());
    }
    setRenameTarget(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'file') {
      onDeleteFile(deleteTarget.item as FileRecord);
    } else {
      onDeleteFolder(deleteTarget.item as Folder);
    }
    setDeleteTarget(null);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`flex-1 p-6 space-y-6 overflow-y-auto transition-colors ${
        isDragOver ? 'bg-blue-600/5 ring-2 ring-blue-500/50 ring-inset' : ''
      }`}
    >
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-2 text-sm font-medium text-slate-400">
          <button
            onClick={() => onNavigateFolder(null)}
            className={`hover:text-white transition-colors flex items-center gap-1.5 ${
              currentFolder === null ? 'text-white font-semibold' : ''
            }`}
          >
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>My Drive</span>
          </button>
          {folderPath.map((f, idx) => (
            <React.Fragment key={f.id}>
              <span className="text-slate-600">/</span>
              <button
                onClick={() => onNavigateFolder(f)}
                className={`hover:text-white transition-colors ${
                  idx === folderPath.length - 1 ? 'text-white font-semibold' : ''
                }`}
              >
                {f.name}
              </button>
            </React.Fragment>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Location Selection Mode Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="text-[11px]">Choose Save Location</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          </div>

          {/* Upload Button with In-Flight Loading Animation */}
          <label className={`cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium text-xs shadow-md transition-all ${
            isUploading
              ? 'bg-blue-600/60 cursor-not-allowed pointer-events-none text-blue-200'
              : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-blue-600/20'
          }`}>
            {isUploading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Upload File</span>
              </>
            )}
            <input
              type="file"
              disabled={isUploading}
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onUploadFile(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Uploading In-Flight Progress Banner */}
      {isUploading && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-500/30 shadow-lg shadow-blue-500/10 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
              <span className="font-semibold text-white">Uploading & Ingesting File</span>
              {uploadingFileName && (
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[11px] truncate max-w-xs">
                  {uploadingFileName}
                </span>
              )}
            </div>
            <span className="text-blue-400 text-[11px] font-mono animate-pulse">Hashing & Syncing...</span>
          </div>

          {/* Animated Shimmer Bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 w-full animate-pulse rounded-full" />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Deduplicating CAS SHA-256 blocks</span>
            <span>AWS S3 / Local Storage Sync</span>
          </div>
        </div>
      )}

      {/* Drag & Drop Prompt Banner (Optional / subtle) */}
      {isDragOver && (
        <div className="p-8 rounded-2xl border-2 border-dashed border-blue-500 bg-blue-600/10 text-center animate-pulse">
          <p className="text-blue-300 font-semibold text-sm">Drop files anywhere to upload instantly</p>
        </div>
      )}

      {/* Folders Section (Only if in root/folder view and folders exist) */}
      {!searchQuery && folders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Folders ({folders.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onDoubleClick={() => onNavigateFolder(folder)}
                className="group p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between cursor-pointer"
              >
                <div
                  onClick={() => onNavigateFolder(folder)}
                  className="flex items-center gap-2.5 min-w-0 flex-1"
                >
                  <svg className="w-6 h-6 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-1.5V9a3 3 0 00-3-3h-3.379a3 3 0 01-2.121-.879L8.379 4.043A3 3 0 006.257 3.164H4.5A3 3 0 001.5 6.164v11.836A3 3 0 004.5 21h15z" />
                  </svg>
                  <span className="text-xs font-medium text-slate-200 truncate group-hover:text-white">
                    {folder.name}
                  </span>
                </div>

                {/* Dropdown actions */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartRename('folder', folder); }}
                    title="Rename Folder"
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'folder', item: folder }); }}
                    title="Delete Folder"
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {searchQuery ? `Search Results for "${searchQuery}" (${files.length})` : `Files (${files.length})`}
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="relative w-12 h-12 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping"></div>
              <div className="relative w-12 h-12 rounded-full border-2 border-t-blue-500 border-r-blue-400 border-b-transparent border-l-transparent animate-spin flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-slate-200">
              {searchQuery ? `Searching cloud storage for "${searchQuery}"...` : 'Loading files...'}
            </p>
            <p className="text-xs text-slate-500">
              {searchQuery ? 'Scanning database indices and storage records' : 'Syncing filesystem view'}
            </p>
          </div>
        ) : files.length === 0 ? (
          <div className="p-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-300">No files found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Drag and drop files here, or click Upload File to store files in your secure cloud drive.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4 hidden md:table-cell">Size</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.mime_type, file.original_filename)}
                        <div className="min-w-0">
                          <p className="font-medium text-slate-200 truncate max-w-xs sm:max-w-md group-hover:text-white">
                            {file.original_filename}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono truncate max-w-xs">
                            SHA: {file.content_hash.slice(0, 12)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-xs hidden md:table-cell">
                      {formatBytes(file.size)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs hidden lg:table-cell">
                      {formatDate(file.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Download with Location Option & Loading Animation */}
                        {downloadingFileId === file.id ? (
                          <div
                            title="Downloading file from cloud storage..."
                            className="p-1.5 rounded-lg text-blue-400 bg-blue-500/20 border border-blue-500/30 flex items-center gap-1.5 text-xs font-medium"
                          >
                            <svg className="w-4 h-4 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            <span className="text-[11px] hidden sm:inline">Saving...</span>
                          </div>
                        ) : (
                          <div className="relative inline-flex items-center rounded-lg border border-slate-800 bg-slate-900/60 hover:border-slate-700">
                            {/* Primary Button: Prompt Location & Save */}
                            <button
                              onClick={() => onDownloadFile(file, true)}
                              title="Download (Choose location & save)"
                              className="p-1.5 rounded-l-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>

                            {/* Dropdown Chevron for Download Options */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDownloadMenuId(activeDownloadMenuId === file.id ? null : file.id);
                              }}
                              title="Download destination options"
                              className="px-1 py-1.5 border-l border-slate-800 rounded-r-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {/* Options Dropdown Menu */}
                            {activeDownloadMenuId === file.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1.5 w-60 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-50 space-y-1 text-left text-xs"
                              >
                                <div className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800/80">
                                  Download Options
                                </div>
                                <button
                                  onClick={() => {
                                    setActiveDownloadMenuId(null);
                                    onDownloadFile(file, true);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-blue-600/20 text-left transition-colors"
                                >
                                  <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                  </svg>
                                  <div>
                                    <p className="font-medium text-white">Choose Save Location...</p>
                                    <p className="text-[10px] text-slate-400">Select any folder on your computer</p>
                                  </div>
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveDownloadMenuId(null);
                                    onDownloadFile(file, false);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 text-left transition-colors"
                                >
                                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  <div>
                                    <p className="font-medium text-slate-200">Direct Download</p>
                                    <p className="text-[10px] text-slate-400">Save to default Downloads folder</p>
                                  </div>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Share */}
                        <button
                          onClick={() => onOpenShareModal(file)}
                          title="Share"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        </button>

                        {/* Rename */}
                        <button
                          onClick={() => handleStartRename('file', file)}
                          title="Rename"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget({ type: 'file', item: file })}
                          title="Delete"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rename Modal */}
      {renameTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              Rename {renameTarget.type === 'file' ? 'File' : 'Folder'}
            </h3>
            <form onSubmit={handleSaveRename} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white">Confirm Deletion</h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-200">
                {deleteTarget.type === 'file'
                  ? (deleteTarget.item as FileRecord).original_filename
                  : (deleteTarget.item as Folder).name}
              </strong>
              ? This action will remove the file from cloud storage and cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md shadow-rose-600/20"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
