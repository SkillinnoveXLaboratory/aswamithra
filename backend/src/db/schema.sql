-- Enable PostGIS Extension for Geofencing & Spatial Radius Math
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  mobile VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(120),
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'farmer', 'b2b', 'admin')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  language VARCHAR(10) DEFAULT 'te',
  avatar_url TEXT,
  pin_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS user_addresses (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  street TEXT NOT NULL,
  landmark TEXT,
  pincode VARCHAR(10) NOT NULL,
  city VARCHAR(60) NOT NULL,
  district VARCHAR(60) NOT NULL,
  state VARCHAR(60) NOT NULL DEFAULT 'Andhra Pradesh',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geom GEOMETRY(Point, 4326),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PRODUCTS TABLE (Cloudinary Image URLs)
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_name VARCHAR(100) NOT NULL,
  village VARCHAR(100) NOT NULL,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(60) NOT NULL,
  description TEXT,
  images TEXT[] DEFAULT '{}', -- Array of Cloudinary CDN URLs
  price NUMERIC(10, 2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  market_reference_price NUMERIC(10, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  min_qty INT NOT NULL DEFAULT 1,
  b2b_tier_price NUMERIC(10, 2),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geom GEOMETRY(Point, 4326),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial PostGIS Index for Products
CREATE INDEX IF NOT EXISTS idx_products_geom ON products USING GIST(geom);

-- 4. CART ITEMS TABLE
CREATE TABLE IF NOT EXISTS cart_items (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty INT NOT NULL DEFAULT 1,
  unit VARCHAR(20) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  buyer_id VARCHAR(64) NOT NULL REFERENCES users(id),
  seller_id VARCHAR(64) NOT NULL REFERENCES users(id),
  seller_name VARCHAR(100) NOT NULL,
  items JSONB NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  commission_rate NUMERIC(5, 2) NOT NULL,
  commission_amount NUMERIC(10, 2) NOT NULL,
  farmer_payout_amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('PLACED', 'ACCEPTED', 'REJECTED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')),
  payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('online', 'cod')),
  payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('PAID', 'PENDING', 'REFUNDED')),
  delivery_otp VARCHAR(6) NOT NULL,
  razorpay_order_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

-- 6. PAYMENTS & ROUTE SPLITS TABLE
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  razorpay_payment_id VARCHAR(100) NOT NULL,
  farmer_share NUMERIC(10, 2) NOT NULL,
  platform_commission NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PAID',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. KYC SUBMISSIONS TABLE (Cloudinary Document URLs)
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL,
  village VARCHAR(100),
  district VARCHAR(100),
  gstin VARCHAR(30),
  aadhaar_masked VARCHAR(20),
  bank_account_masked VARCHAR(30),
  ifsc VARCHAR(20),
  documents TEXT[] DEFAULT '{}', -- Array of Cloudinary CDN Document URLs
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  bank_verified BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. DELIVERY SLOTS TABLE
CREATE TABLE IF NOT EXISTS delivery_slots (
  id VARCHAR(64) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  end_time VARCHAR(20) NOT NULL,
  date_offset_days INT NOT NULL DEFAULT 0,
  max_orders_capacity INT NOT NULL DEFAULT 50,
  active_orders_count INT NOT NULL DEFAULT 0,
  available BOOLEAN NOT NULL DEFAULT TRUE
);

-- 9. MARKET PRICES TABLE
CREATE TABLE IF NOT EXISTS market_prices (
  id VARCHAR(64) PRIMARY KEY,
  crop_name VARCHAR(100) NOT NULL,
  category VARCHAR(60) NOT NULL,
  region VARCHAR(60) NOT NULL,
  reference_price NUMERIC(10, 2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE
);

-- 10. REVIEWS & DISPUTES TABLES
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(64) PRIMARY KEY,
  farmer_id VARCHAR(64) NOT NULL REFERENCES users(id),
  product_id VARCHAR(64) NOT NULL REFERENCES products(id),
  customer_name VARCHAR(100) NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disputes (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id),
  customer_id VARCHAR(64) NOT NULL REFERENCES users(id),
  customer_name VARCHAR(100) NOT NULL,
  farmer_name VARCHAR(100) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'CLOSED')),
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
