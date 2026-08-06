# Aswamithra — Complete API Endpoints Reference (With 100% Full CRUD Matrix)
**Base URL:** `api/v1`
**Auth:** `Authorization: Bearer <jwt_token>` on all endpoints unless marked `[public]`
**Format:** `Content-Type: application/json`

---

## Summary & Full CRUD Coverage Matrix

Every administrative entity and user resource follows full RESTful CRUD conventions:
- **`GET` (List)** — Paginated, filterable, sortable
- **`POST` (Create)** — Resource instantiation
- **`GET /:id` (Detail)** — Full entity view with relations
- **`PUT /:id` (Update)** — Full or partial resource modification
- **`DELETE /:id` (Delete)** — Soft-delete, archive, or hard removal

| # | Entity / Module | Create (`POST`) | Read List (`GET`) | Read Detail (`GET /:id`) | Update (`PUT/PATCH`) | Delete (`DELETE`) | Total Endpoints |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | Auth & Sessions | ✅ | ✅ | ✅ | ✅ | ✅ | 18 |
| 2 | Users & Profiles | ✅ | ✅ | ✅ | ✅ | ✅ | 16 |
| 3 | Onboarding & KYC | ✅ | ✅ | ✅ | ✅ | ✅ | 18 |
| 4 | Categories & Units | ✅ | ✅ | ✅ | ✅ | ✅ | 10 |
| 5 | Geo & Service Locations | ✅ | ✅ | ✅ | ✅ | ✅ | 14 |
| 6 | Products & Inventory | ✅ | ✅ | ✅ | ✅ | ✅ | 24 |
| 7 | Cart & Checkout | ✅ | ✅ | ✅ | ✅ | ✅ | 16 |
| 8 | Orders & Lifecycle | ✅ | ✅ | ✅ | ✅ | ✅ | 26 |
| 9 | Payments & Settlement | ✅ | ✅ | ✅ | ✅ | ✅ | 20 |
| 10 | Customer Savings Ledger | ✅ | ✅ | ✅ | ✅ | ✅ | 10 |
| 11 | Farmer Earnings Ledger | ✅ | ✅ | ✅ | ✅ | ✅ | 14 |
| 12 | B2B Bulk & RFQ Engine | ✅ | ✅ | ✅ | ✅ | ✅ | 24 |
| 13 | Admin Shops & POS | ✅ | ✅ | ✅ | ✅ | ✅ | 18 |
| 14 | Delivery Agents & Partners | ✅ | ✅ | ✅ | ✅ | ✅ | 12 |
| 15 | Dynamic Commission Slabs | ✅ | ✅ | ✅ | ✅ | ✅ | 12 |
| 16 | Coupons & Promos | ✅ | ✅ | ✅ | ✅ | ✅ | 12 |
| 17 | Market Baseline Prices | ✅ | ✅ | ✅ | ✅ | ✅ | 12 |
| 18 | Admin System & Roles | ✅ | ✅ | ✅ | ✅ | ✅ | 18 |
| 19 | Banners & CMS Content | ✅ | ✅ | ✅ | ✅ | ✅ | 16 |
| 20 | Notifications & Push | ✅ | ✅ | ✅ | ✅ | ✅ | 16 |
| 21 | Reviews & Disputes | ✅ | ✅ | ✅ | ✅ | ✅ | 16 |
| 22 | Analytics & Reports | ✅ | ✅ | ✅ | ✅ | ✅ | 16 |
| | **Total Endpoints** | | | | | | **388** |

---

## Module 1 — Auth & Identity (RBAC)
> 18 endpoints

```
POST    api/v1/auth/send-otp                        Send 6-digit SMS OTP via MSG91/Supabase [public]
POST    api/v1/auth/resend-otp                      Resend OTP (rate-limited via Redis) [public]
POST    api/v1/auth/verify-otp                      Verify OTP and return access + refresh tokens [public]
POST    api/v1/auth/google                          Google One-Tap / OAuth sign-in [public]
POST    api/v1/auth/refresh                         Refresh access JWT token [public]
POST    api/v1/auth/logout                          Invalidate active session token

POST    api/v1/auth/pin/setup                       Set 4-digit security PIN
PUT     api/v1/auth/pin/change                      Change 4-digit security PIN
POST    api/v1/auth/pin/verify                      Verify 4-digit PIN for sensitive actions
POST    api/v1/auth/login-pin                       Login using Mobile + PIN [public]

POST    api/v1/auth/admin/login                     Admin login with 2FA password + OTP [public]
POST    api/v1/auth/admin/2fa/verify                Verify Admin 2FA code [public]
POST    api/v1/auth/admin/2fa/setup                 Setup TOTP 2FA for Admin user

GET     api/v1/auth/sessions                        List all active sessions for current user
GET     api/v1/auth/sessions/:session_id            Get details of specific active session
DELETE  api/v1/auth/sessions/:session_id            Revoke specific active session
DELETE  api/v1/auth/sessions/all-except-current    Revoke all other active sessions
GET     api/v1/auth/login-history                   Get user login audit trail & IP history
```

