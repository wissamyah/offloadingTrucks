import { Truck, TruckData } from '../types/truck';
import { githubService } from './githubService';
import { addHours, isAfter } from 'date-fns';

export class DataSyncService {
  private localData: TruckData = {
    trucks: [],
    lastUpdated: '',
  };

  private syncInProgress = false;

  async loadData(): Promise<TruckData> {
    try {
      if (githubService.isInitialized()) {
        this.localData = await githubService.fetchData();
        this.cleanupOldTrucks();
        return this.localData;
      } else {
        // Load from localStorage if GitHub is not configured
        const stored = localStorage.getItem('truckData');
        if (stored) {
          this.localData = JSON.parse(stored);
          this.cleanupOldTrucks();
        }
        return this.localData;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      // Fallback to localStorage
      const stored = localStorage.getItem('truckData');
      if (stored) {
        this.localData = JSON.parse(stored);
      }
      return this.localData;
    }
  }

  async saveData(data: TruckData, message?: string): Promise<void> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;

    try {
      this.localData = data;
      this.localData.lastUpdated = new Date().toISOString();

      // Always save to localStorage first
      localStorage.setItem('truckData', JSON.stringify(this.localData));

      // Then try to sync with GitHub if configured
      if (githubService.isInitialized()) {
        await githubService.saveData(this.localData, message);
      }
    } catch (error) {
      console.error('Failed to save data:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  async addTrucks(trucks: Truck[]): Promise<void> {
    const updatedData = {
      ...this.localData,
      trucks: [...trucks, ...this.localData.trucks],
    };
    await this.saveData(updatedData, 'Add new trucks');
  }

  async updateTruck(truckId: string, updates: Partial<Truck>): Promise<void> {
    const updatedTrucks = this.localData.trucks.map(truck =>
      truck.id === truckId ? { ...truck, ...updates, updatedAt: new Date().toISOString() } : truck
    );

    const updatedData = {
      ...this.localData,
      trucks: updatedTrucks,
    };

    await this.saveData(updatedData, `Update truck ${truckId}`);
  }

  async deleteTruck(truckId: string): Promise<void> {
    const updatedTrucks = this.localData.trucks.filter(truck => truck.id !== truckId);

    const updatedData = {
      ...this.localData,
      trucks: updatedTrucks,
    };

    await this.saveData(updatedData, `Delete truck ${truckId}`);
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
      this.saveData(this.localData, 'Auto cleanup old trucks').catch(console.error);
    }
  }

  getData(): TruckData {
    return this.localData;
  }

  isSyncing(): boolean {
    return this.syncInProgress;
  }
}

export const dataSyncService = new DataSyncService();