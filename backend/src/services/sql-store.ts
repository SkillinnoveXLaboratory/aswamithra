import { query } from '../config/db.config';
import { db } from '../store/db.store';

type DbUserRow = {
  id: string;
  mobile: string;
  email: string | null;
  name: string;
  role: 'customer' | 'farmer' | 'b2b' | 'admin';
  status: 'active' | 'suspended' | 'pending_kyc' | 'needs_onboarding';
  language: string | null;
  avatar_url: string | null;
  pin_hash: string | null;
  created_at: string;
};

type DbAddressRow = {
  id: string;
  user_id: string;
  name: string;
  street: string;
  landmark: string | null;
  pincode: string;
  city: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  is_default: boolean;
};

type DbProductRow = {
  id: string;
  seller_id: string;
  seller_name: string;
  village: string;
  name: string;
  category: string;
  description: string | null;
  images: string[] | null;
  price: string;
  unit: string;
  market_reference_price: string;
  stock: number;
  min_qty: number;
  b2b_tier_price: string | null;
  lat: number;
  lng: number;
  status: string;
  is_featured: boolean;
};

type DbKycRow = {
  id: string;
  user_id: string;
  name: string;
  role: 'farmer' | 'b2b';
  village: string | null;
  district: string | null;
  gstin: string | null;
  aadhaar_masked: string | null;
  bank_account_masked: string | null;
  ifsc: string | null;
  status: string;
  bank_verified: boolean;
  submitted_at?: string;
  documents?: string[] | null;
  details?: Record<string, unknown> | null;
  mandal?: string | null;
  state?: string | null;
  pincode?: string | null;
  lat?: number | null;
  lng?: number | null;
  mobile?: string | null;
  bank_account_name?: string | null;
  aadhaar_number?: string | null;
  bank_account_number?: string | null;
  crops_grown?: string | null;
  land_size_acres?: string | null;
};

type DbShopRow = {
  id: string;
  name: string;
  farmer_id: string | null;
  farmer_name: string | null;
  address: string;
  radius_km: string;
  operating_hours: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  created_at: string;
};

type DbBannerRow = {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  audience: string;
  status: string;
};

type DbSocialLinkRow = {
  id: string;
  platform: string;
  url: string;
  is_visible: boolean;
};

type DbCmsPageRow = {
  slug: string;
  title: string;
  content: string;
  updated_at: string;
};

function normalizeStatus(status: string | null | undefined): 'active' | 'suspended' | 'pending_kyc' | 'needs_onboarding' {
  if (status === 'suspended' || status === 'blocked') return 'suspended';
  if (status === 'pending_kyc') return 'pending_kyc';
  if (status === 'needs_onboarding') return 'needs_onboarding';
  return 'active';
}