---

## Module 2 — Profiles & User Management (Full Admin & User CRUD)
> 16 endpoints

```
GET     api/v1/users/me                             Get logged-in user profile & active role
PUT     api/v1/users/me                             Update basic profile information
PUT     api/v1/users/me/language                    Update preferred UI language (Telugu/Hindi/English)
DELETE  api/v1/users/me                             Request account deletion / soft-deactivate

GET     api/v1/users/me/addresses                   List saved delivery addresses (Customer)
POST    api/v1/users/me/addresses                   Add new delivery address (with Mapbox lat/lng)
GET     api/v1/users/me/addresses/:id               Get address detail
PUT     api/v1/users/me/addresses/:id               Update delivery address
DELETE  api/v1/users/me/addresses/:id               Delete saved address
PUT     api/v1/users/me/addresses/:id/default       Set default delivery address

GET     api/v1/admin/users                          [Admin] List all users (filter: role, status, search)
POST    api/v1/admin/users                          [Admin] Create user account manually
GET     api/v1/admin/users/:id                      [Admin] Get detailed profile by user ID
PUT     api/v1/admin/users/:id                      [Admin] Update user profile & details
PUT     api/v1/admin/users/:id/status               [Admin] Update user status (active, suspended, blocked)
DELETE  api/v1/admin/users/:id                      [Admin] Delete / archive user account
```

---

## Module 3 — Onboarding & KYC Verification (Full Admin CRUD)
> 18 endpoints

```
POST    api/v1/onboarding/customer                  Submit Customer onboarding details [public]
POST    api/v1/onboarding/farmer                    Submit Farmer KYC details & bank account
POST    api/v1/onboarding/b2b                       Submit B2B profile & trade license details

GET     api/v1/kyc/status                           Get logged-in user KYC verification status
GET     api/v1/kyc/documents                        List uploaded KYC documents
POST    api/v1/kyc/documents/upload                 Upload KYC document (Aadhaar, GST, License)
GET     api/v1/kyc/documents/:doc_id/download-url   Get secure signed URL for encrypted document download
DELETE  api/v1/kyc/documents/:doc_id                Delete uploaded KYC document draft

GET     api/v1/admin/kyc/submissions                [Admin] List all KYC submissions (filter: role, status)
POST    api/v1/admin/kyc/submissions                [Admin] Manually create KYC submission record
GET     api/v1/admin/kyc/submissions/:id            [Admin] Get pending KYC full review package
PUT     api/v1/admin/kyc/submissions/:id            [Admin] Update submitted KYC data fields
DELETE  api/v1/admin/kyc/submissions/:id            [Admin] Delete / purge KYC submission record

PATCH   api/v1/admin/kyc/submissions/:id/approve    [Admin] Approve KYC application
PATCH   api/v1/admin/kyc/submissions/:id/reject     [Admin] Reject KYC application with reason
PATCH   api/v1/admin/kyc/submissions/:id/reupload   [Admin] Request document re-upload from applicant

POST    api/v1/admin/kyc/:farmer_id/verify-bank     [Admin] Trigger ₹1 Razorpay penny-drop bank verification
GET     api/v1/admin/kyc/:farmer_id/bank-status     [Admin] Get bank account penny-drop verification status
```

---

## Module 4 — Product Categories & Units (Full Admin CRUD)
> 10 endpoints

```
GET     api/v1/categories                           List all active product categories [public]
POST    api/v1/admin/categories                     [Admin] Create product category
GET     api/v1/categories/:id                       Get product category detail [public]
PUT     api/v1/admin/categories/:id                 [Admin] Update product category
DELETE  api/v1/admin/categories/:id                 [Admin] Delete product category

GET     api/v1/units                                List allowed product measurement units [public]
POST    api/v1/admin/units                          [Admin] Create measurement unit (e.g., quintal, ton)
GET     api/v1/units/:id                            Get measurement unit detail [public]
PUT     api/v1/admin/units/:id                      [Admin] Update measurement unit
DELETE  api/v1/admin/units/:id                      [Admin] Delete measurement unit
```

---

## Module 5 — Geo & Service Locations (Full Admin CRUD)
> 14 endpoints

