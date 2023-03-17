import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "better-commit-message" is now active!'
  );

  let disposable = vscode.commands.registerCommand(
    'better-commit-message.helloWorld',
    () => {
      vscode.window.showInformationMessage(
        'Hello World from BetterCommitMessage!'
      );
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
