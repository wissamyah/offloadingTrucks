import React, { useState, useEffect, useMemo } from 'react';
import { Toaster } from 'react-hot-toast';
import { Truck, TruckStatus, ParsedTruckEntry } from './types/truck';
import { MessageInput } from './components/MessageInput';
import { TruckTable } from './components/TruckTable';
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
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
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

  // Get unique suppliers for the current date
  const availableSuppliers = useMemo(() => {
    const suppliers = new Set(currentTrucks.map(truck => truck.supplierName));
    return Array.from(suppliers).sort();
  }, [currentTrucks]);

  // Filter trucks by supplier name and truck number
  const filteredTrucks = useMemo(() => {
    if (!supplierFilter) return currentTrucks;
    return currentTrucks.filter(truck =>
      truck.supplierName.toLowerCase().includes(supplierFilter.toLowerCase()) ||
      truck.truckNumber.toLowerCase().includes(supplierFilter.toLowerCase())
    );
  }, [currentTrucks, supplierFilter]);

  // Sort handler
  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Sort trucks
  const sortedTrucks = useMemo(() => {
    const sorted = [...filteredTrucks].sort((a, b) => {
      // Default sorting: alphabetical by supplier name if no sort column is selected
      if (!sortBy) {
        const aValue = a.supplierName.toLowerCase();
        const bValue = b.supplierName.toLowerCase();
        if (aValue < bValue) return -1;
        if (aValue > bValue) return 1;
        return 0;
      }

      // Custom column sorting
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'time':
          // Get latest status timestamp
          aValue = a.statusHistory.length > 0
            ? new Date(a.statusHistory[a.statusHistory.length - 1].timestamp).getTime()
            : new Date(a.createdAt).getTime();
          bValue = b.statusHistory.length > 0
            ? new Date(b.statusHistory[b.statusHistory.length - 1].timestamp).getTime()
            : new Date(b.createdAt).getTime();
          break;

        case 'supplier':
          aValue = a.supplierName.toLowerCase();
          bValue = b.supplierName.toLowerCase();
          break;

        case 'truck':
          aValue = a.truckNumber.toLowerCase();
          bValue = b.truckNumber.toLowerCase();
          break;

        case 'bags':
          aValue = a.bags;
          bValue = b.bags;
          break;

        case 'moisture':
          aValue = a.moistureLevel;
          bValue = b.moistureLevel;
          break;

        case 'status':
          // Custom status order: pending < scaled_in < offloaded < rejected
          const statusOrder = { pending: 0, scaled_in: 1, offloaded: 2, rejected: 3 };
          aValue = statusOrder[a.status];
          bValue = statusOrder[b.status];
          break;

        case 'waybill':
          aValue = a.waybillNumber?.toLowerCase() || '';
          bValue = b.waybillNumber?.toLowerCase() || '';
          break;

        case 'netWeight':
          aValue = a.netWeight || 0;
          bValue = b.netWeight || 0;
          break;

        case 'deduction':
          aValue = a.deduction || 0;
          bValue = b.deduction || 0;
          break;

        default:
          return 0;
      }

      // Compare values
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredTrucks, sortBy, sortDirection]);

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
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <TruckIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-100 truncate">Paddy Truck Monitoring System</h1>
                <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">Track and manage paddy truck operations</p>
              </div>
            </div>
            <div className="flex items-center flex-shrink-0">
              <SyncDropdown onRefresh={refresh} lastSync={lastSync} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Message Input and Stats */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Message Input */}
            <div className="flex-1 flex w-full lg:w-auto">
              <MessageInput onProcess={addTrucks} onReset={() => resetData({ trucks: [], lastModified: new Date().toISOString() })} />
            </div>

            {/* Stats */}
            {currentTrucks.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:w-auto">
                <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Total Trucks</p>
                  <p className="text-2xl font-bold text-gray-100">{sortedTrucks.length}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Total Bags</p>
                  <p className="text-2xl font-bold text-purple-500">
                    {sortedTrucks.reduce((sum, t) => sum + t.bags, 0)}
                  </p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Avg. Moisture</p>
                  <p className="text-2xl font-bold text-cyan-500">
                    {sortedTrucks.length > 0
                      ? (sortedTrucks.reduce((sum, t) => sum + t.moistureLevel, 0) / sortedTrucks.length).toFixed(1)
                      : 0}%
                  </p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Avg Bag Weight</p>
                  <p className="text-2xl font-bold text-orange-500">
                    {(() => {
                      const trucksWithWeight = sortedTrucks.filter(t => t.netWeight && t.netWeight > 0);
                      if (trucksWithWeight.length === 0) return '-';
                      const avgBagWeight = trucksWithWeight.reduce((sum, t) => {
                        return sum + (t.netWeight! / t.bags);
                      }, 0) / trucksWithWeight.length;
                      return `${avgBagWeight.toFixed(1)} kg`;
                    })()}
                  </p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Pending</p>
                  <p className="text-2xl font-bold text-yellow-500">
                    {sortedTrucks.filter(t => t.status === 'pending').length}
                  </p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Scaled In</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {sortedTrucks.filter(t => t.status === 'scaled_in').length}
                  </p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Offloaded</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-green-500">
                      {sortedTrucks.filter(t => t.status === 'offloaded').length}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(() => {
                        const totalWeight = sortedTrucks
                          .filter(t => t.status === 'offloaded' && t.netWeight)
                          .reduce((sum, t) => sum + (t.netWeight || 0), 0);
                        return totalWeight > 0 ? `• ${totalWeight.toLocaleString()} kg` : '';
                      })()}
                    </p>
                  </div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Rejected</p>
                  <p className="text-2xl font-bold text-red-500">
                    {sortedTrucks.filter(t => t.status === 'rejected').length}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Truck Table */}
          <div id="truck-table">
            <TruckTable
            trucks={sortedTrucks}
            onScaleIn={handleScaleIn}
            onOffload={handleOffload}
            onReject={handleReject}
            onEdit={handleEdit}
            onDelete={deleteTruck}
            loadingStates={loadingStates}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
            searchFilter={supplierFilter}
            onSearchChange={setSupplierFilter}
            totalTrucks={currentTrucks.length}
            availableDates={availableDates}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
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