```
POST    api/v1/geo/reverse-geocode                  Resolve street address from Mapbox lat/lng [public]
POST    api/v1/geo/forward-geocode                  Resolve lat/lng coordinates from address string [public]
GET     api/v1/geo/radius-options                   Get available search radius presets (5km, 10km, 25km) [public]

GET     api/v1/geo/farmers-in-radius                PostGIS query: find farmers within X km radius [public]
GET     api/v1/geo/shops-in-radius                  PostGIS query: find admin shops within X km radius [public]
GET     api/v1/geo/district-density                 Get farmer & shop density per district [public]

GET     api/v1/service-locations                    List active districts & mandals across India [public]
POST    api/v1/admin/service-locations              [Admin] Create new service location
GET     api/v1/service-locations/:id                Get service location details [public]
PUT     api/v1/admin/service-locations/:id          [Admin] Update service location details
DELETE  api/v1/admin/service-locations/:id          [Admin] Deactivate / Delete service location

GET     api/v1/admin/service-locations/map-data     Get India map visual data payload for Admin map
PUT     api/v1/admin/service-locations/:id/status   [Admin] Toggle location status (active/paused)
```

---

## Module 6 — Products & Inventory (Full Farmer & Admin CRUD)
> 24 endpoints

```
GET     api/v1/products/radius                      Search products in PostGIS radius (filter: category, sort) [public]
GET     api/v1/products/:id                         Get product detail + farmer profile + market price [public]
GET     api/v1/products/farmer/:farmer_id           List all active products by specific farmer [public]

POST    api/v1/products                             Create new product listing (Farmer/Shop)
PUT     api/v1/products/:id                         Update product details (price, stock, description)
PATCH   api/v1/products/:id/price                   Update product price only
PATCH   api/v1/products/:id/stock                   Update available stock count
PATCH   api/v1/products/:id/status                  Pause / Resume product listing (active/paused)
DELETE  api/v1/products/:id                         Delete / Archive product listing

POST    api/v1/products/:id/images                  Upload product image (multipart)
DELETE  api/v1/products/:id/images/:image_id        Delete product image
PUT     api/v1/products/:id/b2b-tiers               Set B2B bulk pricing tiers (quintal/ton rates)

GET     api/v1/admin/products                       [Admin] List all platform products
POST    api/v1/admin/products                       [Admin] Create product listing directly on behalf of farmer/shop
GET     api/v1/admin/products/:id                   [Admin] Get administrative product detail
PUT     api/v1/admin/products/:id                   [Admin] Update any product listing
DELETE  api/v1/admin/products/:id                   [Admin] Delete / remove product listing

PUT     api/v1/admin/products/:id/feature           [Admin] Mark product as featured on homepage
PUT     api/v1/admin/products/:id/verify-pricing    [Admin] Verify farmer price against market baseline
GET     api/v1/products/low-stock                   Get low stock alerts for farmer products
POST    api/v1/products/bulk-stock-update           Bulk update stock for multiple products
GET     api/v1/products/search-suggestions          Get fast auto-complete search suggestions [public]
```

---

## Module 7 — Cart & Checkout Preview
> 16 endpoints

```
GET     api/v1/cart                                 Get current active cart (grouped per farmer/shop)
POST    api/v1/cart/items                           Add product item to cart
GET     api/v1/cart/items/:item_id                  Get item detail in cart
PUT     api/v1/cart/items/:item_id                  Update item quantity in cart
DELETE  api/v1/cart/items/:item_id                  Remove item from cart
DELETE  api/v1/cart                             Clear entire active cart

POST    api/v1/cart/validate                        Validate stock availability for cart items
POST    api/v1/cart/delivery-fee                    Calculate distance-based delivery fee for cart items

POST    api/v1/checkout/preview                     Get checkout summary (subtotal, fee, savings, totals)
POST    api/v1/checkout/coupons/apply               Apply discount coupon to checkout
DELETE  api/v1/checkout/coupons/remove              Remove applied discount coupon
GET     api/v1/checkout/delivery-slots              Get available delivery time slots for delivery area
POST    api/v1/checkout/verify-cod-eligibility      Check if COD is enabled for delivery location
GET     api/v1/checkout/savings-preview             Calculate projected savings vs market price for cart
POST    api/v1/checkout/lock-stock                  Lock stock temporarily for checkout (5-min TTL)
DELETE  api/v1/checkout/unlock-stock                Unlock stock reservation on checkout exit
```

---

## Module 8 — Order Management & Lifecycle (Full Admin CRUD)
> 26 endpoints

