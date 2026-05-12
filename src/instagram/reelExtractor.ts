import { InstagramBrowser, ReelExtractResult } from './browser';
import { ReelData } from '../types';

/** Manages reel extraction queue and deduplication */
export class ReelExtractor {
  private browser: InstagramBrowser;
  private reelQueue: ReelData[] = [];
  private seenIds = new Set<string>();
  private isExtracting = false;

  constructor(browser: InstagramBrowser) {
    this.browser = browser;
  }

  /** Extract a batch of reels and add to queue */
  async fetchReels(count: number = 10): Promise<ReelData[]> {
    if (this.isExtracting) {
      return this.reelQueue;
    }

    this.isExtracting = true;

    try {
      const raw = await this.browser.extractReels(count);
      const newReels = this.processResults(raw);
      return newReels;
    } finally {
      this.isExtracting = false;
    }
  }

  /** Process raw extraction results into ReelData */
  private processResults(results: ReelExtractResult[]): ReelData[] {
    const newReels: ReelData[] = [];

    for (const result of results) {
      if (this.seenIds.has(result.id)) {
        continue;
      }

      this.seenIds.add(result.id);

      const reel: ReelData = {
        id: result.id,
        videoUrl: result.videoUrl,
        posterUrl: result.posterUrl,
        username: result.username,
        caption: result.caption,
        timestamp: new Date().toISOString(),
      };

      this.reelQueue.push(reel);
      newReels.push(reel);
    }

    return newReels;
  }

  /** Get all reels in the current queue */
  getQueue(): ReelData[] {
    return [...this.reelQueue];
  }

  /** Clear the reel queue */
  clearQueue(): void {
    this.reelQueue = [];
    this.seenIds.clear();
  }

  /** Check if extraction is in progress */
  isLoading(): boolean {
    return this.isExtracting;
  }
}
