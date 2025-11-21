import React, { useState } from "react";
import {
  Scale,
  CheckCircle,
  Edit,
  Trash2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
  Package,
} from "lucide-react";
import { Loading, LoadingStatus } from "../types/loading";
import { formatDateTime, formatTime, formatTimeWAT } from "../utils/dateUtils";
import { LoadingButton } from "./LoadingButton";
import { ConfirmationModal } from "./ConfirmationModal";
import { CustomDropdown } from "./CustomDropdown";
import { format, parseISO } from "date-fns";

interface LoadingsTableProps {
  loadings: Loading[];
  onScaleIn: (loadingId: string) => void;
  onMarkLoaded: (loadingId: string) => void;
  onEdit: (loading: Loading) => void;
  onDelete: (loadingId: string) => Promise<void>;
  loadingStates: {
    [key: string]: boolean;
  };
  statusFilter?: LoadingStatus | 'all';
  onStatusFilterChange?: (status: LoadingStatus | 'all') => void;
  availableDates?: string[];
  selectedDate?: string;
  onDateChange?: (date: string) => void;
}

const StatusBadge: React.FC<{ status: LoadingStatus; loading: Loading }> = ({
  status,
  loading,
}) => {
  const statusStyles = {
    pending: "bg-yellow-900/30 text-yellow-400 border-yellow-700",
    scaled_in: "bg-blue-900/30 text-blue-400 border-blue-700",
    loaded: "bg-green-900/30 text-green-400 border-green-700",
  };

  const statusIcons = {
    pending: <Clock className="h-3 w-3" />,
    scaled_in: <Scale className="h-3 w-3" />,
    loaded: <CheckCircle className="h-3 w-3" />,
  };

  const statusLabels = {
    pending: "Pending",
    scaled_in: "Scaled In",
    loaded: "Loaded",
  };

  // Get the timestamp for the relevant status change
  const getStatusTime = (): string | null => {
    if (status !== "scaled_in" && status !== "loaded") {
      return null;
    }

    if (!loading.statusHistory || loading.statusHistory.length === 0) {
      if (loading.status === status && loading.updatedAt) {
        return formatTimeWAT(loading.updatedAt);
      }
      return null;
    }

    const statusChange = loading.statusHistory.find((sh) => sh.status === status);
    if (statusChange) {
      return formatTimeWAT(statusChange.timestamp);
    }

    if (loading.status === status && loading.updatedAt) {
      return formatTimeWAT(loading.updatedAt);
    }

    return null;
  };

  const statusTime = getStatusTime();

  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[status]}`}
      >
        {statusIcons[status]}
        {statusLabels[status]}
      </span>
      {statusTime && (
        <span className="text-xs text-gray-500">{statusTime}</span>
      )}
    </div>
  );
};

export const LoadingsTable: React.FC<LoadingsTableProps> = ({
  loadings,
  onScaleIn,
  onMarkLoaded,
  onEdit,
  onDelete,
  loadingStates,
  statusFilter = 'all',
  onStatusFilterChange,
  availableDates,
  selectedDate,
  onDateChange,
}) => {
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    loadingId: string | null;
  }>({ open: false, loadingId: null });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter by status
  const filteredLoadings = React.useMemo(() => {
    if (statusFilter === 'all') return loadings;
    return loadings.filter(l => l.status === statusFilter);
  }, [loadings, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredLoadings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLoadings = filteredLoadings.slice(startIndex, endIndex);

  const handleDeleteClick = (loadingId: string) => {
    setDeleteConfirmation({ open: true, loadingId });
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmation.loadingId) {
      await onDelete(deleteConfirmation.loadingId);
    }
    setDeleteConfirmation({ open: false, loadingId: null });
  };

  // Date navigation
  const handlePreviousDate = () => {
    if (!availableDates || !selectedDate) return;
    const currentIndex = availableDates.indexOf(selectedDate);
    if (currentIndex < availableDates.length - 1) {
      onDateChange?.(availableDates[currentIndex + 1]);
      setCurrentPage(1);
    }
  };

  const handleNextDate = () => {
    if (!availableDates || !selectedDate) return;
    const currentIndex = availableDates.indexOf(selectedDate);
    if (currentIndex > 0) {
      onDateChange?.(availableDates[currentIndex - 1]);
      setCurrentPage(1);
    }
  };

  const canGoPrevious = availableDates && selectedDate && availableDates.indexOf(selectedDate) < availableDates.length - 1;
  const canGoNext = availableDates && selectedDate && availableDates.indexOf(selectedDate) > 0;

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
      {/* Header with Date Selector and Status Filter */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Date Selector */}
          {availableDates && availableDates.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousDate}
                disabled={!canGoPrevious}
                className="p-2 text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <CustomDropdown
                options={availableDates.map((date) => ({
                  value: date,
                  label: format(parseISO(date), "EEEE, MMM d, yyyy"),
                }))}
                value={selectedDate || ""}
                onChange={(value) => {
                  onDateChange?.(value);
                  setCurrentPage(1);
                }}
              />
              <button
                onClick={handleNextDate}
                disabled={!canGoNext}
                className="p-2 text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onStatusFilterChange?.('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-gray-700 text-gray-100'
                  : 'bg-gray-900 text-gray-400 hover:text-gray-200'
              }`}
            >
              All ({loadings.length})
            </button>
            <button
              onClick={() => onStatusFilterChange?.('pending')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
                  : 'bg-gray-900 text-gray-400 hover:text-gray-200'
              }`}
            >
              Pending ({loadings.filter(l => l.status === 'pending').length})
            </button>
            <button
              onClick={() => onStatusFilterChange?.('scaled_in')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'scaled_in'
                  ? 'bg-blue-900/30 text-blue-400 border border-blue-700'
                  : 'bg-gray-900 text-gray-400 hover:text-gray-200'
              }`}
            >
              Scaled In ({loadings.filter(l => l.status === 'scaled_in').length})
            </button>
            <button
              onClick={() => onStatusFilterChange?.('loaded')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'loaded'
                  ? 'bg-green-900/30 text-green-400 border border-green-700'
                  : 'bg-gray-900 text-gray-400 hover:text-gray-200'
              }`}
            >
              Loaded ({loadings.filter(l => l.status === 'loaded').length})
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {paginatedLoadings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <Package className="h-16 w-16 text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg font-medium mb-2">No loadings found</p>
          <p className="text-gray-500 text-sm">
            {statusFilter === 'all'
              ? 'Paste a message to get started'
              : `No ${statusFilter} loadings`}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Products
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Truck
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {paginatedLoadings.map((loading) => (
                  <tr
                    key={loading.id}
                    className="hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-300 font-medium">
                      {loading.customerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      <div className="whitespace-pre-line max-w-xs">
                        {loading.products}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 font-mono">
                      {loading.truckNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {loading.driverName || <span className="text-gray-600">N/A</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                      {loading.driverPhone || <span className="text-gray-600">N/A</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={loading.status} loading={loading} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {loading.status === "pending" && (
                          <LoadingButton
                            onClick={() => onScaleIn(loading.id)}
                            loading={loadingStates[`scale-${loading.id}`]}
                            variant="primary"
                            size="sm"
                            icon={<Scale className="h-4 w-4" />}
                          >
                            Scale In
                          </LoadingButton>
                        )}
                        {loading.status === "scaled_in" && (
                          <LoadingButton
                            onClick={() => onMarkLoaded(loading.id)}
                            loading={loadingStates[`loaded-${loading.id}`]}
                            variant="success"
                            size="sm"
                            icon={<Package className="h-4 w-4" />}
                          >
                            Mark Loaded
                          </LoadingButton>
                        )}
                        <button
                          onClick={() => onEdit(loading)}
                          className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(loading.id)}
                          disabled={loadingStates[`delete-${loading.id}`]}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {loadingStates[`delete-${loading.id}`] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredLoadings.length)} of{" "}
                {filteredLoadings.length} loadings
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.open}
        onClose={() => setDeleteConfirmation({ open: false, loadingId: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Loading?"
        message="Are you sure you want to delete this loading? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleteConfirmation.loadingId ? loadingStates[`delete-${deleteConfirmation.loadingId}`] : false}
      />
    </div>
  );
};

