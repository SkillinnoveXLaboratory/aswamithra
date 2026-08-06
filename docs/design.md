# Aswamithra — Design System & UI Architecture Specification

## 1. Vision & Core Design Philosophy

**Aswamithra** is a location-first, farmer-to-consumer and B2B fresh marketplace. The design identity balances **vibrant agricultural freshness** (emerald greens, golden harvests, warm earth tones) with **hyper-modern app responsiveness** (Zepto-like speed, glassmorphic cards, smooth micro-animations, and clean typography).

### Core Design Principles
1. **Visual Excellence & Wow Factor**: Dynamic visual feedback, rich gradients, micro-interactions, dark/light harmonious themes, high-contrast readability for mobile users under sunlight.
2. **SEO-First Frontend (Next.js 14+ App Router)**: 
   - **Server-Side Rendering (SSR)** for product detail pages and farmer public profiles.
   - **Static Site Generation (SSG)** for landing pages, categories, and service location pages.
   - **Structured Schema (JSON-LD)** for `Product`, `Offer`, `AggregateRating`, and `LocalBusiness` for Google rich snippets.
   - **Dynamic OpenGraph Meta**: Auto-generated image cards when sharing products/farmers on WhatsApp/Social Media.
3. **Mobile-First Responsive Layout**: Optimized touch targets ($\ge 48\text{px}$), bottom navigation bars on mobile, side navigation drawers on desktop.
4. **Stitch MCP UI Generator Integration**: Every component layout is structured using standard design tokens so Stitch can generate matching, pixel-perfect Next.js React components.

---

## 2. Design System Tokens & Palette

### A. Color System
```scss
// Brand Colors
--primary-emerald: #059669;    // Emerald 600 - Main Brand (Agriculture & Freshness)
--primary-dark: #047857;       // Emerald 700 - Hover & Active states
--primary-light: #d1fae5;      // Emerald 100 - Badges & Soft highlights
--accent-gold: #f59e0b;        // Amber 500 - Harvest Gold (Savings & Ratings)
--accent-earth: #78350f;       // Amber 900 - Earthy Warm Accents

// Dark Mode & Backgrounds
--bg-light: #f8fafc;           // Slate 50 - Light Page Background
--bg-card-light: #ffffff;      // Card Surface Light
--bg-dark: #0f172a;            // Slate 900 - Dark Mode Background
--bg-card-dark: #1e293b;       // Slate 800 - Dark Mode Card Surface

// Status Tones
--status-success: #10b981;     // Emerald (Approved / Delivered)
--status-warning: #f59e0b;     // Amber (Pending / Low Stock / Overdue)
--status-danger: #ef4444;      // Red (Rejected / Out of Stock / Cancelled)
--status-info: #06b6d4;        // Cyan (In Transit / Processing)
--status-purple: #8b5cf6;      // Violet (B2B Bulk Offer / Quote)

// Text Colors
--text-main: #0f172a;          // Slate 900
--text-muted: #64748b;         // Slate 500
--text-inverse: #ffffff;       // Pure White
```

### B. Typography (Google Fonts: Outfit + Inter)
- **Headings & Titles**: `Outfit`, sans-serif (Bold, 600/700/800 weight) — Gives a modern, energetic, premium marketplace feel.
- **Body & Data Tables**: `Inter`, sans-serif (Regular 400, Medium 500) — Optimized for high readability across dense tables and financial ledgers.

```css
h1 { font-family: 'Outfit', sans-serif; font-size: 2.25rem; font-weight: 800; line-height: 1.2; }
h2 { font-family: 'Outfit', sans-serif; font-size: 1.75rem; font-weight: 700; line-height: 1.3; }
h3 { font-family: 'Outfit', sans-serif; font-size: 1.25rem; font-weight: 600; line-height: 1.4; }
body { font-family: 'Inter', sans-serif; font-size: 0.95rem; color: var(--text-main); }
```

### C. Glassmorphism & Elevation
- **Glass Card Utility**: `background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); border: 1px solid rgba(226, 232, 240, 0.8);`
- **Soft Shadow**: `box-shadow: 0 10px 25px -5px rgba(5, 150, 105, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);`
- **Hover Micro-animation**: `transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;`

---

## 3. SEO Architecture & Next.js Strategy

```
Next.js 14+ (App Router)
 ├── app/
 │   ├── (customer)/           # Customer Web Portal (SEO Optimized SSR/SSG)
 │   │   ├── page.tsx          # Homepage (SSG with ISR revalidate=60)
 │   │   ├── browse/           # Radius Discovery (Client + Server Hybrid)
 │   │   ├── product/[id]/     # Product Detail (SSR + JSON-LD Schema)
 │   │   ├── farmer/[id]/      # Farmer Profile (SSR + JSON-LD Schema)
 │   │   ├── savings/          # Customer Savings Dashboard
 │   │   └── cart/             # Interactive Cart & Checkout
 │   ├── (farmer)/             # Farmer Seller Portal (Dynamic App)
 │   ├── (b2b)/                # B2B Wholesale Portal (Dynamic App)
 │   ├── (admin)/              # Super Admin & Staff Portal (Dynamic App)
 │   └── sitemap.ts            # Dynamic XML Sitemap Generator
```

