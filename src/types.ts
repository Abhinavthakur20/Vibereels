/** Message types sent from Extension Host → Webview */
export type ExtensionToWebviewMessage =
  | { type: 'authStatus'; authenticated: boolean }
  | { type: 'reels'; reels: ReelData[] }
  | { type: 'reelsAppend'; reels: ReelData[] }
  | { type: 'error'; message: string }
  | { type: 'loading'; loading: boolean }
  | { type: 'loginProgress'; status: string };

/** Message types sent from Webview → Extension Host */
export type WebviewToExtensionMessage =
  | { type: 'login' }
  | { type: 'logout' }
  | { type: 'refreshReels' }
  | { type: 'loadMore' }
  | { type: 'ready' };

export interface ReelData {
  id: string;
  videoUrl: string;
  posterUrl?: string;
  username?: string;
  caption?: string;
  timestamp?: string;
}
