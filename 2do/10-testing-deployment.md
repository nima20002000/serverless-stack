# Testing & Deployment Tasks

## Status: Not Started
**Priority**: Medium
**Estimated Complexity**: Medium

---

## Overview
Set up testing environment, perform end-to-end testing, and prepare for deployment.

---

## Tasks

### 1. Environment Configuration
- [ ] Create `.env.production` file
- [ ] Set production environment variables
  - DATABASE_URL (production database)
  - NEXTAUTH_SECRET (strong secret)
  - NEXTAUTH_URL (production URL)
  - ZARINPAL_MERCHANT_ID (production merchant)
  - ZARINPAL_SANDBOX=false
- [ ] Document all required environment variables
- [ ] Add environment variable validation

### 2. Database Production Setup
- [ ] Set up production PostgreSQL database
  - Supabase / Neon / Railway / DigitalOcean
- [ ] Run migrations on production database
- [ ] Create admin user in production
- [ ] Add initial products
- [ ] Test database connection
- [ ] Set up database backups
- [ ] Configure connection pooling

### 3. Manual Testing Checklist

#### Authentication Flow
- [ ] Register new user
- [ ] Login with correct credentials
- [ ] Login with wrong credentials
- [ ] Logout
- [ ] Session persists after refresh
- [ ] Protected routes redirect correctly

#### Product Management (Admin)
- [ ] Create new product
- [ ] Edit existing product
- [ ] Delete product (with confirmation)
- [ ] Upload product images
- [ ] Toggle product active/inactive
- [ ] View product list

#### Shopping Flow (User)
- [ ] Browse products
- [ ] View product details
- [ ] Add product to cart
- [ ] Update cart quantity
- [ ] Remove from cart
- [ ] Cart persists after refresh
- [ ] Proceed to checkout

#### Payment Flow
- [ ] Complete checkout process
- [ ] Redirect to Zarinpal
- [ ] Complete payment (sandbox)
- [ ] Verify payment callback
- [ ] Transaction status updates
- [ ] Stock decreases after purchase
- [ ] Invoice generates

#### Promo Code System
- [ ] Promo code generated on registration
- [ ] Promo header displays
- [ ] Countdown timer works
- [ ] Can apply promo at checkout
- [ ] Discount calculates correctly
- [ ] Expired promo cannot be used
- [ ] Used promo cannot be reused

#### Invoice System
- [ ] Invoice generated after purchase
- [ ] Can view invoice
- [ ] Invoice displays correctly (RTL)
- [ ] Can download/print invoice

#### Admin Panel
- [ ] Access admin dashboard
- [ ] View statistics
- [ ] Manage users
- [ ] Change user roles
- [ ] View all transactions
- [ ] Filter transactions
- [ ] View transaction details

### 4. RTL & Persian Testing
- [ ] All text displays in Persian correctly
- [ ] RTL layout works on all pages
- [ ] Numbers format correctly (Persian numerals option)
- [ ] Dates display in Jalali calendar
- [ ] Currency displays as Toman
- [ ] Navigation flows right-to-left
- [ ] Forms are RTL-aligned

### 5. Responsive Testing
- [ ] Test on mobile (< 640px)
- [ ] Test on tablet (640px - 1024px)
- [ ] Test on desktop (> 1024px)
- [ ] Test on different browsers
  - Chrome
  - Firefox
  - Safari
  - Edge
- [ ] Test touch interactions on mobile
- [ ] Test hamburger menu on mobile

### 6. Performance Optimization
- [ ] Run Lighthouse audit
- [ ] Optimize images (Next.js Image)
- [ ] Minimize bundle size
- [ ] Enable compression
- [ ] Add loading states
- [ ] Implement lazy loading
- [ ] Cache API responses where appropriate
- [ ] Optimize database queries (add indexes)

