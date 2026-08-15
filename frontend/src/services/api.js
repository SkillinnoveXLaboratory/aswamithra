import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3099/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aswamithra_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    // Axios defaults to application/json; that breaks multipart uploads (0-byte files).
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Content-Type', undefined);
    } else {
      delete config.headers['Content-Type'];
      if (config.headers.common) delete config.headers.common['Content-Type'];
    }
  }
  return config;
});

export function unwrap(response) {
  const body = response?.data;
  if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'data')) {
    return body.data;
  }
  return body?.data ?? body ?? response;
}

export async function requestWithFallback(request, fallback) {
  try {
    return unwrap(await request());
  } catch (error) {
    console.warn('API fallback used:', error?.message || error);
    return fallback;
  }
}

export const endpoints = {
  siteConfig: () => api.get('/site/config'),
  banners: () => api.get('/banners'),
  socialLinks: () => api.get('/social-links'),
  uploadMedia: (file, folder = 'products') => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/uploads', formData, { params: { folder }, timeout: 60000 });
  },
  sendOtp: (payload) => api.post('/auth/send-otp', payload),
  verifyOtp: (payload) => api.post('/auth/verify-otp', payload),
  loginPin: (payload) => api.post('/auth/login-pin', payload),
  setPin: (payload) => api.post('/auth/set-pin', payload),
  verifyPin: (payload) => api.post('/auth/verify-pin', payload),
  google: (payload) => api.post('/auth/google', payload),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/users/me'),
  updateMe: (payload) => api.put('/users/me', payload),
  addresses: () => api.get('/users/me/addresses'),
  addAddress: (payload) => api.post('/users/me/addresses', payload),
  customerOnboarding: (payload) => api.post('/onboarding/customer', payload),
  farmerOnboarding: (payload) => api.post('/onboarding/farmer', payload),
  b2bOnboarding: (payload) => api.post('/onboarding/b2b', payload),
  kycStatus: (userId) => api.get('/kyc/status', { params: { userId } }),
  myKycSubmission: (userId) => api.get('/kyc/my-submission', { params: { userId } }),
  categories: () => api.get('/categories'),
  category: (id) => api.get(`/categories/${id}`),
  createCategory: (payload) => api.post('/admin/categories', payload),
  updateCategory: (id, payload) => api.put(`/admin/categories/${id}`, payload),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  units: () => api.get('/units'),
  serviceLocations: () => api.get('/geo/service-locations'),
  pincodeCheck: (pincode) => api.get('/geo/pincode-check', { params: { pincode } }),
  productsRadius: (params) => api.get('/products/radius', { params }),
  product: (id) => api.get(`/products/${id}`),
  cart: () => api.get('/cart'),
  addCartItem: (payload) => api.post('/cart/items', payload),
  updateCartItem: (id, payload) => api.put(`/cart/items/${id}`, payload),
  removeCartItem: (id) => api.delete(`/cart/items/${id}`),
  checkoutPreview: () => api.post('/checkout/preview', {}),
  deliverySlots: () => api.get('/checkout/delivery-slots'),
  createRazorpayOrder: (payload) => api.post('/payments/create-razorpay-order', payload),
  verifyRazorpayPayment: (payload) => api.post('/payments/verify', payload),
  createOrder: (payload) => api.post('/orders', payload),
  orders: (buyerId) => api.get('/orders', { params: { buyerId } }),
  order: (id) => api.get(`/orders/${id}`),
  savings: () => api.get('/customer/savings'),
  disputes: (customerId) => api.get('/disputes', { params: customerId ? { customerId } : {} }),
  createDispute: (payload) => api.post('/disputes', payload),
  farmerDashboard: (farmerId) => api.get('/farmer/dashboard', { params: farmerId ? { farmerId } : {} }),
  farmerProducts: (farmerId) => api.get('/farmer/products', { params: { farmerId } }),
  createProduct: (payload) => api.post('/products', payload),
  updateProduct: (id, payload) => api.put(`/products/${id}`, payload),
  updateProductStatus: (id, status) => api.patch(`/products/${id}/status`, { status }),
  farmerOrders: (farmerId) => api.get('/farmer/orders', { params: { farmerId } }),
  acceptOrder: (id) => api.patch(`/orders/${id}/accept`),
  rejectOrder: (id) => api.patch(`/orders/${id}/reject`),
  packOrder: (id) => api.patch(`/orders/${id}/pack`),
  outForDelivery: (id) => api.patch(`/orders/${id}/out-for-delivery`),
  updateOrderPaymentStatus: (id, paymentStatus) => api.patch(`/orders/${id}/payment-status`, { paymentStatus }),
  farmerEarnings: (farmerId) => api.get('/farmer/earnings', { params: farmerId ? { farmerId } : {} }),
  farmerPayouts: (farmerId) => api.get('/farmer/payouts', { params: farmerId ? { farmerId } : {} }),
  farmerRfqs: (farmerId, radiusKm) => api.get('/farmer/rfq', { params: { ...(farmerId ? { farmerId } : {}), ...(radiusKm ? { radiusKm } : {}) } }),
  farmerShop: (farmerId) => api.get('/farmer/my-shop', { params: { farmerId } }),
  createFarmerShop: (payload) => api.post('/farmer/shops', payload),
  updateFarmerShop: (id, payload) => api.put(`/farmer/shops/${id}`, payload),
  deleteFarmerShop: (id, farmerId) => api.delete(`/farmer/shops/${id}`, { params: { farmerId } }),
  adminKycDetail: (id) => api.get(`/admin/kyc/submissions/${id}`),
  submitQuote: (id, payload) => api.post(`/farmer/rfq/${id}/quote`, payload),
  farmerQuotes: (farmerId) => api.get('/farmer/quotes', { params: farmerId ? { farmerId } : {} }),
  rejectFarmerQuote: (id) => api.patch(`/farmer/quotes/${id}/reject`),
  b2bCatalog: () => api.get('/b2b/catalog'),
    b2bRfqs: (buyerId) => api.get('/b2b/rfq', { params: buyerId ? { buyerId } : {} }),
  createRfq: (payload) => api.post('/b2b/rfq', payload),
  b2bRfq: (id) => api.get(`/b2b/rfq/${id}`),
  acceptQuote: (id) => api.post(`/b2b/quotes/${id}/accept`),
  placeOrderFromQuote: (id) => api.post(`/b2b/quotes/${id}/place-order`),
  cancelQuoteOrder: (id) => api.post(`/b2b/quotes/${id}/cancel-order`),
  b2bInvoice: (orderId) => api.get(`/b2b/invoices/${orderId}`),
  b2bCredit: () => api.get('/b2b/credit-ledger'),
  adminAnalytics: () => api.get('/admin/analytics/dashboard'),
  adminKyc: () => api.get('/admin/kyc/submissions'),
  approveKyc: (id) => api.patch(`/admin/kyc/submissions/${id}/approve`),
  rejectKyc: (id) => api.patch(`/admin/kyc/submissions/${id}/reject`),
  adminUsers: () => api.get('/admin/users'),
  adminUser: (id) => api.get(`/admin/users/${id}`),
  createAdminUser: (payload) => api.post('/admin/users', payload),
  updateAdminUser: (id, payload) => api.put(`/admin/users/${id}`, payload),
  updateAdminUserStatus: (id, status) => api.put(`/admin/users/${id}/status`, { status }),
  deleteAdminUser: (id, currentUserId) => api.delete(`/admin/users/${id}`, { params: currentUserId ? { currentUserId } : undefined }),
  commissions: () => api.get('/admin/commission/slabs'),
  commissionSettings: () => api.get('/admin/commission/settings'),
  updateCommissionSettings: (payload) => api.put('/admin/commission/settings', payload),
  shops: () => api.get('/admin/shops'),
  shop: (id) => api.get(`/admin/shops/${id}`),
  createShop: (payload) => api.post('/admin/shops', payload),
  updateShop: (id, payload) => api.put(`/admin/shops/${id}`, payload),
  deleteShop: (id) => api.delete(`/admin/shops/${id}`),
  finance: () => api.get('/admin/payments/transactions'),
  financeSummary: () => api.get('/admin/analytics/dashboard'),
  refundPayment: (payload) => api.post('/admin/payments/refund', payload),
  pendingPayouts: () => api.get('/admin/payouts/pending'),
  processPayouts: () => api.post('/admin/payouts/process'),
  adminBanners: () => api.get('/admin/banners'),
  adminBanner: (id) => api.get(`/admin/banners/${id}`),
  createBanner: (payload) => api.post('/admin/banners', payload),
  updateBanner: (id, payload) => api.put(`/admin/banners/${id}`, payload),
  deleteBanner: (id) => api.delete(`/admin/banners/${id}`),
  cmsPages: () => api.get('/admin/cms/pages'),
  cmsPage: (slug) => api.get(`/cms/pages/${slug}`),
  createCmsPage: (payload) => api.post('/admin/cms/pages', payload),
  updateCmsPage: (slug, payload) => api.put(`/admin/cms/pages/${slug}`, payload),
  deleteCmsPage: (slug) => api.delete(`/admin/cms/pages/${slug}`),
  adminDisputes: () => api.get('/admin/disputes'),
  adminDispute: (id) => api.get(`/admin/disputes/${id}`),
  updateAdminDispute: (id, payload) => api.put(`/admin/disputes/${id}`, payload),
  resolveDispute: (id, payload) => api.patch(`/admin/disputes/${id}/resolve`, payload),
  deleteDispute: (id) => api.delete(`/admin/disputes/${id}`),
  audit: () => api.get('/admin/audit-logs'),
    auditDetail: (id) => api.get(`/admin/audit-logs/${id}`),
  updateSiteConfig: (payload) => api.put('/admin/site/config', payload),
};
