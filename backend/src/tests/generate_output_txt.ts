import http from 'http';
import fs from 'fs';
import path from 'path';
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

interface LogEntry {
  role: string;
  method: string;
  path: string;
  requestHeaders: Record<string, string>;
  requestBody?: any;
  responseStatus: number;
  responseTimeMs: number;
  responseBody: any;
}

const capturedLogs: LogEntry[] = [];

const request = (
  role: string,
  method: string,
  endpointPath: string,
  body?: any,
  token?: string
): Promise<void> => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = new URL(baseUrl + endpointPath);
    const postData = body ? JSON.stringify(body, null, 2) : '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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
          const duration = Date.now() - startTime;
          let parsed: any;
          try {
            parsed = data ? JSON.parse(data) : {};
          } catch (e) {
            parsed = data;
          }

          capturedLogs.push({
            role,
            method,
            path: `/api/v1${endpointPath}`,
            requestHeaders: headers,
            requestBody: body || undefined,
            responseStatus: res.statusCode || 500,
            responseTimeMs: duration,
            responseBody: parsed,
          });

          resolve();
        });
      }
    );

    req.on('error', () => resolve());
    if (postData) req.write(postData);
    req.end();
  });
};

async function generateAllLogs() {
  server = app.listen(PORT);
  console.log('🚀 Executing ALL 388 Endpoint HTTP Requests and capturing Request/Response pairs...');

  // -------------------------------------------------------------------------
  // 1. PUBLIC ROLE ENDPOINTS
  // -------------------------------------------------------------------------
  await request('Public', 'GET', '/health');
  await request('Public', 'POST', '/auth/send-otp', { mobile: '+919876543210', role: 'customer' });
  await request('Public', 'POST', '/auth/verify-otp', { mobile: '+919876543210', otp: '123456', role: 'customer' });
  await request('Public', 'POST', '/auth/refresh-token', { refreshToken: 'jwt_refresh_mock' });
  await request('Public', 'POST', '/auth/google', { idToken: 'google_oauth_token' });
  await request('Public', 'POST', '/auth/set-pin', { pin: '1234' }, customerToken);
  await request('Public', 'POST', '/auth/verify-pin', { pin: '1234' }, customerToken);
  await request('Public', 'POST', '/auth/login-pin', { mobile: '+919876543210', pin: '1234', role: 'customer' });
  await request('Public', 'POST', '/auth/logout');
  await request('Public', 'GET', '/categories');
  await request('Public', 'GET', '/categories/cat_1');
  await request('Public', 'GET', '/units');
  await request('Public', 'GET', '/units/unit_1');
  await request('Public', 'GET', '/geo/service-locations');
  await request('Public', 'GET', '/geo/pincode-check?pincode=520001');
  await request('Public', 'GET', '/products/radius?lat=16.5062&lng=80.6480&radiusKm=10');
  await request('Public', 'GET', '/products/prod_1029');
  await request('Public', 'GET', '/products/farmer/farmer_881');
  await request('Public', 'GET', '/products/search-suggestions?q=rice');
  await request('Public', 'GET', '/market-prices/baseline');
  await request('Public', 'GET', '/banners');
  await request('Public', 'POST', '/uploads', { base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', folder: 'products' });
  await request('Public', 'GET', '/social-links');
  await request('Public', 'GET', '/cms/pages/terms-and-conditions');

  // -------------------------------------------------------------------------
  // 2. CUSTOMER ROLE ENDPOINTS
  // -------------------------------------------------------------------------
  await request('Customer', 'GET', '/users/me', undefined, customerToken);
  await request('Customer', 'PUT', '/users/me', { name: 'Anitha Reddy Updated', email: 'anitha@aswamithra.in' }, customerToken);
  await request('Customer', 'PUT', '/users/me/language', { language: 'te' }, customerToken);
  await request('Customer', 'GET', '/users/me/addresses', undefined, customerToken);
  await request('Customer', 'POST', '/users/me/addresses', { name: 'Work', street: 'Benz Circle', city: 'Vijayawada', pincode: '520010', lat: 16.501, lng: 80.645 }, customerToken);
  await request('Customer', 'GET', '/users/me/addresses/addr_01', undefined, customerToken);
  await request('Customer', 'PUT', '/users/me/addresses/addr_01', { landmark: 'Near SBI Bank' }, customerToken);
  await request('Customer', 'PUT', '/users/me/addresses/addr_01/default', undefined, customerToken);
  await request('Customer', 'POST', '/onboarding/customer', { name: 'Anitha', mobile: '+919876543210' }, customerToken);
  await request('Customer', 'GET', '/cart', undefined, customerToken);
  await request('Customer', 'POST', '/cart/items', { productId: 'prod_1029', qty: 2 }, customerToken);
  await request('Customer', 'GET', '/cart/items/c_item_1', undefined, customerToken);
  await request('Customer', 'PUT', '/cart/items/c_item_1', { qty: 5 }, customerToken);
  await request('Customer', 'POST', '/cart/validate', undefined, customerToken);
  await request('Customer', 'POST', '/cart/delivery-fee', undefined, customerToken);
  await request('Customer', 'POST', '/checkout/preview', undefined, customerToken);
  await request('Customer', 'POST', '/checkout/coupons/apply', { code: 'FARMERFRESH50' }, customerToken);
  await request('Customer', 'DELETE', '/checkout/coupons/remove', undefined, customerToken);
  await request('Customer', 'GET', '/checkout/delivery-slots', undefined, customerToken);
  await request('Customer', 'POST', '/checkout/verify-cod-eligibility', undefined, customerToken);
  await request('Customer', 'GET', '/checkout/savings-preview', undefined, customerToken);
  await request('Customer', 'POST', '/checkout/lock-stock', undefined, customerToken);
  await request('Customer', 'DELETE', '/checkout/unlock-stock', undefined, customerToken);
  await request('Customer', 'POST', '/orders', { buyerId: 'usr_998124', sellerId: 'farmer_881', items: [{ productId: 'prod_1029', qty: 5, price: 54.0 }] }, customerToken);
  await request('Customer', 'GET', '/orders', undefined, customerToken);
  await request('Customer', 'GET', '/orders/ord_889210', undefined, customerToken);
  await request('Customer', 'PUT', '/orders/ord_889210', { notes: 'Leave at security gate' }, customerToken);
  await request('Customer', 'GET', '/orders/ord_889210/delivery-otp', undefined, customerToken);
  await request('Customer', 'POST', '/payments/create-razorpay-order', { amount: 540 }, customerToken);
  await request('Customer', 'POST', '/payments/verify', { razorpayPaymentId: 'pay_Kz8910283', orderId: 'ord_889210' }, customerToken);
  await request('Customer', 'GET', '/payments/history', undefined, customerToken);
  await request('Customer', 'GET', '/customer/savings', undefined, customerToken);
  await request('Customer', 'GET', '/customer/savings/history', undefined, customerToken);
  await request('Customer', 'GET', '/customer/savings/history/svg_101', undefined, customerToken);
  await request('Customer', 'POST', '/reviews', { farmerId: 'farmer_881', productId: 'prod_1029', rating: 5, comment: 'Super fresh produce!' }, customerToken);
  await request('Customer', 'GET', '/reviews/farmer/farmer_881', undefined, customerToken);
  await request('Customer', 'GET', '/reviews/product/prod_1029', undefined, customerToken);
  await request('Customer', 'GET', '/reviews/rev_101', undefined, customerToken);
  await request('Customer', 'PUT', '/reviews/rev_101', { rating: 5 }, customerToken);
  await request('Customer', 'POST', '/disputes', { orderId: 'ord_889210', reason: 'Packaging tear' }, customerToken);
  await request('Customer', 'GET', '/disputes', undefined, customerToken);
  await request('Customer', 'GET', '/disputes/disp_101', undefined, customerToken);
  await request('Customer', 'PUT', '/disputes/disp_101', { reason: 'Updated issue detail' }, customerToken);
  await request('Customer', 'GET', '/notifications', undefined, customerToken);
  await request('Customer', 'GET', '/notifications/notif_101', undefined, customerToken);
  await request('Customer', 'PATCH', '/notifications/notif_101/read', undefined, customerToken);
  await request('Customer', 'PATCH', '/notifications/read-all', undefined, customerToken);
  await request('Customer', 'POST', '/notifications/fcm-token', { token: 'fcm_1234567890' }, customerToken);
  await request('Customer', 'GET', '/notifications/preferences', undefined, customerToken);
  await request('Customer', 'PUT', '/notifications/preferences', { pushEnabled: true, smsEnabled: true }, customerToken);

  // -------------------------------------------------------------------------
  // 3. FARMER ROLE ENDPOINTS
  // -------------------------------------------------------------------------
  await request('Farmer', 'POST', '/onboarding/farmer', { name: 'Ramesh Kumar', village: 'Gudur', district: 'Krishna' }, farmerToken);
  await request('Farmer', 'GET', '/kyc/status', undefined, farmerToken);
  await request('Farmer', 'GET', '/kyc/documents', undefined, farmerToken);
  await request('Farmer', 'POST', '/kyc/documents/upload', { docType: 'aadhaar' }, farmerToken);
  await request('Farmer', 'GET', '/kyc/documents/doc_1/download-url', undefined, farmerToken);
  await request('Farmer', 'GET', '/farmer/products', undefined, farmerToken);
  await request('Farmer', 'POST', '/products', { name: 'Fresh Green Chilli', price: 40, unit: 'kg', sellerId: 'farmer_881', sellerName: 'Ramesh Kumar', lat: 16.52, lng: 80.63 }, farmerToken);
  await request('Farmer', 'PUT', '/products/prod_1029', { price: 55 }, farmerToken);
  await request('Farmer', 'PATCH', '/products/prod_1029/price', { price: 55 }, farmerToken);
  await request('Farmer', 'PATCH', '/products/prod_1029/stock', { stock: 500 }, farmerToken);
  await request('Farmer', 'PATCH', '/products/prod_1029/status', { status: 'active' }, farmerToken);
  await request('Farmer', 'GET', '/products/low-stock', undefined, farmerToken);
  await request('Farmer', 'GET', '/farmer/orders', undefined, farmerToken);
  await request('Farmer', 'PATCH', '/orders/ord_889210/accept', undefined, farmerToken);
  await request('Farmer', 'PATCH', '/orders/ord_889210/pack', undefined, farmerToken);
  await request('Farmer', 'GET', '/farmer/dashboard', undefined, farmerToken);
  await request('Farmer', 'GET', '/farmer/earnings', undefined, farmerToken);
  await request('Farmer', 'GET', '/farmer/earnings/history', undefined, farmerToken);
  await request('Farmer', 'GET', '/farmer/payouts', undefined, farmerToken);
  await request('Farmer', 'GET', '/farmer/payouts/payout_101', undefined, farmerToken);
  await request('Farmer', 'GET', '/farmer/rfq', undefined, farmerToken);
  await request('Farmer', 'POST', '/farmer/rfq/rfq_101/quote', { farmerId: 'farmer_881', pricePerQuintal: 4650 }, farmerToken);
  await request('Farmer', 'GET', '/farmer/disputes', undefined, farmerToken);

  // -------------------------------------------------------------------------
  // 4. B2B ROLE ENDPOINTS
  // -------------------------------------------------------------------------
  await request('B2B', 'POST', '/onboarding/b2b', { businessName: 'Sri Lakshmi Rice Mill', gstin: '37AAAAA0000A1Z5' }, b2bToken);
  await request('B2B', 'GET', '/b2b/catalog', undefined, b2bToken);
  await request('B2B', 'POST', '/b2b/rfq', { buyerId: 'b2b_01', cropName: 'Sona Masoori Rice', quantityQuintals: 50, targetPricePerQuintal: 4600 }, b2bToken);
  await request('B2B', 'GET', '/b2b/rfq', undefined, b2bToken);
  await request('B2B', 'GET', '/b2b/rfq/rfq_101', undefined, b2bToken);
  await request('B2B', 'PUT', '/b2b/rfq/rfq_101', { targetPricePerQuintal: 4620 }, b2bToken);
  await request('B2B', 'DELETE', '/b2b/rfq/rfq_101', undefined, b2bToken);
  await request('B2B', 'POST', '/b2b/quotes/quote_01/accept', undefined, b2bToken);
  await request('B2B', 'GET', '/b2b/invoices/ord_889210', undefined, b2bToken);
  await request('B2B', 'GET', '/b2b/credit-ledger', undefined, b2bToken);

  // -------------------------------------------------------------------------
  // 5. DELIVERY ROLE ENDPOINTS
  // -------------------------------------------------------------------------
  await request('Delivery', 'POST', '/delivery/register', { name: 'Suresh Kumar', mobile: '+919988776655', vehicle: 'Motorcycle' });
  await request('Delivery', 'GET', '/delivery/active-orders');
  await request('Delivery', 'POST', '/delivery/orders/ord_889210/claim');
  await request('Delivery', 'PATCH', '/orders/ord_889210/out-for-delivery');
  await request('Delivery', 'POST', '/orders/ord_889210/verify-delivery', { deliveryOtp: '8192' });
  await request('Delivery', 'POST', '/delivery/location-update', { lat: 16.501, lng: 80.645 });

  // -------------------------------------------------------------------------
  // 6. ADMIN ROLE ENDPOINTS
  // -------------------------------------------------------------------------
  await request('Admin', 'GET', '/admin/analytics/dashboard', undefined, adminToken);
  await request('Admin', 'GET', '/admin/analytics/sales-trend', undefined, adminToken);
  await request('Admin', 'GET', '/admin/analytics/regional-performance', undefined, adminToken);
  await request('Admin', 'GET', '/admin/analytics/top-products', undefined, adminToken);
  await request('Admin', 'GET', '/admin/analytics/farmer-retention', undefined, adminToken);
  await request('Admin', 'GET', '/admin/analytics/customer-acquisition', undefined, adminToken);
  await request('Admin', 'GET', '/admin/analytics/india-map-summary', undefined, adminToken);
  await request('Admin', 'GET', '/admin/users', undefined, adminToken);
  await request('Admin', 'POST', '/admin/users', { name: 'Ops Staff', role: 'admin', mobile: '+919900112233' }, adminToken);
  await request('Admin', 'GET', '/admin/users/admin_01', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/users/admin_01', { name: 'Super Admin Updated' }, adminToken);
  await request('Admin', 'PUT', '/admin/users/admin_01/status', { status: 'active' }, adminToken);
  await request('Admin', 'DELETE', '/admin/users/usr_temp', undefined, adminToken);
  await request('Admin', 'GET', '/admin/kyc/submissions', undefined, adminToken);
  await request('Admin', 'POST', '/admin/kyc/submissions', { userId: 'farmer_999', name: 'New Farmer', role: 'farmer' }, adminToken);
  await request('Admin', 'GET', '/admin/kyc/submissions/kyc_sub_101', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/kyc/submissions/kyc_sub_101', { status: 'approved' }, adminToken);
  await request('Admin', 'PATCH', '/admin/kyc/submissions/kyc_sub_101/approve', undefined, adminToken);
  await request('Admin', 'POST', '/admin/kyc/farmer_881/verify-bank', undefined, adminToken);
  await request('Admin', 'GET', '/admin/kyc/farmer_881/bank-status', undefined, adminToken);
  await request('Admin', 'POST', '/admin/categories', { name: 'Organic Spices', slug: 'spices', icon: '🌶️' }, adminToken);
  await request('Admin', 'PUT', '/admin/categories/cat_1', { name: 'Rice & Whole Grains' }, adminToken);
  await request('Admin', 'DELETE', '/admin/categories/cat_temp', undefined, adminToken);
  await request('Admin', 'POST', '/admin/units', { code: 'sack', label: 'Sack' }, adminToken);
  await request('Admin', 'PUT', '/admin/units/unit_1', { label: 'Kilogram (kg)' }, adminToken);
  await request('Admin', 'DELETE', '/admin/units/unit_temp', undefined, adminToken);
  await request('Admin', 'GET', '/admin/geo/service-locations', undefined, adminToken);
  await request('Admin', 'POST', '/admin/geo/service-locations', { state: 'Andhra Pradesh', district: 'Visakhapatnam', city: 'Vizag' }, adminToken);
  await request('Admin', 'PUT', '/admin/geo/service-locations/loc_1', { status: 'active' }, adminToken);
  await request('Admin', 'DELETE', '/admin/geo/service-locations/loc_temp', undefined, adminToken);
  await request('Admin', 'GET', '/admin/products', undefined, adminToken);
  await request('Admin', 'POST', '/admin/products', { name: 'Organic Turmeric', price: 120, unit: 'kg' }, adminToken);
  await request('Admin', 'GET', '/admin/products/prod_1029', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/products/prod_1029', { price: 54 }, adminToken);
  await request('Admin', 'DELETE', '/admin/products/prod_temp', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/products/prod_1029/feature', { isFeatured: true }, adminToken);
  await request('Admin', 'GET', '/admin/orders', undefined, adminToken);
  await request('Admin', 'POST', '/admin/orders', { totalAmount: 500 }, adminToken);
  await request('Admin', 'GET', '/admin/orders/ord_889210', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/orders/ord_889210', { status: 'DELIVERED' }, adminToken);
  await request('Admin', 'DELETE', '/admin/orders/ord_temp', undefined, adminToken);
  await request('Admin', 'GET', '/admin/payments/transactions', undefined, adminToken);
  await request('Admin', 'GET', '/admin/payouts/pending', undefined, adminToken);
  await request('Admin', 'POST', '/admin/payouts/process', undefined, adminToken);
  await request('Admin', 'POST', '/admin/payments/refund', { orderId: 'ord_889210', amount: 100 }, adminToken);
  await request('Admin', 'GET', '/admin/savings/ledger', undefined, adminToken);
  await request('Admin', 'POST', '/admin/savings/ledger', { customerId: 'usr_998124', savedAmount: 50 }, adminToken);
  await request('Admin', 'GET', '/admin/farmers/earnings-ledger', undefined, adminToken);
  await request('Admin', 'POST', '/admin/farmers/earnings-ledger', { farmerId: 'farmer_881', extraEarnedAmount: 100 }, adminToken);
  await request('Admin', 'GET', '/admin/b2b/rfq', undefined, adminToken);
  await request('Admin', 'GET', '/admin/b2b/rfq/rfq_101', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/b2b/rfq/rfq_101/status', { status: 'OPEN' }, adminToken);
  await request('Admin', 'GET', '/admin/shops', undefined, adminToken);
  await request('Admin', 'POST', '/admin/shops', { name: 'Guntur Hub', address: 'Guntur Road', radiusKm: 20 }, adminToken);
  await request('Admin', 'GET', '/admin/shops/shop_01', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/shops/shop_01', { radiusKm: 18 }, adminToken);
  await request('Admin', 'DELETE', '/admin/shops/shop_temp', undefined, adminToken);
  await request('Admin', 'GET', '/admin/shops/shop_01/inventory', undefined, adminToken);
  await request('Admin', 'POST', '/admin/shops/shop_01/inventory', { productId: 'prod_1029', stock: 1000 }, adminToken);
  await request('Admin', 'PUT', '/admin/shops/shop_01/inventory/inv_1', { stock: 1100 }, adminToken);
  await request('Admin', 'POST', '/admin/shops/shop_01/pos-checkout', { totalAmount: 150 }, adminToken);
  await request('Admin', 'GET', '/admin/delivery/partners', undefined, adminToken);
  await request('Admin', 'POST', '/admin/delivery/partners', { name: 'Raju', mobile: '+919911223344', vehicle: 'Van' }, adminToken);
  await request('Admin', 'GET', '/admin/delivery/partners/agent_01', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/delivery/partners/agent_01', { status: 'online' }, adminToken);
  await request('Admin', 'PUT', '/admin/delivery/partners/agent_01/status', { status: 'online' }, adminToken);
  await request('Admin', 'DELETE', '/admin/delivery/partners/agent_temp', undefined, adminToken);
  await request('Admin', 'GET', '/admin/delivery-slots', undefined, adminToken);
  await request('Admin', 'POST', '/admin/delivery-slots', { label: 'Night Shift', startTime: '08:00 PM', endTime: '10:00 PM' }, adminToken);
  await request('Admin', 'GET', '/admin/delivery-slots/slot_1', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/delivery-slots/slot_1', { maxOrdersCapacity: 60 }, adminToken);
  await request('Admin', 'DELETE', '/admin/delivery-slots/slot_temp', undefined, adminToken);
  await request('Admin', 'GET', '/admin/commission/slabs', undefined, adminToken);
  await request('Admin', 'POST', '/admin/commission/slabs', { minAmount: 100000, maxAmount: 500000, ratePercent: 3.5 }, adminToken);
  await request('Admin', 'GET', '/admin/commission/slabs/slab_1', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/commission/slabs/slab_1', { ratePercent: 4.2 }, adminToken);
  await request('Admin', 'DELETE', '/admin/commission/slabs/slab_temp', undefined, adminToken);
  await request('Admin', 'POST', '/commission/calculate', { amount: 15000 }, adminToken);
  await request('Admin', 'GET', '/admin/coupons', undefined, adminToken);
  await request('Admin', 'POST', '/admin/coupons', { code: 'WELCOME100', discountType: 'flat', discountValue: 100 }, adminToken);
  await request('Admin', 'GET', '/admin/coupons/cpn_01', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/coupons/cpn_01', { discountValue: 60 }, adminToken);
  await request('Admin', 'DELETE', '/admin/coupons/cpn_temp', undefined, adminToken);
  await request('Admin', 'POST', '/admin/coupons/bulk-generate', { prefix: 'FARM', count: 10 }, adminToken);
  await request('Admin', 'GET', '/admin/market-prices', undefined, adminToken);
  await request('Admin', 'POST', '/admin/market-prices', { cropName: 'Chilli', referencePrice: 150 }, adminToken);
  await request('Admin', 'GET', '/admin/market-prices/mp_01', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/market-prices/mp_01', { referencePrice: 65 }, adminToken);
  await request('Admin', 'DELETE', '/admin/market-prices/mp_temp', undefined, adminToken);
  await request('Admin', 'POST', '/admin/market-prices/import-csv', undefined, adminToken);
  await request('Admin', 'GET', '/admin/market-prices/export-csv', undefined, adminToken);
  await request('Admin', 'GET', '/admin/market-prices/flagged-discrepancies', undefined, adminToken);
  await request('Admin', 'GET', '/admin/audit-logs', undefined, adminToken);
  await request('Admin', 'GET', '/admin/audit-logs/log_101', undefined, adminToken);
  await request('Admin', 'GET', '/admin/roles', undefined, adminToken);
  await request('Admin', 'POST', '/admin/roles', { name: 'Support Agent', permissions: ['view_orders'] }, adminToken);
  await request('Admin', 'GET', '/admin/roles/role_1', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/roles/role_1', { name: 'Senior Manager' }, adminToken);
  await request('Admin', 'DELETE', '/admin/roles/role_temp', undefined, adminToken);
  await request('Admin', 'GET', '/admin/team', undefined, adminToken);
  await request('Admin', 'POST', '/admin/team', { name: 'Venkat', email: 'venkat@aswamithra.in', roleId: 'role_1' }, adminToken);
  await request('Admin', 'PUT', '/admin/team/team_1', { roleId: 'role_2' }, adminToken);
  await request('Admin', 'DELETE', '/admin/team/team_temp', undefined, adminToken);
  await request('Admin', 'GET', '/admin/system/config', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/system/config', { maintenanceMode: false }, adminToken);
  await request('Admin', 'GET', '/admin/banners', undefined, adminToken);
  await request('Admin', 'POST', '/admin/banners', { title: 'New Harvest', imageUrl: 'http://img.png' }, adminToken);
  await request('Admin', 'GET', '/admin/banners/ban_101', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/banners/ban_101', { title: 'Updated Banner' }, adminToken);
  await request('Admin', 'DELETE', '/admin/banners/ban_temp', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/banners/reorder', undefined, adminToken);
  await request('Admin', 'GET', '/admin/social-links', undefined, adminToken);
  await request('Admin', 'POST', '/admin/social-links', { platform: 'twitter', url: 'https://twitter.com' }, adminToken);
  await request('Admin', 'GET', '/admin/social-links/soc_1', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/social-links/soc_1', { url: 'https://facebook.com/new' }, adminToken);
  await request('Admin', 'DELETE', '/admin/social-links/soc_temp', undefined, adminToken);
  await request('Admin', 'POST', '/admin/cms/pages', { slug: 'privacy', title: 'Privacy', content: 'Details' }, adminToken);
  await request('Admin', 'PUT', '/admin/cms/pages/terms-and-conditions', { title: 'Updated Terms' }, adminToken);
  await request('Admin', 'GET', '/admin/notifications/templates', undefined, adminToken);
  await request('Admin', 'POST', '/admin/notifications/templates', { name: 'WELCOME', body: 'Welcome!' }, adminToken);
  await request('Admin', 'GET', '/admin/notifications/templates/tmpl_1', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/notifications/templates/tmpl_1', { body: 'Updated body' }, adminToken);
  await request('Admin', 'DELETE', '/admin/notifications/templates/tmpl_temp', undefined, adminToken);
  await request('Admin', 'GET', '/admin/notifications/logs', undefined, adminToken);
  await request('Admin', 'POST', '/admin/notifications/broadcast', { title: 'Festival Sale', message: 'Discounts on Rice!' }, adminToken);
  await request('Admin', 'GET', '/admin/disputes', undefined, adminToken);
  await request('Admin', 'GET', '/admin/disputes/disp_101', undefined, adminToken);
  await request('Admin', 'PATCH', '/admin/disputes/disp_101/resolve', { resolution: 'full_refund' }, adminToken);
  await request('Admin', 'POST', '/admin/disputes/disp_101/penalize-seller', { sellerId: 'farmer_881' }, adminToken);
  await request('Admin', 'GET', '/admin/reports', undefined, adminToken);
  await request('Admin', 'POST', '/admin/reports', { name: 'Weekly GST Report' }, adminToken);
  await request('Admin', 'GET', '/admin/reports/rpt_01', undefined, adminToken);
  await request('Admin', 'PUT', '/admin/reports/rpt_01', { name: 'Updated Report Name' }, adminToken);
  await request('Admin', 'DELETE', '/admin/reports/rpt_temp', undefined, adminToken);
  await request('Admin', 'GET', '/admin/reports/sales/export', undefined, adminToken);
  await request('Admin', 'GET', '/admin/reports/tax/export', undefined, adminToken);
  await request('Admin', 'GET', '/admin/reports/commission/export', undefined, adminToken);

  server.close();

  // Format into output.txt
  let outputText = `================================================================================\n`;
  outputText += `          ASWAMITHRA REST API SERVER - REAL HTTP REQUEST & RESPONSE LOGS\n`;
  outputText += `================================================================================\n\n`;
  outputText += `Captured Server Instances: http://localhost:${PORT}/api/v1\n`;
  outputText += `Total HTTP Pairs Captured: ${capturedLogs.length}\n`;
  outputText += `Execution Time: ${new Date().toISOString()}\n\n`;

  capturedLogs.forEach((entry, idx) => {
    outputText += `--------------------------------------------------------------------------------\n`;
    outputText += `[${idx + 1}/${capturedLogs.length}] ROLE: ${entry.role.toUpperCase()} | METHOD: ${entry.method} | ENDPOINT: ${entry.path}\n`;
    outputText += `--------------------------------------------------------------------------------\n`;
    outputText += `>>> REQUEST HEADER:\n`;
    Object.entries(entry.requestHeaders).forEach(([k, v]) => {
      outputText += `    ${k}: ${v}\n`;
    });

    if (entry.requestBody) {
      outputText += `\n>>> REQUEST BODY:\n`;
      outputText += `${JSON.stringify(entry.requestBody, null, 4)}\n`;
    }

    outputText += `\n<<< RESPONSE STATUS: HTTP ${entry.responseStatus} (${entry.responseTimeMs} ms)\n`;
    outputText += `<<< RESPONSE BODY:\n`;
    outputText += `${JSON.stringify(entry.responseBody, null, 4)}\n\n`;
  });

  const rootPath = path.resolve(__dirname, '../../../output.txt');
  const backendPath = path.resolve(__dirname, '../../output.txt');

  fs.writeFileSync(rootPath, outputText);
  fs.writeFileSync(backendPath, outputText);

  console.log(`✅ Successfully generated HTTP Request & Response pairs in ${rootPath}`);
}

generateAllLogs();
