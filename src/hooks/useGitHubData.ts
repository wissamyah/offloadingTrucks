import { useState, useEffect, useCallback } from 'react';
import { Truck, TruckData, StatusChange, TruckStatus } from '../types/truck';
import { dataSyncService } from '../services/dataSync';
import { ParsedTruckEntry } from '../types/truck';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

export const useGitHubData = () => {
  const [data, setData] = useState<TruckData>({ trucks: [], lastUpdated: '' });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const loadedData = await dataSyncService.loadData();
      setData(loadedData);
    } catch (error: any) {
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addTrucks = useCallback(async (entries: ParsedTruckEntry[]) => {
    setSyncing(true);
    try {
      const newTrucks: Truck[] = entries.map(entry => {
        const now = new Date().toISOString();
        return {
          id: uuidv4(),
          ...entry,
          status: 'pending' as TruckStatus,
          statusHistory: [{
            status: 'pending' as TruckStatus,
            timestamp: now,
          }],
          createdAt: now,
          updatedAt: now,
        };
      });

      // Save to GitHub/localStorage first, then update UI
      await dataSyncService.addTrucks(newTrucks);
      // Only update UI after successful save
      const updatedData = dataSyncService.getData();
      setData(updatedData);
    } catch (error: any) {
      toast.error('Failed to add trucks: ' + error.message);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, []);

  const updateTruckStatus = useCallback(async (
    truckId: string,
    status: TruckStatus,
    details?: { waybillNumber?: string; netWeight?: number; deduction?: number }
  ) => {
    setSyncing(true);
    try {
      const truck = data.trucks.find(t => t.id === truckId);
      if (!truck) {
        throw new Error('Truck not found');
      }

      const now = new Date().toISOString();
      const statusChange: StatusChange = {
        status,
        timestamp: now,
        details,
      };

      const updates: Partial<Truck> = {
        status,
        statusHistory: [...truck.statusHistory, statusChange],
        updatedAt: now,
      };

      if (details?.waybillNumber) {
        updates.waybillNumber = details.waybillNumber;
      }
      if (details?.netWeight !== undefined) {
        updates.netWeight = details.netWeight;
      }
      if (details?.deduction !== undefined) {
        updates.deduction = details.deduction;
      }

      // Save to GitHub/localStorage first, then update UI
      await dataSyncService.updateTruck(truckId, updates);
      // Only update UI after successful save
      const updatedData = dataSyncService.getData();
      setData(updatedData);
    } catch (error: any) {
      toast.error('Failed to update truck: ' + error.message);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, [data]);

  const updateTruck = useCallback(async (truckId: string, updates: Partial<Truck>) => {
    setSyncing(true);
    try {
      // Save to GitHub/localStorage first, then update UI
      await dataSyncService.updateTruck(truckId, updates);
      // Only update UI after successful save
      const updatedData = dataSyncService.getData();
      setData(updatedData);
    } catch (error: any) {
      toast.error('Failed to update truck: ' + error.message);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, []);

  const deleteTruck = useCallback(async (truckId: string) => {
    setSyncing(true);
    try {
      await dataSyncService.deleteTruck(truckId);
      const updatedData = dataSyncService.getData();
      setData(updatedData);
    } catch (error: any) {
      toast.error('Failed to delete truck: ' + error.message);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, []);

  const resetData = useCallback(async () => {
    setSyncing(true);
    try {
      await dataSyncService.saveData({ trucks: [], lastUpdated: new Date().toISOString() }, 'Reset all data');
      setData({ trucks: [], lastUpdated: new Date().toISOString() });
    } catch (error: any) {
      toast.error('Failed to reset data: ' + error.message);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, []);

  return {
    data,
    setData,
    loading,
    syncing,
    addTrucks,
    updateTruckStatus,
    updateTruck,
    deleteTruck,
    resetData,
    reload: loadData,
  };
};