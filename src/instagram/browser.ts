import { chromium, BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const INSTAGRAM_URL = 'https://www.instagram.com';
const REELS_URL = 'https://www.instagram.com/reels/';

export class InstagramBrowser {
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private userDataDir: string;

  constructor(sessionDir: string) {
    this.userDataDir = path.join(sessionDir, 'chromium-profile');
  }

  /** Launch a persistent Chromium context (visible for login, headless for extraction) */
  async launch(headless: boolean = false): Promise<void> {
    if (this.context) {
      await this.close();
    }

    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }

    this.context = await chromium.launchPersistentContext(this.userDataDir, {
      headless,
      viewport: { width: 430, height: 932 },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    // Remove webdriver navigator flag
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    this.page = this.context.pages()[0] || (await this.context.newPage());
  }

  /** Check if the current session is authenticated with Instagram */
  async isAuthenticated(): Promise<boolean> {
    if (!this.context || !this.page) {
      return false;
    }

    try {
      await this.page.goto(INSTAGRAM_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });

      // Wait a moment for redirects
      await this.page.waitForTimeout(3000);

      const url = this.page.url();
      // If redirected to login page, not authenticated
      if (url.includes('/accounts/login') || url.includes('/accounts/emailsignup')) {
        return false;
      }

      // Check for logged-in indicators
      const loggedIn = await this.page.evaluate(() => {
        // Logged-in pages typically have navigation with profile links
        const hasNav = document.querySelector('nav') !== null;
        const hasLoginForm = document.querySelector('input[name="username"]') !== null;
        return hasNav && !hasLoginForm;
      });

      return loggedIn;
    } catch {
      return false;
    }
  }

  /** Open Instagram login page for manual user login */
  async openLoginPage(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.page.goto(`${INSTAGRAM_URL}/accounts/login/`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  }

  /** Wait for the user to complete manual login */
  async waitForLogin(timeoutMs: number = 300000): Promise<boolean> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    try {
      // Wait until URL no longer contains login paths
      await this.page.waitForFunction(
        () => {
          const url = window.location.href;
          return (
            !url.includes('/accounts/login') &&
            !url.includes('/accounts/emailsignup') &&
            !url.includes('/challenge')
          );
        },
        { timeout: timeoutMs }
      );

      // Additional wait for page to settle
      await this.page.waitForTimeout(3000);
      return true;
    } catch {
      return false;
    }
  }

  /** Navigate to reels page and extract reel data */
  async extractReels(count: number = 10): Promise<ReelExtractResult[]> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    try {
      await this.page.goto(REELS_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });

      // Wait for content to load
      await this.page.waitForTimeout(4000);

      // Dismiss any popups/dialogs
      await this.dismissDialogs();

      const reels: ReelExtractResult[] = [];
      const seenIds = new Set<string>();

      // Extract initial batch
      const initial = await this.extractVisibleReels();
      for (const r of initial) {
        if (!seenIds.has(r.id)) {
          seenIds.add(r.id);
          reels.push(r);
        }
      }

      // Scroll and extract more
      let scrollAttempts = 0;
      const maxScrollAttempts = count * 2;

      while (reels.length < count && scrollAttempts < maxScrollAttempts) {
        await this.page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });

        await this.page.waitForTimeout(2000);

        const batch = await this.extractVisibleReels();
        for (const r of batch) {
          if (!seenIds.has(r.id) && reels.length < count) {
            seenIds.add(r.id);
            reels.push(r);
          }
        }
        scrollAttempts++;
      }

      return reels;
    } catch (error) {
      console.error('Failed to extract reels:', error);
      return [];
    }
  }

  /** Extract video data from currently visible DOM elements */
  private async extractVisibleReels(): Promise<ReelExtractResult[]> {
    if (!this.page) {
      return [];
    }

    return this.page.evaluate(() => {
      const results: Array<{
        id: string;
        videoUrl: string;
        posterUrl?: string;
        username?: string;
        caption?: string;
      }> = [];

      // Find all video elements on the page
      const videos = document.querySelectorAll('video');

      videos.forEach((video, index) => {
        // Get video source - check src attribute and source children
        let videoUrl = video.src || '';
        if (!videoUrl) {
          const source = video.querySelector('source');
          if (source) {
            videoUrl = source.src;
          }
        }

        if (!videoUrl || videoUrl.startsWith('blob:')) {
          // Try to get from parent link
          const link = video.closest('a');
          if (link) {
            // Store the reel permalink for later extraction
            videoUrl = link.href;
          }
        }

        const posterUrl = video.poster || undefined;

        // Try to find username from nearby elements
        let username: string | undefined;
        const article = video.closest('article') || video.closest('[role="presentation"]');
        if (article) {
          const usernameEl = article.querySelector('a[href^="/"]');
          if (usernameEl) {
            const href = usernameEl.getAttribute('href');
            if (href && href !== '/' && !href.includes('/reels/')) {
              username = href.replace(/\//g, '');
            }
          }
        }

        // Try to find caption
        let caption: string | undefined;
        if (article) {
          const spans = article.querySelectorAll('span');
          for (const span of spans) {
            const text = span.textContent?.trim();
            if (text && text.length > 10 && text.length < 500) {
              caption = text;
              break;
            }
          }
        }

        if (videoUrl) {
          // Generate a unique ID from URL or index
          const id =
            videoUrl.includes('instagram.com/reel')
              ? videoUrl.split('/reel/')[1]?.split('/')[0] || `reel-${index}-${Date.now()}`
              : `reel-${index}-${Date.now()}`;

          results.push({
            id,
            videoUrl,
            posterUrl,
            username,
            caption,
          });
        }
      });

      return results;
    });
  }

  /** Dismiss common Instagram popups */
  private async dismissDialogs(): Promise<void> {
    if (!this.page) return;

    try {
      // "Not Now" for notifications prompt
      const notNow = this.page.getByRole('button', { name: /not now/i });
      if (await notNow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await notNow.click();
        await this.page.waitForTimeout(500);
      }
    } catch {
      // No dialog to dismiss
    }

    try {
      // Cookie consent
      const allowCookies = this.page.getByRole('button', { name: /allow/i });
      if (await allowCookies.isVisible({ timeout: 1000 }).catch(() => false)) {
        await allowCookies.click();
        await this.page.waitForTimeout(500);
      }
    } catch {
      // No cookie dialog
    }
  }

  /** Extract individual reel video URLs by visiting reel pages */
  async extractReelVideoUrl(reelUrl: string): Promise<string | null> {
    if (!this.context) {
      return null;
    }

    const page = await this.context.newPage();

    try {
      await page.goto(reelUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });

      await page.waitForTimeout(3000);

      const videoUrl = await page.evaluate(() => {
        const video = document.querySelector('video');
        if (video) {
          // Check for direct src
          if (video.src && !video.src.startsWith('blob:')) {
            return video.src;
          }
          // Check source elements
          const source = video.querySelector('source');
          if (source && source.src && !source.src.startsWith('blob:')) {
            return source.src;
          }
        }
        return null;
      });

      return videoUrl;
    } catch {
      return null;
    } finally {
      await page.close();
    }
  }

  /** Get the current page for direct manipulation */
  getPage(): Page | null {
    return this.page;
  }

  /** Close the browser context */
  async close(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
      }
    } catch {
      // Ignore close errors
    } finally {
      this.context = null;
      this.page = null;
    }
  }

  /** Check if browser is running */
  isRunning(): boolean {
    return this.context !== null;
  }
}

export interface ReelExtractResult {
  id: string;
  videoUrl: string;
  posterUrl?: string;
  username?: string;
  caption?: string;
}
