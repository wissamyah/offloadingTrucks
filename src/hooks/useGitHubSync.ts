import { useState, useEffect, useCallback, useRef } from 'react';
import { TruckData, Truck } from '../types/truck';
import { githubSync } from '../services/githubSync';
import toast from 'react-hot-toast';

interface UseGitHubSyncReturn {
  data: TruckData;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  lastSync: Date | null;
  addTruck: (truck: Truck) => Promise<void>;
  addMultipleTrucks: (trucks: Truck[]) => Promise<void>;
  updateTruck: (id: string, updates: Partial<Truck>) => Promise<void>;
  deleteTruck: (id: string) => Promise<void>;
  deleteAllTrucks: () => Promise<void>;
  resetData: (data: TruckData) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useGitHubSync(): UseGitHubSyncReturn {
  const [data, setData] = useState<TruckData>({
    trucks: [],
    lastModified: new Date().toISOString(),
    version: '2.0.0'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const isMounted = useRef(true);

  // Initialize GitHub connection and fetch initial data
  useEffect(() => {
    const initializeSync = async () => {
      try {
        // Get auth from localStorage (only auth stays in localStorage)
        const authData = localStorage.getItem('githubAuth');

        if (!authData) {
          // No GitHub configured - that's OK, just use empty data
          setLoading(false);
          setError(null); // No error, just not configured
          return;
        }

        setLoading(true);
        setError(null);

        const auth = JSON.parse(authData);
        const initialized = await githubSync.initialize(
          auth.token,
          auth.owner,
          auth.repo,
          auth.path || 'data.json'
        );

        if (!initialized) {
          throw new Error('Failed to connect to GitHub');
        }

        // Fetch initial data
        const initialData = await githubSync.fetchData();

        setData(initialData);
        setLastSync(new Date());
        setError(null);
        setLoading(false);

        // Start polling for updates
        githubSync.startPolling(30000); // Poll every 30 seconds

        // Subscribe to updates
        const unsubscribe = githubSync.subscribe((updatedData) => {
          if (isMounted.current) {
            setData(updatedData);
            setLastSync(new Date());
          }
        });

        return unsubscribe;
      } catch (err) {
        console.error('GitHub sync error:', err);
        const message = err instanceof Error ? err.message : 'Failed to initialize';
        setError(message);
        setLoading(false);
      }
    };

    let unsubscribe: (() => void) | undefined;
    initializeSync().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      isMounted.current = false;
      if (unsubscribe) {
        unsubscribe();
      }
      githubSync.stopPolling();
    };
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!githubSync.isInitialized()) {
      toast.error('Please configure GitHub first');
      return;
    }

    try {
      setLoading(true);
      const freshData = await githubSync.fetchData();
      setData(freshData);
      setLastSync(new Date());
      toast.success('Data refreshed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refresh failed';
      toast.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTruck = useCallback(async (truck: Truck) => {
    if (!githubSync.isInitialized()) {
      toast.error('Please configure GitHub to add trucks');
      return;
    }

    if (!isOnline) {
      toast.error('Cannot add truck while offline');
      return;
    }

    // Optimistic update
    const optimisticData = {
      ...data,
      trucks: [...data.trucks, truck]
    };
    setData(optimisticData);

    try {
      const updatedData = await githubSync.addTruck(truck);
      setData(updatedData);
      setLastSync(new Date());
      toast.success('Truck added successfully');
    } catch (err) {
      // Rollback on error
      setData(data);
      const message = err instanceof Error ? err.message : 'Failed to add truck';
      toast.error(message);
      throw err;
    }
  }, [data, isOnline]);

  const addMultipleTrucks = useCallback(async (trucks: Truck[]) => {
    if (!githubSync.isInitialized()) {
      toast.error('Please configure GitHub to add trucks');
      return;
    }

    if (!isOnline) {
      toast.error('Cannot add trucks while offline');
      return;
    }

    if (trucks.length === 0) {
      return;
    }

    // Optimistic update
    const optimisticData = {
      ...data,
      trucks: [...data.trucks, ...trucks]
    };
    setData(optimisticData);

    try {
      const updatedData = await githubSync.addMultipleTrucks(trucks);
      setData(updatedData);
      setLastSync(new Date());
      toast.success(`${trucks.length} trucks added successfully`);
    } catch (err) {
      // Rollback on error
      setData(data);
      const message = err instanceof Error ? err.message : 'Failed to add trucks';
      toast.error(message);
      throw err;
    }
  }, [data, isOnline]);

  const updateTruck = useCallback(async (id: string, updates: Partial<Truck>) => {
    if (!githubSync.isInitialized()) {
      toast.error('Please configure GitHub to update trucks');
      return;
    }

    if (!isOnline) {
      toast.error('Cannot update truck while offline');
      return;
    }

    // Optimistic update
    const optimisticData = {
      ...data,
      trucks: data.trucks.map(t => t.id === id ? { ...t, ...updates } : t)
    };
    setData(optimisticData);

    try {
      const updatedData = await githubSync.updateTruck(id, updates);
      setData(updatedData);
      setLastSync(new Date());
      toast.success('Truck updated successfully');
    } catch (err) {
      // Rollback on error
      setData(data);
      const message = err instanceof Error ? err.message : 'Failed to update truck';
      toast.error(message);
      throw err;
    }
  }, [data, isOnline]);

  const deleteTruck = useCallback(async (id: string) => {
    if (!githubSync.isInitialized()) {
      toast.error('Please configure GitHub to delete trucks');
      return;
    }

    if (!isOnline) {
      toast.error('Cannot delete truck while offline');
      return;
    }

    // Optimistic update
    const optimisticData = {
      ...data,
      trucks: data.trucks.filter(t => t.id !== id)
    };
    setData(optimisticData);

    try {
      const updatedData = await githubSync.deleteTruck(id);
      setData(updatedData);
      setLastSync(new Date());
      toast.success('Truck deleted successfully');
    } catch (err) {
      // Rollback on error
      setData(data);
      const message = err instanceof Error ? err.message : 'Failed to delete truck';
      toast.error(message);
      throw err;
    }
  }, [data, isOnline]);

  const deleteAllTrucks = useCallback(async () => {
    if (!githubSync.isInitialized()) {
      toast.error('Please configure GitHub to delete trucks');
      return;
    }

    if (!isOnline) {
      toast.error('Cannot delete trucks while offline');
      return;
    }

    // Optimistic update
    const optimisticData = {
      ...data,
      trucks: []
    };
    setData(optimisticData);

    try {
      const updatedData = await githubSync.deleteAllTrucks();
      setData(updatedData);
      setLastSync(new Date());
      toast.success('All trucks deleted successfully');
    } catch (err) {
      // Rollback on error
      setData(data);
      const message = err instanceof Error ? err.message : 'Failed to delete trucks';
      toast.error(message);
      throw err;
    }
  }, [data, isOnline]);

  const resetData = useCallback(async (newData: TruckData) => {
    if (!githubSync.isInitialized()) {
      toast.error('Please configure GitHub to reset data');
      return;
    }

    if (!isOnline) {
      toast.error('Cannot reset data while offline');
      return;
    }

    try {
      const updatedData = await githubSync.resetData(newData);
      setData(updatedData);
      setLastSync(new Date());
      toast.success('Data reset successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset data';
      toast.error(message);
      throw err;
    }
  }, [isOnline]);

  return {
    data,
    loading,
    error,
    isOnline,
    lastSync,
    addTruck,
    addMultipleTrucks,
    updateTruck,
    deleteTruck,
    deleteAllTrucks,
    resetData,
    refresh
  };
}