import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as openai from 'openai';
import { OpenAIApi } from 'openai';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'better-commit-message.commitWithSuggestedMessage',
    async () => {
      const gitStagedChanges = await getGitStagedChanges();
      const commitMessage = await getCommitMessage(gitStagedChanges);
      if (commitMessage) {
        const shouldCommit = await vscode.window.showInformationMessage(
          `Commit with message: ${commitMessage}`,
          { modal: true },
          'OK'
        );

        if (shouldCommit === 'OK') {
          await commitWithMessage(commitMessage);
        }
      }
    }
  );

  context.subscriptions.push(disposable);
}

async function getCommitMessage(
  gitStagedChanges: string
): Promise<string | null> {
  try {
    const prompt = `Generate a commit message for the following git differences. Use the prefix "add: " for added features and "modify: " for modified features.\n\n${gitStagedChanges}`;

    const apiKey = vscode.workspace
      .getConfiguration('better-commit-message')
      .get<string>('openaiApiKey');
    if (!apiKey) {
      vscode.window.showErrorMessage(
        'OpenAI API Key is not set in the settings.'
      );
      return null;
    }

    const configuration = new openai.Configuration({
      apiKey: apiKey,
    });

    const api = new OpenAIApi(configuration);

    const response = await api.createCompletion({
      model: 'text-davinci-003',
      prompt: prompt,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      max_tokens: 100,
      stop: null,
    });

    const message = response.data.choices[0].text?.trim();
    return message ?? '';
  } catch (error) {
    vscode.window.showErrorMessage(`Error getting commit message: ${error}`);
    return null;
  }
}

function getProjectRoot(): string | null {
  if (!vscode.workspace.workspaceFolders) {
    vscode.window.showErrorMessage('No workspace folder is open.');
    return null;
  }

  return vscode.workspace.workspaceFolders[0].uri.fsPath;
}

function execPromise(
  command: string,
  options?: cp.ExecOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    cp.exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(typeof stdout === 'string' ? stdout : stdout.toString());
      }
    });
  });
}

async function getGitStagedChanges(): Promise<string> {
  try {
    const projectRoot = getProjectRoot();
    if (!projectRoot) {
      return '';
    }

    const command = 'git diff --staged';
    const stagedChanges = await execPromise(command, { cwd: projectRoot });
    return stagedChanges;
  } catch (error) {
    vscode.window.showErrorMessage(
      `Error getting git staged changes: ${error}`
    );
    return '';
  }
}

async function commitWithMessage(commitMessage: string): Promise<void> {
  try {
    const projectRoot = getProjectRoot();
    if (!projectRoot) {
      return;
    }

    await execPromise(`git commit -m "${commitMessage}"`, { cwd: projectRoot });
    vscode.window.showInformationMessage(
      `Successfully committed with message: ${commitMessage}`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Error committing changes: ${error}`);
  }
}

export function deactivate() {}
