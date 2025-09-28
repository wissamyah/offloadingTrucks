import React, { useState, useEffect, useMemo } from 'react';
import { Toaster } from 'react-hot-toast';
import { Truck, TruckStatus, ParsedTruckEntry } from './types/truck';
import { MessageInput } from './components/MessageInput';
import { TruckTable } from './components/TruckTable';
import { Pagination } from './components/Pagination';
import { ScaleInModal, OffloadModal, EditTruckModal } from './components/ActionModals';
import { useGitHubSync } from './hooks/useGitHubSync';
import { groupByDate, formatDate } from './utils/dateUtils';
import { githubSync } from './services/githubSync';
import { Truck as TruckIcon, Loader2 } from 'lucide-react';
import { SyncDropdown } from './components/SyncDropdown';
import toast from 'react-hot-toast';

function App() {
  const {
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
    refresh,
  } = useGitHubSync();

  // Helper function to add multiple trucks from parsed entries
  const addTrucks = async (entries: ParsedTruckEntry[]) => {
    const timestamp = Date.now();
    const trucks: Truck[] = entries.map((entry, index) => ({
      id: `truck_${timestamp}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      ...entry,
      status: 'pending' as const,
      statusHistory: [{
        status: 'pending' as const,
        timestamp: new Date().toISOString()
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    await addMultipleTrucks(trucks);
  };

  // Helper function to update truck status
  const updateTruckStatus = async (id: string, status: TruckStatus, additionalData?: any) => {
    await updateTruck(id, { status, ...additionalData });
  };

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [scaleInModal, setScaleInModal] = useState<{ open: boolean; truck: Truck | null }>({
    open: false,
    truck: null,
  });
  const [offloadModal, setOffloadModal] = useState<{ open: boolean; truck: Truck | null }>({
    open: false,
    truck: null,
  });
  const [editModal, setEditModal] = useState<{ open: boolean; truck: Truck | null }>({
    open: false,
    truck: null,
  });
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});

  // Group trucks by date
  const groupedTrucks = useMemo(() => {
    return groupByDate(data.trucks);
  }, [data.trucks]);

  // Get available dates
  const availableDates = useMemo(() => {
    return Array.from(groupedTrucks.keys());
  }, [groupedTrucks]);

  // Set initial selected date (default to today's date)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]; // Format: yyyy-MM-dd

    if (!selectedDate) {
      // If no date is selected, try to set today's date or fall back to the first available
      if (availableDates.includes(today)) {
        setSelectedDate(today);
      } else if (availableDates.length > 0) {
        setSelectedDate(availableDates[0]);
      } else {
        // No data yet, but set today's date anyway
        setSelectedDate(today);
      }
    } else if (availableDates.length > 0 && !availableDates.includes(selectedDate)) {
      // If selected date has no data, keep it selected (especially for today)
      if (selectedDate !== today) {
        setSelectedDate(availableDates[0]);
      }
    }
  }, [availableDates, selectedDate]);

  // Get trucks for selected date
  const currentTrucks = useMemo(() => {
    if (!selectedDate) return [];
    return groupedTrucks.get(selectedDate) || [];
  }, [groupedTrucks, selectedDate]);

  // Show sync status
  useEffect(() => {
    if (!isOnline && githubSync.isInitialized()) {
      toast.error('You are offline. Changes will be synced when connection is restored.');
    }
  }, [isOnline]);

  const handleScaleIn = (truckId: string) => {
    const truck = data.trucks.find(t => t.id === truckId);
    if (truck) {
      setScaleInModal({ open: true, truck });
    }
  };

  const handleConfirmScaleIn = async (waybillNumber: string) => {
    if (!scaleInModal.truck) return;

    const truckId = scaleInModal.truck.id;
    setLoadingStates(prev => ({ ...prev, [`scale-${truckId}`]: true }));

    try {
      await updateTruckStatus(truckId, 'scaled_in', { waybillNumber });
    } catch (error) {
      // Error already handled by hook
    } finally {
      setLoadingStates(prev => ({ ...prev, [`scale-${truckId}`]: false }));
    }
  };

  const handleOffload = (truckId: string) => {
    const truck = data.trucks.find(t => t.id === truckId);
    if (truck) {
      setOffloadModal({ open: true, truck });
    }
  };

  const handleConfirmOffload = async (netWeight: number, deduction?: number) => {
    if (!offloadModal.truck) return;

    const truckId = offloadModal.truck.id;
    setLoadingStates(prev => ({ ...prev, [`offload-${truckId}`]: true }));

    try {
      await updateTruckStatus(truckId, 'offloaded', { netWeight, deduction });
    } catch (error) {
      // Error already handled by hook
    } finally {
      setLoadingStates(prev => ({ ...prev, [`offload-${truckId}`]: false }));
    }
  };

  const handleReject = async (truckId: string) => {
    setLoadingStates(prev => ({ ...prev, [`reject-${truckId}`]: true }));

    try {
      await updateTruckStatus(truckId, 'rejected');
    } catch (error) {
      // Error already handled by hook
    } finally {
      setLoadingStates(prev => ({ ...prev, [`reject-${truckId}`]: false }));
    }
  };

  const handleEdit = (truck: Truck) => {
    setEditModal({ open: true, truck });
  };

  const handleConfirmEdit = async (updates: Partial<Truck>) => {
    if (!editModal.truck) return;

    try {
      await updateTruck(editModal.truck.id, updates);
    } catch (error) {
      // Error already handled by hook
    }
  };

  // Don't block on loading or errors - show the main interface

  return (
    <div className="min-h-screen bg-gray-900">
      <Toaster position="top-right" />


      {/* Header */}
      <header className="bg-gray-800 shadow-xl border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TruckIcon className="h-8 w-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-100">Paddy Truck Monitoring System</h1>
                <p className="text-sm text-gray-400">Track and manage paddy truck operations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SyncDropdown onConfigured={refresh} />
              {lastSync && (
                <div className="text-sm text-gray-400">
                  Last sync: {lastSync.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Message Input */}
          <MessageInput onProcess={addTrucks} onReset={() => resetData({ trucks: [], lastModified: new Date().toISOString() })} />

          {/* Date Pagination */}
          {availableDates.length > 0 && (
            <Pagination
              dates={availableDates}
              currentDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          )}

          {/* Stats */}
          {currentTrucks.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Total Trucks</p>
                <p className="text-2xl font-bold text-gray-100">{currentTrucks.length}</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {currentTrucks.filter(t => t.status === 'pending').length}
                </p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Scaled In</p>
                <p className="text-2xl font-bold text-blue-500">
                  {currentTrucks.filter(t => t.status === 'scaled_in').length}
                </p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Offloaded</p>
                <p className="text-2xl font-bold text-green-500">
                  {currentTrucks.filter(t => t.status === 'offloaded').length}
                </p>
              </div>
            </div>
          )}

          {/* Truck Table */}
          <div id="truck-table">
            <TruckTable
            trucks={currentTrucks}
            onScaleIn={handleScaleIn}
            onOffload={handleOffload}
            onReject={handleReject}
            onEdit={handleEdit}
            onDelete={deleteTruck}
            loadingStates={loadingStates}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <ScaleInModal
        isOpen={scaleInModal.open}
        onClose={() => setScaleInModal({ open: false, truck: null })}
        onConfirm={handleConfirmScaleIn}
        truck={scaleInModal.truck}
      />

      <OffloadModal
        isOpen={offloadModal.open}
        onClose={() => setOffloadModal({ open: false, truck: null })}
        onConfirm={handleConfirmOffload}
        truck={offloadModal.truck}
      />

      <EditTruckModal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, truck: null })}
        onConfirm={handleConfirmEdit}
        truck={editModal.truck}
      />
    </div>
  );
}

export default App;