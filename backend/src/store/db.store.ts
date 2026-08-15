// In-Memory Stateful Database Store for Aswamithra REST API
// Simulates PostgreSQL + PostGIS tables with real CRUD mutations and PostGIS distance math.

export interface User {
  id: string;
  mobile: string;
  email?: string;
  name: string;
  role: 'customer' | 'farmer' | 'b2b' | 'admin';
  status: 'active' | 'needs_onboarding' | 'pending_kyc' | 'suspended';
  language: string;
  createdAt: string;
  farmName?: string;
  avatar?: string;
  bannerImg?: string;
  location?: string;
  district?: string;
  acres?: number;
  bio?: string;
  mandiCommissionSavedTotal?: number;
  pinHash?: string;
}

export interface UserAddress {
  id: string;
  userId: string;
  name: string;
  street: string;
  landmark?: string;
  pincode: string;
  city: string;
  district: string;
  state: string;
  location: { lat: number; lng: number };
  isDefault: boolean;
}

export interface KycSubmission {
  id: string;
  userId: string;
  name: string;
  role: 'farmer' | 'b2b';
  village?: string;
  district?: string;
  aadhaarMasked?: string;
  bankAccountMasked?: string;
  ifsc?: string;
  gstin?: string;
  status: 'pending' | 'approved' | 'rejected' | 'reupload_requested';
  bankVerified: boolean;
  submittedAt: string;
  documents?: string[];
  /** Exact onboarding payload for admin review (not masked drafts). */
  details?: Record<string, unknown>;
  mandal?: string;
  state?: string;
  pincode?: string;
  lat?: string;
  lng?: string;
  mobile?: string;
  bankAccountName?: string;
  aadhaarNumber?: string;
  bankAccountNumber?: string;
  cropsGrown?: string;
  landSizeAcres?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface Unit {
  id: string;
  code: string;
  label: string;
}

export interface ServiceLocation {
  id: string;
  state: string;
  district: string;
  city: string;
  status: 'active' | 'paused';
  lat?: number;
  lng?: number;
  activeFarmers?: number;
  activeHubs?: number;
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar?: string;
  village: string;
  name: string;
  category: string;
  description: string;
  nutrition?: string;
  harvestTime?: string;
  images: string[];
  price: number;
  unit: string;
  marketReferencePrice: number;
  stock: number;
  minQty: number;
  b2bTierPrice?: number;
  shopId?: string;
  location: { lat: number; lng: number };
  status: 'active' | 'paused' | 'out_of_stock';
  isFeatured?: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  qty: number;
  unit: string;
  price: number;
  name?: string;
  image?: string;
  category?: string;
  marketReferencePrice?: number;
  sellerId?: string;
  sellerName?: string;
}

export interface CartGroup {
  farmerId: string;
  farmerName: string;
  distanceKm: number;
  items: CartItem[];
  deliveryFee: number;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  sellerName: string;
  items: Array<{ productId: string; name: string; qty: number; unit: string; price: number }>;
  totalAmount: number;
  commissionRate: number;
  commissionAmount: number;
  farmerPayoutAmount: number;
  status: 'PLACED' | 'ACCEPTED' | 'REJECTED' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  paymentMode: 'online' | 'cod';
  paymentStatus: 'PAID' | 'PENDING' | 'REFUNDED';
  deliveryOtp: string;
  razorpayOrderId?: string;
  createdAt: string;
  deliveredAt?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  razorpayPaymentId: string;
  farmerShare: number;
  platformCommission: number;
  status: 'PAID' | 'REFUNDED';
  createdAt: string;
}

export interface Payout {
  id: string;
  farmerId: string;
  orderId: string;
  grossAmount: number;
  commission: number;
  netCredit: number;
  utr: string;
  status: 'SETTLED' | 'PENDING';
  settledAt: string;
}

export interface SavingsEntry {
  id: string;
  customerId: string;
  orderId: string;
  marketValue: number;
  paidValue: number;
  savedAmount: number;
  date: string;
}

export interface EarningsEntry {
  id: string;
  farmerId: string;
  orderId: string;
  aswamithraSaleValue: number;
  localMandiValue: number;
  extraEarnedAmount: number;
  date: string;
}

export interface B2bRfq {
  id: string;
  buyerId: string;
  buyerName?: string;
  companyName?: string;
  gstNumber?: string;
  cropName: string;
  quantityQuintals: number;
  quantityTons?: number;
  targetPricePerQuintal?: number;
  maxBudgetPerKg?: number;
  deliveryDate?: string;
  deliveryCity?: string;
  buyerLat?: number;
  buyerLng?: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  bids?: any[];
  createdAt: string;
}

export interface B2bQuote {
  id: string;
  rfqId: string;
  farmerId: string;
  farmerName: string;
  pricePerQuintal: number;
  deliveryDate: string;
  message?: string;
  requestOrder?: boolean;
  requestedOrderPricePerQuintal?: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface Shop {
  id: string;
  name: string;
  farmerId?: string;
  farmerName?: string;
  address: string;
  radiusKm: number;
  operatingHours: string;
  status: 'active' | 'paused';
  location: { lat: number; lng: number };
}

export interface ShopInventoryItem {
  id: string;
  shopId: string;
  productId: string;
  name: string;
  stock: number;
  price: number;
  unit: string;
}

export interface DeliveryPartner {
  id: string;
  name: string;
  mobile: string;
  vehicle: string;
  status: 'online' | 'offline' | 'busy';
  location: { lat: number; lng: number };
}

export interface DeliverySlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  dateOffsetDays: number;
  maxOrdersCapacity: number;
  activeOrdersCount: number;
  available: boolean;
}

export interface CommissionSlab {
  id: string;
  minAmount: number;
  maxAmount: number;
  ratePercent: number;
  applicableCategory: string;
  applicableRegion: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'flat' | 'percentage';
  discountValue: number;
  minOrderValue: number;
  status: 'active' | 'paused' | 'expired';
}

export interface MarketPrice {
  id: string;
  cropName: string;
  category: string;
  region: string;
  referencePrice: number;
  unit: string;
  isPublished: boolean;
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  audience: string;
  status: 'active' | 'draft';
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  isVisible: boolean;
}

export interface CmsPage {
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  farmerId: string;
  productId?: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  farmerId: string;
  farmerName: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED' | 'REJECTED';
  resolution?: string;
  orderTotal?: number;
  createdAt: string;
}

// Stateful Backend Database Store
class DatabaseStore {
  users: User[] = [
    { id: 'usr_998124', mobile: '+919876543210', email: 'anitha@aswamithra.in', name: 'Anitha Reddy', role: 'customer', status: 'active', language: 'te', createdAt: '2026-07-25T10:00:00Z' },
    { id: 'farmer_881', mobile: '+919876543211', email: 'ramesh@aswamithra.in', name: 'Ramesh Varma', role: 'farmer', status: 'active', language: 'te', createdAt: '2026-07-25T10:00:00Z', farmName: 'Sri Lakshmi Organic Farm', avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=300', bannerImg: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=1200', location: 'Kankipadu Village', district: 'Krishna', acres: 12.5, bio: 'Pioneer in 100% Zero Budget Natural Farming (ZBNF) since 2014.', mandiCommissionSavedTotal: 184500 },
    { id: 'farmer_882', mobile: '+919876543214', email: 'lakshmi@aswamithra.in', name: 'Lakshmi Devi', role: 'farmer', status: 'active', language: 'te', createdAt: '2026-07-25T10:00:00Z', farmName: 'Godavari Bio Dairy & Greens', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300', bannerImg: 'https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?auto=format&fit=crop&q=80&w=1200', location: 'Tenali Rural', district: 'Guntur', acres: 8.0, bio: 'Pure A2 Gir Cow Milk, Bilona Ghee, and Hydroponic Palak.', mandiCommissionSavedTotal: 215000 },
    { id: 'farmer_883', mobile: '+919876543215', email: 'srinivas@aswamithra.in', name: 'Srinivasa Rao', role: 'farmer', status: 'active', language: 'te', createdAt: '2026-07-25T10:00:00Z', farmName: 'Banganapalle Mango Groves', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300', bannerImg: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&q=80&w=1200', location: 'Nuzvid Orchards', district: 'Krishna', acres: 22.0, bio: 'Tree-ripened GI-tagged Nuzvid Banganapalle Mangoes.', mandiCommissionSavedTotal: 340000 },
    { id: 'b2b_01', mobile: '+919876543212', email: 'procurement@lakshmirice.com', name: 'Sri Lakshmi Rice Mill', role: 'b2b', status: 'active', language: 'en', createdAt: '2026-07-25T10:00:00Z' },
    { id: 'admin_01', mobile: '+919876543213', email: 'admin@aswamithra.in', name: 'Super Admin', role: 'admin', status: 'active', language: 'en', createdAt: '2026-07-25T10:00:00Z' },
  ];

  addresses: UserAddress[] = [
    { id: 'addr_01', userId: 'usr_998124', name: 'Home', street: 'Door No 4-12, Near Temple Street', pincode: '520001', city: 'Vijayawada', district: 'Krishna', state: 'Andhra Pradesh', location: { lat: 16.5062, lng: 80.648 }, isDefault: true },
  ];

  kycSubmissions: KycSubmission[] = [
    { id: 'kyc_sub_101', userId: 'farmer_881', name: 'Ramesh Varma', role: 'farmer', village: 'Kankipadu', district: 'Krishna', aadhaarMasked: 'XXXX-XXXX-9012', bankAccountMasked: 'XXXXXX4812', ifsc: 'SBIN0001234', status: 'approved', bankVerified: true, submittedAt: '2026-07-25T08:30:00Z' },
    { id: 'kyc_sub_102', userId: 'farmer_882', name: 'Lakshmi Devi', role: 'farmer', village: 'Tenali', district: 'Guntur', aadhaarMasked: 'XXXX-XXXX-8821', bankAccountMasked: 'XXXXXX9912', ifsc: 'HDFC0005512', status: 'approved', bankVerified: true, submittedAt: '2026-07-26T09:15:00Z' },
  ];

  categories: Category[] = [
    { id: 'cat_1', name: 'Organic Veggies', slug: 'organic-veggies', icon: '🥦' },
    { id: 'cat_2', name: 'Tree-Ripe Fruits', slug: 'tree-ripe-fruits', icon: '🍎' },
    { id: 'cat_3', name: 'Dairy & Ghee', slug: 'dairy-ghee', icon: '🥛' },
    { id: 'cat_4', name: 'Spices & Pulses', slug: 'spices-pulses', icon: '🌾' },
    { id: 'cat_5', name: 'Exotic Greens', slug: 'exotic-greens', icon: '🥬' },
  ];

  units: Unit[] = [
    { id: 'unit_1', code: 'kg', label: 'Kilogram' },
    { id: 'unit_2', code: 'litre', label: 'Litre' },
    { id: 'unit_3', code: 'bunch', label: 'Bunch' },
    { id: 'unit_4', code: 'quintal', label: 'Quintal (100 kg)' },
    { id: 'unit_5', code: 'ton', label: 'Ton (1000 kg)' },
  ];

  serviceLocations: ServiceLocation[] = [
    { id: 'hub-1', state: 'Andhra Pradesh', district: 'Krishna', city: 'Benz Circle Hub', status: 'active', lat: 16.5062, lng: 80.6480, activeFarmers: 342, activeHubs: 18 },
    { id: 'hub-2', state: 'Andhra Pradesh', district: 'Guntur', city: 'Guntur Chilli Market Hub', status: 'active', lat: 16.3067, lng: 80.4365, activeFarmers: 512, activeHubs: 24 },
    { id: 'hub-3', state: 'Andhra Pradesh', district: 'East Godavari', city: 'Godavari Agri Corridor Hub', status: 'active', lat: 16.9891, lng: 82.2475, activeFarmers: 420, activeHubs: 15 },
    { id: 'hub-4', state: 'Andhra Pradesh', district: 'Chittoor', city: 'Chittoor Mango & Dairy Hub', status: 'active', lat: 13.2172, lng: 79.1003, activeFarmers: 610, activeHubs: 30 }
  ];

  products: Product[] = [
    {
      id: 'p-201',
      sellerId: 'farmer_881',
      sellerName: 'Ramesh Varma',
      sellerAvatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=300',
      village: 'Kankipadu',
      name: 'Natural Vine-Ripe Country Tomatoes (Nattu)',
      category: 'Organic Veggies',
      description: 'Harvested fresh at 5:30 AM today from Kankipadu ZBNF farms. Naturally tangy country flavor with firm juicy texture.',
      nutrition: 'Rich in Lycopene, Vitamin C, Potassium & Antioxidants',
      harvestTime: 'Today 05:30 AM',
      images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800'],
      price: 32.0,
      unit: 'kg',
      marketReferencePrice: 48.0,
      stock: 450,
      minQty: 1,
      b2bTierPrice: 26.0,
      location: { lat: 16.4520, lng: 80.7230 },
      status: 'active',
      isFeatured: true,
    },
    {
      id: 'p-202',
      sellerId: 'farmer_883',
      sellerName: 'Srinivasa Rao',
      sellerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
      village: 'Nuzvid',
      name: 'GI Tagged Nuzvid Banganapalle Mangoes',
      category: 'Tree-Ripe Fruits',
      description: 'Directly plucked from heritage orchards in Nuzvid. Naturally straw-matured under shade without any ripening chemicals.',
      nutrition: 'High Vitamin A, C & Dietary Fiber. 0% Artificial Carbide',
      harvestTime: 'Today 04:45 AM',
      images: ['https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=800'],
      price: 95.0,
      unit: 'kg',
      marketReferencePrice: 140.0,
      stock: 1200,
      minQty: 1,
      b2bTierPrice: 78.0,
      location: { lat: 16.7880, lng: 80.8460 },
      status: 'active',
      isFeatured: true,
    },
    {
      id: 'p-203',
      sellerId: 'farmer_882',
      sellerName: 'Lakshmi Devi',
      sellerAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
      village: 'Tenali Rural',
      name: 'Pure A2 Gir Cow Vedic Bilona Ghee',
      category: 'Dairy & Ghee',
      description: 'Crafted using the ancient 5-stage Bilona wooden churning method from grass-fed A2 Gir cow curd.',
      nutrition: 'A2 Beta-Casein Protein, Omega 3 Fatty Acids & Gut Probiotics',
      harvestTime: 'Yesterday Batch',
      images: ['https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&q=80&w=800'],
      price: 1650.0,
      unit: 'litre',
      marketReferencePrice: 2200.0,
      stock: 45,
      minQty: 1,
      b2bTierPrice: 1480.0,
      location: { lat: 16.2430, lng: 80.6400 },
      status: 'active',
    },
    {
      id: 'p-204',
      sellerId: 'farmer_882',
      sellerName: 'Lakshmi Devi',
      sellerAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
      village: 'Tenali Rural',
      name: 'Fresh Farm Tender Hydroponic Spinach (Palak)',
      category: 'Exotic Greens',
      description: 'Crisp pesticide-free hydroponic palak harvested 2 hours before packing. Clean roots intact for extended crispness.',
      nutrition: 'High Iron, Folate, Vitamin K and Magnesium',
      harvestTime: 'Today 06:15 AM',
      images: ['https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=800'],
      price: 45.0,
      unit: 'bunch',
      marketReferencePrice: 70.0,
      stock: 180,
      minQty: 1,
      location: { lat: 16.2430, lng: 80.6400 },
      status: 'active',
    },
    {
      id: 'p-205',
      sellerId: 'farmer_881',
      sellerName: 'Ramesh Varma',
      sellerAvatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=300',
      village: 'Kankipadu',
      name: 'Single-Origin Aged Sona Masoori Raw Rice',
      category: 'Spices & Pulses',
      description: '12-month naturally aged unpolished Sona Masoori raw rice grown along the fertile Krishna river delta.',
      nutrition: 'Low Glycemic Index, High Digestibility & Gluten Free',
      harvestTime: 'Aged 12 Months',
      images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800'],
      price: 68.0,
      unit: 'kg',
      marketReferencePrice: 92.0,
      stock: 2500,
      minQty: 5,
      b2bTierPrice: 55.0,
      location: { lat: 16.4520, lng: 80.7230 },
      status: 'active',
    }
  ];

  cartItems: CartItem[] = [];

  orders: Order[] = [
    {
      id: 'ord_889210',
      buyerId: 'usr_998124',
      sellerId: 'farmer_881',
      sellerName: 'Ramesh Varma',
      items: [{ productId: 'p-201', name: 'Natural Vine-Ripe Country Tomatoes', qty: 5, unit: 'kg', price: 32.0 }],
      totalAmount: 160.0,
      commissionRate: 0.0,
      commissionAmount: 0.0,
      farmerPayoutAmount: 160.0,
      status: 'DELIVERED',
      paymentMode: 'online',
      paymentStatus: 'PAID',
      deliveryOtp: '8192',
      razorpayOrderId: 'order_Kz820x91823',
      createdAt: '2026-08-04T05:30:00Z',
      deliveredAt: '2026-08-04T07:30:00Z',
    },
  ];

  payments: Payment[] = [];

  payouts: Payout[] = [
    { id: 'payout_101', farmerId: 'farmer_881', orderId: 'ord_889210', grossAmount: 160.0, commission: 0.0, netCredit: 160.0, utr: 'UTR9928104812', status: 'SETTLED', settledAt: '2026-08-04T07:30:00Z' },
  ];

  savingsLedger: SavingsEntry[] = [
    { id: 'svg_101', customerId: 'usr_998124', orderId: 'ord_889210', marketValue: 240.0, paidValue: 160.0, savedAmount: 80.0, date: '2026-08-04' },
  ];

  earningsLedger: EarningsEntry[] = [
    { id: 'ern_101', farmerId: 'farmer_881', orderId: 'ord_889210', aswamithraSaleValue: 160.0, localMandiValue: 110.0, extraEarnedAmount: 50.0, date: '2026-08-04' },
  ];

  b2bRfqs: B2bRfq[] = [
    { 
      id: 'rfq_101', 
      buyerId: 'b2b_01', 
      buyerName: 'Sri Balaji Modern Rice Mill',
      companyName: 'Sri Balaji Agro Tech Pvt Ltd',
      gstNumber: '37AAACB1234F1Z9',
      cropName: 'Sona Masoori Rice', 
      quantityQuintals: 250, 
      quantityTons: 25,
      targetPricePerQuintal: 5800.0, 
      maxBudgetPerKg: 58.0,
      deliveryDate: '2026-08-15',
      deliveryCity: 'Vijayawada',
      status: 'OPEN', 
      createdAt: '2026-08-04T09:00:00Z',
      bids: [
        {
          id: 'bid-1',
          farmerId: 'farmer_881',
          farmerName: 'Ramesh Varma',
          farmLocation: 'Kankipadu',
          distanceKm: 8.4,
          bidPricePerKg: 55,
          totalPrice: 1375000,
          deliveryDays: 3,
          qualityGrade: 'Grade A Premium',
          notes: '100% single origin aged 12 months rice ready for immediate loading.',
          createdAt: '2026-08-04T10:15:00Z'
        }
      ]
    },
  ];

  b2bQuotes: B2bQuote[] = [
    { id: 'quote_01', rfqId: 'rfq_101', farmerId: 'farmer_881', farmerName: 'Ramesh Varma', pricePerQuintal: 5500.0, deliveryDate: '2026-08-15', status: 'PENDING' },
  ];

  shops: Shop[] = [];

  shopInventory: ShopInventoryItem[] = [
    { id: 'inv_1', shopId: 'shop_01', productId: 'p-201', name: 'Country Tomatoes', stock: 1200, price: 32.0, unit: 'kg' },
  ];

  deliveryPartners: DeliveryPartner[] = [
    { id: 'agent_01', name: 'Suresh Kumar', mobile: '+919988776655', vehicle: 'Motorcycle', status: 'online', location: { lat: 16.501, lng: 80.645 } },
  ];

  deliverySlots: DeliverySlot[] = [
    { id: 'slot_1', label: 'Today 02:00 PM - 04:00 PM Slot', startTime: '02:00 PM', endTime: '04:00 PM', dateOffsetDays: 0, maxOrdersCapacity: 50, activeOrdersCount: 12, available: true },
    { id: 'slot_2', label: 'Today 06:00 PM - 08:00 PM Slot', startTime: '06:00 PM', endTime: '08:00 PM', dateOffsetDays: 0, maxOrdersCapacity: 50, activeOrdersCount: 5, available: true },
    { id: 'slot_3', label: 'Tomorrow 07:00 AM - 09:00 AM Slot', startTime: '07:00 AM', endTime: '09:00 AM', dateOffsetDays: 1, maxOrdersCapacity: 50, activeOrdersCount: 2, available: true },
  ];

  commissionSlabs: CommissionSlab[] = [
    { id: 'cs-1', minAmount: 0, maxAmount: 15000, ratePercent: 0.0, applicableCategory: 'Perishable Vegetables', applicableRegion: 'Hyperlocal 0-15km' },
    { id: 'cs-2', minAmount: 15001, maxAmount: 50000, ratePercent: 2.5, applicableCategory: 'Fruits & Tree Produce', applicableRegion: 'Regional 15-50km' },
    { id: 'cs-3', minAmount: 50001, maxAmount: 999999, ratePercent: 1.8, applicableCategory: 'Bulk B2B Grains', applicableRegion: 'Inter-District 50-100km' },
  ];

  coupons: Coupon[] = [
    { id: 'cpn_01', code: 'FARMERFRESH50', discountType: 'flat', discountValue: 50.0, minOrderValue: 300.0, status: 'active' },
  ];

  marketPrices: MarketPrice[] = [
    { id: 'mp_01', cropName: 'Country Tomato', category: 'vegetables', region: 'Krishna', referencePrice: 48.0, unit: 'kg', isPublished: true },
    { id: 'mp_02', cropName: 'Banganapalle Mango', category: 'fruits', region: 'Krishna', referencePrice: 140.0, unit: 'kg', isPublished: true },
  ];

  banners: Banner[] = [];

  socialLinks: SocialLink[] = [
    { id: 'soc_1', platform: 'facebook', url: 'https://facebook.com/aswamithra', isVisible: true },
    { id: 'soc_2', platform: 'instagram', url: 'https://instagram.com/aswamithra', isVisible: true },
  ];

  cmsPages: CmsPage[] = [];

  notifications: Notification[] = [
    { id: 'notif_101', userId: 'usr_998124', title: 'Order Accepted!', message: 'Farmer Ramesh Varma has accepted your order #ord_889210', read: false, createdAt: '2026-08-04T05:35:00Z' },
  ];

  reviews: Review[] = [
    { id: 'rev_101', farmerId: 'farmer_881', productId: 'p-201', customerName: 'Anitha R.', rating: 5, comment: 'Vine ripe tomatoes are super fresh!', date: '2026-08-04' },
  ];

    disputes: Dispute[] = [];

  // Site configuration (controllable from admin panel)
  mapLat: number = 16.5062;
  mapLng: number = 80.6480;
  mapAddress: string = 'Vijayawada, Andhra Pradesh';
  commissionRatePercent: number = 4.5;

  // PostGIS Distance Math (Haversine formula in km)
  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  // Dynamic Commission Slab calculation engine
  getCommissionRate(amount: number): number {
    const sortedSlabs = [...this.commissionSlabs].sort((a, b) => a.minAmount - b.minAmount);
    for (const slab of sortedSlabs) {
      if (amount >= slab.minAmount && amount <= slab.maxAmount) {
        return slab.ratePercent;
      }
    }
    return 2.5; // default slab
  }
}

export const db = new DatabaseStore();
