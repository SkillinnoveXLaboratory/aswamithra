# Aswamithra — Complete UI Screens & Data Reference (All 32 Screens)

This document provides a field-by-field UI specification and data model inventory for every screen across the 4 portals of **Aswamithra**:
- **Customer Web & Mobile App** (10 Screens)
- **Farmer Seller Dashboard** (7 Screens)
- **B2B Wholesale Buyer Portal** (6 Screens)
- **Super Admin & Staff Panel** (9 Screens)

---

# Portal 1: Customer Web & Mobile App (10 Screens)

## CS-01 — Homepage & Radius Discovery (`/`)
- **Route:** `/`
- **Who uses it:** End Customers (Web / Mobile App)
- **Purpose:** Primary landing screen with location bar, radius selector (5km/10km/25km), hovering banner carousel, product category tiles, and savings teaser widget.
- **Data Source:** `GET /api/v1/common/banners`, `GET /api/v1/products/radius?lat=...&lng=...&radiusKm=10`, `GET /api/v1/customer/savings`

### Top Bar & Header Components
| Component | Type | Source / Options | Example Value |
|---|---|---|---|
| Location Bar | Input + Map Modal | Mapbox reverse geocode / GPS | Benz Circle, Vijayawada (520001) |
| Radius Selector | Segmented Button | 5 km · 10 km · 25 km · Custom | 10 km |
| Search Input | Auto-complete | `GET /api/v1/products/search-suggestions` | Sona Masoori Rice / Fresh Tomatoes |
| Cart Icon | Badge | Redis cart item count | 3 items |

### Hero Banner Carousel (Managed via Admin CMS)
| Banner ID | Title | Image URL | Target Link |
|---|---|---|---|
| BAN-101 | Direct From Krishna Farmers | `/banners/fresh_harvest.webp` | `/browse?category=rice_grains` |
| BAN-102 | Save up to 25% vs Market Rate | `/banners/savings_offer.webp` | `/savings` |

### Mock Product Cards Grid (6 Recent Nearby Products)
| Product ID | Name | Category | Farmer & Village | Distance | Price / Unit | Market Price | Savings |
|---|---|---|---|---|---|---|---|
| PRD-101 | Organic Sona Masoori Rice | Rice & Grains | Ramesh Kumar · Gudur | 3.2 km | ₹54 / kg | ₹62 / kg | ₹8 / kg |
| PRD-102 | Fresh Harvested Red Tomatoes | Vegetables | Venkat Rao · Kankipadu | 4.8 km | ₹28 / kg | ₹36 / kg | ₹8 / kg |
| PRD-103 | Farm Fresh A2 Cow Milk | Dairy | Lakshmi Farm · Penamaluru | 2.1 km | ₹60 / L | ₹68 / L | ₹8 / L |
| PRD-104 | Desi Chana (Bengal Gram) | Pulses | Satyanarayana · Tenali | 8.5 km | ₹85 / kg | ₹98 / kg | ₹13 / kg |

### Actions on Screen
- **Change Location / Radius** → Opens Mapbox pin drop modal; triggers PostGIS re-query.
- **Click Category Tile** → Navigates to `/browse?category=...`.
- **Add to Cart** → Updates Redis cart state; shows animated toast.

---

## CS-02 — Radius Farmer & Product Listing (`/browse`)
- **Route:** `/browse`
- **Who uses it:** End Customers
- **Purpose:** Interactive search page with Mapbox pin view, category filters, distance sorting, and price sliders.
- **Data Source:** `GET /api/v1/products/radius`

### Filter Sidebar Controls
| Filter Field | Type | Options / Range | Example |
|---|---|---|---|
| Distance Radius | Slider / Buttons | 1 km to 25 km | 10 km |
| Category | Multi-select Checkboxes | Rice & Grains · Vegetables · Fruits · Pulses · Dairy | Vegetables |
| Unit Type | Dropdown | All · Kg · Grams · Units · Tons · Quintals | Kg |
| Sort By | Select | Distance (Closest First) · Price (Low to High) · Top Rated | Distance |