### Key SEO Rules Implemented:
1. **JSON-LD Structured Data**: Embedded on every `/product/[id]` and `/farmer/[id]` page for Google Rich Search Cards (showing price, rating, in-stock status, and distance).
2. **Canonical Links**: Auto-generated canonical tags to prevent duplicate content issues when filtering by radius.
3. **OpenGraph & Twitter Cards**: Dynamic social preview cards featuring farm photos and savings highlights.
4. **Fast First Contentful Paint (FCP < 1.0s)**: Built using Tailwind CSS & Next Image optimization (`next/image` with WebP/AVIF format).

---

## 4. Stitch MCP Prompting Standard

When feeding screen layouts into the **Stitch MCP UI Generator**, use the following unified prompt structure:

```markdown
Generate a modern Next.js 14 React component using Tailwind CSS for the Aswamithra Marketplace.
Screen Name: [SCREEN_NAME]
Target User Role: [Customer | Farmer | B2B | Admin]
Aesthetics: Premium agricultural glassmorphism, Emerald Green (#059669) & Amber Gold (#f59e0b) accents.
Layout Requirements:
- Responsive Grid (1-col mobile, 3/4-col desktop)
- Dynamic location radius selector badge (5km / 10km / 25km)
- Accessible form elements with interactive hover/focus states
- Integrated sample mock data matching the Aswamithra specification
```

---

## 5. UI Screen Index Overview (32 Screens Across 4 Portals)

### Portal 1: Customer Web & Mobile App (10 Screens)
- `CS-01`: Home & Discovery Dashboard (`/`)
- `CS-02`: Radius Farmer & Product Discovery (`/browse`)
- `CS-03`: Product Detail Page (`/product/:id`)
- `CS-04`: Farmer Public Profile Page (`/farmer/:id`)
- `CS-05`: Cart & Multi-Farmer Checkout (`/cart`)
- `CS-06`: Live Order Tracking & OTP Verification (`/orders/:id`)
- `CS-07`: Customer Savings Dashboard (`/savings`)
- `CS-08`: Customer Profile & Address Picker (`/profile`)
- `CS-09`: Customer Order History (`/orders`)
- `CS-10`: Customer Dispute & Support (`/disputes/new`)

### Portal 2: Farmer Seller Dashboard (7 Screens)
- `FR-01`: Farmer Home Dashboard (`/farmer`)
- `FR-02`: Add / Edit Product Listing (`/farmer/products`)
- `FR-03`: Farmer Order Fulfillment & Timer (`/farmer/orders`)
- `FR-04`: Farmer Extra Earnings & Mandi Comparison (`/farmer/earnings`)
- `FR-05`: Razorpay Route Payout Statements (`/farmer/payouts`)
- `FR-06`: Farmer KYC & Farm Map Location (`/farmer/profile`)
- `FR-07`: B2B RFQ Marketplace (`/farmer/rfqs`)

### Portal 3: B2B Wholesale Buyer Portal (6 Screens)
- `B2B-01`: B2B Wholesale Bulk Catalog (`/b2b`)
- `B2B-02`: Request For Quote (RFQ) Builder (`/b2b/rfq/new`)
- `B2B-03`: RFQ Quotes Comparison & Acceptance (`/b2b/rfq/:id`)
- `B2B-04`: B2B GST Invoices & Tax Center (`/b2b/invoices`)
- `B2B-05`: B2B Credit Ledger & Balance (`/b2b/credit`)
- `B2B-06`: Bulk Dispatch & Weighbridge Proof (`/b2b/dispatches/:id`)

### Portal 4: Super Admin & Staff Panel (9 Screens)
- `AD-01`: Super Admin Executive Dashboard (`/admin`)
- `AD-02`: KYC Verification Queue (`/admin/kyc`)
- `AD-03`: Dynamic Commission Slab Engine (`/admin/commissions`)
- `AD-04`: Location-wise Shop & Hub Management (`/admin/shops`)
- `AD-05`: Shop POS Offline Terminal (`/admin/shops/:id/pos`)
- `AD-06`: Billing & Financial Reports (`/admin/finance`)
- `AD-07`: Banners, CMS & Social Links (`/admin/cms`)
- `AD-08`: Dispute Resolution & Refund Console (`/admin/disputes`)
- `AD-09`: Audit Logs & Permission Roles (`/admin/audit`)
