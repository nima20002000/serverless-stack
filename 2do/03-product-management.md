# Product Management Tasks

## Status: Not Started
**Priority**: High
**Estimated Complexity**: High

---

## Overview
Implement complete product management system including CRUD operations, product listing, and detail pages.

---

## Tasks

### 1. Product Service Layer
- [ ] Create `src/services/product-service.ts`
- [ ] Implement `getAllProducts()` - with pagination
- [ ] Implement `getProductById(id)`
- [ ] Implement `createProduct()` - admin only
- [ ] Implement `updateProduct(id, data)` - admin only
- [ ] Implement `deleteProduct(id)` - admin only
- [ ] Implement `updateStock(id, quantity)`
- [ ] Implement `searchProducts(query)`
- [ ] Implement `getActiveProducts()` - for public listing

### 2. Product API Endpoints
- [ ] GET `/api/products` - list all active products (public)
- [ ] GET `/api/products/[id]` - get single product (public)
- [ ] POST `/api/products` - create product (admin only)
- [ ] PUT `/api/products/[id]` - update product (admin only)
- [ ] DELETE `/api/products/[id]` - delete product (admin only)
- [ ] Add proper error handling
- [ ] Add request validation
- [ ] Implement pagination for list endpoint

### 3. Product Components (Public)
- [ ] Create `ProductCard` component
  - Product image
  - Name and description
  - Price (in Toman with proper formatting)
  - Stock status
  - Add to cart button
- [ ] Create `ProductList` component
  - Grid layout (responsive)
  - Loading states
  - Empty states
  - Pagination controls
- [ ] Create `ProductDetail` component
  - Full product information
  - Image gallery
  - Quantity selector
  - Add to cart functionality
  - Stock availability display

### 4. Product Pages (Public)
- [ ] Create products listing page (`/app/(public)/products/page.tsx`)
- [ ] Create product detail page (`/app/(public)/products/[id]/page.tsx`)
- [ ] Implement SEO metadata for products
- [ ] Add breadcrumbs navigation
- [ ] Implement RTL layout

### 5. Admin Product Management Components
- [ ] Create `ProductTable` component
  - List all products (active & inactive)
  - Show stock levels
  - Quick edit buttons
  - Delete confirmation
- [ ] Create `ProductForm` component
  - Name input (Persian)
  - Description textarea (Persian)
  - Price input (Toman)
  - Stock input
  - Image upload (multiple)
  - Active/Inactive toggle
  - Form validation
- [ ] Create `ProductImageUpload` component
  - Drag & drop support
  - Preview images
  - Remove images
  - Multiple image support

### 6. Admin Product Pages
- [ ] Create products list page (`/app/admin/products/page.tsx`)
- [ ] Create add product page (`/app/admin/products/new/page.tsx`)
- [ ] Create edit product page (`/app/admin/products/[id]/edit/page.tsx`)
- [ ] Add success/error notifications
- [ ] Implement proper redirects

### 7. Image Handling
- [ ] Set up image upload solution (local/Cloudinary/S3)
- [ ] Create image upload utility
- [ ] Implement image optimization
- [ ] Add image validation (size, format)
- [ ] Handle multiple images per product

### 8. Product Store (Zustand)
- [ ] Create product store for client state
- [ ] Add selected products cache
- [ ] Implement optimistic updates

### 9. Search & Filtering
- [ ] Add search functionality
- [ ] Implement price range filter
- [ ] Add stock availability filter
- [ ] Add sorting options (price, name, date)

---

## Dependencies
- Prisma Product model (✅ Done)
- Admin authentication (⏳ In Progress)
- Image upload service (❌ Not set up)

---

## API Response Examples

### GET /api/products
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "نام محصول",
      "description": "توضیحات محصول",
      "price": 150000,
      "stock": 10,
      "images": ["url1", "url2"],
      "isActive": true
    }
  ],
  "total": 50,
  "page": 1,
  "perPage": 20
}
```

---

## Testing Checklist
- [ ] Can view product list
- [ ] Can view product details
- [ ] Admin can create product
- [ ] Admin can edit product
- [ ] Admin can delete product
- [ ] Images upload correctly
- [ ] Price displays with proper formatting (Toman)
- [ ] Stock levels update correctly
- [ ] Search works properly
- [ ] Pagination works
- [ ] Non-admin cannot access admin endpoints
- [ ] Persian text displays correctly (RTL)

---

## Notes
- All prices stored in database as Decimal
- Display prices in Toman (Iranian currency)
- Use proper number formatting for Persian locale
- Product names and descriptions should support Persian characters
- Consider lazy loading for product images
- Implement proper image CDN in production