### Mock Results List (Farmers in Radius)
| Farmer ID | Name & Farm | Village | Distance | Rating | In-Stock Products | Action |
|---|---|---|---|---|---|---|
| FRM-881 | Ramesh Kumar (Sri Lakshmi Farms) | Gudur | 3.2 km | 4.8 ★ (42) | Sona Masoori Rice (450kg), Chilli (80kg) | View Profile |
| FRM-882 | Venkat Rao (Annapurna Bio Farm) | Kankipadu | 4.8 km | 4.9 ★ (88) | Tomatoes (120kg), Brinjal (60kg) | View Profile |

---

## CS-03 — Product Detail Page (`/product/:id`)
- **Route:** `/product/[id]` (Next.js SSR for SEO)
- **Who uses it:** End Customers & Google Search Crawlers
- **Purpose:** Full product view with high-res photo gallery, unit selector, farmer mini-profile, verified savings badge, and customer ratings. Includes JSON-LD `Product` schema.

### Fields & Data Table
| Field | Type | Options / Source | Example Value |
|---|---|---|---|
| Product Title | String | Product model `name` | Organic Sona Masoori Rice (Raw) |
| Price | Currency | Farmer set price | ₹54.00 per kg |
| Market Reference Price | Currency | `market_prices` table baseline | ~~₹62.00 per kg~~ |
| Savings Highlight | Badge | (Market Price - Sale Price) | Save ₹8.00 / kg (13% OFF) |
| Available Stock | Number | Live stock counter | 450 kg in stock |
| Minimum Order Qty | Number | `minQty` | 5 kg |
| Quantity Selector | Number Counter | Step: 1 | 10 kg |
| Farmer Profile | Sub-card | `farmer_profiles` relation | Ramesh Kumar · Gudur (3.2 km away) |
| Reviews Summary | Rating Stars | `reviews` aggregate | 4.8 / 5.0 (24 reviews) |

### Actions on Screen
- **Add to Cart** → Adds item to active cart.
- **Buy Now** → Adds to cart and redirects directly to `/cart`.
- **Share Product** → Generates WhatsApp share link with product image & savings preview.

---

## CS-04 — Farmer Public Profile (`/farmer/:id`)
- **Route:** `/farmer/[id]`
- **Who uses it:** Customers checking farmer credibility
- **Purpose:** Public profile showing farm photos, verified status, land size, crops grown, distance from customer, customer reviews, and complete product catalog.

### Mock Profile Summary
- **Farmer Name:** Ramesh Kumar (Sri Lakshmi Organic Farms)
- **Village & District:** Gudur, Krishna District (3.2 km away from your location)
- **KYC Status:** Verified Farmer (Aadhaar Verified)
- **Land Size:** 4.5 Acres
- **Crops Grown:** Organic Rice, Red Chilli, Black Gram
- **Total Orders Served:** 340+ orders

---

## CS-05 — Cart & Grouped Checkout (`/cart`)
- **Route:** `/cart`
- **Who uses it:** Customers completing purchases
- **Purpose:** Grouped cart view (organized per farmer since items fulfill independently), delivery slot picker, discount coupon field, and Razorpay UPI / COD selector.

### Cart Item Grouping Example
```
[Farmer 1: Ramesh Kumar — 3.2 km away]
 ├─ Organic Sona Masoori Rice (10 kg x ₹54) = ₹540.00
 [Subtotal: ₹540.00 | Delivery Fee: ₹25.00]

[Farmer 2: Venkat Rao — 4.8 km away]
 ├─ Fresh Red Tomatoes (3 kg x ₹28) = ₹84.00
 [Subtotal: ₹84.00 | Delivery Fee: ₹20.00]

------------------------------------------------
Total Bill: ₹669.00 | Total Savings: ₹104.00 vs Market
```

---

## CS-06 — Live Order Tracking (`/orders/:id`)
- **Route:** `/orders/[id]`
- **Who uses it:** Customers tracking active delivery
- **Purpose:** Real-time order progress bar (`PLACED` -> `ACCEPTED` -> `PACKED` -> `OUT_FOR_DELIVERY` -> `DELIVERED`), delivery agent live map, and 4-digit doorstep delivery OTP card.

