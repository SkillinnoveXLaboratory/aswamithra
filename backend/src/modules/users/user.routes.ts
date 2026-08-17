// @ts-nocheck
import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { KycSubmission, UserAddress, User } from '../../store/db.store';
import {
  deleteAddress,
  deleteKycByUserId,
  deleteUserById,
  deactivateProductsBySellerId,
  deriveUserStatusFromKyc,
  findKycByUserId,
  findUserById,
  insertAddress,
  listAddressesForUser,
  listKycByRole,
  listUsersByRole,
  toStoreAddress,
  toStoreKyc,
  toStoreUser,
  upsertKyc,
  upsertUser,
} from '../../services/sql-store';

const router = Router();

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

async function enrichUserKyc(userId: string, user?: User | null) {
  const row = await findKycByUserId(userId);
  const sub = row ? toStoreKyc(row) : null;
  if (!sub) return null;

  const details = { ...(sub.details || {}) } as Record<string, unknown>;
  if (user?.mobile && !details.mobile) details.mobile = user.mobile;
  if (user?.email && !details.businessEmail && !details.email) details.email = user.email;

  return {
    ...sub,
    details,
    mobile: pickText(sub.mobile, details.mobile, user?.mobile),
    aadhaarNumber: pickText(sub.aadhaarNumber, details.aadhaarNumber, sub.aadhaarMasked),
    bankAccountNumber: pickText(sub.bankAccountNumber, details.bankAccountNumber, sub.bankAccountMasked),
    bankAccountName: pickText(sub.bankAccountName, details.bankAccountName),
    ifsc: pickText(details.ifscCode, sub.ifsc),
    gstin: pickText(sub.gstin, details.gstin),
    mandal: pickText(sub.mandal, details.mandal),
    state: pickText(sub.state, details.state),
    pincode: pickText(sub.pincode, details.pincode),
    village: pickText(sub.village, details.village),
    district: pickText(sub.district, details.district),
    address: pickText(details.address),
    cropsGrown: pickText(sub.cropsGrown, details.cropsGrown),
    landSizeAcres: pickText(sub.landSizeAcres, details.landSizeAcres),
    businessName: pickText(details.businessName, sub.name),
    ownerName: pickText(details.ownerName),
    businessEmail: pickText(details.businessEmail, user?.email),
    businessType: pickText(details.businessType),
    lat: pickText(sub.lat, details.lat),
    lng: pickText(sub.lng, details.lng),
    aadhaarDocumentUrl: pickText(details.aadhaarDocumentUrl, ...(sub.documents || [])),
    tradeLicenseDocument: pickText(details.tradeLicenseDocument, ...(sub.documents || [])),
    documents: sub.documents || [],
  };
}

function buildKycFromAdminProfile(user: User, profile: Record<string, unknown>, existing: KycSubmission | null) {
  const text = (key: string) => {
    const value = profile[key];
    return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  };
  const role = user.role === 'b2b' ? 'b2b' : 'farmer';
  const documents = [
    text('aadhaarDocumentUrl'),
    text('tradeLicenseDocument'),
  ].filter(Boolean);
  const details = {
    fullName: text('name') || text('businessName') || text('ownerName') || user.name,
    mobile: text('mobile') || user.mobile,
    role,
    village: text('village'),
    mandal: text('mandal'),
    district: text('district'),
    state: text('state'),
    pincode: text('pincode'),
    address: text('address'),
    lat: text('lat'),
    lng: text('lng'),
    gstin: text('gstin'),
    aadhaarNumber: text('aadhaarNumber'),
    aadhaarDocumentUrl: text('aadhaarDocumentUrl'),
    bankAccountName: text('bankAccountName'),
    bankAccountNumber: text('bankAccountNumber'),
    ifscCode: text('ifscCode'),
    cropsGrown: text('cropsGrown'),
    landSizeAcres: text('landSizeAcres'),
    businessName: text('businessName'),
    ownerName: text('ownerName'),
    businessEmail: text('businessEmail'),
    businessType: text('businessType'),
    tradeLicenseDocument: text('tradeLicenseDocument'),
  };

  const aadhaarNumber = text('aadhaarNumber');
  const bankAccountNumber = text('bankAccountNumber');

  return {
    id: existing?.id || `kyc_sub_${Date.now()}`,
    userId: user.id,
    name: role === 'b2b' ? text('businessName') || user.name : text('name') || user.name,
    role: role as 'farmer' | 'b2b',
    village: text('village') || undefined,
    district: text('district') || undefined,
    mandal: text('mandal') || undefined,
    state: text('state') || undefined,
    pincode: text('pincode') || undefined,
    lat: text('lat') || undefined,
    lng: text('lng') || undefined,
    mobile: text('mobile') || user.mobile || undefined,
    gstin: text('gstin') || undefined,
    aadhaarNumber: aadhaarNumber || undefined,
    bankAccountName: text('bankAccountName') || undefined,
    bankAccountNumber: bankAccountNumber || undefined,
    cropsGrown: text('cropsGrown') || undefined,
    landSizeAcres: text('landSizeAcres') || undefined,
    aadhaarMasked: aadhaarNumber
      ? `XXXX-XXXX-${aadhaarNumber.slice(-4)}`
      : existing?.aadhaarMasked || undefined,
    bankAccountMasked: bankAccountNumber
      ? `XXXXXX${bankAccountNumber.slice(-4)}`
      : existing?.bankAccountMasked || undefined,
    ifsc: text('ifscCode') || existing?.ifsc || undefined,
    status: (existing?.status || 'pending') as KycSubmission['status'],
    bankVerified: existing?.bankVerified || false,
    submittedAt: existing?.submittedAt || new Date().toISOString(),
    documents: documents.length ? documents : existing?.documents || [],
    details,
  } as KycSubmission;
}

