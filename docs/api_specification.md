# Aswamithra REST API Specification

**Base URL**: `https://api.aswamithra.in/api/v1` (Production) / `http://localhost:3000/api/v1` (Development)  
**API Version**: `v1`  
**Content-Type**: `application/json`  
**Authentication**: Bearer Token (`Authorization: Bearer <JWT_ACCESS_TOKEN>`)

---

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2026-07-25T16:50:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": "Invalid OTP provided or OTP expired",
  "timestamp": "2026-07-25T16:50:00.000Z"
}
```

---

## 1. Authentication & Identity (`/api/v1/auth`, `/api/v1/users`)

### 1.1 Request Mobile OTP
`POST /api/v1/auth/send-otp`  
*Rate limited via Redis (Max 3 resends per 5 mins)*

**Request Body**:
```json
{
  "mobile": "+919876543210",
  "role": "customer" // customer | farmer | b2b
}
```
**Response (200 OK)**:
```json
{
  "success": true,
  "message": "OTP sent successfully via MSG91",
  "data": {
    "mobile": "+919876543210",
    "expiresInSeconds": 300
  }
}
```

---

### 1.2 Verify Mobile OTP
`POST /api/v1/auth/verify-otp`

**Request Body**:
```json
{
  "mobile": "+919876543210",
  "otp": "482910",
  "role": "customer"
}
```
**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "d8a1f3c9...",
    "user": {
      "id": "usr_998124",
      "mobile": "+919876543210",
      "role": "customer",
      "status": "active" // active | pending_kyc | suspended
    }
  }
}
```

---

### 1.3 Google One-Tap / OAuth Login
`POST /api/v1/auth/google`

**Request Body**:
```json
{
  "idToken": "google_oauth_id_token_string",
  "role": "customer"
}
```
**Response (200 OK)**: Returns standard auth payload with `accessToken` and `user`.

---

### 1.4 Set Login PIN / Password
`POST /api/v1/auth/set-pin`  
*Requires Authorization header*

**Request Body**:
```json
{
  "pin": "1234"
}
```
**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Security PIN updated successfully"
}
```

---

### 1.5 Get Current Profile
`GET /api/v1/users/me`  
*Requires Authorization header*

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "usr_998124",
    "role": "farmer",
    "mobile": "+919876543210",
    "email": "farmer@example.com",
    "language": "te", // te | hi | en
    "profile": {
      "name": "Ramesh Kumar",
      "village": "Gudur",
      "mandal": "Gudur Mandal",
      "district": "Krishna",
      "state": "Andhra Pradesh",
      "pincode": "521149",
      "location": { "lat": 16.2415, "lng": 80.8410 },
      "kycStatus": "approved",
      "bankDetails": {
        "accountHolder": "Ramesh Kumar",
        "accountNumber": "XXXXXX4812",
        "ifsc": "SBIN0001234",
        "isVerified": true
      }
    }
  }
}
```

---

## 2. Onboarding & KYC (`/api/v1/onboarding`)

### 2.1 Customer Profile Setup
`POST /api/v1/onboarding/customer`

**Request Body**:
```json
{
  "name": "Anitha Reddy",
  "address": "Door No 4-12, Near Temple Street",
  "landmark": "Opposite SBI Branch",
  "pincode": "520001",
  "city": "Vijayawada",
  "state": "Andhra Pradesh",
  "lat": 16.5062,
  "lng": 80.6480,
  "language": "te"
}
```

---

### 2.2 Farmer KYC Onboarding
`POST /api/v1/onboarding/farmer`

**Request Body**:
```json
{
  "name": "Ramesh Kumar",
  "village": "Gudur",
  "mandal": "Gudur",
  "district": "Krishna",
  "state": "Andhra Pradesh",
  "pincode": "521149",
  "lat": 16.2415,
  "lng": 80.8410,
  "aadhaarNumber": "123456789012",
  "aadhaarDocUrl": "https://storage.aswamithra.in/kyc/aadhaar_998.enc",
  "bankAccountName": "Ramesh Kumar",
  "bankAccountNumber": "39120482910",
  "ifscCode": "SBIN0001234",
  "cropsGrown": ["Rice", "Chilli", "Tomato"],
  "landSizeAcres": 4.5
}
```
**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Farmer KYC details submitted successfully. Under Admin Review.",
  "data": {
    "kycStatus": "pending"
  }
}
```

---

### 2.3 B2B Buyer Onboarding
`POST /api/v1/onboarding/b2b`

**Request Body**:
```json
{
  "businessName": "Sri Lakshmi Rice Mill",
  "ownerName": "Venkat Rao",
  "businessEmail": "procurement@lakshmirice.com",
  "gstin": "37AAAAA0000A1Z5",
  "businessType": "mill", // retailer | hotel | mill | wholesaler
  "address": "Plot 42, Industrial Estate, Autonagar",
  "lat": 16.4950,
  "lng": 80.6720,
  "tradeLicenseUrl": "https://storage.aswamithra.in/kyc/license_442.enc"
}
```

---

## 3. Product Catalog & Radius Discovery (`/api/v1/products`)

### 3.1 Radius-Based Product Discovery (PostGIS Query)
`GET /api/v1/products/radius`

**Query Parameters**:
- `lat` (required): Latitude e.g. `16.5062`
- `lng` (required): Longitude e.g. `80.6480`
- `radiusKm` (optional, default: `10`): `5` | `10` | `25`
- `category` (optional): `rice_grains` | `vegetables` | `fruits` | `pulses` | `dairy`
- `search` (optional): Keyword search e.g. `Sona Masoori`
- `page` (default: `1`), `limit` (default: `20`)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "total": 14,
    "page": 1,
    "radiusKm": 10,
    "products": [
      {
        "id": "prod_1029",
        "name": "Organic Sona Masoori Rice Raw",
        "category": "rice_grains",
        "price": 54.00,
        "unit": "kg", // kg | g | unit | ton | quintal
        "marketReferencePrice": 62.00, // Market price baseline
        "estimatedSavingsPerUnit": 8.00,
        "stock": 450,
        "minQty": 5,
        "farmer": {
          "id": "farmer_881",
          "name": "Ramesh Kumar",
          "village": "Gudur",
          "photoUrl": "https://storage.aswamithra.in/profiles/farmer_881.jpg",
          "rating": 4.8,
          "distanceKm": 3.2
        }
      }
    ]
  }
}
```

