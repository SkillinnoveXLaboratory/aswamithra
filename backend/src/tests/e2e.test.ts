import http from 'http';
import app from '../app';

const PORT = 3099;
let server: http.Server;

const baseUrl = `http://localhost:${PORT}/api/v1`;

const request = (
  method: string,
  path: string,
  body?: any
): Promise<{ status: number; body: any }> => {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const postData = body ? JSON.stringify(body) : '';

    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
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

async function runE2ETests() {
  console.log('\n=======================================================');
  console.log('🧪 Running Aswamithra E2E Server Integration Test Suite');
  console.log('=======================================================\n');

  server = app.listen(PORT);
  let totalTests = 0;
  let passedTests = 0;

  const assert = (condition: boolean, testName: string) => {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
    }
  };

  try {
    // 1. Health Check
    const health = await request('GET', '/health');
    assert(health.status === 200 && health.body.success === true, '1. Server Health Check GET /api/v1/health');

    // 2. Auth Flow
    const sendOtp = await request('POST', '/auth/send-otp', { mobile: '+919876543210', role: 'customer' });
    assert(sendOtp.status === 200 && sendOtp.body.data.expiresInSeconds === 300, '2. Send OTP POST /api/v1/auth/send-otp');

    const verifyOtp = await request('POST', '/auth/verify-otp', { mobile: '+919876543210', otp: '482910', role: 'customer' });
    assert(verifyOtp.status === 200 && verifyOtp.body.data.accessToken !== undefined, '3. Verify OTP POST /api/v1/auth/verify-otp');

    // 3. Profiles & Onboarding
    const profile = await request('GET', '/users/me');
    assert(profile.status === 200 && profile.body.data.role === 'customer', '4. Get Current Profile GET /api/v1/users/me');

    const farmerKyc = await request('POST', '/onboarding/farmer', { name: 'Ramesh Kumar', village: 'Gudur' });
    assert(farmerKyc.status === 200 && farmerKyc.body.data.role === 'farmer', '5. Farmer Onboarding POST /api/v1/onboarding/farmer');

    const approveKyc = await request('PATCH', '/admin/kyc/submissions/kyc_sub_101/approve');
    assert(approveKyc.status === 200 && approveKyc.body.data.status === 'approved', '6. Admin Approve KYC PATCH /api/v1/admin/kyc/submissions/:id/approve');

    // 4. Categories & Location
    const categories = await request('GET', '/categories');
    assert(categories.status === 200 && categories.body.data.length >= 5, '7. Get Categories GET /api/v1/categories');

    // 5. PostGIS Radius Search
    const radiusProducts = await request('GET', '/products/radius?lat=16.5062&lng=80.6480&radiusKm=10');
    assert(radiusProducts.status === 200 && radiusProducts.body.data.products.length > 0, '8. PostGIS Radius Search GET /api/v1/products/radius');

    // 6. Cart & Checkout
    const cart = await request('GET', '/cart');
    assert(cart.status === 200 && cart.body.data.groups.length > 0, '9. Get Active Cart GET /api/v1/cart');

    const preview = await request('POST', '/checkout/preview', { items: [] });
    assert(preview.status === 200 && preview.body.data.grandTotal === 669.0, '10. Checkout Preview POST /api/v1/checkout/preview');

    // 7. Order Placement & Razorpay Route Split
    const createOrder = await request('POST', '/orders', { paymentMode: 'online' });
    assert(createOrder.status === 201 && createOrder.body.data.commissionRate === 4.5, '11. Create Order POST /api/v1/orders');

    const verifyPay = await request('POST', '/payments/verify', { razorpayPaymentId: 'pay_Kz8910283' });
    assert(verifyPay.status === 200 && verifyPay.body.data.splitDetails.farmerAmount === 515.7, '12. Verify Payment & Route Split POST /api/v1/payments/verify');

    // 8. Order Fulfillment & Doorstep OTP Verification
    const acceptOrder = await request('PATCH', '/orders/ord_889210/accept');
    assert(acceptOrder.status === 200 && acceptOrder.body.data.status === 'ACCEPTED', '13. Farmer Accept Order PATCH /api/v1/orders/:id/accept');

    const deliveryOtp = await request('POST', '/orders/ord_889210/verify-delivery', { deliveryOtp: '8192' });
    assert(deliveryOtp.status === 200 && deliveryOtp.body.data.order.status === 'DELIVERED', '14. Doorstep OTP Delivery POST /api/v1/orders/:id/verify-delivery');

    // 9. Savings & Earnings Ledgers (Dynamic Computations)
    const savings = await request('GET', '/customer/savings');
    assert(savings.status === 200 && savings.body.data.totalSavingsLifetime > 0, '15. Customer Savings Ledger GET /api/v1/customer/savings');

    const earnings = await request('GET', '/farmer/dashboard');
    assert(earnings.status === 200 && earnings.body.data.extraEarnedLifetime > 0, '16. Farmer Earnings Ledger GET /api/v1/farmer/dashboard');

    // 10. B2B Wholesale & Quote Engine
    const b2bCatalog = await request('GET', '/b2b/catalog');
    assert(b2bCatalog.status === 200 && b2bCatalog.body.data.length > 0, '17. B2B Catalog GET /api/v1/b2b/catalog');

    const submitRfq = await request('POST', '/b2b/rfq', { cropName: 'Sona Masoori Rice', quantityQuintals: 50 });
    assert(submitRfq.status === 201 && submitRfq.body.data.status === 'OPEN', '18. Submit B2B RFQ POST /api/v1/b2b/rfq');

    // 11. Admin POS Offline Billing & Commission Engine
    const posCheckout = await request('POST', '/admin/shops/shop_01/pos-checkout', { totalAmount: 108.0, paymentMethod: 'cash' });
    assert(posCheckout.status === 201 && posCheckout.body.data.paymentMethod === 'cash', '19. Shop POS Offline Checkout POST /api/v1/admin/shops/:id/pos-checkout');

    const commissionCalc = await request('POST', '/commission/calculate', { amount: 12000.0 });
    assert(commissionCalc.status === 200 && commissionCalc.body.data.applicableRatePercent === 4.0, '20. Commission Slab Calculation POST /api/v1/commission/calculate');

    // 12. CMS & Executive Analytics
    const banners = await request('GET', '/banners');
    assert(banners.status === 200 && banners.body.data.length > 0, '21. Public Banners GET /api/v1/banners');

    const analytics = await request('GET', '/admin/analytics/dashboard');
    assert(analytics.status === 200 && analytics.body.data.totalGmvAmount > 0, '22. Admin Executive Analytics GET /api/v1/admin/analytics/dashboard');
  } catch (error) {
    console.error('❌ E2E Execution Error:', error);
  } finally {
    server.close();
    console.log('\n=======================================================');
    console.log(`📊 Test Results: ${passedTests} / ${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('=======================================================\n');

    if (passedTests !== totalTests) {
      process.exit(1);
    }
  }
}

runE2ETests();
