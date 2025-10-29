import React, { useState } from "react";
import {
  Scale,
  Package,
  XCircle,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Droplets,
  Copy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { Truck, TruckStatus } from "../types/truck";
import { formatDateTime, formatTime, formatTimeWAT } from "../utils/dateUtils";
import { LoadingButton } from "./LoadingButton";
import { ConfirmationModal } from "./ConfirmationModal";
import { CustomDropdown } from "./CustomDropdown";
import { format, parseISO, startOfDay, isSameDay } from "date-fns";

interface TruckTableProps {
  trucks: Truck[];
  onScaleIn: (truckId: string) => void;
  onOffload: (truckId: string) => void;
  onReject: (truckId: string) => Promise<void>;
  onEdit: (truck: Truck) => void;
  onDelete: (truckId: string) => Promise<void>;
  loadingStates: {
    [key: string]: boolean;
  };
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string) => void;
  searchFilter?: string;
  onSearchChange?: (value: string) => void;
  totalTrucks?: number;
  availableDates?: string[];
  selectedDate?: string;
  onDateChange?: (date: string) => void;
}

const StatusBadge: React.FC<{ status: TruckStatus; truck: Truck }> = ({
  status,
  truck,
}) => {
  const statusStyles = {
    pending: "bg-yellow-900/30 text-yellow-400 border-yellow-700",
    scaled_in: "bg-blue-900/30 text-blue-400 border-blue-700",
    offloaded: "bg-green-900/30 text-green-400 border-green-700",
    rejected: "bg-red-900/30 text-red-400 border-red-700",
  };

  const statusIcons = {
    pending: <Clock className="h-3 w-3" />,
    scaled_in: <Scale className="h-3 w-3" />,
    offloaded: <CheckCircle className="h-3 w-3" />,
    rejected: <XCircle className="h-3 w-3" />,
  };

  const statusLabels = {
    pending: "Pending",
    scaled_in: "Scaled In",
    offloaded: "Offloaded",
    rejected: "Rejected",
  };

  // Get the timestamp for the relevant status change
  const getStatusTime = (): string | null => {
    // Only show time for scaled_in and offloaded statuses
    if (status !== "scaled_in" && status !== "offloaded") {
      return null;
    }

    // Backward compatibility: Check if statusHistory exists
    if (!truck.statusHistory || truck.statusHistory.length === 0) {
      // For old trucks without statusHistory, fall back to updatedAt if status matches
      if (truck.status === status && truck.updatedAt) {
        return formatTimeWAT(truck.updatedAt);
      }
      return null;
    }

    // Find the status change in history
    const statusChange = truck.statusHistory.find((sh) => sh.status === status);
    if (statusChange) {
      return formatTimeWAT(statusChange.timestamp);
    }

    // Fallback: If current status matches but no history entry, use updatedAt
    if (truck.status === status && truck.updatedAt) {
      return formatTimeWAT(truck.updatedAt);
    }

    return null;
  };

  const statusTime = getStatusTime();

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status]}`}
    >
      <div className="flex items-center gap-1">
        {statusIcons[status]}
        <div className="flex flex-col">
          <span>{statusLabels[status]}</span>
          {statusTime && (
            <span className="text-[10px] opacity-60 font-normal leading-tight">
              {statusTime}
            </span>
          )}
        </div>
      </div>
    </span>
  );
};

const SortableHeader: React.FC<{
  column: string;
  label: string | React.ReactNode;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string) => void;
}> = ({ column, label, sortBy, sortDirection, onSort }) => {
  if (!onSort) {
    return (
      <th className="px-2 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
        {label}
      </th>
    );
  }

  const isActive = sortBy === column;

  return (
    <th className="px-2 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
      <button
        onClick={() => onSort(column)}
        className="flex items-center gap-1 hover:text-gray-200 transition-colors group w-full"
      >
        {label}
        <span className="ml-auto">
          {!isActive && (
            <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
          )}
          {isActive && sortDirection === "asc" && (
            <ArrowUp className="h-3 w-3 text-blue-400" />
          )}
          {isActive && sortDirection === "desc" && (
            <ArrowDown className="h-3 w-3 text-blue-400" />
          )}
        </span>
      </button>
    </th>
  );
};

export const TruckTable: React.FC<TruckTableProps> = ({
  trucks,
  onScaleIn,
  onOffload,
  onReject,
  onEdit,
  onDelete,
  loadingStates,
  sortBy,
  sortDirection,
  onSort,
  searchFilter = "",
  onSearchChange,
  totalTrucks = 0,
  availableDates = [],
  selectedDate = "",
  onDateChange,
}) => {
  const [deletingTrucks, setDeletingTrucks] = useState<Set<string>>(new Set());
  const [deleteConfirmTruck, setDeleteConfirmTruck] = useState<string | null>(
    null
  );
  const [rejectConfirmTruck, setRejectConfirmTruck] = useState<string | null>(
    null
  );
  const [copiedTruck, setCopiedTruck] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [sortModalOpen, setSortModalOpen] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const formatDateDisplay = (dateKey: string, isMobile: boolean = false) => {
    if (!dateKey) return "No date";

    try {
      const date = parseISO(dateKey);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }

      const today = startOfDay(new Date());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (isSameDay(date, today)) {
        return isMobile
          ? `Today - ${format(date, "MMM d")}`
          : `Today - ${format(date, "EEEE, MMM d")}`;
      }

      if (isSameDay(date, yesterday)) {
        return isMobile
          ? `Yesterday - ${format(date, "MMM d")}`
          : `Yesterday - ${format(date, "EEEE, MMM d")}`;
      }

      return isMobile
        ? format(date, "MMM d, yyyy")
        : format(date, "EEEE, MMM d");
    } catch (error) {
      console.error("Error formatting date:", dateKey, error);
      return "Invalid date";
    }
  };

  const dropdownOptions = React.useMemo(() => {
    return availableDates.map((date) => ({
      value: date,
      label: formatDateDisplay(date, false),
      shortLabel: formatDateDisplay(date, true),
    }));
  }, [availableDates, isMobile]);

  const currentIndex = availableDates.indexOf(selectedDate);

  const handlePrevious = () => {
    if (currentIndex < availableDates.length - 1 && onDateChange) {
      onDateChange(availableDates[currentIndex + 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex > 0 && onDateChange) {
      onDateChange(availableDates[currentIndex - 1]);
    }
  };

  const copyTruckNumber = (truck: Truck) => {
    navigator.clipboard.writeText(truck.truckNumber).then(() => {
      setCopiedTruck(truck.id);
      setTimeout(() => setCopiedTruck(null), 1500);
    });
  };

  const handleDelete = async (truckId: string) => {
    setDeletingTrucks((prev) => new Set(prev).add(truckId));
    try {
      await onDelete(truckId);
    } finally {
      setDeletingTrucks((prev) => {
        const next = new Set(prev);
        next.delete(truckId);
        return next;
      });
      setDeleteConfirmTruck(null);
    }
  };

  const handleReject = async (truckId: string) => {
    await onReject(truckId);
    setRejectConfirmTruck(null);
  };

  // Get the time when the truck was first added to the table
  const getTruckCreationTime = (truck: Truck): string => {
    return formatTimeWAT(truck.createdAt);
  };

  // Check if we have a search filter active and total trucks exist
  const isSearching = searchFilter && searchFilter.trim().length > 0;
  const hasData = totalTrucks > 0;
  const noResults = trucks.length === 0;

  // Early return only if there's truly no data AND no search is active
  if (noResults && !isSearching && !hasData) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">
          No trucks available. Process a WhatsApp message to add trucks.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
      {/* Search Bar and Date Pagination */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
          {/* Search Bar */}
          {onSearchChange && (
            <div className="flex-1 w-full">
              <div className="flex gap-3 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    id="supplier-filter"
                    type="text"
                    value={searchFilter}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search supplier or truck number..."
                    className="w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchFilter && (
                    <button
                      onClick={() => onSearchChange("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-600 rounded-md transition-colors"
                      aria-label="Clear filter"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
                {searchFilter && (
                  <span className="text-sm text-gray-400 whitespace-nowrap">
                    Showing {trucks.length} of {totalTrucks}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Date Pagination Controls */}
          {availableDates.length > 0 && onDateChange && (
            <div className="flex items-center gap-1 sm:gap-2 w-full lg:w-auto">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === availableDates.length - 1}
                className={`p-1 sm:p-2 rounded-md transition-colors flex-shrink-0 ${
                  currentIndex === availableDates.length - 1
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>

              <div className="flex items-center justify-center gap-1 sm:gap-2 min-w-0 flex-1 lg:flex-initial">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hidden sm:block flex-shrink-0" />
                <div className="min-w-0 max-w-[180px] sm:max-w-[280px]">
                  <CustomDropdown
                    value={selectedDate}
                    options={dropdownOptions}
                    onChange={onDateChange}
                    isMobile={isMobile}
                  />
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={currentIndex === 0}
                className={`p-1 sm:p-2 rounded-md transition-colors flex-shrink-0 ${
                  currentIndex === 0
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3 p-3">
        {noResults ? (
          <div className="bg-gray-750 rounded-lg border border-gray-700 p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">
              No trucks found matching "{searchFilter}"
            </p>
            <p className="text-sm text-gray-500">
              Try a different search term or clear the filter
            </p>
          </div>
        ) : (
          trucks.map((truck) => (
            <div
              key={truck.id}
              className="bg-gray-750 rounded-lg border border-gray-700 p-3"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-base font-semibold text-gray-100 truncate">
                      {truck.supplierName}
                    </div>
                    <div
                      className="text-sm font-mono text-gray-200 bg-gray-700/50 border border-gray-600/50 px-2 py-0.5 rounded cursor-pointer hover:text-gray-100 hover:bg-gray-700 hover:border-gray-600 transition-colors"
                      onClick={() => copyTruckNumber(truck)}
                    >
                      {copiedTruck === truck.id ? (
                        <span className="text-green-400 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Copied!
                        </span>
                      ) : (
                        truck.truckNumber
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 ml-2 flex-shrink-0">
                  {getTruckCreationTime(truck)}
                </div>
              </div>

              <div className="flex items-center gap-4 mb-2 flex-wrap text-xs">
                <div>
                  <span className="text-gray-500">Bags: </span>
                  <span className="text-gray-200 font-medium">
                    {truck.bags}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Droplets className="h-3 w-3 text-gray-500" />
                  <span className="text-gray-500">Moisture: </span>
                  <span className="text-gray-200 font-medium">
                    {truck.moistureLevel}%
                  </span>
                </div>
                {truck.waybillNumber && (
                  <div>
                    <span className="text-gray-500">Waybill: </span>
                    <span className="text-gray-200 font-medium">
                      {truck.waybillNumber}
                    </span>
                  </div>
                )}
                {truck.netWeight && (
                  <div>
                    <span className="text-gray-500">Net: </span>
                    <span className="text-gray-200 font-medium">
                      {truck.netWeight}kg
                    </span>
                  </div>
                )}
                {truck.deduction && (
                  <div>
                    <span className="text-gray-500">Deduction: </span>
                    <span className="text-gray-200 font-medium">
                      {truck.deduction}kg
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1.5 mt-2">
                <div className="flex flex-wrap gap-1.5">
                  {truck.status === "pending" && (
                    <>
                      <LoadingButton
                        onClick={() => onScaleIn(truck.id)}
                        loading={loadingStates[`scale-${truck.id}`]}
                        variant="primary"
                        size="sm"
                        icon={<Scale className="h-3.5 w-3.5" />}
                      >
                        Scale In
                      </LoadingButton>
                      <LoadingButton
                        onClick={() => setRejectConfirmTruck(truck.id)}
                        loading={loadingStates[`reject-${truck.id}`]}
                        variant="danger"
                        size="sm"
                      >
                        Reject
                      </LoadingButton>
                    </>
                  )}

                  {truck.status === "scaled_in" && (
                    <>
                      <LoadingButton
                        onClick={() => onOffload(truck.id)}
                        loading={loadingStates[`offload-${truck.id}`]}
                        variant="success"
                        size="sm"
                        icon={<Package className="h-3.5 w-3.5" />}
                      >
                        Offloaded
                      </LoadingButton>
                      <LoadingButton
                        onClick={() => setRejectConfirmTruck(truck.id)}
                        loading={loadingStates[`reject-${truck.id}`]}
                        variant="danger"
                        size="sm"
                      >
                        Reject
                      </LoadingButton>
                    </>
                  )}

                  {truck.status === "rejected" && (
                    <LoadingButton
                      onClick={() => onScaleIn(truck.id)}
                      loading={loadingStates[`scale-${truck.id}`]}
                      variant="primary"
                      size="sm"
                      icon={<Scale className="h-3.5 w-3.5" />}
                    >
                      Scale In
                    </LoadingButton>
                  )}

                  <button
                    onClick={() => onEdit(truck)}
                    className="text-blue-400 hover:text-blue-300 transition-colors p-1.5 flex items-center gap-1"
                    title="Edit"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span className="text-xs">Edit</span>
                  </button>

                  <button
                    onClick={() => setDeleteConfirmTruck(truck.id)}
                    className="text-red-400 hover:text-red-300 transition-colors p-1.5 flex items-center gap-1"
                    disabled={deletingTrucks.has(truck.id)}
                    title="Delete"
                  >
                    {deletingTrucks.has(truck.id) ? (
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-red-400 border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="text-xs">Delete</span>
                      </>
                    )}
                  </button>
                </div>
                <StatusBadge status={truck.status} truck={truck} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mobile Sort Floating Button */}
      {onSort && (
        <button
          onClick={() => setSortModalOpen(true)}
          className="fixed bottom-6 right-6 md:hidden bg-blue-600 hover:bg-blue-500 text-white rounded-full p-4 shadow-2xl z-50 transition-all hover:scale-110 active:scale-95"
          aria-label="Sort trucks"
        >
          <ArrowUpDown className="h-5 w-5" />
          {sortBy && (
            <span className="absolute -top-1 -right-1 bg-blue-400 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
              {sortDirection === "asc" ? "↑" : "↓"}
            </span>
          )}
        </button>
      )}

      {/* Mobile Sort Bottom Sheet */}
      {onSort && (
        <>
          {/* Backdrop */}
          {sortModalOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-50 md:hidden animate-in fade-in"
              onClick={() => setSortModalOpen(false)}
            />
          )}
          {/* Bottom Sheet */}
          <div
            className={`fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 rounded-t-2xl z-50 md:hidden transform transition-transform duration-300 ease-out ${
              sortModalOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-100">Sort By</h3>
                <button
                  onClick={() => setSortModalOpen(false)}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {[
                  { value: "time", label: "Time" },
                  { value: "supplier", label: "Supplier" },
                  { value: "truck", label: "Truck" },
                  { value: "bags", label: "Bags" },
                  { value: "moisture", label: "Moisture" },
                  { value: "status", label: "Status" },
                  { value: "waybill", label: "Waybill" },
                  { value: "netWeight", label: "Net Weight" },
                  { value: "deduction", label: "Deduction" },
                ].map((option) => {
                  const isActive = sortBy === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => onSort(option.value)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between ${
                        isActive
                          ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                          : "bg-gray-700/50 text-gray-200 hover:bg-gray-700"
                      }`}
                    >
                      <span className="font-medium">{option.label}</span>
                      {isActive && (
                        <span className="text-blue-400">
                          {sortDirection === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-750">
              <tr>
                <SortableHeader
                  column="time"
                  label="Time"
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSort={onSort}
                />
                <SortableHeader
                  column="supplier"
                  label="Supplier"
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSort={onSort}
                />
                <SortableHeader
                  column="truck"
                  label="Truck"
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSort={onSort}
                />
                <SortableHeader
                  column="bags"
                  label="Bags"
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSort={onSort}
                />
                <SortableHeader
                  column="moisture"
                  label={
                    <div className="flex items-center gap-1">
                      <Droplets className="h-3 w-3" />
                      Moist.
                    </div>
                  }
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSort={onSort}
                />
                <SortableHeader
                  column="status"
                  label="Status"
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSort={onSort}
                />
                <SortableHeader
                  column="waybill"
                  label="Waybill"
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSort={onSort}
                />
                <SortableHeader
                  column="netWeight"
                  label="Net Wt."
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSort={onSort}
                />
                <SortableHeader
                  column="deduction"
                  label="Deduc."
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSort={onSort}
                />
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {noResults ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 mb-2">
                        No trucks found matching "{searchFilter}"
                      </p>
                      <p className="text-sm text-gray-500">
                        Try a different search term or clear the filter
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                trucks.map((truck) => (
                  <tr
                    key={truck.id}
                    className="hover:bg-gray-750 transition-colors"
                  >
                    <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-400">
                      {getTruckCreationTime(truck)}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-100">
                        {truck.supplierName}
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <div
                        className="text-xs font-mono text-gray-200 cursor-pointer hover:text-gray-100 inline-block"
                        onClick={() => copyTruckNumber(truck)}
                      >
                        {copiedTruck === truck.id ? (
                          <span className="text-green-400 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Copied!
                          </span>
                        ) : (
                          truck.truckNumber
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-200">
                      {truck.bags}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-200">
                      {truck.moistureLevel}%
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <StatusBadge status={truck.status} truck={truck} />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-200">
                      {truck.waybillNumber || "-"}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-200">
                      {truck.netWeight ? `${truck.netWeight} kg` : "-"}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-200">
                      {truck.deduction ? `${truck.deduction} kg` : "-"}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-right text-xs font-medium">
                      <div className="flex justify-end gap-1">
                        {truck.status === "pending" && (
                          <>
                            <LoadingButton
                              onClick={() => onScaleIn(truck.id)}
                              loading={loadingStates[`scale-${truck.id}`]}
                              variant="primary"
                              size="xs"
                              icon={<Scale className="h-3 w-3" />}
                            >
                              Scale In
                            </LoadingButton>
                            <LoadingButton
                              onClick={() => setRejectConfirmTruck(truck.id)}
                              loading={loadingStates[`reject-${truck.id}`]}
                              variant="danger"
                              size="xs"
                            >
                              Reject
                            </LoadingButton>
                          </>
                        )}

                        {truck.status === "scaled_in" && (
                          <>
                            <LoadingButton
                              onClick={() => onOffload(truck.id)}
                              loading={loadingStates[`offload-${truck.id}`]}
                              variant="success"
                              size="xs"
                              icon={<Package className="h-3 w-3" />}
                            >
                              Offload
                            </LoadingButton>
                            <LoadingButton
                              onClick={() => setRejectConfirmTruck(truck.id)}
                              loading={loadingStates[`reject-${truck.id}`]}
                              variant="danger"
                              size="xs"
                            >
                              Reject
                            </LoadingButton>
                          </>
                        )}

                        {truck.status === "rejected" && (
                          <LoadingButton
                            onClick={() => onScaleIn(truck.id)}
                            loading={loadingStates[`scale-${truck.id}`]}
                            variant="primary"
                            size="xs"
                            icon={<Scale className="h-3 w-3" />}
                          >
                            Scale In
                          </LoadingButton>
                        )}

                        <button
                          onClick={() => onEdit(truck)}
                          className="text-blue-400 hover:text-blue-300 transition-colors p-0.5 flex items-center gap-1"
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span className="text-xs">Edit</span>
                        </button>

                        <button
                          onClick={() => setDeleteConfirmTruck(truck.id)}
                          className="text-red-400 hover:text-red-300 transition-colors p-0.5 flex items-center gap-1"
                          disabled={deletingTrucks.has(truck.id)}
                          title="Delete"
                        >
                          {deletingTrucks.has(truck.id) ? (
                            <div className="animate-spin h-3.5 w-3.5 border-2 border-red-400 border-t-transparent rounded-full" />
                          ) : (
                            <>
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="text-xs">Delete</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteConfirmTruck !== null}
        onClose={() => setDeleteConfirmTruck(null)}
        onConfirm={() => {
          if (deleteConfirmTruck) {
            return handleDelete(deleteConfirmTruck);
          }
        }}
        title="Delete Truck Entry"
        message="Are you sure you want to delete this truck entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={
          deleteConfirmTruck ? deletingTrucks.has(deleteConfirmTruck) : false
        }
      />

      <ConfirmationModal
        isOpen={rejectConfirmTruck !== null}
        onClose={() => setRejectConfirmTruck(null)}
        onConfirm={() => {
          if (rejectConfirmTruck) {
            return handleReject(rejectConfirmTruck);
          }
        }}
        title="Reject Truck"
        message="Are you sure you want to reject this truck? You can scale it in later if needed."
        confirmText="Reject"
        cancelText="Cancel"
        type="warning"
        loading={
          rejectConfirmTruck
            ? loadingStates[`reject-${rejectConfirmTruck}`]
            : false
        }
      />
    </div>
  );
};
