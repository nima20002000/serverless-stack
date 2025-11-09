# UI Components & Layout Tasks

## Status: Not Started
**Priority**: High
**Estimated Complexity**: Medium

---

## Overview
Create reusable UI components and main site layout with RTL support and Persian design.

---

## Tasks

### 1. Base UI Components
- [ ] Create `Button` component (`/src/components/ui/button.tsx`)
  - Primary, secondary, outline variants
  - Different sizes (sm, md, lg)
  - Loading state
  - Disabled state
  - RTL support
  - Icon support (Heroicons)
- [ ] Create `Input` component
  - Text, email, password, number types
  - Label and error message support
  - RTL text alignment
  - Persian number input
  - Validation states
- [ ] Create `Card` component
  - Header, body, footer sections
  - Hover effects
  - Shadow variants
- [ ] Create `Badge` component
  - Different colors (info, success, warning, danger)
  - Different sizes
  - RTL support
- [ ] Create `Modal` component
  - Backdrop
  - Close button
  - Header, body, footer
  - RTL layout
  - Keyboard shortcuts (ESC to close)
- [ ] Create `Toast/Notification` component
  - Success, error, warning, info types
  - Auto-dismiss
  - Position (top-right for RTL)
  - RTL support
- [ ] Create `Spinner/Loading` component
  - Different sizes
  - Different colors
  - Full-page overlay variant

### 2. Form Components
- [ ] Create `FormField` wrapper component
  - Label
  - Input/Textarea
  - Error message
  - Help text
  - RTL layout
- [ ] Create `Textarea` component
  - Auto-resize option
  - Character counter
  - RTL support
- [ ] Create `Select` component
  - Single select
  - RTL dropdown
  - Persian text support
  - Search/filter option
- [ ] Create `Checkbox` component
  - RTL label position
  - Checked, unchecked, indeterminate states
- [ ] Create `Radio` component
  - RTL label position
  - Group support

### 3. Layout Components
- [ ] Create main site header (`/src/components/layout/header.tsx`)
  - Logo/Brand
  - Navigation menu (Products, About, Contact)
  - Search bar (optional for v1)
  - User menu (Login/Register or Profile)
  - Cart icon with badge
  - RTL layout
  - Sticky on scroll
  - Mobile responsive with hamburger menu
- [ ] Create footer (`/src/components/layout/footer.tsx`)
  - Links (About, Contact, Terms, Privacy)
  - Social media links
  - Copyright notice
  - RTL layout
- [ ] Create main layout (`/src/app/(public)/layout.tsx`)
  - Header
  - Main content area
  - Footer
  - Promo header (if user has active promo)
- [ ] Create container component
  - Max-width wrapper
  - Padding
  - Responsive

### 4. Navigation Components
- [ ] Create `Navbar` component
  - Desktop horizontal menu
  - Mobile hamburger menu
  - Active link highlighting
  - RTL support
- [ ] Create `MobileMenu` component
  - Slide-in drawer
  - Close on outside click
  - Navigation links
  - RTL slide direction (from right)
- [ ] Create `Breadcrumbs` component
  - Auto-generated from route
  - RTL separator (< instead of >)
  - Click to navigate
- [ ] Create `UserMenu` dropdown
  - Profile link
  - Orders link
  - Admin panel (if admin)
  - Logout button
  - RTL dropdown alignment

### 5. Product Components
- [ ] Create `ProductCard` component (covered in 03)
- [ ] Create `ProductGrid` component
  - Responsive grid (1-4 columns)
  - Loading skeleton
  - Empty state
- [ ] Create `ProductImage` component
  - Next.js Image optimization
  - Fallback image
  - Zoom on hover (optional)

### 6. Utility Components
- [ ] Create `EmptyState` component
  - Icon
  - Message
  - Action button
  - RTL support
- [ ] Create `ErrorMessage` component
  - Error icon
  - Persian error text
  - Retry button
