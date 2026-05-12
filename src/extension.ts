import * as vscode from 'vscode';
import { ReelViewProvider } from './ReelViewProvider';

let provider: ReelViewProvider;

export function activate(context: vscode.ExtensionContext): void {
  provider = new ReelViewProvider(context);

  // Register the webview view provider for the sidebar
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ReelViewProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('vibereels.login', () => {
      provider.login();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vibereels.logout', () => {
      provider.logout();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vibereels.refresh', () => {
      provider.fetchReels();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vibereels.show', () => {
      vscode.commands.executeCommand('vibereels.reelView.focus');
    })
  );
}

export function deactivate(): void {
  provider?.cleanup();
}
