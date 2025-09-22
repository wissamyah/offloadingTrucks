import React, { useState } from 'react';
import {
  Scale,
  Package,
  XCircle,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Droplets
} from 'lucide-react';
import { Truck, TruckStatus } from '../types/truck';
import { formatDateTime, formatTime } from '../utils/dateUtils';
import { LoadingButton } from './LoadingButton';

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
}

const StatusBadge: React.FC<{ status: TruckStatus }> = ({ status }) => {
  const statusStyles = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    scaled_in: 'bg-blue-100 text-blue-800 border-blue-200',
    offloaded: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
  };

  const statusIcons = {
    pending: <Clock className="h-3 w-3" />,
    scaled_in: <Scale className="h-3 w-3" />,
    offloaded: <CheckCircle className="h-3 w-3" />,
    rejected: <XCircle className="h-3 w-3" />,
  };

  const statusLabels = {
    pending: 'Pending',
    scaled_in: 'Scaled In',
    offloaded: 'Offloaded',
    rejected: 'Rejected',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[status]}`}>
      {statusIcons[status]}
      {statusLabels[status]}
    </span>
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
}) => {
  const [deletingTrucks, setDeletingTrucks] = useState<Set<string>>(new Set());

  const handleDelete = async (truckId: string) => {
    if (!window.confirm('Are you sure you want to delete this truck entry?')) {
      return;
    }

    setDeletingTrucks(prev => new Set(prev).add(truckId));
    try {
      await onDelete(truckId);
    } finally {
      setDeletingTrucks(prev => {
        const next = new Set(prev);
        next.delete(truckId);
        return next;
      });
    }
  };

  const handleReject = async (truckId: string) => {
    if (!window.confirm('Are you sure you want to reject this truck?')) {
      return;
    }

    await onReject(truckId);
  };

  const getLatestStatusTime = (truck: Truck): string => {
    if (truck.statusHistory.length > 0) {
      const latest = truck.statusHistory[truck.statusHistory.length - 1];
      return formatTime(latest.timestamp);
    }
    return formatTime(truck.createdAt);
  };

  if (trucks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No trucks available. Process a WhatsApp message to add trucks.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Truck
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bags
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <Droplets className="h-4 w-4" />
                  Moisture
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Waybill
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Net Weight
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deduction
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trucks.map((truck) => (
              <tr key={truck.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {getLatestStatusTime(truck)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{truck.supplierName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-mono text-gray-900">{truck.truckNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {truck.bags}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {truck.moistureLevel}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={truck.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {truck.waybillNumber || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {truck.netWeight ? `${truck.netWeight} kg` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {truck.deduction ? `${truck.deduction} kg` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    {truck.status === 'pending' && (
                      <>
                        <LoadingButton
                          onClick={() => onScaleIn(truck.id)}
                          loading={loadingStates[`scale-${truck.id}`]}
                          variant="primary"
                          size="sm"
                          icon={<Scale className="h-4 w-4" />}
                        >
                          Scale In
                        </LoadingButton>
                        <LoadingButton
                          onClick={() => handleReject(truck.id)}
                          loading={loadingStates[`reject-${truck.id}`]}
                          variant="danger"
                          size="sm"
                        >
                          Reject
                        </LoadingButton>
                      </>
                    )}

                    {truck.status === 'scaled_in' && (
                      <>
                        <LoadingButton
                          onClick={() => onOffload(truck.id)}
                          loading={loadingStates[`offload-${truck.id}`]}
                          variant="success"
                          size="sm"
                          icon={<Package className="h-4 w-4" />}
                        >
                          Offloaded
                        </LoadingButton>
                        <LoadingButton
                          onClick={() => handleReject(truck.id)}
                          loading={loadingStates[`reject-${truck.id}`]}
                          variant="danger"
                          size="sm"
                        >
                          Reject
                        </LoadingButton>
                      </>
                    )}

                    {truck.status === 'rejected' && (
                      <LoadingButton
                        onClick={() => onScaleIn(truck.id)}
                        loading={loadingStates[`scale-${truck.id}`]}
                        variant="primary"
                        size="sm"
                        icon={<Scale className="h-4 w-4" />}
                      >
                        Scale In
                      </LoadingButton>
                    )}

                    <button
                      onClick={() => onEdit(truck)}
                      className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(truck.id)}
                      className="text-red-600 hover:text-red-800 transition-colors p-1"
                      disabled={deletingTrucks.has(truck.id)}
                      title="Delete"
                    >
                      {deletingTrucks.has(truck.id) ? (
                        <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
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
    </div>
  );
};