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
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 1800);
  };

  const getTierBadge = (tier?: string) => {
    const t = (tier || 'STANDARD').toUpperCase();
    switch (t) {
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
      case 'STANDARD':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Standard
          </span>
        );
    }
  };

  const getFileIcon = (_mimeType: string, filename: string) => {
    const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';
    return (
      <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-700/80 flex items-center justify-center shrink-0">
        <span className="font-mono text-[9px] font-bold text-zinc-300 tracking-tight">
          {ext.slice(0, 4)}
        </span>
      </div>
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
      className={`flex-1 p-5 space-y-5 overflow-y-auto transition-colors bg-[#09090b] ${
        isDragOver ? 'bg-zinc-900/50 ring-1 ring-zinc-500' : ''
      }`}
    >
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between pb-1 border-b border-zinc-800/80">
        <nav className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
          <button
            onClick={() => onNavigateFolder(null)}
            className={`hover:text-zinc-100 transition-colors flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-zinc-800/60 ${
              currentFolder === null ? 'text-zinc-100 font-semibold bg-zinc-900 border border-zinc-800' : ''
            }`}
          >
            <span>root</span>
          </button>
          {folderPath.map((f, idx) => (
            <React.Fragment key={f.id}>
              <span className="text-zinc-600">/</span>
              <button
                onClick={() => onNavigateFolder(f)}
                className={`hover:text-zinc-100 transition-colors px-1.5 py-1 rounded hover:bg-zinc-800/60 ${
                  idx === folderPath.length - 1 ? 'text-zinc-100 font-semibold bg-zinc-900 border border-zinc-800' : ''
                }`}
              >
                {f.name}
              </button>
            </React.Fragment>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Location Selection Mode Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Local Picker: Enabled</span>
          </div>

          {/* Upload Button */}
          <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-colors shadow-sm ${
            isUploading
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed pointer-events-none'
              : 'bg-zinc-100 hover:bg-white text-zinc-950 active:scale-[0.99]'
          }`}>
            {isUploading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin text-zinc-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Ingesting...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Upload</span>
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

      {/* Ingestion In-Flight Telemetry Banner */}
      {isUploading && (
        <div className="p-3.5 rounded-md bg-zinc-900 border border-zinc-700/80 space-y-2 text-xs">
          <div className="flex items-center justify-between font-mono">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-zinc-100 font-semibold">CAS Pipeline Ingesting:</span>
              {uploadingFileName && (
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 truncate max-w-xs">
                  {uploadingFileName}
                </span>
              )}
            </div>
            <span className="text-zinc-400 text-[11px]">Computing SHA-256 Digest...</span>
          </div>

          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-zinc-200 w-full animate-pulse" />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Deduplication check &amp; reference counter update</span>
            <span>Amazon S3 / Local storage gateway</span>
          </div>
        </div>
      )}

      {/* Drag & Drop Overlay Hint */}
      {isDragOver && (
        <div className="p-6 rounded-md border border-dashed border-zinc-600 bg-zinc-900/40 text-center">
          <p className="text-zinc-200 font-mono text-xs">Release file to ingest via Content-Addressable Storage</p>
        </div>
      )}

      {/* Folders Section */}
      {!searchQuery && folders.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            Directories ({folders.length})
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onDoubleClick={() => onNavigateFolder(folder)}
                className="group p-2.5 rounded-md bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div
                  onClick={() => onNavigateFolder(folder)}
                  className="flex items-center gap-2 min-w-0 flex-1"
                >
                  <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-1.5V9a3 3 0 00-3-3h-3.379a3 3 0 01-2.121-.879L8.379 4.043A3 3 0 006.257 3.164H4.5A3 3 0 001.5 6.164v11.836A3 3 0 004.5 21h15z" />
                  </svg>
                  <span className="text-xs font-medium text-zinc-200 truncate group-hover:text-white">
                    {folder.name}
                  </span>
                </div>

                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartRename('folder', folder); }}
                    title="Rename"
                    className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'folder', item: folder }); }}
                    title="Delete"
                    className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-700"
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

      {/* Files Section (Data Grid) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-500">
          <span>{searchQuery ? `Query: "${searchQuery}" (${files.length})` : `Objects (${files.length})`}</span>
          <span>Amazon S3 / CAS Store</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-400 space-y-2 bg-zinc-900/30 border border-zinc-800 rounded-md">
            <div className="w-5 h-5 mx-auto border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono text-zinc-300">Scanning relational metadata indices...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center rounded-md bg-zinc-900/20 border border-zinc-800/80 space-y-2">
            <svg className="w-8 h-8 text-zinc-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-xs font-mono text-zinc-300">Directory contains 0 objects</p>
            <p className="text-[11px] text-zinc-500">Upload payloads or drop files to trigger CAS ingestion</p>
          </div>
        ) : (
          <div className="bg-[#0c0d0e] border border-zinc-800 rounded-md overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/70 text-zinc-400 font-mono text-[11px] uppercase tracking-wider select-none">
                  <th className="py-2.5 px-3.5">Filename</th>
                  <th className="py-2.5 px-3.5">Tier</th>
                  <th className="py-2.5 px-3.5 hidden sm:table-cell">CAS Hash</th>
                  <th className="py-2.5 px-3.5 hidden md:table-cell">Size</th>
                  <th className="py-2.5 px-3.5 hidden lg:table-cell">Modified</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-zinc-900/70 transition-colors group">
                    {/* Filename */}
                    <td className="py-2 px-3.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getFileIcon(file.mime_type, file.original_filename)}
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-200 truncate group-hover:text-white max-w-xs sm:max-w-sm">
                            {file.original_filename}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono truncate">
                            {file.mime_type}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Storage Tier */}
                    <td className="py-2 px-3.5 whitespace-nowrap">
                      {getTierBadge(file.storage_tier)}
                    </td>

                    {/* CAS Hash */}
                    <td className="py-2 px-3.5 hidden sm:table-cell whitespace-nowrap">
                      <button
                        onClick={() => copyToClipboard(file.content_hash, file.id)}
                        title="Click to copy full SHA-256 fingerprint"
                        className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 font-mono text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                      >
                        <span>{file.content_hash.slice(0, 10)}...</span>
                        <svg className="w-3 h-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {copiedHash === file.id && (
                          <span className="text-[9px] text-emerald-400 font-sans">Copied!</span>
                        )}
                      </button>
                    </td>

                    {/* Size */}
                    <td className="py-2 px-3.5 text-zinc-300 font-mono text-xs tabular-nums hidden md:table-cell whitespace-nowrap">
                      {formatBytes(file.size)}
                    </td>

                    {/* Modified */}
                    <td className="py-2 px-3.5 text-zinc-400 text-xs hidden lg:table-cell whitespace-nowrap">
                      {formatDate(file.updated_at || file.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* Download Menu */}
                        {downloadingFileId === file.id ? (
                          <div className="p-1 px-2 rounded bg-zinc-800 text-zinc-300 flex items-center gap-1.5 text-xs font-mono">
                            <span className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></span>
                            <span className="text-[11px]">Streaming</span>
                          </div>
                        ) : (
                          <div className="relative inline-flex items-center rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700">
                            <button
                              onClick={() => onDownloadFile(file, true)}
                              title="Download (Pick target directory)"
                              className="p-1 px-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDownloadMenuId(activeDownloadMenuId === file.id ? null : file.id);
                              }}
                              title="Download options"
                              className="p-1 px-1 border-l border-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {activeDownloadMenuId === file.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-56 rounded-md bg-[#121215] border border-zinc-700 shadow-xl p-1 z-50 space-y-0.5 text-left text-xs"
                              >
                                <div className="px-2 py-1 text-[10px] font-mono uppercase text-zinc-500 border-b border-zinc-800">
                                  Download Destination
                                </div>
                                <button
                                  onClick={() => {
                                    setActiveDownloadMenuId(null);
                                    onDownloadFile(file, true);
                                  }}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                                >
                                  <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                  </svg>
                                  <div>
                                    <div className="font-medium">Choose Location...</div>
                                    <div className="text-[10px] text-zinc-500">Pick destination via File System API</div>
                                  </div>
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveDownloadMenuId(null);
                                    onDownloadFile(file, false);
                                  }}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                                >
                                  <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  <div>
                                    <div className="font-medium">Default Downloads</div>
                                    <div className="text-[10px] text-zinc-500">Stream to browser Downloads directory</div>
                                  </div>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Share */}
                        <button
                          onClick={() => onOpenShareModal(file)}
                          title="Manage Access Shares"
                          className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        </button>

                        {/* Rename */}
                        <button
                          onClick={() => handleStartRename('file', file)}
                          title="Rename"
                          className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget({ type: 'file', item: file })}
                          title="Delete Object"
                          className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* Rename Dialog */}
      {renameTarget && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#121215] border border-zinc-700 rounded-lg p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-semibold text-zinc-100">
              Rename {renameTarget.type === 'file' ? 'Object' : 'Directory'}
            </h3>
            <form onSubmit={handleSaveRename} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-xs text-zinc-100 focus:outline-none focus:border-zinc-400"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 rounded-md transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#121215] border border-zinc-700 rounded-lg p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-semibold text-zinc-100">Confirm Deletion</h3>
            <p className="text-xs text-zinc-400">
              Are you sure you want to delete{' '}
              <span className="font-mono text-zinc-200">
                {deleteTarget.type === 'file'
                  ? (deleteTarget.item as FileRecord).original_filename
                  : (deleteTarget.item as Folder).name}
              </span>
              ? If other users reference this CAS digest, their copy will remain intact via reference counting.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-md transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