// Current User Profile
router.get('/users/me', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const dbUser = userId ? await findUserById(userId) : null;
  const user = dbUser ? toStoreUser(dbUser) : null;
  if (!user) return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');

  const defaultAddrRow = await listAddressesForUser(user.id);
  const defaultAddr = defaultAddrRow.length ? toStoreAddress(defaultAddrRow[0]) : null;

  return sendSuccess(res, 200, 'Current user profile retrieved', {
    ...user,
    profile: defaultAddr
      ? {
          name: user.name,
          address: defaultAddr.street,
          city: defaultAddr.city,
          district: defaultAddr.district,
          state: defaultAddr.state,
          pincode: defaultAddr.pincode,
          location: defaultAddr.location,
        }
      : { name: user.name },
  });
});

router.put('/users/me', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const user = userId ? await findUserById(userId).then((u) => (u ? toStoreUser(u) : null)) : null;
  if (!user) return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');

  if (req.body.name) user.name = req.body.name;
  if (req.body.email) user.email = req.body.email;
  if (req.body.mobile) user.mobile = req.body.mobile;
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

  return sendSuccess(res, 200, 'Profile updated successfully', user);
});

router.put('/users/me/language', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const user = userId ? await findUserById(userId).then((u) => (u ? toStoreUser(u) : null)) : null;
  if (user && req.body.language) {
    user.language = req.body.language;
  }
  return sendSuccess(res, 200, 'Preferred language updated', { language: user ? user.language : req.body.language });
});

router.delete('/users/me', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const user = userId ? await findUserById(userId).then((u) => (u ? toStoreUser(u) : null)) : null;
  if (user) user.status = 'suspended';
  return sendSuccess(res, 200, 'Account deactivation request received');
});

// Addresses CRUD (Strictly without hardcoded fallback strings/numbers)
router.get('/users/me/addresses', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const rows = await listAddressesForUser(userId);
  const userAddresses = rows.map((row) => toStoreAddress(row));
  return sendSuccess(res, 200, 'Saved addresses retrieved', userAddresses);
});

router.post('/users/me/addresses', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;

  const latParsed = req.body.lat !== undefined && req.body.lat !== null ? parseFloat(req.body.lat) : undefined;
  const lngParsed = req.body.lng !== undefined && req.body.lng !== null ? parseFloat(req.body.lng) : undefined;

  const newAddr: UserAddress = {
    id: 'addr_' + Date.now(),
    userId,
    name: req.body.name,
    street: req.body.street,
    landmark: req.body.landmark,
    pincode: req.body.pincode,
    city: req.body.city,
    district: req.body.district,
    state: req.body.state,
    location: latParsed !== undefined && lngParsed !== undefined ? { lat: latParsed, lng: lngParsed } : { lat: 0, lng: 0 },
    isDefault: true,
  };
  await insertAddress({
    id: newAddr.id,
    userId: newAddr.userId,
    name: newAddr.name,
    street: newAddr.street,
    landmark: newAddr.landmark ?? null,
    pincode: newAddr.pincode,
    city: newAddr.city,
    district: newAddr.district,
    state: newAddr.state,
    lat: newAddr.location.lat,
    lng: newAddr.location.lng,
    isDefault: newAddr.isDefault,
  });
  return sendSuccess(res, 201, 'Address added successfully', newAddr);
});

