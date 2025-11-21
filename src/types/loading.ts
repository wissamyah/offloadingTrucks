export type LoadingStatus = 'pending' | 'scaled_in' | 'loaded';

export interface StatusChange {
  status: LoadingStatus;
  timestamp: string;
  details?: {
    waybillNumber?: string;
  };
}

export interface Loading {
  id: string;
  customerName: string;
  products: string; // Combined products as multiline string
  truckNumber: string;
  driverName?: string;
  driverPhone?: string;
  status: LoadingStatus;
  waybillNumber?: string;
  statusHistory: StatusChange[];
  createdAt: string;
  updatedAt: string;
}

export interface LoadingData {
  loadings: Loading[];
  lastModified: string;
  version?: string;
}

export interface ParsedLoadingEntry {
  customerName: string;
  products: string; // Combined products as multiline string
  truckNumber: string;
  driverName?: string;
  driverPhone?: string;
}

