# SEO Implementation Plan for Kitia E-Commerce Platform

## Current State Analysis

### What's Already Good ✅
1. **RTL and Persian Language Support** - Proper `lang="fa"` and `dir="rtl"` attributes
2. **Performance Optimizations** - ISR with 60s revalidation, Cloudflare CDN, image optimization
3. **Basic Metadata** - Root layout has basic title and description
4. **Product Detail Pages** - Have basic dynamic metadata generation
5. **Clean URL Structure** - Using slugs for products and categories
6. **Semantic HTML** - Proper heading hierarchy (h1, h2, h3)

### Critical SEO Gaps ❌

#### 1. **Missing Metadata on Most Pages**
- Static pages (About, Contact, FAQ, Terms, Shipping, Privacy, Refund) have NO metadata
- Product listing page has no metadata
- Cart and checkout pages lack metadata
- This means Google sees empty titles and descriptions

#### 2. **No Structured Data (Schema.org)**
- No Product schema for e-commerce
- No Organization schema
- No BreadcrumbList schema
- Missing out on rich snippets in search results

#### 3. **No Sitemap**
- Search engines can't discover all pages efficiently
- Dynamic product/category URLs not indexed automatically

#### 4. **No robots.txt**
- No crawler directives
- Admin pages could be crawled (security/SEO issue)

#### 5. **No Open Graph / Twitter Cards**
- Poor social media sharing experience
- No preview images when sharing links

#### 6. **No Canonical URLs**
- Risk of duplicate content issues
- Pagination and filters could create duplicate pages

#### 7. **Missing Alt Text Strategy**
- Product images may lack proper alt attributes for accessibility and SEO

---

## Proposed Implementation (Priority Order)

### Phase 1: Foundation (Critical - Immediate Impact)

#### 1.1 Add Metadata to All Static Pages
**Files to update:**
- `/src/app/about/page.tsx`
- `/src/app/contact/page.tsx`
- `/src/app/faq/page.tsx`
- `/src/app/terms/page.tsx`
- `/src/app/shipping/page.tsx`
- `/src/app/privacy/page.tsx`
- `/src/app/refund-policy/page.tsx`
- `/src/app/cart/page.tsx`

**Implementation:**
```typescript
export const metadata: Metadata = {
  title: "درباره ما - کیتیا",
  description: "کیتیا، فروشگاه آنلاین لیوان‌های سفری و ماگ‌های باکیفیت. بخشی از درآمد به کمک گربه‌های خیابانی اختصاص می‌یابد.",
  openGraph: {
    title: "درباره ما - کیتیا",
    description: "...",
    type: "website",
    locale: "fa_IR",
  }
};
```

#### 1.2 Enhance Product Listing Metadata
**File:** `/src/app/products/page.tsx`

Add:
- Dynamic title based on filters (category, tag)
- Rich description
- Pagination metadata (next/prev links)
- Open Graph tags

#### 1.3 Improve Product Detail Metadata
**File:** `/src/app/products/[id]/page.tsx`

Current state: Basic title/description
Enhancements needed:
- Add product image to Open Graph
- Include price in metadata
- Add availability status
- Include category breadcrumb

---

### Phase 2: Rich Snippets (High Impact)

#### 2.1 Implement JSON-LD Structured Data

**Create:** `/src/lib/seo/structured-data.ts`

This will generate Schema.org markup for:

##### Product Schema
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "لیوان سفری استیل",
  "description": "...",
  "image": ["url1", "url2"],
  "sku": "SKU123",
  "brand": {
    "@type": "Brand",
    "name": "کیتیا"
  },
  "offers": {
    "@type": "Offer",
    "price": "350000",
    "priceCurrency": "IRR",
    "availability": "https://schema.org/InStock",
    "url": "https://kitia.ir/products/..."
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "12"
  }
}
```

##### Organization Schema (Root Layout)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "کیتیا",
  "url": "https://kitia.ir",
  "logo": "https://kitia.ir/logo.png",
  "sameAs": [
    "https://instagram.com/kitia",
    "https://twitter.com/kitia"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Service",
    "availableLanguage": "Persian"
  }
}
```

##### BreadcrumbList Schema
For product pages showing navigation path:
Home > Category > Product

---

### Phase 3: Discoverability

#### 3.1 Generate Sitemap
**Create:** `/src/app/sitemap.ts`

Dynamic sitemap including:
- All static pages
- All active products (from database)
- All categories
- Proper `lastModified` dates from database

#### 3.2 Create robots.txt
**Create:** `/src/app/robots.ts`

```typescript
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/profile'],
      },
    ],
    sitemap: 'https://kitia.ir/sitemap.xml',
  };
}
```

---

### Phase 4: Social & Sharing

#### 4.1 Open Graph & Twitter Cards
Add to all pages:
- `og:title`, `og:description`, `og:image`
- `og:type` (website/product)
- `og:locale` (fa_IR)
- Twitter Card metadata

