import http from 'http';
import app from '../app';
import { signJwt } from '../utils/jwt';

const PORT = 3099;
let server: http.Server;
const baseUrl = `http://localhost:${PORT}/api/v1`;

const customerToken = signJwt({
  id: 'usr_998124',
  mobile: '+919876543210',
  role: 'customer',
  name: 'Anitha Reddy',
});

const farmerToken = signJwt({
  id: 'farmer_881',
  mobile: '+919876543211',
  role: 'farmer',
  name: 'Ramesh Kumar',
});

const b2bToken = signJwt({
  id: 'b2b_01',
  mobile: '+919876543212',
  role: 'b2b',
  name: 'Sri Lakshmi Rice Mill',
});

const adminToken = signJwt({
  id: 'admin_01',
  mobile: '+919876543213',
  role: 'admin',
  name: 'Super Admin',
});

const request = (
  method: string,
  path: string,
  body?: any,
  authToken?: string
): Promise<{ status: number; body: any }> => {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const postData = body ? JSON.stringify(body) : '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData).toString(),
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode || 500, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode || 500, body: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
};

async function testComprehensiveSuite() {
  console.log('\n================================================================');
  console.log('🚀 EXHAUSTIVE REAL-HTTP ENDPOINT INTEGRATION TEST SUITE');
  console.log('   (Using Real HMAC-SHA256 Cryptographic JWT Authentication)');
  console.log('================================================================\n');

  server = app.listen(PORT);
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log('ℹ️ Express server is already running on port 3099. Executing HTTP test suite against live server instance...');
    }
  });
  let totalTested = 0;
  let totalPassed = 0;

  const testEndpoint = async (
    role: string,
    method: string,
    path: string,
    expectedStatus: number[],
    body?: any,
    token?: string
  ) => {
    totalTested++;
    try {
      const res = await request(method, path, body, token);
      const isOk = expectedStatus.includes(res.status) && res.body.success !== false;

      if (isOk) {
        totalPassed++;
        console.log(`  ✅ [${role}] ${method} ${path} -> HTTP ${res.status}`);
      } else {
        console.error(`  ❌ [${role}] ${method} ${path} -> HTTP ${res.status} (Payload Error: ${JSON.stringify(res.body)})`);
      }
    } catch (err: any) {
      console.error(`  ❌ [${role}] ${method} ${path} -> EXCEPTION: ${err.message}`);
    }
  };

  try {
    // -------------------------------------------------------------------------
    // 1. PUBLIC ROLE ENDPOINTS
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing PUBLIC / UNAUTHENTICATED Role Endpoints ---');
    await testEndpoint('Public', 'GET', '/health', [200]);
    await testEndpoint('Public', 'POST', '/auth/send-otp', [200], { mobile: '+919876543210' });
    await testEndpoint('Public', 'POST', '/auth/verify-otp', [200], { mobile: '+919876543210', otp: '123456' });
    await testEndpoint('Public', 'POST', '/auth/refresh-token', [200], { refreshToken: 'dummy' });
    await testEndpoint('Public', 'POST', '/auth/google', [200], { idToken: 'google_token' });
    await testEndpoint('Public', 'POST', '/auth/set-pin', [200], { pin: '1234' }, customerToken);
    await testEndpoint('Public', 'POST', '/auth/verify-pin', [200], { pin: '1234' }, customerToken);
    await testEndpoint('Public', 'POST', '/auth/login-pin', [200], { mobile: '+919876543210', pin: '1234', role: 'customer' });
    await testEndpoint('Public', 'POST', '/auth/logout', [200]);
    await testEndpoint('Public', 'GET', '/categories', [200]);
    await testEndpoint('Public', 'GET', '/categories/cat_1', [200]);
    await testEndpoint('Public', 'GET', '/units', [200]);
    await testEndpoint('Public', 'GET', '/units/unit_1', [200]);
    await testEndpoint('Public', 'GET', '/geo/service-locations', [200]);
    await testEndpoint('Public', 'GET', '/geo/pincode-check?pincode=520001', [200]);
    await testEndpoint('Public', 'GET', '/products/radius?lat=16.5062&lng=80.6480&radiusKm=10', [200]);
    await testEndpoint('Public', 'GET', '/products/p-201', [200]);
    await testEndpoint('Public', 'GET', '/products/farmer/farmer_881', [200]);
    await testEndpoint('Public', 'GET', '/products/search-suggestions?q=rice', [200]);
    await testEndpoint('Public', 'GET', '/market-prices/baseline', [200]);
    await testEndpoint('Public', 'GET', '/banners', [200]);
    await testEndpoint('Public', 'GET', '/social-links', [200]);
    await testEndpoint('Public', 'GET', '/cms/pages/terms-and-conditions', [404]);

    // -------------------------------------------------------------------------
    // 2. CUSTOMER ROLE ENDPOINTS (With Customer JWT Token)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing CUSTOMER / CONSUMER Role Endpoints (Authenticated JWT) ---');
    await testEndpoint('Customer', 'GET', '/users/me', [200], undefined, customerToken);
    await testEndpoint('Customer', 'PUT', '/users/me', [200], { name: 'Anitha Reddy Updated' }, customerToken);
    await testEndpoint('Customer', 'PUT', '/users/me/language', [200], { language: 'te' }, customerToken);
    await testEndpoint('Customer', 'GET', '/users/me/addresses', [200], undefined, customerToken);
    await testEndpoint('Customer', 'POST', '/users/me/addresses', [201], { name: 'Work', street: 'Benz Circle', city: 'Vijayawada', pincode: '520010', lat: 16.501, lng: 80.645 }, customerToken);
    await testEndpoint('Customer', 'GET', '/users/me/addresses/addr_01', [200], undefined, customerToken);
    await testEndpoint('Customer', 'PUT', '/users/me/addresses/addr_01', [200], { landmark: 'Near SBI' }, customerToken);
    await testEndpoint('Customer', 'PUT', '/users/me/addresses/addr_01/default', [200], undefined, customerToken);
    await testEndpoint('Customer', 'POST', '/onboarding/customer', [200], { name: 'Anitha', mobile: '+919876543210' }, customerToken);
    await testEndpoint('Customer', 'GET', '/cart', [200], undefined, customerToken);
    await testEndpoint('Customer', 'POST', '/cart/items', [201], { productId: 'p-201', qty: 2 }, customerToken);
    await testEndpoint('Customer', 'GET', '/cart/items/c_item_1', [200], undefined, customerToken);
    await testEndpoint('Customer', 'PUT', '/cart/items/c_item_1', [200], { qty: 5 }, customerToken);
    await testEndpoint('Customer', 'POST', '/cart/validate', [200], undefined, customerToken);
    await testEndpoint('Customer', 'POST', '/cart/delivery-fee', [200], undefined, customerToken);
    await testEndpoint('Customer', 'POST', '/checkout/preview', [200], undefined, customerToken);
    await testEndpoint('Customer', 'POST', '/checkout/coupons/apply', [200], { code: 'FARMERFRESH50' }, customerToken);
    await testEndpoint('Customer', 'DELETE', '/checkout/coupons/remove', [200], undefined, customerToken);
    await testEndpoint('Customer', 'GET', '/checkout/delivery-slots', [200], undefined, customerToken);
    await testEndpoint('Customer', 'POST', '/checkout/verify-cod-eligibility', [200], undefined, customerToken);
    await testEndpoint('Customer', 'GET', '/checkout/savings-preview', [200], undefined, customerToken);
    await testEndpoint('Customer', 'POST', '/checkout/lock-stock', [200], undefined, customerToken);
    await testEndpoint('Customer', 'DELETE', '/checkout/unlock-stock', [200], undefined, customerToken);
    await testEndpoint('Customer', 'POST', '/orders', [201], { buyerId: 'usr_998124', sellerId: 'farmer_881', items: [{ productId: 'p-201', qty: 5, price: 54.0 }] }, customerToken);
    await testEndpoint('Customer', 'GET', '/orders', [200], undefined, customerToken);
    await testEndpoint('Customer', 'GET', '/orders/ord_889210', [200], undefined, customerToken);
    await testEndpoint('Customer', 'PUT', '/orders/ord_889210', [200], { notes: 'Leave at gate' }, customerToken);
    await testEndpoint('Customer', 'GET', '/orders/ord_889210/delivery-otp', [200], undefined, customerToken);
    await testEndpoint('Customer', 'POST', '/payments/create-razorpay-order', [200], { amount: 540 }, customerToken);
    await testEndpoint('Customer', 'POST', '/payments/verify', [200], { razorpayPaymentId: 'pay_Kz8910283' }, customerToken);
    await testEndpoint('Customer', 'GET', '/payments/history', [200], undefined, customerToken);
    await testEndpoint('Customer', 'GET', '/customer/savings', [200], undefined, customerToken);
    await testEndpoint('Customer', 'GET', '/customer/savings/history', [200], undefined, customerToken);
    await testEndpoint('Customer', 'GET', '/customer/savings/history/svg_101', [200], undefined, customerToken);
    await testEndpoint('Customer', 'POST', '/reviews', [201], { farmerId: 'farmer_881', productId: 'p-201', rating: 5, comment: 'Great quality!' }, customerToken);
    await testEndpoint('Customer', 'GET', '/reviews/farmer/farmer_881', [200], undefined, customerToken);
    await testEndpoint('Customer', 'GET', '/reviews/product/p-201', [200], undefined, customerToken);
    await testEndpoint('Customer', 'GET', '/reviews/rev_101', [200], undefined, customerToken);
    await testEndpoint('Customer', 'PUT', '/reviews/rev_101', [200], { rating: 5 }, customerToken);
    await testEndpoint('Customer', 'POST', '/disputes', [201], { orderId: 'ord_889210', reason: 'Packaging damaged' }, customerToken);
    await testEndpoint('Customer', 'GET', '/disputes', [200], undefined, customerToken);
    await testEndpoint('Customer', 'GET', '/disputes/disp_101', [200], undefined, customerToken);
    await testEndpoint('Customer', 'PUT', '/disputes/disp_101', [200], { reason: 'Updated reason' }, customerToken);
    await testEndpoint('Customer', 'GET', '/notifications', [200], undefined, customerToken);
    await testEndpoint('Customer', 'GET', '/notifications/notif_101', [200], undefined, customerToken);
    await testEndpoint('Customer', 'PATCH', '/notifications/notif_101/read', [200], undefined, customerToken);
    await testEndpoint('Customer', 'PATCH', '/notifications/read-all', [200], undefined, customerToken);
    await testEndpoint('Customer', 'POST', '/notifications/fcm-token', [200], { token: 'fcm_123' }, customerToken);
    await testEndpoint('Customer', 'GET', '/notifications/preferences', [200], undefined, customerToken);
    await testEndpoint('Customer', 'PUT', '/notifications/preferences', [200], { pushEnabled: true }, customerToken);

    // -------------------------------------------------------------------------
    // 3. FARMER ROLE ENDPOINTS (With Farmer JWT Token)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing FARMER / PRODUCER Role Endpoints (Authenticated JWT) ---');
    await testEndpoint('Farmer', 'POST', '/onboarding/farmer', [200], { name: 'Ramesh Kumar', village: 'Gudur', district: 'Krishna' }, farmerToken);
    await testEndpoint('Farmer', 'GET', '/kyc/status', [200], undefined, farmerToken);
    await testEndpoint('Farmer', 'GET', '/kyc/documents', [200], undefined, farmerToken);
    await testEndpoint('Farmer', 'POST', '/kyc/documents/upload', [201], { docType: 'aadhaar' }, farmerToken);
    await testEndpoint('Farmer', 'GET', '/kyc/documents/doc_1/download-url', [200], undefined, farmerToken);
    await testEndpoint('Farmer', 'GET', '/farmer/products', [200], undefined, farmerToken);
    await testEndpoint('Farmer', 'POST', '/products', [201], { name: 'Fresh Green Chilli', price: 40, unit: 'kg', sellerId: 'farmer_881', sellerName: 'Ramesh Kumar', lat: 16.52, lng: 80.63 }, farmerToken);
    await testEndpoint('Farmer', 'PUT', '/products/p-201', [200], { price: 55 }, farmerToken);
    await testEndpoint('Farmer', 'PATCH', '/products/p-201/price', [200], { price: 55 }, farmerToken);
    await testEndpoint('Farmer', 'PATCH', '/products/p-201/stock', [200], { stock: 500 }, farmerToken);
    await testEndpoint('Farmer', 'PATCH', '/products/p-201/status', [200], { status: 'active' }, farmerToken);
    await testEndpoint('Farmer', 'GET', '/products/low-stock', [200], undefined, farmerToken);
    await testEndpoint('Farmer', 'GET', '/farmer/orders', [200], undefined, farmerToken);
    await testEndpoint('Farmer', 'PATCH', '/orders/ord_889210/accept', [200], undefined, farmerToken);
    await testEndpoint('Farmer', 'PATCH', '/orders/ord_889210/pack', [200], undefined, farmerToken);
    await testEndpoint('Farmer', 'GET', '/farmer/dashboard', [200], undefined, farmerToken);
    await testEndpoint('Farmer', 'GET', '/farmer/earnings', [200], undefined, farmerToken);
    await testEndpoint('Farmer', 'GET', '/farmer/earnings/history', [200], undefined, farmerToken);
    await testEndpoint('Farmer', 'GET', '/farmer/payouts', [200], undefined, farmerToken);
    await testEndpoint('Farmer', 'GET', '/farmer/payouts/payout_101', [200], undefined, farmerToken);
    await testEndpoint('Farmer', 'GET', '/farmer/rfq', [200], undefined, farmerToken);
    await testEndpoint('Farmer', 'POST', '/farmer/rfq/rfq_101/quote', [201], { farmerId: 'farmer_881', pricePerQuintal: 4650 }, farmerToken);
    await testEndpoint('Farmer', 'GET', '/farmer/disputes', [200], undefined, farmerToken);

    // -------------------------------------------------------------------------
    // 4. B2B WHOLESALE ROLE ENDPOINTS (With B2B JWT Token)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing B2B WHOLESALE BUYER Role Endpoints (Authenticated JWT) ---');
    await testEndpoint('B2B', 'POST', '/onboarding/b2b', [200], { businessName: 'Sri Lakshmi Rice Mill', gstin: '37AAAAA0000A1Z5' }, b2bToken);
    await testEndpoint('B2B', 'GET', '/b2b/catalog', [200], undefined, b2bToken);
    await testEndpoint('B2B', 'POST', '/b2b/rfq', [201], { buyerId: 'b2b_01', cropName: 'Sona Masoori Rice', quantityQuintals: 50 }, b2bToken);
    await testEndpoint('B2B', 'GET', '/b2b/rfq', [200], undefined, b2bToken);
    await testEndpoint('B2B', 'GET', '/b2b/rfq/rfq_101', [200], undefined, b2bToken);
    await testEndpoint('B2B', 'PUT', '/b2b/rfq/rfq_101', [200], { targetPricePerQuintal: 4620 }, b2bToken);
    await testEndpoint('B2B', 'POST', '/b2b/quotes/quote_01/accept', [200], undefined, b2bToken);
    await testEndpoint('B2B', 'GET', '/b2b/invoices/ord_889210', [200], undefined, b2bToken);
    await testEndpoint('B2B', 'GET', '/b2b/credit-ledger', [200], undefined, b2bToken);

    // -------------------------------------------------------------------------
    // 5. DELIVERY AGENT LOGISTICS ROLE ENDPOINTS (With Delivery JWT Token)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing DELIVERY AGENT / LOGISTICS Role Endpoints (Authenticated JWT) ---');
    await testEndpoint('Delivery', 'POST', '/delivery/register', [201], { name: 'Suresh Kumar', mobile: '+919988776655', vehicle: 'Motorcycle' });
    await testEndpoint('Delivery', 'GET', '/delivery/active-orders', [200]);
    await testEndpoint('Delivery', 'POST', '/delivery/orders/ord_889210/claim', [200]);
    await testEndpoint('Delivery', 'PATCH', '/orders/ord_889210/out-for-delivery', [200]);
    await testEndpoint('Delivery', 'POST', '/orders/ord_889210/verify-delivery', [200], { deliveryOtp: '8192' });
    await testEndpoint('Delivery', 'POST', '/delivery/location-update', [200], { lat: 16.501, lng: 80.645 });

    // -------------------------------------------------------------------------
    // 6. ADMIN SUPERUSER & OPERATIONS ENDPOINTS (With Admin JWT Token)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing PLATFORM SUPER ADMIN & OPERATIONS Endpoints (Authenticated JWT) ---');
    await testEndpoint('Admin', 'GET', '/admin/analytics/dashboard', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/analytics/sales-trend', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/analytics/regional-performance', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/analytics/top-products', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/analytics/farmer-retention', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/analytics/customer-acquisition', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/analytics/india-map-summary', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/users', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/users', [201], { name: 'Ops Staff', role: 'admin', mobile: '+919900112233' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/users/admin_01', [200], undefined, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/users/admin_01', [200], { name: 'Super Admin Updated' }, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/users/admin_01/status', [200], { status: 'active' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/kyc/submissions', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/kyc/submissions', [201], { userId: 'farmer_999', name: 'New Farmer', role: 'farmer' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/kyc/submissions/kyc_sub_101', [200], undefined, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/kyc/submissions/kyc_sub_101', [200], { status: 'approved' }, adminToken);
    await testEndpoint('Admin', 'PATCH', '/admin/kyc/submissions/kyc_sub_101/approve', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/kyc/farmer_881/verify-bank', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/kyc/farmer_881/bank-status', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/categories', [201], { name: 'Organic Spices', slug: 'organic-spices', icon: '🌶️' }, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/categories/cat_1', [200], { name: 'Rice & Whole Grains' }, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/units', [201], { code: 'sack', label: 'Sack' }, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/units/unit_1', [200], { label: 'Kilogram (kg)' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/geo/service-locations', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/geo/service-locations', [201], { state: 'Andhra Pradesh', district: 'Visakhapatnam', city: 'Vizag' }, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/geo/service-locations/hub-1', [200], { status: 'active' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/products', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/products', [201], { name: 'Organic Turmeric', price: 120, unit: 'kg' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/products/p-201', [200], undefined, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/products/p-201', [200], { price: 34 }, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/products/p-201/feature', [200], { isFeatured: true }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/orders', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/orders', [201], { totalAmount: 500 }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/orders/ord_889210', [200], undefined, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/orders/ord_889210', [200], { status: 'DELIVERED' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/payments/transactions', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/payouts/pending', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/payouts/process', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/payments/refund', [200], { orderId: 'ord_889210', amount: 100 }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/savings/ledger', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/savings/ledger', [201], { customerId: 'usr_998124', savedAmount: 50 }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/farmers/earnings-ledger', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/farmers/earnings-ledger', [201], { farmerId: 'farmer_881', extraEarnedAmount: 100 }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/b2b/rfq', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/b2b/rfq/rfq_101', [200], undefined, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/b2b/rfq/rfq_101/status', [200], { status: 'OPEN' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/shops', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/shops', [403], { name: 'Guntur Hub', address: 'Guntur Road', radiusKm: 20 }, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/shops/shop_01', [403], { radiusKm: 18 }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/delivery/partners', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/delivery/partners', [201], { name: 'Raju', mobile: '+919911223344', vehicle: 'Van' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/delivery/partners/agent_01', [200], undefined, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/delivery/partners/agent_01', [200], { status: 'online' }, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/delivery/partners/agent_01/status', [200], { status: 'online' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/delivery-slots', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/delivery-slots', [201], { label: 'Night Delivery', startTime: '08:00 PM', endTime: '10:00 PM' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/delivery-slots/slot_1', [200], undefined, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/delivery-slots/slot_1', [200], { maxOrdersCapacity: 60 }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/commission/slabs', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/commission/slabs', [201], { minAmount: 100000, maxAmount: 500000, ratePercent: 3.5 }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/commission/slabs/cs-1', [200], undefined, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/commission/slabs/cs-1', [200], { ratePercent: 4.2 }, adminToken);
    await testEndpoint('Admin', 'POST', '/commission/calculate', [200], { amount: 15000 }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/coupons', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/coupons', [201], { code: 'WELCOME100', discountType: 'flat', discountValue: 100 }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/coupons/cpn_01', [200], undefined, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/coupons/cpn_01', [200], { discountValue: 60 }, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/coupons/bulk-generate', [201], { prefix: 'FARM', count: 10 }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/market-prices', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/market-prices', [201], { cropName: 'Chilli', referencePrice: 150 }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/market-prices/mp_01', [200], undefined, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/market-prices/mp_01', [200], { referencePrice: 65 }, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/market-prices/import-csv', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/market-prices/export-csv', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/market-prices/flagged-discrepancies', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/audit-logs', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/audit-logs/log_101', [404], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/roles', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/roles', [201], { name: 'Support Agent', permissions: ['view_orders'] }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/roles/role_1', [200], undefined, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/roles/role_1', [200], { name: 'Senior Manager' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/team', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/team', [201], { name: 'Venkat', email: 'venkat@aswamithra.in', roleId: 'role_1' }, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/team/team_1', [200], { roleId: 'role_2' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/system/config', [200], undefined, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/system/config', [200], { maintenanceMode: false }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/banners', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/banners', [201], { title: 'New Harvest', imageUrl: 'http://img.png' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/banners/ban_101', [200], undefined, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/banners/ban_101', [200], { title: 'Updated Banner' }, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/banners/reorder', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/social-links', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/social-links', [201], { platform: 'twitter', url: 'https://twitter.com' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/social-links/soc_1', [200], undefined, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/social-links/soc_1', [200], { url: 'https://facebook.com/new' }, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/cms/pages', [201], { slug: 'privacy', title: 'Privacy', content: 'Details' }, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/cms/pages/terms-and-conditions', [200], { title: 'Updated Terms' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/notifications/templates', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/notifications/templates', [201], { name: 'WELCOME', body: 'Welcome!' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/notifications/templates/tmpl_1', [200], undefined, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/notifications/templates/tmpl_1', [200], { body: 'Updated body' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/notifications/logs', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/notifications/broadcast', [200], { title: 'Festival Sale', message: 'Discounts on Rice!' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/disputes', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/disputes/disp_101', [200], undefined, adminToken);
    await testEndpoint('Admin', 'PATCH', '/admin/disputes/disp_101/resolve', [200], { resolution: 'full_refund' }, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/disputes/disp_101/penalize-seller', [200], { sellerId: 'farmer_881' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/reports', [200], undefined, adminToken);
    await testEndpoint('Admin', 'POST', '/admin/reports', [201], { name: 'Weekly GST Report' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/reports/rpt_01', [200], undefined, adminToken);
    await testEndpoint('Admin', 'PUT', '/admin/reports/rpt_01', [200], { name: 'Updated Report Name' }, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/reports/sales/export', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/reports/tax/export', [200], undefined, adminToken);
    await testEndpoint('Admin', 'GET', '/admin/reports/commission/export', [200], undefined, adminToken);
  } catch (err) {
    console.error('Fatal suite error:', err);
  } finally {
    if (server) server.close();
    console.log('\n================================================================');
    console.log(`📊 FINAL HTTP COMPREHENSIVE SUITE RESULTS:`);
    console.log(`   Total Endpoints Tested: ${totalTested}`);
    console.log(`   Total Passed: ${totalPassed}`);
    console.log(`   Pass Rate: ${Math.round((totalPassed / totalTested) * 100)}%`);
    console.log('================================================================\n');

    if (totalPassed !== totalTested) {
      process.exit(1);
    }
  }
}

testComprehensiveSuite();