### Doorstep OTP Card Component
> **Delivery Security OTP**: `8192`  
> *Provide this 4-digit code to the delivery partner upon arrival to complete delivery.*

---

## CS-07 — Customer Savings Dashboard (`/savings`)
- **Route:** `/savings`
- **Who uses it:** Customers reviewing financial savings
- **Purpose:** Gamified transparency dashboard highlighting total money saved by purchasing directly from farmers.

### KPI Cards & Mock Data
- **Lifetime Savings:** ₹4,280.00
- **Saved This Month:** ₹1,240.00
- **Total Orders Completed:** 18 Orders
- **Average Savings Per Order:** ₹237.70

---

## CS-08 — Customer Profile & Address Picker (`/profile`)
- **Route:** `/profile`
- **Purpose:** Manage saved delivery addresses (with Mapbox lat/lng pin selector), UI language settings (Telugu/Hindi/English), and linked Google account.

---

## CS-09 — Customer Order History (`/orders`)
- **Route:** `/orders`
- **Purpose:** Paginated historical orders list with 1-tap reorder shortcuts, PDF invoice downloads, and rate farmer triggers.

---

## CS-10 — Customer Dispute & Support (`/disputes/new`)
- **Route:** `/disputes/new`
- **Purpose:** Customer complaint intake screen (select damaged/missing items, upload photo evidence, request refund/replacement).

---

# Portal 2: Farmer Seller Dashboard (7 Screens)

## FR-01 — Farmer Home Dashboard (`/farmer`)
- **Route:** `/farmer`
- **Who uses it:** Verified Farmers
- **Purpose:** Main operational dashboard with today's sales summary, pending order alert modal, extra earnings card, and low-stock indicators.

### KPI Summary Cards
| Tile | Formula / Source | Example |
|---|---|---|
| Today's Sales | Sum of today's completed order totals | ₹3,420.00 |
| New Orders Alert | Orders in `PLACED` status | 2 Orders (Action Req) |
| Extra Earned via Aswamithra | Accumulation in `earnings_ledger` | ₹14,850.00 |
| Low Stock Items | Products with `stock < 10` | 1 Item (Sona Rice) |

---

## FR-02 — Add / Edit Product Listing (`/farmer/products`)
- **Route:** `/farmer/products`
- **Purpose:** Form to list new agricultural produce with name, category, photo upload, custom price, measurement unit selector (`kg`, `g`, `unit`, `ton`, `quintal`), minimum order quantity, and stock limit.

---

## FR-03 — Farmer Order Fulfillment (`/farmer/orders`)
- **Route:** `/farmer/orders`
- **Purpose:** Order management queue with 30-minute acceptance timer, Accept / Reject buttons, Pack confirmation, and delivery partner handover verification.

---

## FR-04 — Farmer Extra Earnings & Mandi Comparison (`/farmer/earnings`)
- **Route:** `/farmer/earnings`
- **Purpose:** Transparency financial report comparing Aswamithra sale earnings vs. local APMC mandi market rates, showing the exact extra income gained.

---

## FR-05 — Razorpay Route Payout Statements (`/farmer/payouts`)
- **Route:** `/farmer/payouts`
- **Purpose:** Automated bank settlement log detailing gross sale amount, platform commission deducted (4.5% / 4.0%), net credited amount, and bank UTR numbers.

---

## FR-06 — Farmer KYC & Farm Map Location (`/farmer/profile`)
- **Route:** `/farmer/profile`
- **Purpose:** Farmer identity management, village/mandal/district fields, Mapbox farm location pin dropper, Aadhaar document uploader, and bank account status.

---

## FR-07 — B2B RFQ Marketplace (`/farmer/rfqs`)
- **Route:** `/farmer/rfqs`
- **Purpose:** View nearby bulk RFQs posted by wholesalers/mills and submit custom price quotes per quintal/ton.

---

# Portal 3: B2B Wholesale Buyer Portal (6 Screens)

