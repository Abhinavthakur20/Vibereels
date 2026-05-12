interface LoadingScreenProps {
  progress?: string | null;
}

export function LoadingScreen({ progress }: LoadingScreenProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-vr-bg p-6">
      <div className="text-center animate-fade-in">
        <div className="relative mx-auto w-14 h-14 mb-5">
          <div className="absolute inset-0 rounded-xl bg-vr-accent/20 blur-lg animate-pulse-glow" />
          <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-vr-accent to-pink-500 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        </div>
        {progress && (
          <p className="text-vr-text-muted text-xs animate-fade-in">{progress}</p>
        )}
        {!progress && (
          <p className="text-vr-text-muted text-xs">Initializing...</p>
        )}
      </div>
    </div>
  );
}