- [ ] Create `ConfirmDialog` component
  - Title and message
  - Confirm and cancel buttons
  - RTL layout
  - Used for destructive actions
- [ ] Create `Pagination` component
  - Previous/Next buttons
  - Page numbers
  - RTL layout (arrows reversed)
  - Jump to page

### 7. Styling Setup
- [ ] Define color palette in Tailwind config
  - Primary color
  - Secondary color
  - Success, warning, error, info colors
  - Gray scale
- [ ] Add custom Tailwind utilities for RTL
- [ ] Set up Persian font (Vazir/IRANSans)
  - Download font files
  - Add to public/fonts
  - Configure in Tailwind
  - Apply globally
- [ ] Create global styles
  - Reset/normalize
  - RTL base styles
  - Typography
  - Spacing

### 8. Typography Components
- [ ] Create heading components (H1-H6)
  - Consistent sizes
  - Persian font
  - RTL alignment
- [ ] Create `Text` component
  - Different sizes
  - Different weights
  - Color variants
  - RTL support

### 9. Responsive Design
- [ ] Define breakpoints
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
- [ ] Test all components on different screen sizes
- [ ] Ensure touch-friendly on mobile
- [ ] Test RTL layout on all breakpoints

### 10. Accessibility
- [ ] Add proper ARIA labels
- [ ] Ensure keyboard navigation works
- [ ] Test with screen readers
- [ ] Add focus indicators
- [ ] Ensure proper color contrast
- [ ] Add alt text to images

---

## Dependencies
- Tailwind CSS (✅ Installed)
- Heroicons (✅ Installed)
- Next.js Image (✅ Available)

---

## Color Palette Example
```typescript
// tailwind.config.ts
colors: {
  primary: {
    50: '#f0f9ff',
    // ... shades
    500: '#0ea5e9', // main
    900: '#0c4a6e',
  },
  // ... other colors
}
```

---

## Persian Font Setup
```typescript
// app/layout.tsx
import localFont from 'next/font/local'

const vazir = localFont({
  src: '../public/fonts/Vazir.woff2',
  variable: '--font-vazir',
})

// Apply: className={vazir.variable}
```

---

## Component Structure Example
```
/src/components
├── /ui
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── modal.tsx
│   ├── toast.tsx
│   └── spinner.tsx
├── /layout
│   ├── header.tsx
│   ├── footer.tsx
│   ├── navbar.tsx
│   └── container.tsx
├── /products
│   ├── product-card.tsx
│   ├── product-grid.tsx
│   └── product-image.tsx
└── /admin
    ├── stats-card.tsx
    └── admin-table.tsx
```

---

## Header Layout (RTL)
```
┌────────────────────────────────────────────┐
│ [🛒2] [👤] [جستجو] [تماس|درباره|محصولات] 🏠│
└────────────────────────────────────────────┘
```

---

## Testing Checklist
- [ ] All components render correctly
- [ ] RTL layout works throughout
- [ ] Persian text displays correctly
- [ ] Responsive design works on all devices
- [ ] Mobile menu works
- [ ] All buttons are clickable
- [ ] Forms are usable
- [ ] Loading states display
- [ ] Error states display
- [ ] Modals open and close properly
- [ ] Toasts auto-dismiss
- [ ] Navigation works
- [ ] Cart icon shows correct count
- [ ] User menu works
- [ ] Keyboard navigation works
- [ ] Focus states are visible
- [ ] Colors have good contrast

---

## Notes
- Use Tailwind utility classes consistently
- Keep components small and focused
- Make components reusable
- Document prop interfaces with TypeScript
- Use semantic HTML elements
- Ensure all text is in Persian (except code/technical terms)
- Test on different browsers
- Use Next.js Image for optimization
- Lazy load images
- Consider dark mode in future versions
- Keep design clean and minimal
- Prioritize usability over fancy effects