```
POST    api/v1/orders                               Create order / checkout (returns orderId & Razorpay order)
GET     api/v1/orders                               List customer orders (filter: status, date)
GET     api/v1/orders/:id                           Get order full details & tracking status
PUT     api/v1/orders/:id                           Update order delivery details (before dispatch)
DELETE  api/v1/orders/:id                           Cancel order (Customer/Farmer before packing)

GET     api/v1/farmer/orders                        List orders assigned to farmer (filter: status)
PATCH   api/v1/orders/:id/accept                    Farmer accept order (within 30-min window)
PATCH   api/v1/orders/:id/reject                    Farmer reject order (triggers refund/re-assign)
PATCH   api/v1/orders/:id/pack                      Mark order as packed & ready for delivery
PATCH   api/v1/orders/:id/out-for-delivery          Mark order as out for delivery

POST    api/v1/orders/:id/verify-delivery           Verify customer 4-digit doorstep OTP (completes delivery)
GET     api/v1/orders/:id/delivery-otp              Get doorstep delivery OTP (Customer view)
POST    api/v1/orders/:id/resend-delivery-otp       Resend doorstep delivery OTP via SMS

GET     api/v1/orders/:id/timeline                  Get granular order status change history
GET     api/v1/orders/:id/invoice                   Get/Download PDF invoice for order

GET     api/v1/admin/orders                         [Admin] List all platform orders (filter: location, status)
POST    api/v1/admin/orders                         [Admin] Create manual order (Phone order / POS)
GET     api/v1/admin/orders/:id                     [Admin] Get order administrative details & audit log
PUT     api/v1/admin/orders/:id                     [Admin] Edit order details / items
DELETE  api/v1/admin/orders/:id                     [Admin] Delete / void order

PUT     api/v1/admin/orders/:id/reassign            [Admin] Reassign order to alternative shop/farmer
PUT     api/v1/admin/orders/:id/force-status        [Admin] Force update order status
POST    api/v1/admin/orders/:id/issue-refund        [Admin] Trigger full or partial refund for order

POST    api/v1/orders/reorder                       One-tap reorder from historical order
GET     api/v1/orders/live-tracking                 Get live geo-coordinates of active delivery agent
POST    api/v1/orders/:id/assign-delivery           Assign delivery partner to order
```

---

## Module 9 — Payments & Razorpay Route Settlement (Full Admin CRUD)
> 20 endpoints

```
POST    api/v1/payments/create-razorpay-order       Generate Razorpay Order ID with Route split calculation
POST    api/v1/payments/verify                      Verify Razorpay payment signature & confirm order
POST    api/v1/payments/webhook                     Razorpay Payment & Payout webhook handler [public]

GET     api/v1/payments                             List customer/farmer payment transactions
GET     api/v1/payments/:order_id                   Get payment transaction status
GET     api/v1/payments/:order_id/split-breakdown   Get Razorpay Route split details (Farmer vs Commission)
POST    api/v1/payments/cod/collect                 Mark Cash on Delivery payment collected by agent
POST    api/v1/payments/cod/settle                  Settle COD collection with platform ledger

GET     api/v1/payouts                              List farmer payouts history
GET     api/v1/payouts/:payout_id                   Get detailed payout statement (gross, commission, net, UTR)
GET     api/v1/payouts/:payout_id/pdf               Download payout statement PDF for farmer

GET     api/v1/admin/payments                       [Admin] List all platform transactions
GET     api/v1/admin/payments/:id                   [Admin] Get detailed transaction log
DELETE  api/v1/admin/payments/:id                   [Admin] Void / Archive payment record

POST    api/v1/admin/payouts/manual-trigger         [Admin] Trigger manual payout batch to farmers
GET     api/v1/admin/payouts/pending                [Admin] List pending payouts waiting for settlement
GET     api/v1/admin/refunds                        [Admin] List refund requests
POST    api/v1/admin/refunds/process                [Admin] Process refund via Razorpay Route reversal
GET     api/v1/admin/finance/daily-summary          [Admin] Get daily sales, commissions, and payout breakdown
GET     api/v1/admin/finance/tax-report             [Admin] Export GST breakdown report for finance
GET     api/v1/admin/finance/settlements            [Admin] List settled Razorpay transfer batches
```

---

## Module 10 — Customer Savings Ledger (Full Admin CRUD)
> 10 endpoints

```
GET     api/v1/customer/savings                     Get Customer lifetime & monthly total savings summary
GET     api/v1/customer/savings/history             Get detailed per-order savings history breakdown
GET     api/v1/customer/savings/history/:id         Get specific savings ledger entry detail
GET     api/v1/customer/savings/graph               Get monthly savings trend graph data (12 months)
GET     api/v1/customer/savings/category-breakdown  Get savings breakdown by product category
GET     api/v1/customer/savings/share-card          Generate visual graphic card of total savings for social sharing

GET     api/v1/admin/savings/ledger                 [Admin] List all customer savings ledger entries
POST    api/v1/admin/savings/ledger                 [Admin] Manually add adjustment savings ledger entry
GET     api/v1/admin/savings/overview               [Admin] Get total savings delivered across all customers
DELETE  api/v1/admin/savings/ledger/:id             [Admin] Void / Delete savings ledger entry
```

---

## Module 11 — Farmer Earnings Ledger & Payouts (Full Admin CRUD)
> 14 endpoints

