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

CREATE TABLE IF NOT EXISTS b2b_rfq (
  id VARCHAR(64) PRIMARY KEY,
  buyer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_name VARCHAR(100),
  company_name VARCHAR(120),
  gst_number VARCHAR(40),
  crop_name VARCHAR(120) NOT NULL,
  quantity_quintals NUMERIC(12, 2) NOT NULL,
  quantity_tons NUMERIC(12, 2),
  target_price_per_quintal NUMERIC(12, 2),
  max_budget_per_kg NUMERIC(12, 2),
  delivery_date DATE,
  delivery_city VARCHAR(120),
  buyer_lat DOUBLE PRECISION,
  buyer_lng DOUBLE PRECISION,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS b2b_quotes (
  id VARCHAR(64) PRIMARY KEY,
  rfq_id VARCHAR(64) NOT NULL REFERENCES b2b_rfq(id) ON DELETE CASCADE,
  farmer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  farmer_name VARCHAR(120) NOT NULL,
  price_per_quintal NUMERIC(12, 2) NOT NULL,
  delivery_date DATE,
  message TEXT,
  request_order BOOLEAN NOT NULL DEFAULT FALSE,
  requested_order_price_per_quintal NUMERIC(12, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS earnings_ledger (
  id VARCHAR(64) PRIMARY KEY,
  farmer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id VARCHAR(64) REFERENCES orders(id) ON DELETE SET NULL,
  aswamithra_sale_value NUMERIC(12, 2) NOT NULL,
  local_mandi_value NUMERIC(12, 2) NOT NULL,
  extra_earned_amount NUMERIC(12, 2) NOT NULL,
  date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_partners (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  vehicle VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'busy')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(160) NOT NULL UNIQUE,
  icon VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS units (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  label VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS commission_slabs (
  id VARCHAR(64) PRIMARY KEY,
  min_amount NUMERIC(12,2) NOT NULL,
  max_amount NUMERIC(12,2) NOT NULL,
  rate_percent NUMERIC(5,2) NOT NULL,
  applicable_category VARCHAR(120) NOT NULL,
  applicable_region VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS market_prices (
  id VARCHAR(64) PRIMARY KEY,
  crop_name VARCHAR(120) NOT NULL,
  category VARCHAR(120) NOT NULL,
  region VARCHAR(120) NOT NULL,
  reference_price NUMERIC(12,2) NOT NULL,
  unit VARCHAR(40) NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS service_locations (
  id VARCHAR(64) PRIMARY KEY,
  state VARCHAR(120) NOT NULL,
  district VARCHAR(120),
  city VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  active_farmers INT,
  active_hubs INT
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
