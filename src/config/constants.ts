export const API_ROUTES = {
  AUTH: {
    LOGIN: "/api/auth/signin",
    REGISTER: "/api/auth/signup",
    LOGOUT: "/api/auth/signout",
  },
  PRODUCTS: "/api/products",
  TRANSACTIONS: "/api/transactions",
  INVOICES: "/api/invoices",
  ADMIN: {
    PRODUCTS: "/api/admin/products",
    USERS: "/api/admin/users",
    TRANSACTIONS: "/api/admin/transactions",
  },
};

export const ROLES = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;

export const TRANSACTION_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export const PROMO_CODE_DURATION_HOURS = 24;

export const ZARINPAL_CONFIG = {
  MERCHANT_ID: process.env.ZARINPAL_MERCHANT_ID || "",
  SANDBOX: process.env.NODE_ENV !== "production",
};
