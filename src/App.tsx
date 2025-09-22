import React, { useState, useEffect, useMemo } from 'react';
import { Toaster } from 'react-hot-toast';
import { Truck, TruckStatus } from './types/truck';
import { MessageInput } from './components/MessageInput';
import { TruckTable } from './components/TruckTable';
import { Pagination } from './components/Pagination';
import { AuthSettings } from './components/AuthSettings';
import { ScaleInModal, OffloadModal, EditTruckModal } from './components/ActionModals';
import { useGitHubData } from './hooks/useGitHubData';
import { groupByDate, formatDate } from './utils/dateUtils';
import { Truck as TruckIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

function App() {
  const {
    data,
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

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      reload();
    }, 30000);

    return () => clearInterval(interval);
  }, [reload]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading truck data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      <AuthSettings onConfigured={reload} />

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TruckIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Paddy Truck Monitoring System</h1>
                <p className="text-sm text-gray-500">Track and manage paddy truck operations</p>
              </div>
            </div>
            {syncing && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing with GitHub...
              </div>
            )}
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
              <div className="bg-white p-4 rounded-lg shadow-md">
                <p className="text-sm text-gray-600 mb-1">Total Trucks</p>
                <p className="text-2xl font-bold text-gray-900">{currentTrucks.length}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md">
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {currentTrucks.filter(t => t.status === 'pending').length}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md">
                <p className="text-sm text-gray-600 mb-1">Scaled In</p>
                <p className="text-2xl font-bold text-blue-600">
                  {currentTrucks.filter(t => t.status === 'scaled_in').length}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md">
                <p className="text-sm text-gray-600 mb-1">Offloaded</p>
                <p className="text-2xl font-bold text-green-600">
                  {currentTrucks.filter(t => t.status === 'offloaded').length}
                </p>
              </div>
            </div>
          )}

          {/* Truck Table */}
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