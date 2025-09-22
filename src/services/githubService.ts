import { Octokit } from 'octokit';
import { TruckData } from '../types/truck';

export class GitHubService {
  private octokit: Octokit | null = null;
  private owner: string = '';
  private repo: string = '';
  private branch: string = 'main';
  private dataPath: string = 'data/data.json';

  initialize(token: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  isInitialized(): boolean {
    return this.octokit !== null && this.owner !== '' && this.repo !== '';
  }

  async fetchData(): Promise<TruckData> {
    if (!this.isInitialized()) {
      throw new Error('GitHub service not initialized. Please configure your GitHub settings.');
    }

    try {
      const response = await this.octokit!.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: this.dataPath,
        ref: this.branch,
      });

      if ('content' in response.data && response.data.type === 'file') {
        const content = atob(response.data.content);
        return JSON.parse(content) as TruckData;
      }

      throw new Error('Invalid file response from GitHub');
    } catch (error: any) {
      if (error.status === 404) {
        // File doesn't exist, return empty data
        return {
          trucks: [],
          lastUpdated: new Date().toISOString(),
        };
      }
      throw error;
    }
  }

  async saveData(data: TruckData, message: string = 'Update truck data'): Promise<void> {
    if (!this.isInitialized()) {
      throw new Error('GitHub service not initialized. Please configure your GitHub settings.');
    }

    try {
      // Get current file SHA
      let sha: string | undefined;
      try {
        const currentFile = await this.octokit!.rest.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: this.dataPath,
          ref: this.branch,
        });

        if ('sha' in currentFile.data) {
          sha = currentFile.data.sha;
        }
      } catch (error: any) {
        // File doesn't exist yet, that's okay
        if (error.status !== 404) {
          throw error;
        }
      }

      // Update the file
      const content = btoa(JSON.stringify(data, null, 2));

      await this.octokit!.rest.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: this.dataPath,
        message,
        content,
        sha,
        branch: this.branch,
      });
    } catch (error) {
      console.error('Failed to save data to GitHub:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.isInitialized()) {
      return false;
    }

    try {
      await this.octokit!.rest.repos.get({
        owner: this.owner,
        repo: this.repo,
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const githubService = new GitHubService();