import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { LoadingButton } from './LoadingButton';
import { Loading } from '../types/loading';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      document.body.style.overflow = 'unset';
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out ${
        isAnimating ? 'bg-black bg-opacity-70' : 'bg-black bg-opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 transform border border-gray-700 transition-all duration-300 ease-out ${
          isAnimating
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Scale In Loading Modal
interface ScaleInLoadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (waybillNumber: string) => Promise<void>;
  loading: Loading | null;
}

export const ScaleInLoadingModal: React.FC<ScaleInLoadingModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  loading 
}) => {
  const [waybillNumber, setWaybillNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waybillNumber.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm(waybillNumber.trim());
      setWaybillNumber('');
      onClose();
    } catch (error) {
      // Error handled by parent component
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setWaybillNumber('');
    }
  }, [isOpen]);

  if (!loading) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scale In Loading">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-4">
            Customer: <span className="text-gray-200 font-medium">{loading.customerName}</span>
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Truck: <span className="text-gray-200 font-medium">{loading.truckNumber}</span>
          </p>
          <label htmlFor="waybill" className="block text-sm font-medium text-gray-300 mb-2">
            Waybill Number
          </label>
          <input
            type="text"
            id="waybill"
            value={waybillNumber}
            onChange={(e) => setWaybillNumber(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter waybill number"
            autoFocus
          />
        </div>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-gray-100 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <LoadingButton
            type="submit"
            loading={submitting}
            variant="primary"
            disabled={!waybillNumber.trim()}
          >
            Confirm Scale In
          </LoadingButton>
        </div>
      </form>
    </Modal>
  );
};

// Mark Loaded Modal
interface MarkLoadedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: Loading | null;
}

export const MarkLoadedModal: React.FC<MarkLoadedModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  loading 
}) => {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      // Error handled by parent component
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mark as Loaded">
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-2">
            Customer: <span className="text-gray-200 font-medium">{loading.customerName}</span>
          </p>
          <p className="text-sm text-gray-400 mb-2">
            Truck: <span className="text-gray-200 font-medium">{loading.truckNumber}</span>
          </p>
          {loading.waybillNumber && (
            <p className="text-sm text-gray-400 mb-2">
              Waybill: <span className="text-gray-200 font-medium">{loading.waybillNumber}</span>
            </p>
          )}
          <p className="text-sm text-gray-300 mt-4">
            Confirm that this loading has been completed and the truck has been loaded.
          </p>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-gray-100 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <LoadingButton
            type="submit"
            loading={submitting}
            variant="success"
          >
            Mark as Loaded
          </LoadingButton>
        </div>
      </form>
    </Modal>
  );
};

// Edit Loading Modal
interface EditLoadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updates: Partial<Loading>) => Promise<void>;
  loading: Loading | null;
}

export const EditLoadingModal: React.FC<EditLoadingModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  loading 
}) => {
  const [formData, setFormData] = useState({
    customerName: '',
    products: '',
    truckNumber: '',
    driverName: '',
    driverPhone: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading && isOpen) {
      setFormData({
        customerName: loading.customerName || '',
        products: loading.products || '',
        truckNumber: loading.truckNumber || '',
        driverName: loading.driverName || '',
        driverPhone: loading.driverPhone || '',
      });
    }
  }, [loading, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName.trim() || !formData.products.trim() || !formData.truckNumber.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm({
        customerName: formData.customerName.trim(),
        products: formData.products.trim(),
        truckNumber: formData.truckNumber.trim(),
        driverName: formData.driverName.trim() || undefined,
        driverPhone: formData.driverPhone.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (error) {
      // Error handled by parent component
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Loading">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium text-gray-300 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              id="customerName"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter customer name"
            />
          </div>

          <div>
            <label htmlFor="products" className="block text-sm font-medium text-gray-300 mb-1">
              Products *
            </label>
            <textarea
              id="products"
              value={formData.products}
              onChange={(e) => setFormData({ ...formData, products: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Enter products (one per line)"
              rows={4}
            />
          </div>

          <div>
            <label htmlFor="truckNumber" className="block text-sm font-medium text-gray-300 mb-1">
              Truck Number *
            </label>
            <input
              type="text"
              id="truckNumber"
              value={formData.truckNumber}
              onChange={(e) => setFormData({ ...formData, truckNumber: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter truck number"
            />
          </div>

          <div>
            <label htmlFor="driverName" className="block text-sm font-medium text-gray-300 mb-1">
              Driver Name (Optional)
            </label>
            <input
              type="text"
              id="driverName"
              value={formData.driverName}
              onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter driver name"
            />
          </div>

          <div>
            <label htmlFor="driverPhone" className="block text-sm font-medium text-gray-300 mb-1">
              Driver Phone (Optional)
            </label>
            <input
              type="text"
              id="driverPhone"
              value={formData.driverPhone}
              onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter driver phone"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-gray-100 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <LoadingButton
            type="submit"
            loading={submitting}
            variant="primary"
            disabled={!formData.customerName.trim() || !formData.products.trim() || !formData.truckNumber.trim()}
          >
            Save Changes
          </LoadingButton>
        </div>
      </form>
    </Modal>
  );
};

