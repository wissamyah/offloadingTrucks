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
        // Proper decoding for UTF-8 content
        const content = decodeURIComponent(escape(atob(response.data.content)));
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

    let retries = 3;
    let lastError: any;

    while (retries > 0) {
      try {
        // Always get the latest SHA before updating
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

            // If file exists, merge with existing data to prevent data loss
            if ('content' in currentFile.data) {
              try {
                const existingContent = atob(currentFile.data.content);
                const existingData = JSON.parse(existingContent) as TruckData;

                // Merge trucks, keeping the most recent version of each truck
                const mergedTrucks = new Map<string, any>();

                // Add existing trucks
                existingData.trucks.forEach(truck => {
                  mergedTrucks.set(truck.id, truck);
                });

                // Override with new trucks (they have the latest updates)
                data.trucks.forEach(truck => {
                  mergedTrucks.set(truck.id, truck);
                });

                // Update data with merged trucks
                data.trucks = Array.from(mergedTrucks.values());
              } catch (e) {
                console.warn('Could not merge existing data:', e);
              }
            }
          }
        } catch (error: any) {
          // File doesn't exist yet, that's okay
          if (error.status !== 404) {
            throw error;
          }
        }

        // Update the file with proper encoding
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

        await this.octokit!.rest.repos.createOrUpdateFileContents({
          owner: this.owner,
          repo: this.repo,
          path: this.dataPath,
          message,
          content,
          sha,
          branch: this.branch,
        });

        // Success! Exit the retry loop
        return;
      } catch (error: any) {
        lastError = error;

        if (error.status === 409) {
          // Conflict - retry with fresh SHA
          console.warn(`GitHub conflict, retrying... (${retries} attempts left)`);
          retries--;

          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          // Other error - don't retry
          console.error('Failed to save data to GitHub:', error);
          throw error;
        }
      }
    }

    // If we've exhausted all retries
    console.error('Failed to save after all retries:', lastError);
    throw new Error('Failed to save data to GitHub after multiple attempts. Please try again.');
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