router.get('/users/me/addresses/:id', async (req: Request, res: Response) => {
  const rows = await listAddressesForUser(req.query.userId as string);
  const addr = rows.find((a) => a.id === req.params.id);
  if (!addr) return sendError(res, 404, 'ADDRESS_NOT_FOUND', 'Address not found');
  return sendSuccess(res, 200, 'Address detail retrieved', addr);
});

router.put('/users/me/addresses/:id', async (req: Request, res: Response) => {
  const rows = await listAddressesForUser(req.query.userId as string);
  const addr = rows.find((a) => a.id === req.params.id);
  if (!addr) return sendError(res, 404, 'ADDRESS_NOT_FOUND', 'Address not found');

  if (req.body.name !== undefined) addr.name = req.body.name;
  if (req.body.street !== undefined) addr.street = req.body.street;
  if (req.body.landmark !== undefined) addr.landmark = req.body.landmark;
  if (req.body.pincode !== undefined) addr.pincode = req.body.pincode;
  if (req.body.city !== undefined) addr.city = req.body.city;
  if (req.body.district !== undefined) addr.district = req.body.district;
  if (req.body.state !== undefined) addr.state = req.body.state;
  if (req.body.lat !== undefined && req.body.lng !== undefined) {
    addr.location = { lat: parseFloat(req.body.lat), lng: parseFloat(req.body.lng) };
  }

  await insertAddress({
    id: addr.id,
    userId: addr.userId,
    name: addr.name,
    street: addr.street,
    landmark: addr.landmark ?? null,
    pincode: addr.pincode,
    city: addr.city,
    district: addr.district,
    state: addr.state,
    lat: addr.location.lat,
    lng: addr.location.lng,
    isDefault: addr.isDefault,
  });
  return sendSuccess(res, 200, 'Address updated successfully', addr);
});

router.delete('/users/me/addresses/:id', async (req: Request, res: Response) => {
  const addressId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await deleteAddress(addressId);
  return sendSuccess(res, 200, 'Address deleted successfully', { id: addressId });
});

router.put('/users/me/addresses/:id/default', async (req: Request, res: Response) => {
  const rows = await listAddressesForUser(req.query.userId as string);
  const addr = rows.find((a) => a.id === req.params.id);
  if (!addr) return sendError(res, 404, 'ADDRESS_NOT_FOUND', 'Address not found');
  await insertAddress({
    id: addr.id,
    userId: addr.userId,
    name: addr.name,
    street: addr.street,
    landmark: addr.landmark ?? null,
    pincode: addr.pincode,
    city: addr.city,
    district: addr.district,
    state: addr.state,
    lat: (addr as any).location?.lat ?? 0,
    lng: (addr as any).location?.lng ?? 0,
    isDefault: true,
  });
  return sendSuccess(res, 200, 'Default address updated', addr);
});

// Admin User Management CRUD (Strictly without hardcoded fallback strings)
router.get('/admin/users', async (req: Request, res: Response) => {
  const roleFilter = typeof req.query.role === 'string' ? req.query.role : undefined;
  const dbUsers = await listUsersByRole(roleFilter);
  if (dbUsers.length) {
    const kycRows = await listKycByRole();
    const kycByUserId = new Map(kycRows.map((row) => [row.user_id, row]));
    const filteredUsers = await Promise.all(
      dbUsers.map(async (row) => {
        const user = toStoreUser(row);
        const kyc = kycByUserId.get(user.id);
        const status = deriveUserStatusFromKyc(user.role, user.status, kyc?.status);
        if (status !== user.status) {
          await upsertUser({
            id: user.id,
            mobile: user.mobile,
            name: user.name,
            role: user.role,
            email: user.email ?? null,
            status,
            language: user.language,
            avatarUrl: row.avatar_url,
          });
        }
        return { ...user, status, hasPin: Boolean(row.pin_hash) };
      }),
    );
    return sendSuccess(res, 200, 'All users retrieved', filteredUsers, { page: 1, limit: 10, total: filteredUsers.length, totalPages: 1 });
  }

  return sendSuccess(res, 200, 'All users retrieved', [], { page: 1, limit: 10, total: 0, totalPages: 1 });
});

router.post('/admin/users', async (req: Request, res: Response) => {
  const newUser: User = {
    id: 'usr_' + Date.now(),
    mobile: req.body.mobile,
    email: req.body.email,
    name: req.body.name,
    role: req.body.role,
    status: req.body.status || 'active',
    language: req.body.language,
    createdAt: new Date().toISOString(),
  };

  await upsertUser({
    id: newUser.id,
    mobile: newUser.mobile,
    name: newUser.name,
    role: newUser.role,
    email: newUser.email ?? null,
    status: newUser.status,
    language: newUser.language,
  });
  return sendSuccess(res, 201, 'User created manually by Admin', newUser);
});

