interface OnboardingProps {
  onLogin: () => void;
  loading: boolean;
  error: string | null;
  progress: string | null;
}

export function Onboarding({ onLogin, loading, error, progress }: OnboardingProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-vr-bg p-6">
      <div className="max-w-[280px] w-full text-center animate-slide-up">
        {/* Logo */}
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-vr-accent to-pink-500 opacity-20 blur-xl animate-pulse-glow" />
          <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-vr-accent to-pink-500 flex items-center justify-center shadow-2xl">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="white" strokeWidth="1.5" />
              <polygon points="10,7 17,12 10,17" />
            </svg>
          </div>
        </div>

        <h1 className="text-xl font-bold text-vr-text mb-2 tracking-tight">VibeReels</h1>
        <p className="text-vr-text-muted text-sm leading-relaxed mb-8">
          Login once to access your Instagram Reels feed inside VS Code.
        </p>

        <button
          onClick={onLogin}
          disabled={loading}
          className="w-full py-3 px-6 rounded-xl font-semibold text-sm text-white
                     bg-gradient-to-r from-vr-accent to-pink-500
                     hover:from-vr-accent hover:to-pink-400
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-300 transform hover:scale-[1.02]
                     shadow-lg shadow-vr-accent/20 hover:shadow-vr-accent/40
                     active:scale-95"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Connecting...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
              </svg>
              Login to Instagram
            </span>
          )}
        </button>

        {progress && (
          <div className="mt-4 p-3 rounded-lg bg-vr-surface border border-vr-border animate-fade-in">
            <p className="text-vr-text-muted text-xs">{progress}</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-vr-error/10 border border-vr-error/20 animate-fade-in">
            <p className="text-vr-error text-xs">{error}</p>
          </div>
        )}

        <div className="mt-10 space-y-3">
          <Feature icon="shield" text="Your session stays local and secure on your machine." />
          <Feature icon="check" text="Login once — sessions persist across restarts." />
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: 'shield' | 'check'; text: string }) {
  return (
    <div className="flex items-center gap-3 text-left">
      <div className="w-8 h-8 rounded-lg bg-vr-surface flex items-center justify-center flex-shrink-0">
        {icon === 'shield' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e040fb" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e040fb" strokeWidth="2">
            <polyline points="20,6 9,17 4,12" />
          </svg>
        )}
      </div>
      <p className="text-vr-text-dim text-xs leading-relaxed">{text}</p>
    </div>
  );
}