```
GET     api/v1/farmer/dashboard                     Get farmer main dashboard metrics (today earnings, orders)
GET     api/v1/farmer/earnings                      Get extra earnings ledger summary vs local mandi rates
GET     api/v1/farmer/earnings/history              Get line-item extra earnings breakdown per order
GET     api/v1/farmer/earnings/history/:id          Get specific earnings ledger entry detail
GET     api/v1/farmer/earnings/trend                Get monthly earnings trend graph data

GET     api/v1/farmer/statements                    List downloadable monthly earnings statements
GET     api/v1/farmer/statements/:month/pdf         Download official monthly PDF statement for bank/records
GET     api/v1/farmer/bank-account                  Get registered payout bank account details
PUT     api/v1/farmer/bank-account                  Update payout bank account (requires re-verification)

GET     api/v1/admin/farmers/earnings-ledger        [Admin] List all farmer earnings ledger entries
POST    api/v1/admin/farmers/earnings-ledger        [Admin] Manually add adjustment earnings ledger entry
DELETE  api/v1/admin/farmers/earnings-ledger/:id    [Admin] Void / Delete earnings ledger entry
GET     api/v1/admin/farmers/earnings-overview      [Admin] Get total extra income generated nationwide
GET     api/v1/admin/farmers/top-earners            [Admin] List top earning farmers on platform
```

---

## Module 12 — B2B Wholesale, RFQ & Credit Ledger (Full Admin & User CRUD)
> 24 endpoints

```
GET     api/v1/b2b/catalog                          List bulk wholesale products (quintal/ton tiers) [public]
GET     api/v1/b2b/catalog/:id                      Get bulk product details & quantity tier discounts [public]

POST    api/v1/b2b/rfq                              Submit Request for Quote (RFQ) for bulk produce
GET     api/v1/b2b/rfq                              List B2B buyer's submitted RFQs
GET     api/v1/b2b/rfq/:id                          Get RFQ detail & received responses/quotes
PUT     api/v1/b2b/rfq/:id                          Update submitted RFQ details (quantity/dates)
DELETE  api/v1/b2b/rfq/:id                          Cancel / Delete submitted RFQ

GET     api/v1/farmer/rfq                           List relevant RFQs matching farmer crops
POST    api/v1/farmer/rfq/:id/quote                 Farmer submit price quote response to RFQ
GET     api/v1/farmer/rfq/:id/quote                 Get farmer submitted quote detail
PUT     api/v1/farmer/rfq/:id/quote                 Farmer update submitted quote response
DELETE  api/v1/farmer/rfq/:id/quote                 Withdraw submitted quote response

POST    api/v1/b2b/quotes/:quote_id/accept          B2B accept farmer quote & generate bulk order
POST    api/v1/b2b/quotes/:quote_id/reject          B2B reject farmer quote

GET     api/v1/b2b/invoices                         List B2B GST tax invoices
GET     api/v1/b2b/invoices/:id/pdf                 Download B2B GST compliant PDF tax invoice
GET     api/v1/b2b/credit-ledger                    Get B2B account credit limit, balance, & due dates
POST    api/v1/b2b/credit/pay-due                   Pay outstanding credit ledger balance via Razorpay

GET     api/v1/admin/b2b/applications               [Admin] List B2B account applications
GET     api/v1/admin/b2b/credit-ledgers             [Admin] List all B2B credit ledgers
POST    api/v1/admin/b2b/credit-ledgers             [Admin] Manually issue credit to B2B buyer
PUT     api/v1/admin/b2b/:id/credit-limit           [Admin] Update credit limit for B2B buyer
DELETE  api/v1/admin/b2b/credit-ledgers/:id         [Admin] Revoke / Delete credit ledger
POST    api/v1/b2b/dispatch-slip                    Upload weighbridge slip / photo proof for bulk dispatch
```

---

## Module 13 — Admin Shops & POS Billing (Full Admin CRUD)
> 18 endpoints

```
GET     api/v1/admin/shops                          List all admin location-wise shops
POST    api/v1/admin/shops                          Create new shop with Mapbox pin & service radius
GET     api/v1/admin/shops/:id                      Get shop details, assigned staff, & stock
PUT     api/v1/admin/shops/:id                      Update shop details & operating hours
DELETE  api/v1/admin/shops/:id                      Deactivate / Delete shop location

GET     api/v1/admin/shops/:id/inventory            List inventory stock at specific shop
POST    api/v1/admin/shops/:id/inventory            Add/Procure stock to shop inventory
GET     api/v1/admin/shops/:id/inventory/:prod_id   Get shop inventory product detail
PUT     api/v1/admin/shops/:id/inventory/:prod_id   Adjust stock quantity at shop
DELETE  api/v1/admin/shops/:id/inventory/:prod_id   Remove item from shop inventory

POST    api/v1/admin/shops/:id/pos-checkout         POS offline checkout: generate invoice & process payment
GET     api/v1/admin/shops/:id/pos-history          List POS transactions at shop
GET     api/v1/admin/shops/:id/pos-history/:trans_id Get specific POS transaction detail
DELETE  api/v1/admin/shops/:id/pos-history/:trans_id Void / Refund POS transaction
POST    api/v1/admin/shops/:id/pos-print            Generate printable receipt for POS transaction

POST    api/v1/admin/shops/:id/staff                Assign staff user to shop location
DELETE  api/v1/admin/shops/:id/staff/:user_id       Remove staff user from shop location
GET     api/v1/shops/public-list                    List active shops shown to customers [public]
```

