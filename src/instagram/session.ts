import * as path from 'path';
import * as fs from 'fs';

/** Manages the persistent session directory for Instagram authentication */
export class SessionManager {
  private sessionDir: string;
  private metadataPath: string;

  constructor(globalStoragePath: string) {
    this.sessionDir = path.join(globalStoragePath, 'instagram-session');
    this.metadataPath = path.join(this.sessionDir, 'session-meta.json');

    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  /** Get the session directory path for Playwright persistent context */
  getSessionDir(): string {
    return this.sessionDir;
  }

  /** Save session metadata (e.g., last login time, username) */
  saveMetadata(data: SessionMetadata): void {
    try {
      fs.writeFileSync(this.metadataPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save session metadata:', error);
    }
  }

  /** Load session metadata */
  loadMetadata(): SessionMetadata | null {
    try {
      if (fs.existsSync(this.metadataPath)) {
        const raw = fs.readFileSync(this.metadataPath, 'utf-8');
        return JSON.parse(raw) as SessionMetadata;
      }
    } catch (error) {
      console.error('Failed to load session metadata:', error);
    }
    return null;
  }

  /** Check if a previous session exists */
  hasSession(): boolean {
    const chromiumProfile = path.join(this.sessionDir, 'chromium-profile');
    return fs.existsSync(chromiumProfile);
  }

  /** Clear the session (logout) */
  clearSession(): void {
    try {
      if (fs.existsSync(this.sessionDir)) {
        fs.rmSync(this.sessionDir, { recursive: true, force: true });
        fs.mkdirSync(this.sessionDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }
}

export interface SessionMetadata {
  lastLogin: string;
  username?: string;
  authenticated: boolean;
}
