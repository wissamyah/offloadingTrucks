import { TruckData, Truck } from '../types/truck';
import toast from 'react-hot-toast';

interface GitHubConfig {
  owner: string;
  repo: string;
  path: string;
  token: string;
}

class GitHubSyncService {
  private config: GitHubConfig | null = null;
  private currentSha: string | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(data: TruckData) => void> = new Set();

  initialize(token: string, owner: string, repo: string, path: string = 'data.json') {
    this.config = { token, owner, repo, path };
    return this.testConnection();
  }

  private getHeaders() {
    if (!this.config) throw new Error('GitHub not initialized');
    return {
      'Authorization': `Bearer ${this.config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.config) return false;
      const response = await fetch(
        `https://api.github.com/repos/${this.config.owner}/${this.config.repo}`,
        { headers: this.getHeaders() }
      );
      return response.ok;
    } catch (error) {
      console.error('GitHub connection test failed:', error);
      return false;
    }
  }

  async fetchData(): Promise<TruckData> {
    if (!this.config) throw new Error('GitHub not initialized');

    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.path}`,
        { headers: this.getHeaders() }
      );

      if (response.status === 404) {
        // File doesn't exist, create initial data
        const initialData: TruckData = {
          trucks: [],
          lastModified: new Date().toISOString(),
          version: '2.0.0'
        };
        await this.saveData(initialData, 'Initial data creation');
        return initialData;
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const file = await response.json();
      this.currentSha = file.sha;

      const content = atob(file.content);
      const data = JSON.parse(content) as TruckData;

      // Ensure data structure
      return {
        trucks: data.trucks || [],
        lastModified: data.lastModified || new Date().toISOString(),
        version: data.version || '2.0.0'
      };
    } catch (error) {
      console.error('Error fetching from GitHub:', error);
      throw error;
    }
  }

  async saveData(data: TruckData, message: string = 'Update truck data'): Promise<void> {
    if (!this.config) throw new Error('GitHub not initialized');

    try {
      // Try to get current SHA if file exists (don't create if it doesn't)
      if (this.currentSha) {
        try {
          const response = await fetch(
            `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.path}`,
            { headers: this.getHeaders() }
          );
          if (response.ok) {
            const file = await response.json();
            this.currentSha = file.sha;
          }
        } catch {
          // File might not exist yet, that's ok
        }
      }

      const content = btoa(JSON.stringify({
        ...data,
        lastModified: new Date().toISOString(),
        version: '2.0.0'
      }, null, 2));

      const body: any = {
        message,
        content
      };

      // Only include SHA if we have one (file exists)
      if (this.currentSha) {
        body.sha = this.currentSha;
      }

      const response = await fetch(
        `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.path}`,
        {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(body)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save to GitHub');
      }

      const result = await response.json();
      this.currentSha = result.content.sha;

      // Notify all listeners of the update
      this.notifyListeners(data);
    } catch (error) {
      console.error('Error saving to GitHub:', error);
      throw error;
    }
  }

  async addTruck(truck: Truck): Promise<TruckData> {
    const data = await this.fetchData();
    data.trucks.push(truck);
    await this.saveData(data, `Add truck: ${truck.supplierName}`);
    return data;
  }

  async addMultipleTrucks(trucks: Truck[]): Promise<TruckData> {
    if (trucks.length === 0) return await this.fetchData();

    const data = await this.fetchData();
    data.trucks.push(...trucks);
    await this.saveData(data, `Add ${trucks.length} trucks`);
    return data;
  }

  async updateTruck(id: string, updates: Partial<Truck>): Promise<TruckData> {
    const data = await this.fetchData();
    const index = data.trucks.findIndex(t => t.id === id);

    if (index === -1) {
      throw new Error('Truck not found');
    }

    data.trucks[index] = { ...data.trucks[index], ...updates };
    await this.saveData(data, `Update truck: ${data.trucks[index].supplierName}`);
    return data;
  }

  async deleteTruck(id: string): Promise<TruckData> {
    const data = await this.fetchData();
    const truck = data.trucks.find(t => t.id === id);

    if (!truck) {
      throw new Error('Truck not found');
    }

    data.trucks = data.trucks.filter(t => t.id !== id);
    await this.saveData(data, `Delete truck: ${truck.supplierName}`);
    return data;
  }

  async deleteAllTrucks(): Promise<TruckData> {
    const data: TruckData = {
      trucks: [],
      lastModified: new Date().toISOString(),
      version: '2.0.0'
    };
    await this.saveData(data, 'Delete all trucks');
    return data;
  }

  async resetData(newData: TruckData): Promise<TruckData> {
    await this.saveData(newData, 'Reset data');
    return newData;
  }

  // Start polling for updates
  startPolling(intervalMs: number = 30000) {
    this.stopPolling();

    this.pollingInterval = setInterval(async () => {
      try {
        const data = await this.fetchData();
        this.notifyListeners(data);
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Subscribe to data changes
  subscribe(listener: (data: TruckData) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(data: TruckData) {
    this.listeners.forEach(listener => listener(data));
  }

  isInitialized(): boolean {
    return this.config !== null;
  }

  getConfig() {
    return this.config;
  }

  disconnect() {
    this.stopPolling();
    this.listeners.clear();
    this.config = null;
    this.currentSha = null;
  }
}

// Singleton instance
export const githubSync = new GitHubSyncService();