---

### 3.2 Add Product (Farmer / Shop)
`POST /api/v1/products`  
*Requires Farmer or Admin role*

**Request Body**:
```json
{
  "name": "Fresh Red Tomatoes",
  "category": "vegetables",
  "description": "Naturally grown, freshly harvested today morning.",
  "images": ["https://storage.aswamithra.in/products/img_01.jpg"],
  "price": 28.00,
  "unit": "kg", // kg | g | unit | ton | quintal
  "stock": 120,
  "minQty": 1,
  "b2bTierPrice": 2400.00, // Optional bulk price per quintal
  "b2bMinQty": 1
}
```

---

### 3.3 Edit / Update Product
`PUT /api/v1/products/:id`

---

### 3.4 Toggle Product Status (Pause / Resume)
`PATCH /api/v1/products/:id/status`

**Request Body**:
```json
{
  "status": "paused" // active | paused | out_of_stock
}
```

---

## 4. Orders & Checkout (`/api/v1/orders`)

### 4.1 Create Order / Checkout
`POST /api/v1/orders`  
*Requires Customer or B2B role*

**Request Body**:
```json
{
  "sellerId": "farmer_881",
  "items": [
    {
      "productId": "prod_1029",
      "qty": 10,
      "unit": "kg",
      "priceAtOrder": 54.00
    }
  ],
  "deliveryAddress": {
    "street": "Door No 4-12, Near Temple Street",
    "pincode": "520001",
    "lat": 16.5062,
    "lng": 80.6480
  },
  "paymentMode": "online", // online | cod
  "deliverySlot": "2026-07-26T08:00:00.000Z"
}
```
**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "orderId": "ord_889210",
    "totalAmount": 540.00,
    "commissionRate": 4.5,
    "commissionAmount": 24.30,
    "farmerPayoutAmount": 515.70,
    "status": "PLACED",
    "razorpayOrderId": "order_Kz820x91823"
  }
}
```

---

### 4.2 Farmer Accept / Reject Order
`PATCH /api/v1/orders/:id/accept`  
`PATCH /api/v1/orders/:id/reject`

**Request Body (Reject)**:
```json
{
  "reason": "Stock sold out at farm location"
}
```

---

### 4.3 Update Order Status
- `PATCH /api/v1/orders/:id/pack` (Farmer marks packed)
- `PATCH /api/v1/orders/:id/out-for-delivery` (Delivery dispatched)

---

### 4.4 Verify Doorstep Delivery OTP (Finalize Order)
`POST /api/v1/orders/:id/verify-delivery`

**Request Body**:
```json
{
  "deliveryOtp": "8192" // 4-digit doorstep OTP provided by customer
}
```
**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Order delivered successfully. Razorpay Route split initiated.",
  "data": {
    "orderStatus": "DELIVERED",
    "deliveredAt": "2026-07-25T16:52:00.000Z",
    "customerSavedAmount": 80.00,
    "farmerExtraEarnedAmount": 120.00
  }
}
```

---

## 5. Payments & Razorpay Split (`/api/v1/payments`)

### 5.1 Razorpay Payment Signature Verification
`POST /api/v1/payments/verify`

**Request Body**:
```json
{
  "orderId": "ord_889210",
  "razorpayPaymentId": "pay_Kz8910283",
  "razorpayOrderId": "order_Kz820x91823",
  "razorpaySignature": "46a1e8bc..."
}
```
**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "paymentStatus": "PAID",
    "splitDetails": {
      "farmerAccount": "acc_farmer_881",
      "farmerAmount": 515.70,
      "platformCommission": 24.30
    }
  }
}
```

---

### 5.2 Razorpay Webhook Handler
`POST /api/v1/payments/webhook`  
*Headers: `x-razorpay-signature`*

---

## 6. Dashboards & Ledgers (`/api/v1/customer/savings`, `/api/v1/farmer/dashboard`)

### 6.1 Customer Savings Dashboard
`GET /api/v1/customer/savings`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "totalSavingsLifetime": 4280.00,
    "savingsThisMonth": 1240.00,
    "totalOrdersCount": 18,
    "monthlyBreakdown": [
      { "month": "2026-07", "savedAmount": 1240.00 },
      { "month": "2026-06", "savedAmount": 1620.00 }
    ]
  }
}
```

