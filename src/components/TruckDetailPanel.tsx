import React, { useState } from "react";
import {
  X,
  Scale,
  Package,
  XCircle,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Copy,
  Truck as TruckIcon,
  Box,
  Droplets,
  FileText,
  Weight,
  MinusCircle,
} from "lucide-react";
import { Truck, TruckStatus } from "../types/truck";
import {
  formatDateTime,
  formatTimeWAT,
  getTimeDifference,
} from "../utils/dateUtils";
import { LoadingButton } from "./LoadingButton";
import { ConfirmationModal } from "./ConfirmationModal";

interface TruckDetailPanelProps {
  truck: Truck | null;
  isOpen: boolean;
  onClose: () => void;
  onScaleIn: (truckId: string) => void;
  onOffload: (truckId: string) => void;
  onReject: (truckId: string) => Promise<void>;
  onEdit: (truck: Truck) => void;
  onDelete: (truckId: string) => Promise<void>;
  loadingStates: {
    [key: string]: boolean;
  };
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
    pending: <Clock className="h-4 w-4" />,
    scaled_in: <Scale className="h-4 w-4" />,
    offloaded: <CheckCircle className="h-4 w-4" />,
    rejected: <XCircle className="h-4 w-4" />,
  };

  const statusLabels = {
    pending: "Pending",
    scaled_in: "Scaled In",
    offloaded: "Offloaded",
    rejected: "Rejected",
  };

  const getStatusTime = (): string | null => {
    if (status !== "scaled_in" && status !== "offloaded") {
      return null;
    }

    if (!truck.statusHistory || truck.statusHistory.length === 0) {
      if (truck.status === status && truck.updatedAt) {
        return formatTimeWAT(truck.updatedAt);
      }
      return null;
    }

    const statusChange = truck.statusHistory.find((sh) => sh.status === status);
    if (statusChange) {
      return formatTimeWAT(statusChange.timestamp);
    }

    if (truck.status === status && truck.updatedAt) {
      return formatTimeWAT(truck.updatedAt);
    }

    return null;
  };

  const statusTime = getStatusTime();

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${statusStyles[status]}`}
    >
      {statusIcons[status]}
      <div className="flex flex-col">
        <span>{statusLabels[status]}</span>
        {statusTime && (
          <span className="text-xs opacity-70 font-normal">{statusTime}</span>
        )}
      </div>
    </div>
  );
};

const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number | React.ReactNode;
  onCopy?: () => void;
}> = ({ icon, label, value, onCopy }) => {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-700/50 last:border-b-0">
      <div className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 mb-0.5">{label}</div>
        <div className="text-sm text-gray-100 font-medium break-words">
          {value}
          {onCopy && (
            <button
              onClick={onCopy}
              className="ml-2 text-gray-400 hover:text-gray-200 transition-colors"
              title="Copy"
            >
              <Copy className="h-3.5 w-3.5 inline" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const TruckDetailPanel: React.FC<TruckDetailPanelProps> = ({
  truck,
  isOpen,
  onClose,
  onScaleIn,
  onOffload,
  onReject,
  onEdit,
  onDelete,
  loadingStates,
}) => {
  const [deleteConfirmTruck, setDeleteConfirmTruck] = useState<string | null>(
    null
  );
  const [rejectConfirmTruck, setRejectConfirmTruck] = useState<string | null>(
    null
  );
  const [copied, setCopied] = useState<string | null>(null);

  if (!truck || !isOpen) return null;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const getStatusBackground = (status: TruckStatus): string => {
    const statusBg: Record<TruckStatus, string> = {
      pending: "bg-yellow-900/10",
      scaled_in: "bg-blue-900/10",
      offloaded: "bg-green-900/10",
      rejected: "bg-red-900/10",
    };
    return statusBg[status];
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[150] transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-gray-800 border-l border-gray-700 shadow-2xl z-[160] transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div
            className={`px-6 py-4 border-b border-gray-700 ${getStatusBackground(
              truck.status
            )}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-100">Truck Details</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-200 transition-colors p-1"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={truck.status} truck={truck} />
              <span className="text-xs text-gray-400">
                {getTimeDifference(truck.createdAt)}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Supplier & Truck Number */}
            <div className="mb-6">
              <div className="text-xl font-bold text-gray-100 mb-2">
                {truck.supplierName}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-gray-200 bg-gray-700/50 border border-gray-600/50 px-3 py-1 rounded">
                  {truck.truckNumber}
                </span>
                <button
                  onClick={() => copyToClipboard(truck.truckNumber, "truck")}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                  title="Copy truck number"
                >
                  {copied === "truck" ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Main Info */}
            <div className="bg-gray-750/50 rounded-lg border border-gray-700/50 p-4 mb-6">
              <InfoRow
                icon={<Box className="h-4 w-4" />}
                label="Bags"
                value={truck.bags}
              />
              <InfoRow
                icon={<Droplets className="h-4 w-4" />}
                label="Moisture Level"
                value={`${truck.moistureLevel}%`}
              />
              {truck.waybillNumber && (
                <InfoRow
                  icon={<FileText className="h-4 w-4" />}
                  label="Waybill Number"
                  value={truck.waybillNumber}
                  onCopy={() =>
                    copyToClipboard(truck.waybillNumber!, "waybill")
                  }
                />
              )}
              {truck.netWeight && (
                <InfoRow
                  icon={<Weight className="h-4 w-4" />}
                  label="Net Weight"
                  value={`${truck.netWeight} kg`}
                />
              )}
              {truck.deduction && (
                <InfoRow
                  icon={<MinusCircle className="h-4 w-4" />}
                  label="Deduction"
                  value={`${truck.deduction} kg`}
                />
              )}
            </div>

            {/* Timestamps */}
            <div className="bg-gray-750/50 rounded-lg border border-gray-700/50 p-4 mb-6">
              <InfoRow
                icon={<Clock className="h-4 w-4" />}
                label="Created At"
                value={formatDateTime(truck.createdAt)}
              />
              <InfoRow
                icon={<Clock className="h-4 w-4" />}
                label="Last Updated"
                value={formatDateTime(truck.updatedAt)}
              />
            </div>

            {/* Status History */}
            {truck.statusHistory && truck.statusHistory.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  Status History
                </h3>
                <div className="space-y-2">
                  {truck.statusHistory
                    .slice()
                    .reverse()
                    .map((history, index) => (
                      <div
                        key={index}
                        className="bg-gray-750/50 rounded border border-gray-700/50 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-200 capitalize">
                            {history.status.replace("_", " ")}
                          </span>
                          <span className="text-gray-400">
                            {formatDateTime(history.timestamp)}
                          </span>
                        </div>
                        {history.details && (
                          <div className="mt-2 pt-2 border-t border-gray-700/50 space-y-1">
                            {history.details.waybillNumber && (
                              <div className="text-gray-400">
                                Waybill: {history.details.waybillNumber}
                              </div>
                            )}
                            {history.details.netWeight && (
                              <div className="text-gray-400">
                                Net Weight: {history.details.netWeight} kg
                              </div>
                            )}
                            {history.details.deduction && (
                              <div className="text-gray-400">
                                Deduction: {history.details.deduction} kg
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/50">
            <div className="flex flex-col gap-2">
              {/* Action Buttons Based on Status */}
              {truck.status === "pending" && (
                <>
                  <LoadingButton
                    onClick={() => onScaleIn(truck.id)}
                    loading={loadingStates[`scale-${truck.id}`]}
                    variant="primary"
                    size="sm"
                    icon={<Scale className="h-4 w-4" />}
                    className="w-full justify-center"
                  >
                    Scale In
                  </LoadingButton>
                  <LoadingButton
                    onClick={() => setRejectConfirmTruck(truck.id)}
                    loading={loadingStates[`reject-${truck.id}`]}
                    variant="danger"
                    size="sm"
                    className="w-full justify-center"
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
                    icon={<Package className="h-4 w-4" />}
                    className="w-full justify-center"
                  >
                    Offload
                  </LoadingButton>
                  <LoadingButton
                    onClick={() => setRejectConfirmTruck(truck.id)}
                    loading={loadingStates[`reject-${truck.id}`]}
                    variant="danger"
                    size="sm"
                    className="w-full justify-center"
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
                  icon={<Scale className="h-4 w-4" />}
                  className="w-full justify-center"
                >
                  Scale In
                </LoadingButton>
              )}

              {/* Edit and Delete */}
              <div className="flex gap-2 pt-2 border-t border-gray-700/50">
                <LoadingButton
                  onClick={() => {
                    onEdit(truck);
                    onClose();
                  }}
                  variant="secondary"
                  size="sm"
                  icon={<Edit className="h-4 w-4" />}
                  className="flex-1 justify-center"
                >
                  Edit
                </LoadingButton>
                <LoadingButton
                  onClick={() => setDeleteConfirmTruck(truck.id)}
                  loading={loadingStates[`delete-${truck.id}`]}
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="h-4 w-4" />}
                  className="flex-1 justify-center"
                >
                  Delete
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={deleteConfirmTruck === truck.id}
        onClose={() => setDeleteConfirmTruck(null)}
        onConfirm={async () => {
          if (deleteConfirmTruck) {
            await onDelete(deleteConfirmTruck);
            setDeleteConfirmTruck(null);
            onClose();
          }
        }}
        title="Delete Truck"
        message={`Are you sure you want to delete truck ${truck.truckNumber} from ${truck.supplierName}? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
        loading={loadingStates[`delete-${truck.id}`]}
      />

      <ConfirmationModal
        isOpen={rejectConfirmTruck === truck.id}
        onClose={() => setRejectConfirmTruck(null)}
        onConfirm={async () => {
          if (rejectConfirmTruck) {
            await onReject(rejectConfirmTruck);
            setRejectConfirmTruck(null);
          }
        }}
        title="Reject Truck"
        message={`Are you sure you want to reject truck ${truck.truckNumber} from ${truck.supplierName}?`}
        confirmText="Reject"
        type="danger"
        loading={loadingStates[`reject-${truck.id}`]}
      />
    </>
  );
};
