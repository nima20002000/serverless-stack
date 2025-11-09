# Admin Panel Tasks

## Status: Not Started
**Priority**: High
**Estimated Complexity**: High

---

## Overview
Build simple admin panel for managing products, users, and viewing transactions.

---

## Tasks

### 1. Admin Service Layer
- [ ] Create `src/services/admin-service.ts`
- [ ] Implement `getAllUsers()`
- [ ] Implement `getUserById(id)`
- [ ] Implement `updateUserRole(id, role)`
- [ ] Implement `deleteUser(id)`
- [ ] Implement `getAllTransactions()`
- [ ] Implement `getTransactionById(id)`
- [ ] Implement `getDashboardStats()`
  - Total users
  - Total products
  - Total transactions
  - Revenue (completed transactions)
  - Pending transactions

### 2. Admin API Endpoints
- [ ] GET `/api/admin/users` - list all users
- [ ] GET `/api/admin/users/[id]` - get user details
- [ ] PUT `/api/admin/users/[id]` - update user role
- [ ] DELETE `/api/admin/users/[id]` - delete user
- [ ] GET `/api/admin/transactions` - list all transactions
- [ ] GET `/api/admin/transactions/[id]` - get transaction details
- [ ] GET `/api/admin/stats` - dashboard statistics
- [ ] Add admin role verification to all endpoints
- [ ] Add proper error handling

### 3. Admin Layout
- [ ] Create admin layout (`/app/admin/layout.tsx`)
- [ ] Add admin sidebar navigation
- [ ] Add admin header with logout
- [ ] Add breadcrumbs
- [ ] Implement RTL layout
- [ ] Add current user info display
- [ ] Add responsive mobile menu

### 4. Admin Dashboard
- [ ] Create dashboard page (`/app/admin/page.tsx`)
- [ ] Display key statistics cards
  - Total Users
  - Total Products
  - Total Revenue
  - Pending Orders
  - Completed Orders
- [ ] Add recent transactions table
- [ ] Add quick actions
- [ ] Add charts (optional for v1)
  - Revenue over time
  - Orders per day
  - Top products

### 5. Admin User Management
- [ ] Create users list page (`/app/admin/users/page.tsx`)
- [ ] Create `UsersTable` component
  - Display all users
  - Show email, name, role, join date
  - Add role change buttons
  - Add delete button with confirmation
  - Add search functionality
  - Add pagination
- [ ] Create user detail page (`/app/admin/users/[id]/page.tsx`)
  - Show user info
  - Show user's transactions
  - Show user's promo codes
  - Add edit role option
- [ ] Add user filters (role, date joined)

### 6. Admin Transaction Management
- [ ] Create transactions list page (`/app/admin/transactions/page.tsx`)
- [ ] Create `TransactionsTable` component
  - Display all transactions
  - Show transaction code, user, amount, status, date
  - Add status filters (PENDING, COMPLETED, FAILED)
  - Add search by transaction code
  - Add date range filter
  - Add pagination
  - Link to invoice
- [ ] Create transaction detail page (`/app/admin/transactions/[id]/page.tsx`)
  - Show full transaction details
  - Show purchased items
  - Show customer info
  - Show Zarinpal details
  - Link to invoice
  - Show payment timeline

### 7. Admin Product Management
- [ ] Already covered in product management tasks (03-product-management.md)
- [ ] Ensure admin product pages are accessible from admin panel
- [ ] Add product management link to admin navigation

### 8. Admin Components
- [ ] Create `StatsCard` component
  - Display metric name
  - Display metric value
  - Display icon
  - Show trend (optional)
- [ ] Create `AdminTable` component (reusable)
  - Generic table with sorting
  - Pagination
  - Search
  - RTL support
- [ ] Create `AdminHeader` component
  - Site branding
  - Admin user info
  - Logout button
- [ ] Create `AdminSidebar` component
  - Navigation links
  - Active state
  - Icons from Heroicons
  - Collapsible on mobile

### 9. Admin Navigation Structure
```
Dashboard (/)
├── Users Management (/admin/users)
│   └── User Detail (/admin/users/[id])
├── Products Management (/admin/products)
│   ├── Add Product (/admin/products/new)
│   └── Edit Product (/admin/products/[id]/edit)
└── Transactions (/admin/transactions)
    └── Transaction Detail (/admin/transactions/[id])
```

### 10. Admin Store (Zustand)
- [ ] Create `src/store/admin-store.ts`
- [ ] Store dashboard stats
- [ ] Store current filters
- [ ] Store pagination state
- [ ] Add refresh functions

### 11. Admin Permissions
- [ ] Verify admin middleware works
- [ ] Test non-admin access blocked
- [ ] Add role checks in components
- [ ] Hide admin links for non-admins
- [ ] Redirect non-admins from admin pages

### 12. Admin UI Polish
- [ ] Add loading states
- [ ] Add empty states
- [ ] Add error states
- [ ] Add success notifications
- [ ] Add confirmation modals for destructive actions
- [ ] Implement responsive design
- [ ] Add keyboard shortcuts (optional)

---

## Dependencies
- Admin role in User model (✅ Done)
- Middleware protection (✅ Done)
- Product management (⏳ Pending)
- Transaction system (⏳ Pending)
- Authentication (⏳ Pending)

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
- [ ] Admin can access admin panel
- [ ] Non-admin redirected from admin panel
- [ ] Dashboard stats display correctly
- [ ] Can view all users
- [ ] Can change user role
- [ ] Can delete user (with confirmation)
- [ ] Can view all transactions
- [ ] Can filter transactions by status
- [ ] Can search transactions
- [ ] Can view transaction details
- [ ] Can access product management
- [ ] All Persian text displays correctly (RTL)
- [ ] Pagination works
- [ ] Search works
- [ ] Responsive design works on mobile
- [ ] Logout works from admin panel

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
