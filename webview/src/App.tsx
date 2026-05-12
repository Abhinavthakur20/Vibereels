import { useState, useEffect, useCallback, useRef } from 'react';
import { ReelFeed } from './components/ReelFeed';
import { Onboarding } from './components/Onboarding';
import { Header } from './components/Header';
import { LoadingScreen } from './components/LoadingScreen';

export interface ReelData {
  id: string;
  videoUrl: string;
  posterUrl?: string;
  username?: string;
  caption?: string;
  timestamp?: string;
}

type ExtMessage =
  | { type: 'authStatus'; authenticated: boolean }
  | { type: 'reels'; reels: ReelData[] }
  | { type: 'reelsAppend'; reels: ReelData[] }
  | { type: 'error'; message: string }
  | { type: 'loading'; loading: boolean }
  | { type: 'loginProgress'; status: string };

const vscode = acquireVsCodeApi();

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [reels, setReels] = useState<ReelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginProgress, setLoginProgress] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(false);
  const initialLoad = useRef(true);

  const handleMessage = useCallback((event: MessageEvent<ExtMessage>) => {
    const message = event.data;

    switch (message.type) {
      case 'authStatus':
        setAuthenticated(message.authenticated);
        if (!message.authenticated) {
          setLoading(false);
        }
        setLoginProgress(null);
        break;

      case 'reels':
        setReels(message.reels);
        setLoading(false);
        setError(null);
        break;

      case 'reelsAppend':
        setReels((prev) => [...prev, ...message.reels]);
        break;

      case 'error':
        setError(message.message);
        setLoading(false);
        break;

      case 'loading':
        setLoading(message.loading);
        if (message.loading) {
          setError(null);
        }
        break;

      case 'loginProgress':
        setLoginProgress(message.status);
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);

    // Signal webview is ready
    if (initialLoad.current) {
      initialLoad.current = false;
      vscode.postMessage({ type: 'ready' });
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const handleLogin = useCallback(() => {
    setLoading(true);
    setError(null);
    vscode.postMessage({ type: 'login' });
  }, []);

  const handleLogout = useCallback(() => {
    vscode.postMessage({ type: 'logout' });
    setReels([]);
    setAuthenticated(false);
  }, []);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setError(null);
    vscode.postMessage({ type: 'refreshReels' });
  }, []);

  const handleLoadMore = useCallback(() => {
    vscode.postMessage({ type: 'loadMore' });
  }, []);

  // Initial loading state
  if (loading && !authenticated && reels.length === 0) {
    return <LoadingScreen progress={loginProgress} />;
  }

  // Not authenticated - show onboarding
  if (!authenticated) {
    return (
      <Onboarding
        onLogin={handleLogin}
        loading={loading}
        error={error}
        progress={loginProgress}
      />
    );
  }

  // Authenticated - show feed
  return (
    <div className="h-full flex flex-col bg-vr-bg">
      <Header
        autoScroll={autoScroll}
        onToggleAutoScroll={() => setAutoScroll((s) => !s)}
        onRefresh={handleRefresh}
        onLogout={handleLogout}
      />

      {loading && reels.length === 0 ? (
        <LoadingScreen progress="Loading reels..." />
      ) : error && reels.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center animate-fade-in">
            <div className="text-3xl mb-3">⚠️</div>
            <p className="text-vr-text-muted text-sm mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-vr-accent/20 text-vr-accent rounded-lg text-sm
                         hover:bg-vr-accent/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <ReelFeed
          reels={reels}
          autoScroll={autoScroll}
          onLoadMore={handleLoadMore}
          loading={loading}
        />
      )}
    </div>
  );
}
