interface HeaderProps {
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
  onRefresh: () => void;
  onLogout: () => void;
}

export function Header({ autoScroll, onToggleAutoScroll, onRefresh, onLogout }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-3 py-2.5 bg-vr-bg/80 backdrop-blur-md border-b border-vr-border sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-vr-accent to-pink-500 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <polygon points="8,5 19,12 8,19" />
          </svg>
        </div>
        <span className="text-vr-text text-sm font-semibold tracking-tight">VibeReels</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5">
        {/* Auto-scroll toggle */}
        <button
          onClick={onToggleAutoScroll}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
            ${
              autoScroll
                ? 'bg-vr-accent/20 text-vr-accent border border-vr-accent/30'
                : 'bg-vr-surface text-vr-text-muted border border-vr-border hover:border-vr-text-dim'
            }`}
          title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {autoScroll ? (
              <>
                <polygon points="5,3 19,12 5,21" fill="currentColor" />
              </>
            ) : (
              <>
                <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
                <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
              </>
            )}
          </svg>
          Auto
        </button>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg bg-vr-surface text-vr-text-muted border border-vr-border
                     hover:text-vr-text hover:border-vr-text-dim transition-colors"
          title="Refresh feed"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23,4 23,10 17,10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="p-1.5 rounded-lg bg-vr-surface text-vr-text-muted border border-vr-border
                     hover:text-vr-error hover:border-vr-error/30 transition-colors"
          title="Logout"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16,17 21,12 16,7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
