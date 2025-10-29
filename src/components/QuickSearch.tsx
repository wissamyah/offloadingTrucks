import React from "react";
import {
  X,
  Search,
  Clock,
  Scale,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Truck, TruckStatus } from "../types/truck";
import { formatTimeWAT } from "../utils/dateUtils";

interface QuickSearchProps {
  isOpen: boolean;
  onClose: () => void;
  trucks: Truck[];
  onTruckSelect?: (truck: Truck) => void;
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

export const QuickSearch: React.FC<QuickSearchProps> = ({ isOpen, onClose, trucks, onTruckSelect }) => {
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const normalized = query.trim().toLowerCase();
  const hasQuery = normalized.length > 0;

  const filtered = React.useMemo(() => {
    if (!hasQuery) return [] as Truck[];
    return trucks.filter((t) => {
      const hay = [
        t.supplierName,
        t.truckNumber,
        t.waybillNumber || "",
        t.status,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(normalized);
    });
  }, [trucks, normalized, hasQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="absolute left-1/2 -translate-x-1/2 top-16 w-[92vw] sm:w-[640px] bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Search bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search suppliers, truck/plate number, waybill, status..."
            className="flex-1 bg-transparent outline-none text-gray-100 placeholder-gray-400 text-sm"
          />
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!hasQuery ? (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">
              Type to search across trucks
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">
              No results for "{query}"
            </div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {filtered.map((t) => (
                <li
                  key={t.id}
                  className="px-4 py-3 hover:bg-gray-750 transition-colors cursor-pointer"
                  onClick={() => {
                    onTruckSelect?.(t);
                    onClose();
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <div className="text-sm text-gray-100 truncate font-medium">
                          {t.supplierName}
                        </div>
                        <div className="text-xs font-mono text-gray-200 bg-gray-700/50 border border-gray-600/50 px-2 py-0.5 rounded">
                          #{t.truckNumber}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {t.waybillNumber && (
                          <span className="text-xs text-gray-400">
                            Waybill: {t.waybillNumber}
                          </span>
                        )}
                        <StatusBadge status={t.status} truck={t} />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                      {new Date(t.createdAt).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickSearch;