export async function ensureTablesReady() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      mobile VARCHAR(20) UNIQUE NOT NULL,
      email VARCHAR(120),
      name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      language VARCHAR(10) DEFAULT 'te',
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
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
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(64) PRIMARY KEY,
      seller_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      seller_name VARCHAR(100) NOT NULL,
      village VARCHAR(100) NOT NULL,
      name VARCHAR(120) NOT NULL,
      category VARCHAR(60) NOT NULL,
      description TEXT,
      images TEXT[] DEFAULT '{}',
      price NUMERIC(10,2) NOT NULL,
      unit VARCHAR(20) NOT NULL,
      market_reference_price NUMERIC(10,2) NOT NULL,
      stock INT NOT NULL DEFAULT 0,
      min_qty INT NOT NULL DEFAULT 1,
      b2b_tier_price NUMERIC(10,2),
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      is_featured BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
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
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      bank_verified BOOLEAN NOT NULL DEFAULT FALSE,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS banners (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(120) NOT NULL,
      image_url TEXT NOT NULL,
      link_url TEXT NOT NULL,
      audience VARCHAR(40) NOT NULL DEFAULT 'customer',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS social_links (
      id VARCHAR(64) PRIMARY KEY,
      platform VARCHAR(40) NOT NULL,
      url TEXT NOT NULL,
      is_visible BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS cms_pages (
      slug VARCHAR(120) PRIMARY KEY,
      title VARCHAR(120) NOT NULL,
      content TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS site_config (
      key VARCHAR(120) PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS shops (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      farmer_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
      farmer_name VARCHAR(100),
      address TEXT NOT NULL,
      radius_km NUMERIC(8,2) NOT NULL DEFAULT 10,
      operating_hours VARCHAR(100),
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE kyc_submissions ADD COLUMN IF NOT EXISTS documents TEXT[] DEFAULT '{}';
    ALTER TABLE kyc_submissions ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE kyc_submissions ADD COLUMN IF NOT EXISTS mandal VARCHAR(100);
    ALTER TABLE kyc_submissions ADD COLUMN IF NOT EXISTS state VARCHAR(100);
    ALTER TABLE kyc_submissions ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
    ALTER TABLE kyc_submissions ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
    ALTER TABLE kyc_submissions ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
    ALTER TABLE kyc_submissions ADD COLUMN IF NOT EXISTS mobile VARCHAR(20);
    ALTER TABLE kyc_submissions ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(120);
    ALTER TABLE kyc_submissions ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(20);
    ALTER TABLE kyc_submissions ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(30);
    ALTER TABLE kyc_submissions ADD COLUMN IF NOT EXISTS crops_grown TEXT;
    ALTER TABLE kyc_submissions ADD COLUMN IF NOT EXISTS land_size_acres VARCHAR(40);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS shop_id VARCHAR(64);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash TEXT;
  `);
}

export async function setUserPinHash(userId: string, pinHash: string) {
  await query('UPDATE users SET pin_hash = $1 WHERE id = $2', [pinHash, userId]);
}

export async function getUserPinHash(userId: string): Promise<string | null> {
  const res = await query<{ pin_hash: string | null }>('SELECT pin_hash FROM users WHERE id = $1 LIMIT 1', [userId]);
  return res.rows[0]?.pin_hash ?? null;
}

export async function userHasPin(userId: string): Promise<boolean> {
  const hash = await getUserPinHash(userId);
  return Boolean(hash);
}

export async function upsertUser(input: {
  id: string;
  mobile: string;
  name: string;
  role: 'customer' | 'farmer' | 'b2b' | 'admin';
  email?: string | null;
  status?: string | null;
  language?: string | null;
  avatarUrl?: string | null;
}) {
  await query(
    `
      INSERT INTO users (id, mobile, name, role, email, status, language, avatar_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        mobile = EXCLUDED.mobile,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        email = EXCLUDED.email,
        status = EXCLUDED.status,
        language = EXCLUDED.language,
        avatar_url = EXCLUDED.avatar_url
    `,
    [
      input.id,
      input.mobile,
      input.name,
      input.role,
      input.email ?? null,
      normalizeStatus(input.status),
      input.language ?? 'te',
      input.avatarUrl ?? null,
    ],
  );
}

export async function findUserByMobile(mobile: string) {
  const res = await query<DbUserRow>('SELECT * FROM users WHERE mobile = $1 LIMIT 1', [mobile]);
  return res.rows[0] ?? null;
}

export async function findUserByMobileAndRole(mobile: string, role: string) {
  const res = await query<DbUserRow>('SELECT * FROM users WHERE mobile = $1 AND role = $2 LIMIT 1', [mobile, role]);
  return res.rows[0] ?? null;
}

export async function findUserById(id: string) {
  const res = await query<DbUserRow>('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
  return res.rows[0] ?? null;
}

export async function deleteUserById(id: string) {
  await query('DELETE FROM users WHERE id = $1', [id]);
}

export async function deleteKycByUserId(userId: string) {
  await query('DELETE FROM kyc_submissions WHERE user_id = $1', [userId]);
}

export async function deleteKycById(id: string) {
  await query('DELETE FROM kyc_submissions WHERE id = $1', [id]);
}

export async function deleteOrphanKycSubmissions() {
  await query('DELETE FROM kyc_submissions WHERE user_id NOT IN (SELECT id FROM users)');
}

export async function listUsersByRole(role?: string) {
  const sql = role ? 'SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC' : 'SELECT * FROM users ORDER BY created_at DESC';
  const res = role ? await query<DbUserRow>(sql, [role]) : await query<DbUserRow>(sql);
  return res.rows;
}

export async function listPendingKycUsers(role?: 'farmer' | 'b2b') {
  const sql = role
    ? 'SELECT * FROM users WHERE status = $1 AND role = $2 ORDER BY created_at DESC'
    : 'SELECT * FROM users WHERE status = $1 AND role IN ($2, $3) ORDER BY created_at DESC';
  const params = role ? ['pending_kyc', role] : ['pending_kyc', 'farmer', 'b2b'];
  const res = await query<DbUserRow>(sql, params);
  return res.rows;
}

export async function getDefaultAddressForUser(userId: string) {
  const res = await query<DbAddressRow>('SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC LIMIT 1', [userId]);
  return res.rows[0] ?? null;
}

export async function listAddressesForUser(userId: string) {
  const res = await query<DbAddressRow>('SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC', [userId]);
  return res.rows;
}

export async function insertAddress(input: {
  id: string;
  userId: string;
  name: string;
  street: string;
  landmark?: string | null;
  pincode: string;
  city: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}) {
  await query(
    `
      INSERT INTO user_addresses (id, user_id, name, street, landmark, pincode, city, district, state, lat, lng, is_default)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        street = EXCLUDED.street,
        landmark = EXCLUDED.landmark,
        pincode = EXCLUDED.pincode,
        city = EXCLUDED.city,
        district = EXCLUDED.district,
        state = EXCLUDED.state,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        is_default = EXCLUDED.is_default
    `,
    [
      input.id,
      input.userId,
      input.name,
      input.street,
      input.landmark ?? null,
      input.pincode,
      input.city,
      input.district,
      input.state,
      input.lat,
      input.lng,
      input.isDefault,
    ],
  );
}

export async function deleteAddress(id: string) {
  await query('DELETE FROM user_addresses WHERE id = $1', [id]);
}

export async function listActiveProducts() {
  const res = await query<DbProductRow>('SELECT * FROM products WHERE status = $1 ORDER BY created_at DESC', ['active']);
  return res.rows;
}

export async function listAllProducts() {
  const res = await query<DbProductRow>('SELECT * FROM products ORDER BY created_at DESC');
  return res.rows;
}

export async function findProductById(id: string) {
  const res = await query<DbProductRow>('SELECT * FROM products WHERE id = $1 LIMIT 1', [id]);
  return res.rows[0] ?? null;
}

export async function deactivateProductById(id: string) {
  await query(`UPDATE products SET status = 'inactive' WHERE id = $1`, [id]);
}

export async function deactivateProductsBySellerId(sellerId: string) {
  await query(`UPDATE products SET status = 'inactive' WHERE seller_id = $1`, [sellerId]);
}

export async function insertProduct(input: {
  id: string;
  sellerId: string;
  sellerName: string;
  village: string;
  name: string;
  category: string;
  description?: string | null;
  images?: string[];
  price: number;
  unit: string;
  marketReferencePrice: number;
  stock: number;
  minQty: number;
  b2bTierPrice?: number | null;
  shopId?: string | null;
  lat: number;
  lng: number;
  status?: string;
  isFeatured?: boolean;
}) {
  await query(
    `
      INSERT INTO products (id, seller_id, seller_name, village, name, category, description, images, price, unit, market_reference_price, stock, min_qty, b2b_tier_price, shop_id, lat, lng, status, is_featured)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      ON CONFLICT (id) DO UPDATE SET
        seller_id = EXCLUDED.seller_id,
        seller_name = EXCLUDED.seller_name,
        village = EXCLUDED.village,
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        images = EXCLUDED.images,
        price = EXCLUDED.price,
        unit = EXCLUDED.unit,
        market_reference_price = EXCLUDED.market_reference_price,
        stock = EXCLUDED.stock,
        min_qty = EXCLUDED.min_qty,
        b2b_tier_price = EXCLUDED.b2b_tier_price,
        shop_id = EXCLUDED.shop_id,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        status = EXCLUDED.status,
        is_featured = EXCLUDED.is_featured
    `,
    [
      input.id,
      input.sellerId,
      input.sellerName,
      input.village,
      input.name,
      input.category,
      input.description ?? null,
      input.images ?? [],
      input.price,
      input.unit,
      input.marketReferencePrice,
      input.stock,
      input.minQty,
      input.b2bTierPrice ?? null,
      input.shopId ?? null,
      input.lat,
      input.lng,
      input.status ?? 'active',
      input.isFeatured ?? false,
    ],
  );
}

export async function countProductsByShopIds() {
  const res = await query<{ shop_id: string; count: string }>(
    `SELECT shop_id, COUNT(*)::text AS count FROM products WHERE shop_id IS NOT NULL GROUP BY shop_id`,
  );
  return new Map(res.rows.map((row) => [row.shop_id, Number(row.count)]));
}

export async function clearShopIdFromProducts(shopId: string) {
  await query(`UPDATE products SET shop_id = NULL WHERE shop_id = $1`, [shopId]);
}

export async function deleteAllShops() {
  await query('DELETE FROM shops');
}

export async function findKycById(id: string) {
  const res = await query<DbKycRow>('SELECT * FROM kyc_submissions WHERE id = $1 LIMIT 1', [id]);
  return res.rows[0] ?? null;
}

export async function findKycByUserId(userId: string) {
  const res = await query<DbKycRow>('SELECT * FROM kyc_submissions WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1', [userId]);
  return res.rows[0] ?? null;
}

export function deriveUserStatusFromKyc(
  role: string,
  userStatus: string,
  kycStatus?: string | null,
): 'active' | 'suspended' | 'pending_kyc' | 'needs_onboarding' {
  if (role !== 'farmer' && role !== 'b2b') {
    return userStatus === 'suspended' ? 'suspended' : 'active';
  }
  if (kycStatus === 'pending' || kycStatus === 'reupload_requested') return 'pending_kyc';
  if (kycStatus === 'rejected') return 'suspended';
  if (kycStatus === 'approved') return 'active';
  if (userStatus === 'needs_onboarding') return 'needs_onboarding';
  return userStatus === 'pending_kyc' ? 'pending_kyc' : userStatus === 'suspended' ? 'suspended' : 'active';
}

export async function listKycByRole(role?: string) {
  const sql = role ? 'SELECT * FROM kyc_submissions WHERE role = $1 ORDER BY submitted_at DESC' : 'SELECT * FROM kyc_submissions ORDER BY submitted_at DESC';
  const res = role ? await query<DbKycRow>(sql, [role]) : await query<DbKycRow>(sql);
  return res.rows;
}

export async function upsertKyc(input: {
  id: string;
  userId: string;
  name: string;
  role: 'farmer' | 'b2b';
  village?: string | null;
  district?: string | null;
  gstin?: string | null;
  aadhaarMasked?: string | null;
  bankAccountMasked?: string | null;
  ifsc?: string | null;
  status?: string;
  bankVerified?: boolean;
  documents?: string[];
  details?: Record<string, unknown> | null;
  mandal?: string | null;
  state?: string | null;
  pincode?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  mobile?: string | null;
  bankAccountName?: string | null;
  aadhaarNumber?: string | null;
  bankAccountNumber?: string | null;
  cropsGrown?: string | null;
  landSizeAcres?: string | number | null;
}) {
  const toNum = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  await query(
    `
      INSERT INTO kyc_submissions (
        id, user_id, name, role, village, district, gstin, aadhaar_masked, bank_account_masked, ifsc,
        status, bank_verified, documents, details, mandal, state, pincode, lat, lng, mobile,
        bank_account_name, aadhaar_number, bank_account_number, crops_grown, land_size_acres
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14::jsonb,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        village = EXCLUDED.village,
        district = EXCLUDED.district,
        gstin = EXCLUDED.gstin,
        aadhaar_masked = EXCLUDED.aadhaar_masked,
        bank_account_masked = EXCLUDED.bank_account_masked,
        ifsc = EXCLUDED.ifsc,
        status = EXCLUDED.status,
        bank_verified = EXCLUDED.bank_verified,
        documents = EXCLUDED.documents,
        details = EXCLUDED.details,
        mandal = EXCLUDED.mandal,
        state = EXCLUDED.state,
        pincode = EXCLUDED.pincode,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        mobile = EXCLUDED.mobile,
        bank_account_name = EXCLUDED.bank_account_name,
        aadhaar_number = EXCLUDED.aadhaar_number,
        bank_account_number = EXCLUDED.bank_account_number,
        crops_grown = EXCLUDED.crops_grown,
        land_size_acres = EXCLUDED.land_size_acres,
        submitted_at = NOW()
    `,
    [
      input.id,
      input.userId,
      input.name,
      input.role,
      input.village ?? null,
      input.district ?? null,
      input.gstin ?? null,
      input.aadhaarMasked ?? null,
      input.bankAccountMasked ?? null,
      input.ifsc ?? null,
      input.status ?? 'pending',
      input.bankVerified ?? false,
      input.documents ?? [],
      JSON.stringify(input.details ?? {}),
      input.mandal ?? null,
      input.state ?? null,
      input.pincode ?? null,
      toNum(input.lat),
      toNum(input.lng),
      input.mobile ?? null,
      input.bankAccountName ?? null,
      input.aadhaarNumber ?? null,
      input.bankAccountNumber ?? null,
      input.cropsGrown ?? null,
      input.landSizeAcres != null && input.landSizeAcres !== '' ? String(input.landSizeAcres) : null,
    ],
  );
}

export async function listShops() {
  const res = await query<DbShopRow>('SELECT * FROM shops ORDER BY created_at DESC');
  return res.rows;
}

export async function findShopById(id: string) {
  const res = await query<DbShopRow>('SELECT * FROM shops WHERE id = $1 LIMIT 1', [id]);
  return res.rows[0] ?? null;
}

export async function findShopByFarmerId(farmerId: string) {
  const res = await query<DbShopRow>('SELECT * FROM shops WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 1', [farmerId]);
  return res.rows[0] ?? null;
}

export async function upsertShop(input: {
  id: string;
  name: string;
  farmerId?: string | null;
  farmerName?: string | null;
  address: string;
  radiusKm: number;
  operatingHours?: string | null;
  lat?: number | null;
  lng?: number | null;
  status?: string;
}) {
  await query(
    `
      INSERT INTO shops (id, name, farmer_id, farmer_name, address, radius_km, operating_hours, lat, lng, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        farmer_id = EXCLUDED.farmer_id,
        farmer_name = EXCLUDED.farmer_name,
        address = EXCLUDED.address,
        radius_km = EXCLUDED.radius_km,
        operating_hours = EXCLUDED.operating_hours,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        status = EXCLUDED.status
    `,
    [
      input.id,
      input.name,
      input.farmerId ?? null,
      input.farmerName ?? null,
      input.address,
      input.radiusKm,
      input.operatingHours ?? null,
      input.lat ?? null,
      input.lng ?? null,
      input.status ?? 'active',
    ],
  );
}

export async function deleteShopById(id: string) {
  await query('DELETE FROM shops WHERE id = $1', [id]);
}

export async function listActiveBanners() {
  const res = await query<DbBannerRow>('SELECT * FROM banners WHERE status = $1 ORDER BY created_at DESC', ['active']);
  return res.rows;
}

export async function listBanners() {
  const res = await query<DbBannerRow>('SELECT * FROM banners ORDER BY created_at DESC');
  return res.rows;
}

export async function upsertBanner(input: {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  audience: string;
  status?: string;
}) {
  await query(
    `
      INSERT INTO banners (id, title, image_url, link_url, audience, status)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        image_url = EXCLUDED.image_url,
        link_url = EXCLUDED.link_url,
        audience = EXCLUDED.audience,
        status = EXCLUDED.status
    `,
    [input.id, input.title, input.imageUrl, input.linkUrl, input.audience, input.status ?? 'active'],
  );
}

export async function deleteBanner(id: string) {
  await query('DELETE FROM banners WHERE id = $1', [id]);
}

export async function listSocialLinks() {
  const res = await query<DbSocialLinkRow>('SELECT * FROM social_links ORDER BY created_at DESC');
  return res.rows;
}

export async function upsertSocialLink(input: {
  id: string;
  platform: string;
  url: string;
  isVisible: boolean;
}) {
  await query(
    `
      INSERT INTO social_links (id, platform, url, is_visible)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (id) DO UPDATE SET
        platform = EXCLUDED.platform,
        url = EXCLUDED.url,
        is_visible = EXCLUDED.is_visible
    `,
    [input.id, input.platform, input.url, input.isVisible],
  );
}

export async function deleteSocialLink(id: string) {
  await query('DELETE FROM social_links WHERE id = $1', [id]);
}

export async function listCmsPages() {
  const res = await query<DbCmsPageRow>('SELECT * FROM cms_pages ORDER BY updated_at DESC');
  return res.rows;
}

export async function findCmsPageBySlug(slug: string) {
  const res = await query<DbCmsPageRow>('SELECT * FROM cms_pages WHERE slug = $1 LIMIT 1', [slug]);
  return res.rows[0] ?? null;
}

export async function upsertCmsPage(input: {
  slug: string;
  title: string;
  content: string;
}) {
  await query(
    `
      INSERT INTO cms_pages (slug, title, content, updated_at)
      VALUES ($1,$2,$3,NOW())
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        updated_at = NOW()
    `,
    [input.slug, input.title, input.content],
  );
}

export async function deleteCmsPage(slug: string) {
  await query('DELETE FROM cms_pages WHERE slug = $1', [slug]);
}

export function toStoreUser(row: DbUserRow) {
  return {
    id: row.id,
    mobile: row.mobile,
    email: row.email ?? undefined,
    name: row.name,
    role: row.role,
    status: normalizeStatus(row.status),
    language: row.language ?? 'te',
    createdAt: row.created_at,
    hasPin: Boolean(row.pin_hash),
  } as const;
}

export function toStoreAddress(row: DbAddressRow) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    street: row.street,
    landmark: row.landmark ?? undefined,
    pincode: row.pincode,
    city: row.city,
    district: row.district,
    state: row.state,
    location: { lat: row.lat, lng: row.lng },
    isDefault: row.is_default,
  } as const;
}

export function toStoreProduct(row: DbProductRow) {
  return {
    id: row.id,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    village: row.village,
    name: row.name,
    category: row.category,
    description: row.description ?? '',
    images: row.images ?? [],
    price: Number(row.price),
    unit: row.unit,
    marketReferencePrice: Number(row.market_reference_price),
    stock: row.stock,
    minQty: row.min_qty,
    b2bTierPrice: row.b2b_tier_price ? Number(row.b2b_tier_price) : undefined,
    location: { lat: row.lat, lng: row.lng },
    status: row.status as 'active' | 'paused' | 'out_of_stock',
    isFeatured: row.is_featured,
  } as const;
}

export function toStoreKyc(row: DbKycRow) {
  const details = (row.details && typeof row.details === 'object' ? row.details : {}) as Record<string, unknown>;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    role: row.role,
    village: row.village ?? undefined,
    district: row.district ?? undefined,
    gstin: row.gstin ?? undefined,
    aadhaarMasked: row.aadhaar_masked ?? undefined,
    bankAccountMasked: row.bank_account_masked ?? undefined,
    ifsc: row.ifsc ?? undefined,
    status: row.status as 'pending' | 'approved' | 'rejected' | 'reupload_requested',
    bankVerified: row.bank_verified,
    submittedAt: row.submitted_at || '',
    documents: row.documents ?? [],
    details,
    mandal: row.mandal ?? (details.mandal as string) ?? undefined,
    state: row.state ?? (details.state as string) ?? undefined,
    pincode: row.pincode ?? (details.pincode as string) ?? undefined,
    lat: row.lat != null ? String(row.lat) : ((details.lat as string) ?? undefined),
    lng: row.lng != null ? String(row.lng) : ((details.lng as string) ?? undefined),
    mobile: row.mobile ?? (details.mobile as string) ?? undefined,
    bankAccountName: row.bank_account_name ?? (details.bankAccountName as string) ?? undefined,
    aadhaarNumber: row.aadhaar_number ?? (details.aadhaarNumber as string) ?? undefined,
    bankAccountNumber: row.bank_account_number ?? (details.bankAccountNumber as string) ?? undefined,
    cropsGrown: row.crops_grown ?? (details.cropsGrown as string) ?? undefined,
    landSizeAcres: row.land_size_acres ?? (details.landSizeAcres as string) ?? undefined,
  } as const;
}

export function toStoreShop(row: DbShopRow) {
  return {
    id: row.id,
    name: row.name,
    farmerId: row.farmer_id ?? undefined,
    farmerName: row.farmer_name ?? undefined,
    address: row.address,
    radiusKm: Number(row.radius_km),
    operatingHours: row.operating_hours || '',
    status: row.status as 'active' | 'paused',
    location: { lat: row.lat ?? 0, lng: row.lng ?? 0 },
  } as const;
}

export async function getSiteConfig(): Promise<{ mapLat: number; mapLng: number; mapAddress: string }> {
  const res = await query<{ key: string; value: string }>(
    `SELECT key, value FROM site_config WHERE key IN ('mapLat','mapLng','mapAddress')`
  );
  const map: Record<string, string> = {};
  for (const row of res.rows) {
    map[row.key] = row.value;
  }
  return {
    mapLat: map.mapLat ? Number(map.mapLat) : 16.5062,
    mapLng: map.mapLng ? Number(map.mapLng) : 80.6480,
    mapAddress: map.mapAddress ?? 'Vijayawada, Andhra Pradesh',
  };
}

export async function updateSiteConfig(input: { mapLat?: number; mapLng?: number; mapAddress?: string }) {
  const rows: Array<[string, string]> = [];
  if (input.mapLat != null) rows.push(['mapLat', String(input.mapLat)]);
  if (input.mapLng != null) rows.push(['mapLng', String(input.mapLng)]);
  if (input.mapAddress != null) rows.push(['mapAddress', input.mapAddress]);
  for (const [key, value] of rows) {
    await query(
      `INSERT INTO site_config (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value]
    );
    // keep in-memory store in sync
    if (key === 'mapLat') db.mapLat = Number(value);
    else if (key === 'mapLng') db.mapLng = Number(value);
    else if (key === 'mapAddress') db.mapAddress = value;
  }
}


export async function countRows(table: string) {
  const res = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table}`);
  return Number(res.rows[0]?.count || 0);
}

export async function countBy(table: string, column: string, value: string) {
  const res = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table} WHERE ${column} = $1`, [value]);
  return Number(res.rows[0]?.count || 0);
}

export async function countWhere(table: string, clauses: Array<{ column: string; value: string }>) {
  const whereSql = clauses.map((clause, index) => `${clause.column} = $${index + 1}`).join(' AND ');
  const values = clauses.map((clause) => clause.value);
  const res = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table} WHERE ${whereSql}`, values);
  return Number(res.rows[0]?.count || 0);
}

export async function purgeDemoAdminSeedData() {
  await query(`DELETE FROM banners WHERE id IN ('ban_101')`);
  await query(`DELETE FROM cms_pages WHERE slug IN ('terms-and-conditions', 'privacy-policy')`);
}

export async function seedFromMemoryIfEmpty() {
  try {
    await purgeDemoAdminSeedData();
    const userCount = await countRows('users');
    if (userCount === 0) {
      for (const user of db.users) {
        await upsertUser({
          id: user.id,
          mobile: user.mobile,
          name: user.name,
          role: user.role,
          email: user.email ?? null,
          status: user.status,
          language: user.language,
          avatarUrl: user.avatar ?? null,
        });
      }
    }

    const addressCount = await countRows('user_addresses');
    if (addressCount === 0) {
      for (const address of db.addresses) {
        await insertAddress({
          id: address.id,
          userId: address.userId,
          name: address.name,
          street: address.street,
          landmark: address.landmark ?? null,
          pincode: address.pincode,
          city: address.city,
          district: address.district,
          state: address.state,
          lat: address.location.lat,
          lng: address.location.lng,
          isDefault: address.isDefault,
        });
      }
    }

    const productCount = await countRows('products');
    if (productCount === 0) {
      for (const product of db.products) {
        await insertProduct({
          id: product.id,
          sellerId: product.sellerId,
          sellerName: product.sellerName,
          village: product.village,
          name: product.name,
          category: product.category,
          description: product.description,
          images: product.images,
          price: product.price,
          unit: product.unit,
          marketReferencePrice: product.marketReferencePrice,
          stock: product.stock,
          minQty: product.minQty,
          b2bTierPrice: product.b2bTierPrice ?? null,
          lat: product.location.lat,
          lng: product.location.lng,
          status: product.status,
          isFeatured: product.isFeatured ?? false,
        });
      }
    }

    const kycCount = await countRows('kyc_submissions');
    if (kycCount === 0) {
      for (const sub of db.kycSubmissions) {
        await upsertKyc({
          id: sub.id,
          userId: sub.userId,
          name: sub.name,
          role: sub.role,
          village: sub.village,
          district: sub.district,
          gstin: sub.gstin,
          aadhaarMasked: sub.aadhaarMasked,
          bankAccountMasked: sub.bankAccountMasked,
          ifsc: sub.ifsc,
          status: sub.status,
          bankVerified: sub.bankVerified,
        });
      }
    }

    const bannerCount = await countRows('banners');
    if (bannerCount === 0) {
      for (const banner of db.banners) {
        await upsertBanner({
          id: banner.id,
          title: banner.title,
          imageUrl: banner.imageUrl,
          linkUrl: banner.linkUrl,
          audience: banner.audience,
          status: banner.status,
        });
      }
    }

    const socialCount = await countRows('social_links');
    if (socialCount === 0) {
      for (const link of db.socialLinks) {
        await upsertSocialLink({
          id: link.id,
          platform: link.platform,
          url: link.url,
          isVisible: link.isVisible,
        });
      }
    }

        const cmsCount = await countRows('cms_pages');
    if (cmsCount === 0) {
      for (const page of db.cmsPages) {
        await upsertCmsPage({
          slug: page.slug,
          title: page.title,
          content: page.content,
        });
      }
    }

        // Seed default site config (map fields)
    const cfgExisting = await query<{ key: string; value: string }>(
      `SELECT key, value FROM site_config WHERE key IN ('mapLat','mapLng','mapAddress')`
    );
    const cfgExistingKeys = new Set(cfgExisting.rows.map((r) => r.key));
    const defaults: Array<{ key: string; value: string }> = [
      { key: 'mapLat', value: String(db.mapLat ?? 16.5062) },
      { key: 'mapLng', value: String(db.mapLng ?? 80.6480) },
      { key: 'mapAddress', value: db.mapAddress ?? 'Vijayawada, Andhra Pradesh' },
    ];
    for (const d of defaults) {
      if (!cfgExistingKeys.has(d.key)) {
        await query(`INSERT INTO site_config (key, value) VALUES ($1, $2)`, [d.key, d.value]);
      }
    }

    // Keep in-memory store in sync with persisted values
    if (cfgExisting.rows.length) {
      for (const row of cfgExisting.rows) {
        if (row.key === 'mapLat') db.mapLat = Number(row.value);
        else if (row.key === 'mapLng') db.mapLng = Number(row.value);
        else if (row.key === 'mapAddress') db.mapAddress = row.value;
      }
    }
  } catch {
    // Keep the app usable even when PostgreSQL is offline.
  }
}
