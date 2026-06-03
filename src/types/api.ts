// Shared API response types

// Generic paginated response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// Generic success/error responses
export interface SuccessResponse {
  success: true;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: string[];
}

export type ApiResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// Common operation results
export interface DeleteResult {
  success: boolean;
  message?: string;
}

export interface UpdateResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Dashboard statistics
export interface DashboardStats {
  users: {
    total: number;
    new: number;
  };
  products: {
    total: number;
    active: number;
  };
  transactions: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
  };
  recentTransactions: Array<{
    id: string;
    transactionCode: string;
    amount: number;
    status: string;
    createdAt: string;
    user: {
      name: string;
      email: string;
    };
  }>;
}

// Stock verification result
export interface StockVerificationResult {
  available: boolean;
  errors: string[];
  /** Product IDs that are unavailable (inactive, out of stock, or not found) */
  unavailableProductIds: string[];
}
