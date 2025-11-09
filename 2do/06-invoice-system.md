# Invoice System Tasks

## Status: Not Started
**Priority**: Medium
**Estimated Complexity**: Medium

---

## Overview
Implement invoice generation system that creates downloadable invoices for completed transactions.

---

## Tasks

### 1. Invoice Service
- [ ] Create `src/services/invoice-service.ts`
- [ ] Implement `generateInvoice(transactionId)`
  - Fetch transaction with items
  - Generate unique invoice number
  - Create invoice record in DB
  - Generate PDF (optional for v1)
  - Return invoice data
- [ ] Implement `getInvoiceByTransaction(transactionId)`
- [ ] Implement `getInvoiceByNumber(invoiceNumber)`
- [ ] Implement `generateInvoiceNumber()`
  - Format: `INV-YYYYMMDD-XXXX`
  - Example: `INV-20250109-0001`
  - Ensure uniqueness

### 2. Invoice API Endpoints
- [ ] GET `/api/invoices/[id]`
  - Get invoice by ID
  - Verify user owns the invoice
  - Return invoice with transaction details
- [ ] GET `/api/invoices/transaction/[transactionId]`
  - Get invoice by transaction ID
- [ ] GET `/api/invoices/download/[id]`
  - Generate PDF on-the-fly
  - Return PDF file
  - Set proper headers for download

### 3. Invoice Data Structure
```typescript
interface InvoiceData {
  invoiceNumber: string
  invoiceDate: Date
  transactionCode: string
  customer: {
    name: string
    email: string
  }
  items: {
    productName: string
    quantity: number
    unitPrice: number
    total: number
  }[]
  subtotal: number
  total: number
  status: string
  zarinpalRefId?: string
}
```

### 4. Invoice Component (View)
- [ ] Create `InvoiceTemplate` component
- [ ] Design invoice layout (RTL)
- [ ] Add company/site branding
- [ ] Display invoice number and date
- [ ] Show transaction code
- [ ] List purchased items with details
- [ ] Display subtotal and total
- [ ] Show payment status
- [ ] Add Persian date formatting (Jalali calendar)
- [ ] Make it print-friendly

### 5. Invoice Page
- [ ] Create invoice view page (`/app/(public)/invoice/[id]/page.tsx`)
- [ ] Display invoice using InvoiceTemplate
- [ ] Add download/print buttons
- [ ] Verify user access (must own invoice)
- [ ] Show 404 if invoice not found
- [ ] Add breadcrumb navigation

### 6. PDF Generation (Optional for v1)
- [ ] Set up PDF generation with pdfkit
- [ ] Create PDF template with Persian font support
- [ ] Include all invoice data
- [ ] Add proper RTL formatting
- [ ] Generate PDF on-demand
- [ ] Store PDF URL in database (optional)
- [ ] Set up storage for PDFs (local/S3/Cloudinary)

### 7. Integration with Transaction Flow
- [ ] Auto-generate invoice after successful payment
- [ ] Link invoice in payment success page
- [ ] Send invoice to user email (future)
- [ ] Add invoice link to user dashboard

### 8. User Invoice History
- [ ] Create invoices list page for users
- [ ] Display all user invoices
- [ ] Add filters (date, status)
- [ ] Show download links
- [ ] Add pagination

### 9. Admin Invoice Management
- [ ] View all invoices in admin panel
- [ ] Search invoices by number/transaction code
- [ ] View invoice details
- [ ] Regenerate invoice if needed
- [ ] Export invoices list (CSV)

### 10. Invoice Utilities
- [ ] Create Persian date formatter (Jalali)
- [ ] Create number formatter for Toman
- [ ] Create invoice printer helper
- [ ] Add invoice validation helpers

---

## Dependencies
- pdfkit package (✅ Installed)
- date-fns-jalali (✅ Installed)
- Transaction model (✅ Done)
- Invoice model (✅ Done)
- Payment verification (⏳ Pending)

---

## Invoice Number Format
```
INV-YYYYMMDD-XXXX
Examples:
- INV-20250109-0001
- INV-20250109-0002
- INV-20250110-0001
```

---

## Persian Font for PDF
- Need to include Persian/Arabic font for PDF generation
- Recommended: Vazir, IRANSans, or similar
- Configure pdfkit to use Persian fonts
- Ensure RTL text rendering

---

## Invoice Template Sections
```
┌─────────────────────────────────┐
│     LOGO      │   شرکت کیتیا    │
├─────────────────────────────────┤
│ فاکتور شماره: INV-20250109-0001│
│ تاریخ: ۱۹ دی ۱۴۰۳               │
│ کد تراکنش: KT-ABC123            │
├─────────────────────────────────┤
│ مشتری: نام کاربر                │
│ ایمیل: user@example.com         │
├─────────────────────────────────┤
│ محصولات:                        │
│ ┌─────────────────────────────┐ │
│ │ نام │ تعداد │ قیمت │ جمع   │ │
│ │ ... │ ...   │ ...  │ ...   │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ جمع کل: ۱۵۰,۰۰۰ تومان          │
│ وضعیت پرداخت: موفق              │
│ شماره پیگیری زرین‌پال: ۱۲۳۴۵۶ │
└─────────────────────────────────┘
```

---

## API Examples

### Get Invoice
```typescript
GET /api/invoices/[id]

Response:
{
  "id": "uuid",
  "invoiceNumber": "INV-20250109-0001",
  "transactionCode": "KT-ABC123",
  "generatedAt": "2025-01-09T...",
  "customer": { ... },
  "items": [ ... ],
  "total": 150000,
  "status": "COMPLETED"
}
```

---

## Testing Checklist
- [ ] Invoice generated after successful payment
- [ ] Invoice number is unique
- [ ] Can view invoice page
- [ ] Can download invoice (PDF if implemented)
- [ ] Invoice displays correctly in RTL
- [ ] Persian dates show correctly (Jalali)
- [ ] Prices formatted in Toman
- [ ] User can only access their own invoices
- [ ] Print layout works correctly
- [ ] Invoice includes all transaction details
- [ ] PDF generation works (if implemented)
- [ ] Persian fonts render correctly in PDF

---

## Notes
- Phase 1: HTML invoice view with print button
- Phase 2: PDF generation (can be added later)
- Use Jalali calendar for Persian dates
- Format all numbers in Persian style
- Ensure RTL layout throughout
- Consider email delivery in future versions
- Keep invoice simple and readable
- Add company details (address, phone, etc.) in template