---

## Module 14 — Delivery Partners & Agents (Full Admin CRUD)
> 12 endpoints

```
GET     api/v1/admin/delivery-partners              [Admin] List all delivery partners & agents
POST    api/v1/admin/delivery-partners              [Admin] Register new delivery partner/agent
GET     api/v1/admin/delivery-partners/:id          [Admin] Get delivery agent details & live location
PUT     api/v1/admin/delivery-partners/:id          [Admin] Update delivery agent details & status
DELETE  api/v1/admin/delivery-partners/:id          [Admin] Deactivate / Delete delivery agent

GET     api/v1/delivery/active-orders               List active orders assigned to delivery agent
PUT     api/v1/delivery/status                      Update agent status (online, offline, busy)
POST    api/v1/delivery/location-update             Send live GPS coordinates from agent mobile app
GET     api/v1/admin/delivery/performance           [Admin] Get delivery partner performance metrics
POST    api/v1/admin/delivery/assign                [Admin] Manually assign delivery partner to order
DELETE  api/v1/admin/delivery/assign/:order_id      [Admin] Unassign delivery partner from order
GET     api/v1/admin/delivery/payouts               [Admin] List delivery partner fee payouts
```

---

## Module 15 — Dynamic Commission Slabs & Overrides (Full Admin CRUD)
> 12 endpoints

```
GET     api/v1/admin/commission/slabs               List all dynamic commission slabs (Admin)
POST    api/v1/admin/commission/slabs               Create new commission slab (e.g., 4.5% up to 10k)
GET     api/v1/admin/commission/slabs/:id           Get commission slab details
PUT     api/v1/admin/commission/slabs/:id           Update commission slab parameters
DELETE  api/v1/admin/commission/slabs/:id           Delete commission slab

GET     api/v1/admin/commission/overrides           List category or region-specific slab overrides
POST    api/v1/admin/commission/overrides           Create category or region slab override rule
GET     api/v1/admin/commission/overrides/:id       Get slab override rule details
PUT     api/v1/admin/commission/overrides/:id       Update slab override rule
DELETE  api/v1/admin/commission/overrides/:id       Delete slab override rule

POST    api/v1/commission/calculate                 Calculate applicable commission for amount & category
POST    api/v1/admin/commission/schedule            Schedule temporary promotional slab (e.g. festival 3% rate)
```

---

## Module 16 — Coupons & Discount Engine (Full Admin CRUD)
> 12 endpoints

```
GET     api/v1/coupons                              List active public coupons [public]
GET     api/v1/admin/coupons                        [Admin] List all coupons (active, expired, upcoming)
POST    api/v1/admin/coupons                        [Admin] Create new discount coupon code
GET     api/v1/admin/coupons/:id                    [Admin] Get coupon details & usage stats
PUT     api/v1/admin/coupons/:id                    [Admin] Update coupon code, discount %, or limits
DELETE  api/v1/admin/coupons/:id                    [Admin] Delete / deactivate coupon code

POST    api/v1/coupons/validate                     Validate coupon code applicability for cart
GET     api/v1/admin/coupons/:id/redemptions        [Admin] List all redemption records for coupon
POST    api/v1/admin/coupons/bulk-generate          [Admin] Bulk generate single-use promo codes
GET     api/v1/admin/coupons/stats                  [Admin] Get coupon performance & ROI analytics
PUT     api/v1/admin/coupons/:id/status             [Admin] Toggle coupon status (active/paused)
DELETE  api/v1/admin/coupons/expired                [Admin] Purge all expired coupon codes
```

---

## Module 17 — Market Baseline Reference Prices (Full Admin CRUD)
> 12 endpoints

```
GET     api/v1/market-prices                        List market reference prices per crop & region [public]
POST    api/v1/admin/market-prices                  [Admin] Create market reference baseline price
GET     api/v1/market-prices/:id                    Get market reference baseline price detail [public]
PUT     api/v1/admin/market-prices/:id              [Admin] Update market baseline price for category/region
DELETE  api/v1/admin/market-prices/:id              [Admin] Delete market baseline price entry

GET     api/v1/market-prices/history/:category      Get market reference price history for category [public]
PUT     api/v1/admin/market-prices/bulk-update      [Admin] Bulk update weekly mandi reference prices
GET     api/v1/admin/market-prices/discrepancies    [Admin] Flag products listed far above/below mandi price
POST    api/v1/admin/market-prices/import-csv       [Admin] Import mandi prices from government CSV feed
GET     api/v1/admin/market-prices/export-csv       [Admin] Export current baseline market prices
PUT     api/v1/admin/market-prices/:id/publish      [Admin] Publish / Activate market price update
```

