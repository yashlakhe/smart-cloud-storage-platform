import React from 'react';

export type ActiveTab = 'my-files' | 'shared' | 'dashboard' | 'activity' | 'intelligence' | 'storage' | 'health';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenUpload: () => void;
  onOpenNewFolder: () => void;
  isUploading?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenUpload,
  onOpenNewFolder,
  isUploading = false,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'my-files',
      label: 'Files & Folders',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      id: 'shared',
      label: 'Shared with Me',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: 'dashboard',
      label: 'Overview & Metrics',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'intelligence',
      label: 'Storage Engines',
      badge: '4 Active',
      icon: (
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: 'activity',
      label: 'Audit Trail',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'health',
      label: 'Cluster Health',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-60 bg-[#0c0d0e] border-r border-zinc-800 flex flex-col justify-between p-3.5 shrink-0 select-none">
      <div className="space-y-5">
        {/* Quick Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={onOpenUpload}
            disabled={isUploading}
            className={`w-full py-2 px-3 rounded-md font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
              isUploading
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-zinc-100 hover:bg-white text-zinc-950 active:scale-[0.99]'
            }`}
          >
            {isUploading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin text-zinc-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Ingesting Payload...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Upload Object</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenNewFolder}
            className="w-full py-1.5 px-3 rounded-md bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 text-zinc-300 hover:text-zinc-100 font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <span>New Directory</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-0.5">
          <div className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Navigation
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className={isActive ? 'text-zinc-100' : 'text-zinc-500'}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Storage Tier Telemetry */}
      <div className="p-3 rounded-md bg-zinc-900/60 border border-zinc-800/80 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-mono text-zinc-400">Multi-Tier S3</span>
          <span className="text-[10px] font-mono text-emerald-400">ONLINE</span>
        </div>

        {/* Segmented Tier Bar */}
        <div className="w-full h-1.5 bg-zinc-800 rounded-full flex overflow-hidden">
          <div className="bg-emerald-500 w-[55%]" title="Standard (Hot)" />
          <div className="bg-amber-500 w-[25%]" title="Standard-IA (Warm)" />
          <div className="bg-cyan-500 w-[15%]" title="Glacier IR (Cold)" />
          <div className="bg-purple-500 w-[5%]" title="Glacier Deep Archive" />
        </div>

        <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-zinc-500 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Standard</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Std-IA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
            <span>Glacier</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            <span>Archive</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
