# Admin Panel Tasks

## Status: ✅ Complete (Core + Optional Features)
**Priority**: High
**Estimated Complexity**: High
**Completed**: 2025-11-10
**Updated**: 2025-11-10 (Added optional features)

---

## Overview
Build simple admin panel for managing products, users, and viewing transactions.

---

## Tasks

### 1. Admin Service Layer
- [x] Create `src/services/admin-service.ts`
- [x] Implement `getAllUsers()`
- [x] Implement `getUserById(id)`
- [x] Implement `updateUserRole(id, role)`
- [x] Implement `deleteUser(id)`
- [x] Implement `getAllTransactions()`
- [x] Implement `getTransactionById(id)`
- [x] Implement `getDashboardStats()`
  - Total users
  - Total products
  - Total transactions
  - Revenue (completed transactions)
  - Pending transactions

### 2. Admin API Endpoints
- [x] GET `/api/admin/users` - list all users
- [x] GET `/api/admin/users/[id]` - get user details
- [x] PUT `/api/admin/users/[id]` - update user role
- [x] DELETE `/api/admin/users/[id]` - delete user
- [x] GET `/api/admin/transactions` - list all transactions
- [x] GET `/api/admin/transactions/[id]` - get transaction details
- [x] GET `/api/admin/stats` - dashboard statistics
- [x] Add admin role verification to all endpoints
- [x] Add proper error handling

### 3. Admin Layout
- [x] Create admin layout (`/app/admin/layout.tsx`)
- [x] Add admin sidebar navigation
- [x] Add admin header with logout (uses existing Header)
- [x] Add breadcrumbs (optional for v1)
- [x] Implement RTL layout
- [x] Add current user info display (optional for v1)
- [x] Add responsive mobile menu (optional for v1)

### 4. Admin Dashboard
- [x] Create dashboard page (`/app/admin/page.tsx`)
- [x] Display key statistics cards
  - Total Users
  - Total Products
  - Total Revenue
  - Pending Orders
  - Completed Orders
- [x] Add recent transactions table
- [ ] Add quick actions (optional for v1)
- [ ] Add charts (optional for v1)
  - Revenue over time
  - Orders per day
  - Top products

### 5. Admin User Management
- [x] Create users list page (`/app/admin/users/page.tsx`)
- [x] Create users table (inline component)
  - Display all users
  - Show email, name, role, join date
  - Add role change buttons
  - Add delete button with confirmation
  - Add pagination
- [x] Create user detail page (`/app/admin/users/[id]/page.tsx`) (optional for v1)
- [x] Add search functionality (optional for v1)
- [x] Add user filters (role filter) (optional for v1)

### 6. Admin Transaction Management
- [x] Create transactions list page (`/app/admin/transactions/page.tsx`)
- [x] Create transactions table (inline component)
  - Display all transactions
  - Show transaction code, user, amount, status, date
  - Add status filters (PENDING, COMPLETED, FAILED)
  - Add pagination
  - Link to invoice
- [ ] Create transaction detail page (`/app/admin/transactions/[id]/page.tsx`) (optional for v1)
- [x] Add search by transaction code (optional for v1)
- [x] Add date range filter (optional for v1)

### 7. Admin Product Management
- [x] Already covered in product management tasks (03-product-management.md)
- [x] Ensure admin product pages are accessible from admin panel
- [x] Add product management link to admin navigation
- [x] Add search functionality for products
- [x] Add filters (active/inactive status, in-stock/out-of-stock)

### 8. Admin Components
- [x] Create `StatsCard` component
  - Display metric name
  - Display metric value
  - Display icon
  - Show trend (optional)
- [ ] Create `AdminTable` component (reusable) (not needed - used inline tables)
- [ ] Create `AdminHeader` component (not needed - using existing Header)
- [x] Create `AdminSidebar` component
  - Navigation links
  - Active state
  - Icons from Heroicons
  - Collapsible on mobile (optional for v1)

### 9. Admin Navigation Structure
- [x] Dashboard (/)
- [x] Users Management (/admin/users)
- [x] Products Management (/admin/products)
  - [x] Add Product (/admin/products/new)
  - [x] Edit Product (/admin/products/[id]/edit)
- [x] Transactions (/admin/transactions)

### 10. Admin Store (Zustand)
- [ ] Create `src/store/admin-store.ts` (optional - using component state)

### 11. Admin Permissions
- [x] Verify admin middleware works
- [x] Test non-admin access blocked
- [x] Add role checks in components
- [x] Redirect non-admins from admin pages

### 12. Admin UI Polish
- [x] Add loading states
- [x] Add empty states
- [x] Add error states
- [x] Add success notifications
- [x] Add confirmation modals for destructive actions
- [x] Implement responsive design
- [ ] Add keyboard shortcuts (optional for v1)

---

## Dependencies
- Admin role in User model (✅ Done)
- Middleware protection (✅ Done)
- Product management (✅ Done)
- Transaction system (✅ Done)
- Authentication (✅ Done)

---

## Admin Navigation Menu
```
┌─────────────────────┐
│ پنل مدیریت کیتیا    │
├─────────────────────┤
│ 📊 داشبورد          │
│ 👥 کاربران         │
│ 📦 محصولات          │
│ 💳 تراکنش‌ها        │
│ 📄 فاکتورها         │
│ 🎁 کدهای تخفیف      │
├─────────────────────┤
│ 🚪 خروج             │
└─────────────────────┘
```

---

## Dashboard Stats Cards
```
┌─────────────┬─────────────┬─────────────┐
│ کل کاربران │ کل محصولات  │  درآمد کل   │
│    125      │     48      │ 12,500,000  │
└─────────────┴─────────────┴─────────────┘
┌─────────────┬─────────────┬─────────────┐
│ سفارش‌ جدید │ تکمیل‌شده   │ ناموفق      │
│     12      │    103      │     10      │
└─────────────┴─────────────┴─────────────┘
```

---

## API Examples

### Dashboard Stats
```typescript
GET /api/admin/stats

Response:
{
  "users": {
    "total": 125,
    "new": 15
  },
  "products": {
    "total": 48,
    "active": 42
  },
  "transactions": {
    "total": 125,
    "pending": 12,
    "completed": 103,
    "failed": 10
  },
  "revenue": {
    "total": 12500000,
    "thisMonth": 3200000
  }
}
```

### Users List
```typescript
GET /api/admin/users?page=1&limit=20

Response:
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "نام کاربر",
      "role": "USER",
      "createdAt": "2025-01-01T..."
    }
  ],
  "total": 125,
  "page": 1,
  "perPage": 20
}
```

---

## Testing Checklist
- [x] Admin can access admin panel
- [x] Non-admin redirected from admin panel
- [x] Dashboard stats display correctly
- [x] Can view all users
- [x] Can change user role
- [x] Can delete user (with confirmation)
- [x] Can view all transactions
- [x] Can filter transactions by status
- [ ] Can search transactions (optional for v1)
- [ ] Can view transaction details (optional for v1)
- [x] Can access product management
- [x] All Persian text displays correctly (RTL)
- [x] Pagination works
- [ ] Search works (optional for v1)
- [x] Responsive design works on mobile
- [x] Logout works from admin panel

---

## Notes
- Keep UI simple and functional
- Focus on core CRUD operations
- No need for fancy charts in v1 (can add later)
- Ensure all destructive actions have confirmation
- Add proper loading and error states
- Use Persian for all labels and messages
- Make tables responsive (horizontal scroll on mobile)
- Consider adding export functionality (CSV) in future
- Add activity logs in future versions
- Keep dashboard clean and easy to understand