### 7. Security Checklist
- [ ] Validate all user inputs
- [ ] Sanitize data before database insertion
- [ ] Protect against SQL injection (Prisma handles this)
- [ ] Protect against XSS
- [ ] Use HTTPS in production
- [ ] Secure environment variables
- [ ] Rate limit API endpoints (optional)
- [ ] Add CSRF protection
- [ ] Validate file uploads (size, type)
- [ ] Hash passwords (bcrypt)
- [ ] Secure session management (NextAuth)

### 8. Error Handling
- [ ] Test error states in all forms
- [ ] Test network failures
- [ ] Test database connection failures
- [ ] Test payment failures
- [ ] Add global error boundary
- [ ] Add 404 page
- [ ] Add 500 page
- [ ] Log errors appropriately

### 9. Deployment Preparation
- [ ] Choose hosting platform
  - Vercel (recommended for Next.js)
  - Netlify
  - Railway
  - DigitalOcean
- [ ] Set up deployment pipeline
- [ ] Configure environment variables on platform
- [ ] Set up domain (if available)
- [ ] Configure SSL certificate
- [ ] Test build process locally: `npm run build`
- [ ] Fix any build errors
- [ ] Test production build locally: `npm start`

### 10. Vercel Deployment (if chosen)
- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Login to Vercel: `vercel login`
- [ ] Deploy to preview: `vercel`
- [ ] Test preview deployment
- [ ] Deploy to production: `vercel --prod`
- [ ] Set environment variables in Vercel dashboard
- [ ] Connect custom domain (optional)
- [ ] Set up preview deployments for branches

### 11. Post-Deployment
- [ ] Verify production site works
- [ ] Test all critical flows in production
- [ ] Run Lighthouse on production
- [ ] Set up monitoring (Vercel Analytics/Google Analytics)
- [ ] Set up error tracking (Sentry - optional)
- [ ] Monitor database performance
- [ ] Create backup strategy
- [ ] Document deployment process

### 12. Documentation
- [ ] Update README with deployment instructions
- [ ] Document environment variables
- [ ] Create user guide (optional)
- [ ] Create admin guide
- [ ] Document API endpoints
- [ ] Add troubleshooting guide
- [ ] Document database schema

---

## Dependencies
- All features completed (⏳ Pending)
- Production database (❌ Not set up)
- Zarinpal production credentials (❌ Not set up)

---

## Deployment Commands

### Vercel
```bash
# Install CLI
npm i -g vercel

# Login
vercel login

# Deploy preview
vercel

# Deploy production
vercel --prod
```

### Build Locally
```bash
# Build
npm run build

# Start production server
npm start
```

---

## Environment Variables Checklist
```env
# Production .env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=https://your-domain.com
ZARINPAL_MERCHANT_ID=xxx
ZARINPAL_SANDBOX=false
```

---

## Lighthouse Goals
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

---

## Testing Tools
- Browser DevTools
- Lighthouse
- Vercel Analytics (built-in)
- PostgreSQL query analyzer
- NextAuth debug mode

---

## Monitoring Setup (Optional)
- [ ] Set up Vercel Analytics
- [ ] Set up Google Analytics
- [ ] Set up Sentry for error tracking
- [ ] Set up database monitoring
- [ ] Set up uptime monitoring

---

## Launch Checklist
- [ ] All features working in production
- [ ] No console errors
- [ ] All forms working
- [ ] Payment flow working
- [ ] Admin panel accessible
- [ ] Database seeded with initial data
- [ ] Analytics set up
- [ ] Error tracking set up
- [ ] Domain configured (if applicable)
- [ ] SSL enabled
- [ ] Backups configured
- [ ] Documentation complete

---

## Notes
- Test thoroughly before production deployment
- Use preview deployments to test changes
- Keep production database separate from development
- Never commit .env files
- Use strong secrets in production
- Monitor error logs after launch
- Have rollback plan ready
- Test payment flow thoroughly in sandbox before production
- Consider load testing for high traffic
- Set up automated backups for production database
