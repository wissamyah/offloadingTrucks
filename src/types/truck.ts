export type TruckStatus = 'pending' | 'scaled_in' | 'offloaded' | 'rejected';

export interface StatusChange {
  status: TruckStatus;
  timestamp: string;
  details?: {
    waybillNumber?: string;
    netWeight?: number;
    deduction?: number;
  };
}

export interface Truck {
  id: string;
  supplierName: string;
  bags: number;
  moistureLevel: number;
  truckNumber: string;
  status: TruckStatus;
  waybillNumber?: string;
  netWeight?: number;
  deduction?: number;
  statusHistory: StatusChange[];
  createdAt: string;
  updatedAt: string;
}

export interface TruckData {
  trucks: Truck[];
  lastModified: string;
  version?: string;
}

export interface ParsedTruckEntry {
  supplierName: string;
  bags: number;
  moistureLevel: number;
  truckNumber: string;
}