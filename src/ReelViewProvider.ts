import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { InstagramBrowser } from './instagram/browser';
import { SessionManager } from './instagram/session';
import { ReelExtractor } from './instagram/reelExtractor';
import { BrowserSetup } from './utils/browserSetup';
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from './types';

export class ReelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'vibereels.reelView';

  private view?: vscode.WebviewView;
  private browser: InstagramBrowser;
  private session: SessionManager;
  private extractor: ReelExtractor;
  private extensionUri: vscode.Uri;
  private isAuthenticated = false;

  constructor(
    private readonly context: vscode.ExtensionContext
  ) {
    this.extensionUri = context.extensionUri;
    this.session = new SessionManager(context.globalStorageUri.fsPath);
    this.browser = new InstagramBrowser(this.session.getSessionDir());
    this.extractor = new ReelExtractor(this.browser);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'webview', 'dist'),
        vscode.Uri.joinPath(this.extensionUri, 'media'),
      ],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => this.handleWebviewMessage(message),
      undefined,
      this.context.subscriptions
    );

    // Cleanup on dispose
    webviewView.onDidDispose(() => {
      this.cleanup();
    });
  }

  /** Handle incoming messages from the React webview */
  private async handleWebviewMessage(message: WebviewToExtensionMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
        await this.checkAuthStatus();
        break;
      case 'login':
        await this.login();
        break;
      case 'logout':
        await this.logout();
        break;
      case 'refreshReels':
        await this.fetchReels();
        break;
      case 'loadMore':
        await this.loadMoreReels();
        break;
    }
  }

  /** Check if user is already authenticated */
  private async checkAuthStatus(): Promise<void> {
    if (!this.session.hasSession()) {
      this.postMessage({ type: 'authStatus', authenticated: false });
      return;
    }

    try {
      this.postMessage({ type: 'loading', loading: true });
      this.postMessage({ type: 'loginProgress', status: 'Checking session...' });

      const ready = await BrowserSetup.ensureReady();
      if (!ready) {
        this.postMessage({ type: 'authStatus', authenticated: false });
        return;
      }

      await this.browser.launch(true);
      this.isAuthenticated = await this.browser.isAuthenticated();

      this.postMessage({ type: 'authStatus', authenticated: this.isAuthenticated });

      if (this.isAuthenticated) {
        await this.fetchReels();
      } else {
        await this.browser.close();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.postMessage({ type: 'authStatus', authenticated: false });
      this.postMessage({ type: 'error', message: 'Failed to check authentication status' });
    } finally {
      this.postMessage({ type: 'loading', loading: false });
    }
  }

  /** Launch browser for manual Instagram login */
  async login(): Promise<void> {
    try {
      this.postMessage({ type: 'loading', loading: true });
      this.postMessage({ type: 'loginProgress', status: 'Launching browser...' });

      // Close any existing browser
      await this.browser.close();

      const ready = await BrowserSetup.ensureReady();
      if (!ready) {
        this.postMessage({ type: 'loading', loading: false });
        return;
      }

      // Launch visible browser for login
      await this.browser.launch(false);

      this.postMessage({ type: 'loginProgress', status: 'Opening Instagram...' });
      await this.browser.openLoginPage();

      this.postMessage({
        type: 'loginProgress',
        status: 'Please log in to Instagram in the browser window...',
      });

      // Wait for user to complete login (5 minute timeout)
      const success = await this.browser.waitForLogin(300000);

      if (success) {
        this.isAuthenticated = true;

        this.session.saveMetadata({
          lastLogin: new Date().toISOString(),
          authenticated: true,
        });

        this.postMessage({ type: 'authStatus', authenticated: true });
        this.postMessage({ type: 'loginProgress', status: 'Login successful! Loading reels...' });

        // Close visible browser and reopen headless for extraction
        await this.browser.close();
        await this.browser.launch(true);

        await this.fetchReels();
      } else {
        this.postMessage({ type: 'authStatus', authenticated: false });
        this.postMessage({ type: 'error', message: 'Login timed out or was cancelled' });
        await this.browser.close();
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Login failed';
      console.error('Login failed:', error);
      this.postMessage({ type: 'error', message: msg });
      this.postMessage({ type: 'authStatus', authenticated: false });
    } finally {
      this.postMessage({ type: 'loading', loading: false });
    }
  }

  /** Logout and clear session */
  async logout(): Promise<void> {
    try {
      await this.browser.close();
      this.session.clearSession();
      this.extractor.clearQueue();
      this.isAuthenticated = false;
      this.postMessage({ type: 'authStatus', authenticated: false });
      this.postMessage({ type: 'reels', reels: [] });
      vscode.window.showInformationMessage('VibeReels: Logged out from Instagram');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  /** Fetch reels from Instagram */
  async fetchReels(): Promise<void> {
    try {
      this.postMessage({ type: 'loading', loading: true });

      if (!this.browser.isRunning()) {
        const ready = await BrowserSetup.ensureReady();
        if (!ready) return;
        
        await this.browser.launch(true);

        const authenticated = await this.browser.isAuthenticated();
        if (!authenticated) {
          this.isAuthenticated = false;
          this.postMessage({ type: 'authStatus', authenticated: false });
          this.postMessage({ type: 'error', message: 'Session expired. Please log in again.' });
          await this.browser.close();
          return;
        }
      }

      this.extractor.clearQueue();
      const reels = await this.extractor.fetchReels(15);

      this.postMessage({ type: 'reels', reels });

      if (reels.length === 0) {
        this.postMessage({
          type: 'error',
          message: 'No reels found. Instagram may have changed their layout.',
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to load reels';
      console.error('Fetch reels failed:', error);
      this.postMessage({ type: 'error', message: msg });
    } finally {
      this.postMessage({ type: 'loading', loading: false });
    }
  }

  /** Load more reels (append to existing) */
  private async loadMoreReels(): Promise<void> {
    try {
      this.postMessage({ type: 'loading', loading: true });
      const reels = await this.extractor.fetchReels(10);
      if (reels.length > 0) {
        this.postMessage({ type: 'reelsAppend', reels });
      }
    } catch (error) {
      console.error('Load more failed:', error);
    } finally {
      this.postMessage({ type: 'loading', loading: false });
    }
  }

  /** Send a typed message to the webview */
  private postMessage(message: ExtensionToWebviewMessage): void {
    this.view?.webview.postMessage(message);
  }

  /** Generate the HTML content for the webview */
  private getHtmlForWebview(webview: vscode.Webview): string {
    const distPath = vscode.Uri.joinPath(this.extensionUri, 'webview', 'dist');

    // Try to find built webview assets
    const distFsPath = distPath.fsPath;
    let scriptUri: vscode.Uri;
    let styleUri: vscode.Uri | null = null;

    if (fs.existsSync(distFsPath)) {
      // Production: use built files
      const files = fs.readdirSync(path.join(distFsPath, 'assets'));
      const jsFile = files.find((f) => f.endsWith('.js'));
      const cssFile = files.find((f) => f.endsWith('.css'));

      if (!jsFile) {
        return this.getErrorHtml('Webview assets not found. Run "npm run build:webview" first.');
      }

      scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(distPath, 'assets', jsFile)
      );

      if (cssFile) {
        styleUri = webview.asWebviewUri(
          vscode.Uri.joinPath(distPath, 'assets', cssFile)
        );
      }
    } else {
      return this.getErrorHtml(
        'Webview not built. Run "npm run build:webview" to build the webview.'
      );
    }

    const nonce = getNonce();
    const cspSource = webview.cspSource;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    style-src ${cspSource} 'unsafe-inline';
    script-src 'nonce-${nonce}';
    img-src ${cspSource} https: data: blob:;
    media-src https: blob: data:;
    connect-src https:;
    font-src ${cspSource} https:;
  ">
  <title>VibeReels</title>
  ${styleUri ? `<link rel="stylesheet" href="${styleUri}">` : ''}
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  /** Fallback error HTML */
  private getErrorHtml(message: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      color: #ccc;
      background: transparent;
      text-align: center;
      padding: 20px;
    }
  </style>
</head>
<body>
  <p>${message}</p>
</body>
</html>`;
  }

  /** Cleanup resources */
  async cleanup(): Promise<void> {
    await this.browser.close();
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
