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
  totalProducts: number;
  totalUsers: number;
  totalTransactions: number;
  completedTransactions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  recentTransactions: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: Date;
    user: {
      name: string;
      email: string | null;
    };
  }>;
}

// Stock verification result
export interface StockVerificationResult {
  available: boolean;
  errors: string[];
}