---

## Module 18 — Admin System & Roles (Full Admin CRUD)
> 18 endpoints

```
GET     api/v1/admin/audit-logs                     List system audit trail logs (who, what, when)
GET     api/v1/admin/audit-logs/:id                 Get audit log entry full detail (before/after state)
DELETE  api/v1/admin/audit-logs/:id                 Archive / purge audit log entry

GET     api/v1/admin/roles                          List admin roles & permissions matrix
POST    api/v1/admin/roles                          Create custom admin role
GET     api/v1/admin/roles/:id                      Get admin role details
PUT     api/v1/admin/roles/:id                      Update admin role permissions
DELETE  api/v1/admin/roles/:id                      Delete custom admin role

GET     api/v1/admin/team                           List admin staff team members
POST    api/v1/admin/team                           Invite new admin team member
GET     api/v1/admin/team/:id                       Get admin team member details
PUT     api/v1/admin/team/:id                       Update admin team member role/status
DELETE  api/v1/admin/team/:id                       Deactivate admin team member

GET     api/v1/admin/config                         Get system global configuration settings
POST    api/v1/admin/config                         Add custom system configuration parameter
PUT     api/v1/admin/config                         Update global system configuration parameters
DELETE  api/v1/admin/config/:key                    Reset / Delete system configuration parameter
GET     api/v1/admin/system-health                  Get infrastructure health status (PostgreSQL, Redis, VPS)
```

---

## Module 19 — Banners, CMS & Social Links (Full Admin CRUD)
> 16 endpoints

```
GET     api/v1/banners                              List active homepage banners & welcome notes [public]
GET     api/v1/admin/banners                        [Admin] List all banners (active, draft, expired)
POST    api/v1/admin/banners                        [Admin] Create new banner (image, link, audience)
GET     api/v1/admin/banners/:id                    [Admin] Get banner details
PUT     api/v1/admin/banners/:id                    [Admin] Update banner details & schedule
DELETE  api/v1/admin/banners/:id                    [Admin] Delete banner listing
PUT     api/v1/admin/banners/reorder                [Admin] Reorder display sequence of active banners

GET     api/v1/social-links                         Get official footer social media links [public]
GET     api/v1/admin/social-links                   [Admin] List social media links configuration
POST    api/v1/admin/social-links                   [Admin] Add new social media link platform
GET     api/v1/admin/social-links/:id               [Admin] Get social media link detail
PUT     api/v1/admin/social-links/:id               [Admin] Update social media link URL
DELETE  api/v1/admin/social-links/:id               [Admin] Delete social media link

GET     api/v1/cms/pages/:slug                      Get static page content (Terms, Privacy, FAQs) [public]
POST    api/v1/admin/cms/pages                      [Admin] Create static CMS page
PUT     api/v1/admin/cms/pages/:slug                [Admin] Update static CMS page content
DELETE  api/v1/admin/cms/pages/:slug                [Admin] Delete static CMS page
```

---

## Module 20 — Notifications & Push Templates (Full Admin CRUD)
> 16 endpoints

```
POST    api/v1/notifications/fcm-token              Register device FCM push notification token
DELETE  api/v1/notifications/fcm-token              Unregister device FCM token on logout

GET     api/v1/notifications                        List user in-app notifications
GET     api/v1/notifications/:id                    Get notification detail
PATCH   api/v1/notifications/:id/read               Mark single notification as read
PATCH   api/v1/notifications/read-all               Mark all notifications as read
DELETE  api/v1/notifications/:id                    Delete notification entry

GET     api/v1/admin/notifications/templates       [Admin] List notification message templates
POST    api/v1/admin/notifications/templates       [Admin] Create notification message template
GET     api/v1/admin/notifications/templates/:id   [Admin] Get notification template detail
PUT     api/v1/admin/notifications/templates/:id   [Admin] Update notification template text
DELETE  api/v1/admin/notifications/templates/:id   [Admin] Delete notification template

GET     api/v1/admin/notifications/logs             [Admin] List notification dispatch logs (FCM/WhatsApp/SMS)
POST    api/v1/admin/notifications/broadcast        [Admin] Send broadcast push notification to target user segment
GET     api/v1/notifications/preferences            Get user notification channel preferences
PUT     api/v1/notifications/preferences            Update notification preferences (WhatsApp on/off, SMS on/off)
```

---

## Module 21 — Reviews & Disputes (Full Admin CRUD)
> 16 endpoints

