import React, { useState, useEffect, useMemo } from "react";
import { Toaster } from "react-hot-toast";
import { Loading, LoadingStatus, ParsedLoadingEntry } from "../types/loading";
import { LoadingMessageInput } from "../components/LoadingMessageInput";
import { LoadingsTable } from "../components/LoadingsTable";
import {
  ScaleInLoadingModal,
  MarkLoadedModal,
  EditLoadingModal,
} from "../components/LoadingModals";
import { useGitHubSync } from "../hooks/useGitHubSync";
import { groupByDate, getTodayDateKey } from "../utils/dateUtils";
import { PackageOpen, ChevronDown } from "lucide-react";
import { SyncDropdown } from "../components/SyncDropdown";
import { ModuleNav } from "../components/ModuleNav";
import toast from "react-hot-toast";
import { parseLoadingMessage, validateParsedLoadings } from "../utils/loadingParser";

export const LoadingsPage = () => {
  const {
    data,
    loading,
    error,
    isOnline,
    lastSync,
    addLoading,
    addMultipleLoadings,
    updateLoading,
    deleteLoading,
    deleteAllLoadings,
    resetData,
    refresh,
  } = useGitHubSync();

  // Helper function to add multiple loadings from parsed entries
  const addLoadings = async (entries: ParsedLoadingEntry[]) => {
    const timestamp = Date.now();
    const loadings: Loading[] = entries.map((entry, index) => ({
      id: `loading_${timestamp}_${index}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      ...entry,
      status: "pending" as const,
      statusHistory: [
        {
          status: "pending" as const,
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await addMultipleLoadings(loadings);
  };

  // Helper function to update loading status
  const updateLoadingStatus = async (
    id: string,
    status: LoadingStatus,
    additionalData?: any
  ) => {
    const loading = (data.loadings || []).find((l) => l.id === id);
    if (!loading) {
      throw new Error("Loading not found");
    }

    // Add new status change to history
    const statusHistory = [
      ...(loading.statusHistory || []),
      {
        status,
        timestamp: new Date().toISOString(),
        details: additionalData,
      },
    ];

    await updateLoading(id, {
      status,
      statusHistory,
      updatedAt: new Date().toISOString(),
      ...additionalData,
    });
  };

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<LoadingStatus | 'all'>('all');
  const [scaleInModal, setScaleInModal] = useState<{
    open: boolean;
    loading: Loading | null;
  }>({
    open: false,
    loading: null,
  });
  const [loadedModal, setLoadedModal] = useState<{
    open: boolean;
    loading: Loading | null;
  }>({
    open: false,
    loading: null,
  });
  const [editModal, setEditModal] = useState<{
    open: boolean;
    loading: Loading | null;
  }>({
    open: false,
    loading: null,
  });
  const [loadingStates, setLoadingStates] = useState<{
    [key: string]: boolean;
  }>({});

  // Stats visibility on mobile (collapsed by default)
  const [showStats, setShowStats] = useState(false);

  // Group loadings by date
  const groupedLoadings = useMemo(() => {
    return groupByDate(data.loadings || []);
  }, [data.loadings]);

  // Get available dates (always include today even if no loadings)
  const availableDates = useMemo(() => {
    const datesFromLoadings = Array.from(groupedLoadings.keys());
    const today = getTodayDateKey();
    
    if (!datesFromLoadings.includes(today)) {
      return [today, ...datesFromLoadings];
    }
    return datesFromLoadings;
  }, [groupedLoadings]);

  // Set initial selected date (default to today's date)
  useEffect(() => {
    const today = getTodayDateKey();

    if (!selectedDate) {
      if (availableDates.includes(today)) {
        setSelectedDate(today);
      } else if (availableDates.length > 0) {
        setSelectedDate(availableDates[0]);
      } else {
        setSelectedDate(today);
      }
    } else if (
      availableDates.length > 0 &&
      !availableDates.includes(selectedDate)
    ) {
      if (selectedDate !== today) {
        setSelectedDate(availableDates[0]);
      }
    }
  }, [availableDates, selectedDate]);

  // Get loadings for selected date
  const currentLoadings = useMemo(() => {
    if (!selectedDate) return [];
    return groupedLoadings.get(selectedDate) || [];
  }, [groupedLoadings, selectedDate]);

  // Filter loadings by status
  const filteredLoadings = useMemo(() => {
    if (statusFilter === 'all') return currentLoadings;
    return currentLoadings.filter(l => l.status === statusFilter);
  }, [currentLoadings, statusFilter]);

  const handleScaleIn = (loadingId: string) => {
    const loading = (data.loadings || []).find((l) => l.id === loadingId);
    if (loading) {
      setScaleInModal({ open: true, loading });
    }
  };

  const handleConfirmScaleIn = async (waybillNumber: string) => {
    if (!scaleInModal.loading) return;

    const loadingId = scaleInModal.loading.id;
    setLoadingStates((prev) => ({ ...prev, [`scale-${loadingId}`]: true }));

    try {
      await updateLoadingStatus(loadingId, "scaled_in", { waybillNumber });
    } catch (error) {
      // Error already handled by hook
    } finally {
      setLoadingStates((prev) => ({ ...prev, [`scale-${loadingId}`]: false }));
    }
  };

  const handleMarkLoaded = (loadingId: string) => {
    const loading = (data.loadings || []).find((l) => l.id === loadingId);
    if (loading) {
      setLoadedModal({ open: true, loading });
    }
  };

  const handleConfirmLoaded = async () => {
    if (!loadedModal.loading) return;

    const loadingId = loadedModal.loading.id;
    setLoadingStates((prev) => ({ ...prev, [`loaded-${loadingId}`]: true }));

    try {
      await updateLoadingStatus(loadingId, "loaded");
    } catch (error) {
      // Error already handled by hook
    } finally {
      setLoadingStates((prev) => ({ ...prev, [`loaded-${loadingId}`]: false }));
    }
  };

  const handleEdit = (loading: Loading) => {
    setEditModal({ open: true, loading });
  };

  const handleConfirmEdit = async (updates: Partial<Loading>) => {
    if (!editModal.loading) return;

    try {
      await updateLoading(editModal.loading.id, updates);
    } catch (error) {
      // Error already handled by hook
    }
  };

  const handleDelete = async (loadingId: string) => {
    setLoadingStates((prev) => ({ ...prev, [`delete-${loadingId}`]: true }));

    try {
      await deleteLoading(loadingId);
    } catch (error) {
      // Error already handled by hook
    } finally {
      setLoadingStates((prev) => ({ ...prev, [`delete-${loadingId}`]: false }));
    }
  };

  // Count products (lines in products string)
  const countProducts = (products: string): number => {
    return products.split('\n').filter(line => line.trim().length > 0).length;
  };

  const totalProducts = currentLoadings.reduce((sum, l) => sum + countProducts(l.products), 0);

  return (
    <div className="min-h-screen bg-gray-900">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-gray-800 shadow-xl border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <PackageOpen className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-100 truncate">
                  Loadings Module
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">
                  Track and manage truck loading operations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ModuleNav />
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
              <LoadingMessageInput
                onProcess={addLoadings}
                onReset={() =>
                  resetData({
                    trucks: data.trucks || [],
                    loadings: [],
                    lastModified: new Date().toISOString(),
                  })
                }
              />
            </div>

            {/* Stats */}
            {currentLoadings.length > 0 && (
              <div className="lg:w-auto">
                {/* Mobile toggle button */}
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="lg:hidden w-full flex items-center justify-center gap-2 py-2 px-3 mb-2 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700/50 text-gray-400 text-sm transition-colors"
                >
                  <span>Statistics</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-300 ${showStats ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Stats grid - hidden on mobile by default, always visible on desktop */}
                <div
                  className={`grid grid-cols-2 lg:grid-cols-2 gap-4 overflow-hidden transition-all duration-300 ease-in-out lg:max-h-none lg:opacity-100 ${
                    showStats ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 lg:max-h-none lg:opacity-100'
                  }`}
                >
                  <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">Total Loadings</p>
                    <p className="text-2xl font-bold text-gray-100">
                      {currentLoadings.length}
                    </p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">Total Products</p>
                    <p className="text-2xl font-bold text-purple-500">
                      {totalProducts}
                    </p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">Pending</p>
                    <p className="text-2xl font-bold text-yellow-500">
                      {currentLoadings.filter((l) => l.status === "pending").length}
                    </p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">Scaled In</p>
                    <p className="text-2xl font-bold text-blue-500">
                      {currentLoadings.filter((l) => l.status === "scaled_in").length}
                    </p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700 col-span-2">
                    <p className="text-sm text-gray-400 mb-1">Loaded</p>
                    <p className="text-2xl font-bold text-green-500">
                      {currentLoadings.filter((l) => l.status === "loaded").length}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Loadings Table */}
          <div id="loadings-table">
            <LoadingsTable
              loadings={currentLoadings}
              onScaleIn={handleScaleIn}
              onMarkLoaded={handleMarkLoaded}
              onEdit={handleEdit}
              onDelete={handleDelete}
              loadingStates={loadingStates}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              availableDates={availableDates}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <ScaleInLoadingModal
        isOpen={scaleInModal.open}
        onClose={() => setScaleInModal({ open: false, loading: null })}
        onConfirm={handleConfirmScaleIn}
        loading={scaleInModal.loading}
      />

      <MarkLoadedModal
        isOpen={loadedModal.open}
        onClose={() => setLoadedModal({ open: false, loading: null })}
        onConfirm={handleConfirmLoaded}
        loading={loadedModal.loading}
      />

      <EditLoadingModal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, loading: null })}
        onConfirm={handleConfirmEdit}
        loading={editModal.loading}
      />
    </div>
  );
};

