import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { chromium } from 'playwright';

const execAsync = promisify(exec);

export class BrowserSetup {
  /** Check if the required browser is installed */
  static async isBrowserInstalled(): Promise<boolean> {
    try {
      const executablePath = chromium.executablePath();
      return fs.existsSync(executablePath);
    } catch {
      return false;
    }
  }

  /** Run the playwright install command */
  static async installBrowser(): Promise<void> {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "VibeReels: Installing browser components...",
        cancellable: false
      },
      async (progress) => {
        try {
          progress.report({ message: "This may take a minute or two..." });
          
          // Run npx playwright install chromium
          // We use the extension's node_modules if possible
          const installCmd = 'npx playwright install chromium';
          
          await execAsync(installCmd);
          
          vscode.window.showInformationMessage("VibeReels: Browser components installed successfully!");
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`VibeReels: Failed to install browser: ${msg}`);
          throw error;
        }
      }
    );
  }

  /** Ensure browser is ready, prompt user if not */
  static async ensureReady(): Promise<boolean> {
    const installed = await this.isBrowserInstalled();
    if (installed) {
      return true;
    }

    const selection = await vscode.window.showWarningMessage(
      "VibeReels requires Chromium to view reels. Would you like to download it now? (~100MB)",
      "Install",
      "Later"
    );

    if (selection === "Install") {
      try {
        await this.installBrowser();
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }
}