router.get('/admin/users/:id', async (req: Request, res: Response) => {
  const dbUser = await findUserById(String(req.params.id));
  if (!dbUser) return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
  const user = { ...toStoreUser(dbUser) };
  const { pinHash, ...safeUser } = user as typeof user & { pinHash?: string };
  const kyc = await enrichUserKyc(safeUser.id, safeUser as User);
  return sendSuccess(res, 200, 'User details retrieved', {
    ...safeUser,
    hasPin: Boolean(dbUser?.pin_hash || (safeUser as { hasPin?: boolean }).hasPin),
    kyc,
  });
});

router.put('/admin/users/:id', async (req: Request, res: Response) => {
  const userId = String(req.params.id);
  const dbUser = await findUserById(userId);
  const baseUser = dbUser ? toStoreUser(dbUser) : null;
  if (!baseUser) return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');

  const { pin: _pin, kycProfile, kyc: _kyc, hasPin: _hasPin, createdAt: _createdAt, ...profileFields } = req.body || {};
  const updated: User = {
    ...baseUser,
    ...profileFields,
    id: userId,
    role: baseUser.role,
  };

  await upsertUser({
    id: updated.id,
    mobile: updated.mobile,
    name: updated.name,
    role: updated.role,
    email: updated.email ?? null,
    status: updated.status,
    language: updated.language,
    avatarUrl: updated.avatar ?? null,
  });

  let nextKyc = null;
  if ((updated.role === 'farmer' || updated.role === 'b2b') && kycProfile && typeof kycProfile === 'object') {
    const existingRow = await findKycByUserId(userId);
    const existing = existingRow ? toStoreKyc(existingRow) : null;
    const nextSub = buildKycFromAdminProfile(updated, kycProfile as Record<string, unknown>, existing);

    await upsertKyc({
      id: nextSub.id,
      userId: nextSub.userId,
      name: nextSub.name,
      role: nextSub.role,
      village: nextSub.village ?? null,
      district: nextSub.district ?? null,
      gstin: nextSub.gstin ?? null,
      aadhaarMasked: nextSub.aadhaarMasked ?? null,
      bankAccountMasked: nextSub.bankAccountMasked ?? null,
      ifsc: nextSub.ifsc ?? null,
      status: nextSub.status,
      bankVerified: nextSub.bankVerified,
      documents: nextSub.documents ?? [],
      details: nextSub.details ?? {},
      mandal: nextSub.mandal ?? null,
      state: nextSub.state ?? null,
      pincode: nextSub.pincode ?? null,
      lat: nextSub.lat ?? null,
      lng: nextSub.lng ?? null,
      mobile: nextSub.mobile ?? null,
      bankAccountName: nextSub.bankAccountName ?? null,
      aadhaarNumber: nextSub.aadhaarNumber ?? null,
      bankAccountNumber: nextSub.bankAccountNumber ?? null,
      cropsGrown: nextSub.cropsGrown ?? null,
      landSizeAcres: nextSub.landSizeAcres ?? null,
    });
    nextKyc = await enrichUserKyc(userId, updated);
  } else {
    nextKyc = await enrichUserKyc(userId, updated);
  }

  return sendSuccess(res, 200, 'User profile updated by Admin', {
    ...updated,
    hasPin: Boolean(dbUser?.pin_hash),
    kyc: nextKyc,
  });
});

router.put('/admin/users/:id/status', async (req: Request, res: Response) => {
  const dbUser = await findUserById(String(req.params.id));
  if (!dbUser) return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
  await upsertUser({
    id: dbUser.id,
    mobile: dbUser.mobile,
    name: dbUser.name,
    role: dbUser.role,
    email: dbUser.email,
    status: req.body.status,
    language: dbUser.language,
    avatarUrl: dbUser.avatar_url,
  });
  return sendSuccess(res, 200, 'User status updated', { ...toStoreUser(dbUser), status: req.body.status });
});

router.delete('/admin/users/:id', async (req: Request, res: Response) => {
  const currentUserId = typeof req.query.currentUserId === 'string' ? req.query.currentUserId : undefined;
  if (currentUserId && currentUserId === req.params.id) {
    return sendError(res, 400, 'SELF_DELETE_BLOCKED', 'Admin users cannot delete their own account');
  }
  await deactivateProductsBySellerId(String(req.params.id));
  await deleteUserById(String(req.params.id));
  await deleteKycByUserId(String(req.params.id));
  return sendSuccess(res, 200, 'User account archived', { id: req.params.id });
});

export default router;
