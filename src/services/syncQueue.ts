import { githubService } from './githubService';
import { TruckData } from '../types/truck';

export interface SyncOperation {
  id: string;
  timestamp: number;
  type: 'update' | 'delete' | 'create' | 'reset';
  entityId?: string;
  data?: any;
  retries: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  error?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  pendingOperations: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  hasConflicts: boolean;
  conflictDetails?: any;
}

class SyncQueueManager {
  private queue: Map<string, SyncOperation> = new Map();
  private isSyncing: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private lastSyncTime: Date | null = null;
  private conflicts: Map<string, any> = new Map();
  private isOnline: boolean = true;

  constructor() {
    this.loadQueue();
    this.startBackgroundSync();
    this.setupOnlineListener();

    // Process any pending operations immediately on startup
    if (this.queue.size > 0 && this.isOnline) {
      setTimeout(() => this.processSyncQueue(), 500);
    }
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();

      // Reset failed operations to pending when coming back online
      Array.from(this.queue.values()).forEach(op => {
        if (op.status === 'failed' && op.retries < 3) {
          op.status = 'pending';
        }
      });
      this.saveQueue();

      // Immediately try to sync when coming back online
      setTimeout(() => this.processSyncQueue(), 100);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });

    this.isOnline = navigator.onLine;

    // Check connection periodically
    setInterval(() => {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;
      if (wasOnline !== this.isOnline) {
        this.notifyListeners();
        if (this.isOnline && this.queue.size > 0) {
          this.processSyncQueue();
        }
      }
    }, 5000);
  }

  private loadQueue() {
    const savedQueue = localStorage.getItem('syncQueue');
    if (savedQueue) {
      try {
        const queueArray = JSON.parse(savedQueue) as SyncOperation[];
        this.queue = new Map(queueArray.map(op => [op.id, op]));
      } catch (error) {
        console.error('Failed to load sync queue:', error);
        this.queue = new Map();
      }
    }
  }

  private saveQueue() {
    const queueArray = Array.from(this.queue.values());
    localStorage.setItem('syncQueue', JSON.stringify(queueArray));
  }

  public addOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries' | 'status'>) {
    const id = `${operation.type}_${operation.entityId || 'all'}_${Date.now()}`;

    // Coalesce operations - if there's a pending operation for the same entity, replace it
    if (operation.entityId) {
      const existingOps = Array.from(this.queue.values()).filter(
        op => op.entityId === operation.entityId && op.status === 'pending'
      );

      // Remove older operations for the same entity
      existingOps.forEach(op => {
        this.queue.delete(op.id);
      });
    }

    const newOperation: SyncOperation = {
      id,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
      ...operation
    };

    this.queue.set(id, newOperation);
    this.saveQueue();
    this.notifyListeners();

    // Try to sync immediately if not already syncing
    if (!this.isSyncing && this.isOnline) {
      this.processSyncQueue();
    }
  }

  private async processSyncQueue() {
    if (this.isSyncing || this.queue.size === 0 || !this.isOnline) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    const pendingOps = Array.from(this.queue.values())
      .filter(op => op.status === 'pending')
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const operation of pendingOps) {
      try {
        operation.status = 'syncing';
        this.notifyListeners();

        await this.executeSyncOperation(operation);

        operation.status = 'completed';
        this.queue.delete(operation.id);
        this.lastSyncTime = new Date();
        this.saveQueue();

        // Clear from pending deletions and pending local changes after successful sync
        if (operation.entityId) {
          const { dataSyncService } = await import('./dataSync');
          if (operation.type === 'delete') {
            dataSyncService.clearPendingDeletion(operation.entityId);
          } else {
            // For update operations, just clear the pending sync flag
            dataSyncService.clearPendingSync(operation.entityId);
          }
        }

        this.notifyListeners();
      } catch (error: any) {
        operation.retries++;
        operation.error = error.message;

        if (operation.retries >= 3) {
          operation.status = 'failed';

          // Check if it's a conflict error
          if (error.status === 409 || error.message?.includes('conflict')) {
            this.handleConflict(operation, error);
          }
          this.notifyListeners();
        } else {
          operation.status = 'pending';
          this.notifyListeners();
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, operation.retries) * 1000));
        }
      }
    }

    this.isSyncing = false;
    this.saveQueue();
    this.notifyListeners();
  }

  private async executeSyncOperation(operation: SyncOperation): Promise<void> {
    if (!githubService.isInitialized()) {
      throw new Error('GitHub service not initialized');
    }

    switch (operation.type) {
      case 'update':
      case 'create':
        // Get current local data
        const localData = JSON.parse(localStorage.getItem('truckData') || '{}') as TruckData;
        await githubService.saveData(localData, `Sync: ${operation.type} operation`);
        // Clear pending local changes for all trucks after successful sync
        if (operation.type === 'update' && !operation.entityId) {
          localStorage.removeItem('pendingLocalChanges');
        }
        break;

      case 'delete':
        // Already handled in local data, just sync the current state
        const currentData = JSON.parse(localStorage.getItem('truckData') || '{}') as TruckData;
        await githubService.saveData(currentData, `Sync: delete operation`);
        break;

      case 'reset':
        await githubService.saveData(operation.data, 'Sync: reset operation');
        break;
    }
  }

  private handleConflict(operation: SyncOperation, error: any) {
    this.conflicts.set(operation.id, {
      operation,
      error,
      timestamp: new Date()
    });
    this.notifyListeners();
  }

  public resolveConflict(operationId: string, resolution: 'keep-local' | 'use-remote') {
    const conflict = this.conflicts.get(operationId);
    if (!conflict) return;

    if (resolution === 'keep-local') {
      // Force push local changes
      const operation = conflict.operation;
      operation.retries = 0;
      operation.status = 'pending';
      this.queue.set(operation.id, operation);
    } else {
      // Discard local changes - remove from queue
      this.queue.delete(operationId);
    }

    this.conflicts.delete(operationId);
    this.saveQueue();
    this.processSyncQueue();
  }

  private startBackgroundSync() {
    // Sync every 10 seconds if there are pending operations (more responsive)
    this.syncInterval = setInterval(() => {
      if (this.queue.size > 0 && this.isOnline && !this.isSyncing) {
        this.processSyncQueue();
      }
    }, 10000);

    // Also sync on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.queue.size > 0) {
        this.processSyncQueue();
      }
    });

    // Warn before closing if there are pending operations
    window.addEventListener('beforeunload', (e) => {
      const pendingOps = Array.from(this.queue.values()).filter(op => op.status === 'pending');
      if (pendingOps.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    });
  }

  public subscribe(listener: (status: SyncStatus) => void) {
    this.listeners.add(listener);
    // Immediately notify with current status
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach(listener => listener(status));
  }

  public getStatus(): SyncStatus {
    const pendingOps = Array.from(this.queue.values()).filter(op => op.status === 'pending');

    return {
      isOnline: this.isOnline,
      pendingOperations: pendingOps.length,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      hasConflicts: this.conflicts.size > 0,
      conflictDetails: Array.from(this.conflicts.values())
    };
  }

  public async forceSync() {
    await this.processSyncQueue();
  }

  public clearQueue() {
    this.queue.clear();
    this.conflicts.clear();
    this.saveQueue();
    this.notifyListeners();
  }

  public destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.listeners.clear();
  }
}

// Singleton instance
let syncQueueInstance: SyncQueueManager | null = null;

export const getSyncQueue = (): SyncQueueManager => {
  if (!syncQueueInstance) {
    syncQueueInstance = new SyncQueueManager();
  }
  return syncQueueInstance;
};