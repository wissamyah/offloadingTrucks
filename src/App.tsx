import React, { useState, useEffect, useMemo } from 'react';
import { Toaster } from 'react-hot-toast';
import { Truck, TruckStatus } from './types/truck';
import { MessageInput } from './components/MessageInput';
import { TruckTable } from './components/TruckTable';
import { Pagination } from './components/Pagination';
import { ScaleInModal, OffloadModal, EditTruckModal } from './components/ActionModals';
import { useGitHubData } from './hooks/useGitHubData';
import { groupByDate, formatDate } from './utils/dateUtils';
import { githubService } from './services/githubService';
import { dataSyncService } from './services/dataSync';
import { Truck as TruckIcon, Loader2 } from 'lucide-react';
import { SyncDropdown } from './components/SyncDropdown';
import toast from 'react-hot-toast';

function App() {
  // Initialize GitHub settings from localStorage before anything else
  useEffect(() => {
    const savedSettings = localStorage.getItem('githubSettings');
    if (savedSettings) {
      try {
        const { token, owner, repo } = JSON.parse(savedSettings);
        if (token && owner && repo) {
          githubService.initialize(token, owner, repo);
        }
      } catch (error) {
        console.error('Failed to initialize GitHub settings:', error);
      }
    }
  }, []);

  const {
    data,
    setData,
    loading,
    syncing,
    addTrucks,
    updateTruckStatus,
    updateTruck,
    deleteTruck,
    resetData,
    reload,
  } = useGitHubData();

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

  // Set initial selected date
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    } else if (availableDates.length === 0) {
      setSelectedDate('');
    } else if (!availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  // Get trucks for selected date
  const currentTrucks = useMemo(() => {
    if (!selectedDate) return [];
    return groupedTrucks.get(selectedDate) || [];
  }, [groupedTrucks, selectedDate]);

  // Listen for remote data updates from polling
  useEffect(() => {
    const handleRemoteUpdate = () => {
      // Reload data when remote updates are detected
      dataSyncService.loadData().then(newData => {
        setData(newData);
        toast.success('Data updated from remote', {
          duration: 2000,
          icon: '🔄',
        });
      });
    };

    window.addEventListener('remote-data-updated', handleRemoteUpdate);
    return () => window.removeEventListener('remote-data-updated', handleRemoteUpdate);
  }, [setData]);

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
      toast.success('Truck scaled in successfully');
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
      toast.success('Truck marked as offloaded');
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
      toast.success('Truck rejected');
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
      toast.success('Truck details updated');
    } catch (error) {
      // Error already handled by hook
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading truck data...</p>
        </div>
      </div>
    );
  }

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
              <SyncDropdown onConfigured={reload} />
              {syncing && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
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
          <MessageInput onProcess={addTrucks} onReset={resetData} />

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