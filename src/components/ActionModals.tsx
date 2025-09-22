import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { LoadingButton } from './LoadingButton';
import { Truck } from '../types/truck';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 transform transition-all">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

interface ScaleInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (waybillNumber: string) => Promise<void>;
  truck: Truck | null;
}

export const ScaleInModal: React.FC<ScaleInModalProps> = ({ isOpen, onClose, onConfirm, truck }) => {
  const [waybillNumber, setWaybillNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waybillNumber.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onConfirm(waybillNumber.trim());
      setWaybillNumber('');
      onClose();
    } catch (error) {
      // Error handled by parent component
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scale In Truck">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          {truck && (
            <div className="bg-gray-50 p-3 rounded mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Supplier:</span> {truck.supplierName}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Truck:</span> {truck.truckNumber}
              </p>
            </div>
          )}
          <label htmlFor="waybill" className="block text-sm font-medium text-gray-700 mb-2">
            Waybill Number <span className="text-red-500">*</span>
          </label>
          <input
            id="waybill"
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={waybillNumber}
            onChange={(e) => setWaybillNumber(e.target.value)}
            placeholder="Enter waybill number"
            required
            autoFocus
          />
        </div>
        <div className="flex gap-3 justify-end">
          <LoadingButton
            type="button"
            onClick={onClose}
            variant="secondary"
            disabled={loading}
          >
            Cancel
          </LoadingButton>
          <LoadingButton
            type="submit"
            loading={loading}
            variant="primary"
          >
            Confirm Scale In
          </LoadingButton>
        </div>
      </form>
    </Modal>
  );
};

interface OffloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (netWeight: number, deduction?: number) => Promise<void>;
  truck: Truck | null;
}

export const OffloadModal: React.FC<OffloadModalProps> = ({ isOpen, onClose, onConfirm, truck }) => {
  const [netWeight, setNetWeight] = useState('');
  const [deduction, setDeduction] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const weight = parseFloat(netWeight);
    const deduct = deduction ? parseFloat(deduction) : undefined;

    if (isNaN(weight) || weight <= 0) {
      return;
    }

    if (deduct !== undefined && (isNaN(deduct) || deduct < 0)) {
      return;
    }

    setLoading(true);
    try {
      await onConfirm(weight, deduct);
      setNetWeight('');
      setDeduction('');
      onClose();
    } catch (error) {
      // Error handled by parent component
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mark as Offloaded">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {truck && (
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Supplier:</span> {truck.supplierName}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Truck:</span> {truck.truckNumber}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Waybill:</span> {truck.waybillNumber}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="netWeight" className="block text-sm font-medium text-gray-700 mb-2">
              Net Weight (kg) <span className="text-red-500">*</span>
            </label>
            <input
              id="netWeight"
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={netWeight}
              onChange={(e) => setNetWeight(e.target.value)}
              placeholder="Enter net weight in kg"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="deduction" className="block text-sm font-medium text-gray-700 mb-2">
              Deduction (kg) <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="deduction"
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={deduction}
              onChange={(e) => setDeduction(e.target.value)}
              placeholder="Enter deduction in kg"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <LoadingButton
            type="button"
            onClick={onClose}
            variant="secondary"
            disabled={loading}
          >
            Cancel
          </LoadingButton>
          <LoadingButton
            type="submit"
            loading={loading}
            variant="success"
          >
            Confirm Offload
          </LoadingButton>
        </div>
      </form>
    </Modal>
  );
};

interface EditTruckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updates: Partial<Truck>) => Promise<void>;
  truck: Truck | null;
}

export const EditTruckModal: React.FC<EditTruckModalProps> = ({ isOpen, onClose, onConfirm, truck }) => {
  const [formData, setFormData] = useState({
    supplierName: '',
    bags: '',
    moistureLevel: '',
    truckNumber: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (truck) {
      setFormData({
        supplierName: truck.supplierName,
        bags: truck.bags.toString(),
        moistureLevel: truck.moistureLevel.toString(),
        truckNumber: truck.truckNumber,
      });
    }
  }, [truck]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updates: Partial<Truck> = {
      supplierName: formData.supplierName.trim(),
      bags: parseInt(formData.bags, 10),
      moistureLevel: parseFloat(formData.moistureLevel),
      truckNumber: formData.truckNumber.trim(),
    };

    if (!updates.supplierName || !updates.truckNumber) {
      return;
    }

    if (isNaN(updates.bags!) || updates.bags! <= 0) {
      return;
    }

    if (isNaN(updates.moistureLevel!) || updates.moistureLevel! < 0 || updates.moistureLevel! > 100) {
      return;
    }

    setLoading(true);
    try {
      await onConfirm(updates);
      onClose();
    } catch (error) {
      // Error handled by parent component
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Truck Details">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-supplier" className="block text-sm font-medium text-gray-700 mb-2">
              Supplier Name <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-supplier"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.supplierName}
              onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="edit-bags" className="block text-sm font-medium text-gray-700 mb-2">
              Number of Bags <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-bags"
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.bags}
              onChange={(e) => setFormData({ ...formData, bags: e.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="edit-moisture" className="block text-sm font-medium text-gray-700 mb-2">
              Moisture Level (%) <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-moisture"
              type="number"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.moistureLevel}
              onChange={(e) => setFormData({ ...formData, moistureLevel: e.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="edit-truck" className="block text-sm font-medium text-gray-700 mb-2">
              Truck Number <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-truck"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.truckNumber}
              onChange={(e) => setFormData({ ...formData, truckNumber: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <LoadingButton
            type="button"
            onClick={onClose}
            variant="secondary"
            disabled={loading}
          >
            Cancel
          </LoadingButton>
          <LoadingButton
            type="submit"
            loading={loading}
            variant="primary"
          >
            Save Changes
          </LoadingButton>
        </div>
      </form>
    </Modal>
  );
};