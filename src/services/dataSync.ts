import { Truck, TruckData } from '../types/truck';
import { githubService } from './githubService';
import { getSyncQueue } from './syncQueue';
import { addHours, isAfter } from 'date-fns';

export class DataSyncService {
  private localData: TruckData = {
    trucks: [],
    lastUpdated: '',
  };

  private syncQueue = getSyncQueue();
  private pollInterval: NodeJS.Timeout | null = null;
  private pendingDeletions = new Set<string>();

  constructor() {
    // Load pending deletions from storage
    this.loadPendingDeletions();
    // Start polling for remote changes if in multi-user mode
    this.startPolling();
  }

  private loadPendingDeletions() {
    const saved = localStorage.getItem('pendingDeletions');
    if (saved) {
      try {
        this.pendingDeletions = new Set(JSON.parse(saved));
      } catch {
        this.pendingDeletions = new Set();
      }
    }
  }

  private savePendingDeletions() {
    localStorage.setItem('pendingDeletions', JSON.stringify(Array.from(this.pendingDeletions)));
  }

  async loadData(): Promise<TruckData> {
    try {
      // Always load from localStorage first for instant display
      const stored = localStorage.getItem('truckData');
      if (stored) {
        this.localData = JSON.parse(stored);
        this.cleanupOldTrucks();
      }

      // Then try to fetch from GitHub and merge if configured
      if (githubService.isInitialized()) {
        try {
          const remoteData = await githubService.fetchData();
          this.mergeRemoteData(remoteData);
        } catch (error) {
          console.warn('Failed to fetch remote data, using local:', error);
          // Continue with local data - no throwing
        }
      }

      return this.localData;
    } catch (error) {
      console.error('Failed to load data:', error);
      return this.localData;
    }
  }

  private mergeRemoteData(remoteData: TruckData) {
    // Simple merge strategy: combine trucks from both sources, keeping the newest version of duplicates
    const truckMap = new Map<string, Truck>();

    // Add local trucks
    this.localData.trucks.forEach(truck => {
      truckMap.set(truck.id, truck);
    });

    // Add/update with remote trucks (newer ones win)
    remoteData.trucks.forEach(remoteTruck => {
      // CRITICAL: Skip if this truck is pending deletion locally
      if (this.pendingDeletions.has(remoteTruck.id)) {
        console.log(`Skipping merge of deleted truck ${remoteTruck.id}`);
        return;
      }

      const localTruck = truckMap.get(remoteTruck.id);
      if (!localTruck || new Date(remoteTruck.updatedAt || remoteTruck.createdAt) > new Date(localTruck.updatedAt || localTruck.createdAt)) {
        truckMap.set(remoteTruck.id, remoteTruck);
      }
    });

    this.localData.trucks = Array.from(truckMap.values());
    this.localData.lastUpdated = new Date().toISOString();
    localStorage.setItem('truckData', JSON.stringify(this.localData));
  }

  async saveDataLocal(data: TruckData, message?: string): Promise<void> {
    // INSTANT: Save to localStorage immediately
    this.localData = data;
    this.localData.lastUpdated = new Date().toISOString();
    localStorage.setItem('truckData', JSON.stringify(this.localData));

    // BACKGROUND: Queue GitHub sync if configured
    if (githubService.isInitialized()) {
      this.syncQueue.addOperation({
        type: 'update',
        data: this.localData,
      });
    }
  }

  async addTrucks(trucks: Truck[]): Promise<void> {
    const updatedData = {
      ...this.localData,
      trucks: [...trucks, ...this.localData.trucks],
    };
    await this.saveDataLocal(updatedData, 'Add new trucks');
  }

  async updateTruck(truckId: string, updates: Partial<Truck>): Promise<void> {
    const updatedTrucks = this.localData.trucks.map(truck =>
      truck.id === truckId ? { ...truck, ...updates, updatedAt: new Date().toISOString() } : truck
    );

    const updatedData = {
      ...this.localData,
      trucks: updatedTrucks,
    };

    await this.saveDataLocal(updatedData, `Update truck ${truckId}`);
  }

  async deleteTruck(truckId: string): Promise<void> {
    // Add to pending deletions to prevent resurrection during merge
    this.pendingDeletions.add(truckId);
    this.savePendingDeletions();

    const updatedTrucks = this.localData.trucks.filter(truck => truck.id !== truckId);

    const updatedData = {
      ...this.localData,
      trucks: updatedTrucks,
    };

    // Use entityId to track the specific deletion
    await this.saveDataLocal(updatedData, `Delete truck ${truckId}`);
  }

  async resetData(): Promise<void> {
    const emptyData: TruckData = {
      trucks: [],
      lastUpdated: new Date().toISOString(),
    };

    // Clear all pending deletions on reset
    this.pendingDeletions.clear();
    this.savePendingDeletions();

    // For reset, we want to ensure GitHub is also cleared
    this.localData = emptyData;
    localStorage.setItem('truckData', JSON.stringify(this.localData));

    if (githubService.isInitialized()) {
      // Reset is important, so we queue it with high priority
      this.syncQueue.addOperation({
        type: 'reset',
        data: emptyData,
      });
    }
  }

  clearPendingDeletion(truckId: string) {
    this.pendingDeletions.delete(truckId);
    this.savePendingDeletions();
  }

  private cleanupOldTrucks(): void {
    const now = new Date();
    const cutoffDate = addHours(now, -72);

    const filteredTrucks = this.localData.trucks.filter(truck => {
      const createdDate = new Date(truck.createdAt);
      return isAfter(createdDate, cutoffDate);
    });

    if (filteredTrucks.length !== this.localData.trucks.length) {
      this.localData.trucks = filteredTrucks;
      // Don't await this as it's a background cleanup
      this.saveDataLocal(this.localData, 'Auto cleanup old trucks').catch(console.error);
    }
  }

  private startPolling() {
    // Poll for remote changes every 15 seconds if GitHub is configured
    this.pollInterval = setInterval(async () => {
      if (githubService.isInitialized() && !document.hidden) {
        try {
          const remoteData = await githubService.fetchData();

          // Check if remote has newer data
          if (remoteData.lastUpdated > this.localData.lastUpdated) {
            this.mergeRemoteData(remoteData);

            // Notify UI of new data
            window.dispatchEvent(new CustomEvent('remote-data-updated', {
              detail: { source: 'poll', timestamp: new Date() }
            }));
          }
        } catch (error) {
          // Silently ignore polling errors
        }
      }
    }, 15000);
  }

  getData(): TruckData {
    return this.localData;
  }

  getSyncStatus() {
    return this.syncQueue.getStatus();
  }

  async forceSync() {
    await this.syncQueue.forceSync();
  }

  destroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
}

export const dataSyncService = new DataSyncService();