#### 4.2 Create Social Preview Images
- Default OG image for homepage/static pages
- Product images as OG images on product pages
- Optimize dimensions (1200x630 for Open Graph)

---

### Phase 5: Technical SEO

#### 5.1 Canonical URLs
Add canonical tags to prevent duplicate content:
- Product pages
- Category pages with filters
- Paginated lists

**Implementation in metadata:**
```typescript
alternates: {
  canonical: 'https://kitia.ir/products/product-slug'
}
```

#### 5.2 Language and Regional Tags
```typescript
openGraph: {
  locale: 'fa_IR',
}
```

#### 5.3 Enhance next.config.js
Add metadata to config if needed (already optimized for performance)

---

### Phase 6: Content Enhancements (Lower Priority)

#### 6.1 Image Alt Text Strategy
- Product images: "{product name} - {variant details}"
- Category images: "دسته‌بندی {category name}"
- Hero images: Descriptive alt text

#### 6.2 Meta Keywords (Optional)
- Not heavily weighted by Google but can help other search engines
- Keep under 10 keywords per page

---

## Technical Implementation Details

### File Structure
```
src/
├── lib/
│   └── seo/
│       ├── structured-data.ts      # JSON-LD generators
│       ├── metadata-helpers.ts     # Metadata generation utilities
│       └── constants.ts            # SEO constants (site URL, default images)
├── app/
│   ├── sitemap.ts                 # Dynamic sitemap
│   └── robots.ts                  # Robots.txt
```

### Environment Variables Needed
```env
NEXT_PUBLIC_SITE_URL=https://kitia.ir
NEXT_PUBLIC_DEFAULT_OG_IMAGE=https://cdn.kitia.ir/og-default.jpg
```

### Service Layer Integration
- Sitemap will call `getActiveProducts()` and `getCategories()` from services
- Follow existing pattern: fetch from database, respect caching

---

## SEO Metrics & Success Criteria

After implementation, you should monitor:
1. **Google Search Console**
   - Index coverage (ensure all pages indexed)
   - Rich results (Product schema validation)
   - Mobile usability

2. **PageSpeed Insights**
   - Already optimized, ensure no regression

3. **Rich Results Test**
   - https://search.google.com/test/rich-results
   - Validate Product and Organization schemas

4. **Social Media Debuggers**
   - Facebook Sharing Debugger
   - Twitter Card Validator

---

## Implementation Notes

### Respect Existing Architecture
- All metadata will be static exports in page components
- No API routes for SEO (use Next.js built-in features)
- Structured data will be injected via `<script type="application/ld+json">`
- Follow service layer pattern for data fetching

### No Breaking Changes
- All changes are additive (metadata, structured data)
- No changes to business logic
- No database schema changes needed

### Performance Considerations
- Sitemap generation will be cached (ISR)
- Structured data is static JSON (no runtime overhead)
- Metadata is server-side only (no client bundle increase)

---

## Estimated Impact

### High Impact (Priority 1)
- **Metadata on all pages** → Proper titles/descriptions in search results
- **Product structured data** → Rich snippets with price, availability, ratings
- **Sitemap** → Better crawling and indexing

### Medium Impact (Priority 2)
- **Open Graph tags** → Better social sharing
- **Organization schema** → Knowledge panel in Google
- **Canonical URLs** → Prevent duplicate content penalties

### Lower Impact (Priority 3)
- **BreadcrumbList schema** → Breadcrumb trails in search results
- **Alt text optimization** → Accessibility + image search SEO

---

## Next Steps

1. **Get approval** on this plan
2. **Implement Phase 1** (metadata on all pages)
3. **Implement Phase 2** (structured data)
4. **Implement Phase 3** (sitemap + robots.txt)
5. **Test build** after each phase
6. **Commit and deploy**
7. **Submit sitemap** to Google Search Console
8. **Monitor** for 2-4 weeks

---

## Maintenance

After initial implementation:
- **New products** → Automatically included in sitemap (dynamic generation)
- **New pages** → Remember to add metadata
- **Schema updates** → Google releases new schema types (monitor schema.org)
- **Performance** → Re-test after any major changes

---

## Questions to Clarify

1. **Site URL** - Is production URL `https://kitia.ir` or different?
2. **Social Media** - Do you have Instagram/Twitter accounts for Organization schema?
3. **Logo** - Do you have a logo file for Organization schema? (Current favicon is small)
4. **Product Reviews** - Do you plan to add reviews? (Affects aggregateRating schema)
5. **Multiple Currencies** - Only IRR (Toman) or will you support other currencies?

---

## Why No Blog Section (As Requested)

You mentioned not interested in a blog section yet. This is fine because:
- E-commerce sites don't need blogs for basic SEO
- Product pages and category pages are your primary content
- Focus on **transactional SEO** (people ready to buy)
- Blogs are for **informational SEO** (awareness stage)

You can add a blog later for:
- "چگونه لیوان سفری را تمیز کنیم"
- "بهترین لیوان سفری برای سفر"
- Link building and backlinks

But for now, focus on product SEO is the right call.