---

### 6.2 Farmer Earnings & Payout Dashboard
`GET /api/v1/farmer/dashboard`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "extraEarnedLifetime": 14850.00, // Extra earned vs local mandi price
    "extraEarnedThisMonth": 3800.00,
    "pendingOrdersCount": 3,
    "completedOrdersCount": 42,
    "lowStockAlerts": [
      { "productId": "prod_1029", "name": "Sona Masoori Rice", "remainingStock": 5 }
    ],
    "recentPayouts": [
      {
        "orderId": "ord_889210",
        "netAmount": 515.70,
        "utr": "UTR9928104812",
        "settledAt": "2026-07-25T16:53:00.000Z",
        "status": "SETTLED"
      }
    ]
  }
}
```

---

## 7. B2B Wholesale & Quote APIs (`/api/v1/b2b`)

### 7.1 B2B Catalog Listing
`GET /api/v1/b2b/catalog`

### 7.2 Submit Request for Quote (RFQ)
`POST /api/v1/b2b/rfq`

**Request Body**:
```json
{
  "cropCategory": "rice",
  "specificVariety": "Sona Masoori Raw",
  "quantity": 50,
  "unit": "quintal",
  "targetDeliveryDate": "2026-08-05",
  "destinationPincode": "520007"
}
```

---

### 7.3 Download GST Invoice
`GET /api/v1/b2b/invoices/:orderId/download`

---

## 8. Admin Control Panel APIs (`/api/v1/admin`)

### 8.1 KYC Pending Applications Queue
`GET /api/v1/admin/kyc/pending?role=farmer`

### 8.2 Approve / Reject KYC
`PATCH /api/v1/admin/kyc/:id/approve`  
*Triggers ₹1 Razorpay Penny Drop bank verification*

`PATCH /api/v1/admin/kyc/:id/reject`  
**Request Body**:
```json
{
  "reason": "Aadhaar photo is blurred. Please re-upload a clear copy."
}
```

---

### 8.3 Dynamic Commission Slab Controls
- `GET /api/v1/admin/commissions`
- `POST /api/v1/admin/commissions`

**Request Body**:
```json
{
  "minAmount": 0,
  "maxAmount": 10000,
  "ratePercent": 4.5,
  "applicableCategory": "all",
  "applicableRegion": "all"
}
```

---

### 8.4 Location-wise Shop Management
- `GET /api/v1/admin/shops`
- `POST /api/v1/admin/shops`

**Request Body**:
```json
{
  "name": "Aswamithra Vijayawada Hub Shop",
  "address": "Benz Circle Main Road",
  "lat": 16.5000,
  "lng": 80.6500,
  "radiusKm": 15,
  "operatingHours": "07:00 AM - 09:00 PM",
  "staffUserIds": ["usr_staff_01", "usr_staff_02"]
}
```

---

### 8.5 POS Direct Billing at Shop
`POST /api/v1/admin/shops/:id/pos-checkout`

**Request Body**:
```json
{
  "customerMobile": "+919876543210",
  "items": [
    { "productId": "prod_1029", "qty": 2, "unit": "kg", "price": 54.00 }
  ],
  "paymentMethod": "cash" // cash | upi_qr
}
```

---

### 8.6 Content & Banner Management
- `GET /api/v1/admin/banners`
- `POST /api/v1/admin/banners`

---

### 8.7 Audit Trail Logs
`GET /api/v1/admin/audit-logs`

---

## 9. Common / Public APIs (`/api/v1/common`)

### 9.1 Active Locations List
`GET /api/v1/common/service-locations`

### 9.2 Active Home Banners
`GET /api/v1/common/banners?audience=customer`

### 9.3 Footer Social Media Links
`GET /api/v1/common/social-links`

---

## Summary of API Endpoint Hierarchy

```
/api/v1
 ├── /auth             (send-otp, verify-otp, google, set-pin)
 ├── /users            (me, profile updates)
 ├── /onboarding       (customer, farmer, b2b KYC)
 ├── /products         (radius search via PostGIS, add, edit, pause)
 ├── /orders           (checkout, accept/reject, pack, OTP verify delivery)
 ├── /payments         (Razorpay verify, Route webhooks)
 ├── /customer         (savings ledger, order history)
 ├── /farmer           (earnings ledger, payouts, inventory dashboard)
 ├── /b2b              (catalog, RFQs, GST invoices, credit ledger)
 ├── /shops            (nearby shops, POS offline checkout)
 ├── /admin            (KYC queue, commission slabs, shops, banners, audit logs)
 └── /common           (service locations, public banners, social links)
```