## B2B-01 — B2B Wholesale Bulk Catalog (`/b2b`)
- **Route:** `/b2b`
- **Purpose:** Bulk produce catalog displaying tiered volume discounts (quintal / ton rates), minimum order thresholds, and harvest availability schedules.

---

## B2B-02 — Request For Quote (RFQ) Builder (`/b2b/rfq/new`)
- **Route:** `/b2b/rfq/new`
- **Purpose:** Form for bulk buyers (hotels, mills, wholesalers) to request custom quotes (crop variety, quantity in tons/quintals, target delivery date, quality grade).

---

## B2B-03 — RFQ Quotes Comparison (`/b2b/rfq/:id`)
- **Route:** `/b2b/rfq/[id]`
- **Purpose:** Side-by-side comparison table of quotes received from multiple farmers/admin hubs with 1-click quote acceptance to generate a bulk order.

---

## B2B-04 — B2B GST Invoices & Tax Center (`/b2b/invoices`)
- **Route:** `/b2b/invoices`
- **Purpose:** Tax documentation portal for downloading GST-compliant invoices (buyer/seller GSTIN, HSN codes, CGST/SGST/IGST tax breakdowns).

---

## B2B-05 — B2B Credit Ledger & Balance (`/b2b/credit`)
- **Route:** `/b2b/credit`
- **Purpose:** Manage approved credit line, view outstanding balance, track payment due dates, and execute credit settlements via Razorpay.

---

## B2B-06 — Bulk Dispatch & Weighbridge Proof (`/b2b/dispatches/:id`)
- **Route:** `/b2b/dispatches/[id]`
- **Purpose:** Track bulk transport dispatches, view uploaded weighbridge slip photos, and check quality inspection certificates.

---

# Portal 4: Super Admin & Staff Panel (9 Screens)

## AD-01 — Super Admin Executive Dashboard (`/admin`)
- **Route:** `/admin`
- **Purpose:** Platform command center featuring GMV trends, total active farmers/customers, commission revenue charts, and active district density maps.

---

## AD-02 — KYC Verification Queue (`/admin/kyc`)
- **Route:** `/admin/kyc`
- **Purpose:** Operations portal for reviewing pending Farmer and B2B KYC applications. Includes side-by-side document viewer and 1-click ₹1 Razorpay penny-drop bank account test trigger.

---

## AD-03 — Dynamic Commission Slab Engine (`/admin/commissions`)
- **Route:** `/admin/commissions`
- **Purpose:** Live commission rule editor (e.g. 4.5% up to ₹10k, 4.0% above ₹10k) with category and regional override configuration.

---

## AD-04 — Location-wise Shop & Hub Management (`/admin/shops`)
- **Route:** `/admin/shops`
- **Purpose:** Create and manage location-wise admin hubs/shops across India, set service radiuses, assign staff, and manage hub inventory.

---

## AD-05 — Shop POS Offline Terminal (`/admin/shops/:id/pos`)
- **Route:** `/admin/shops/[id]/pos`
- **Purpose:** Touchscreen POS checkout interface for shop staff to handle walk-in customers, scan items, take cash/UPI payments, and print paper receipts.

---

## AD-06 — Billing & Financial Reports (`/admin/finance`)
- **Route:** `/admin/finance`
- **Purpose:** Finance console showing total GMV, platform commission earned, pending payout settlements, and exportable GST summaries.

---

## AD-07 — Banners, CMS & Social Link Manager (`/admin/cms`)
- **Route:** `/admin/cms`
- **Purpose:** Content management panel to schedule homepage hero banners, welcome messages, static pages (Terms/Privacy), and footer social media links.

---

## AD-08 — Dispute Resolution & Refund Console (`/admin/disputes`)
- **Route:** `/admin/disputes`
- **Purpose:** Customer service ticket console for investigating order complaints, reviewing photo evidence, and executing instant Razorpay refund reversals.

---

## AD-09 — Audit Logs & Role Control (`/admin/audit`)
- **Route:** `/admin/audit`
- **Purpose:** Security and audit log viewer recording all administrative actions (who, what, when, IP) and managing RBAC role permissions.