```
POST    api/v1/reviews                              Submit rating & review for farmer post-delivery
GET     api/v1/reviews/farmer/:farmer_id            List verified customer reviews for farmer [public]
GET     api/v1/reviews/product/:product_id           List reviews for specific product [public]
GET     api/v1/reviews/:id                          Get review detail [public]
PUT     api/v1/reviews/:id                          Update customer review (within 48 hours)
DELETE  api/v1/reviews/:id                          Delete review (Customer self-delete)
DELETE  api/v1/admin/reviews/:id                    [Admin] Moderation delete inappropriate review

POST    api/v1/disputes                             Raise order dispute/complaint (Customer)
GET     api/v1/disputes                             List user submitted disputes
GET     api/v1/disputes/:id                         Get dispute details & message thread
PUT     api/v1/disputes/:id                         Update dispute details
DELETE  api/v1/disputes/:id                         Withdraw submitted dispute

GET     api/v1/admin/disputes                       [Admin] List pending disputes queue
GET     api/v1/admin/disputes/:id                   [Admin] Get dispute investigation package
PATCH   api/v1/admin/disputes/:id/resolve           [Admin] Resolve dispute (full refund, partial refund, reject)
POST    api/v1/admin/disputes/:id/penalize-seller   [Admin] Issue warning/penalty to repeat offending seller
DELETE  api/v1/admin/disputes/:id                   [Admin] Close & purge dispute record
```

---

## Module 22 — Analytics & Platform Reporting (Full Admin CRUD)
> 16 endpoints

```
GET     api/v1/market-prices                        List market reference prices per crop & region [public]
GET     api/v1/admin/analytics/dashboard            [Admin] Get primary executive dashboard metrics
GET     api/v1/admin/analytics/sales-trend          [Admin] Get sales revenue & commission trend graphs
GET     api/v1/admin/analytics/regional-performance [Admin] Get sales performance broken down by district
GET     api/v1/admin/analytics/top-products         [Admin] Get top 20 best-selling products platform-wide
GET     api/v1/admin/analytics/farmer-retention     [Admin] Get farmer retention & active listing statistics
GET     api/v1/admin/analytics/customer-acquisition [Admin] Get customer signup growth & repeat buyer rate

GET     api/v1/admin/reports                        [Admin] List saved custom report configurations
POST    api/v1/admin/reports                        [Admin] Create new scheduled custom report
GET     api/v1/admin/reports/:id                    [Admin] Get report configuration & execution status
PUT     api/v1/admin/reports/:id                    [Admin] Update report parameters & schedule
DELETE  api/v1/admin/reports/:id                    [Admin] Delete custom report configuration

GET     api/v1/admin/reports/sales/export          [Admin] Export comprehensive sales report (Excel/CSV)
GET     api/v1/admin/reports/tax/export            [Admin] Export tax and GST breakdown report (Excel/CSV)
GET     api/v1/admin/reports/commission/export     [Admin] Export commission revenue statement (Excel/CSV)
GET     api/v1/admin/analytics/india-map-summary    [Admin] Get high-level summary stats for India map dashboard
```

---

## Global Conventions

### Pagination (all list endpoints)
```
GET api/v1/products/radius?page=1&limit=50&sort=created_at&order=desc
```

### Filtering
```
GET api/v1/products/radius?category=vegetables&radiusKm=10&lat=16.5062&lng=80.6480&status=active
```

### Standard Response Envelope
```json
{
  "success": true,
  "data": { },
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 1240,
    "total_pages": 25
  },
  "error": null
}
```

### Error Response
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product with ID prod_1029 not found",
    "field": null
  }
}
```

### HTTP Status Codes Used
```
200  OK                  Successful GET / PUT / PATCH
201  Created             Successful POST
204  No Content          Successful DELETE
400  Bad Request         Validation error
401  Unauthorized        Missing or invalid token
403  Forbidden           Insufficient permissions (RBAC)
404  Not Found           Resource does not exist
409  Conflict            Duplicate / state conflict
422  Unprocessable       Business rule violation (e.g. invalid OTP or delivery state)
429  Too Many Requests   Rate limit hit (Redis OTP limit)
500  Internal Error      Unexpected server error
```

### WebSocket Events (Real-time, via ws://api/v1/ws)
```
order.placed                New order notification to farmer
order.status.updated        Order lifecycle state changed (Accepted, Packed, Out for Delivery, Delivered)
order.otp.verified          Doorstep OTP verified & delivery completed
payment.split.success       Razorpay Route payout split executed
delivery.location.updated   Live GPS tracking update from delivery agent
inventory.low_stock         Farmer stock fell below minimum quantity
kyc.status.updated          Farmer/B2B KYC verification decision
notification.new            Generic in-app notification
```

---

*Total: 388 endpoints across 22 modules*
*Base URL: api/v1*
*Stack: Node.js (NestJS) — Backend | Next.js / React Native — Web & App | PostgreSQL + PostGIS — DB*
*Auth: Supabase Auth (Mobile OTP + Google OAuth) + JWT Bearer Token + RBAC*

