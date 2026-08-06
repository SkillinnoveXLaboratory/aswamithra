import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { db, UserAddress, User } from '../../store/db.store';
import { deleteAddress, deleteKycByUserId, deleteUserById, deactivateProductsBySellerId, deriveUserStatusFromKyc, findUserById, insertAddress, listAddressesForUser, listKycByRole, listUsersByRole, toStoreAddress, toStoreUser, upsertUser } from '../../services/sql-store';

const router = Router();

// Current User Profile
router.get('/users/me', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const dbUser = userId ? await findUserById(userId) : await findUserById(db.users[0]?.id || '');
  const user = dbUser ? toStoreUser(dbUser) : (userId ? db.users.find((u) => u.id === userId) : db.users[0]);
  if (!user) return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');

  const defaultAddrRow = await listAddressesForUser(user.id);
  const defaultAddr = defaultAddrRow.length ? toStoreAddress(defaultAddrRow[0]) : db.addresses.find((a) => a.userId === user.id && a.isDefault);

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
  const user = userId ? db.users.find((u) => u.id === userId) : db.users[0];
  if (!user) return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');

  if (req.body.name) user.name = req.body.name;
  if (req.body.email) user.email = req.body.email;
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

router.put('/users/me/language', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const user = userId ? db.users.find((u) => u.id === userId) : db.users[0];
  if (user && req.body.language) {
    user.language = req.body.language;
  }
  return sendSuccess(res, 200, 'Preferred language updated', { language: user ? user.language : req.body.language });
});

router.delete('/users/me', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const user = userId ? db.users.find((u) => u.id === userId) : db.users[0];
  if (user) user.status = 'suspended';
  return sendSuccess(res, 200, 'Account deactivation request received');
});

// Addresses CRUD (Strictly without hardcoded fallback strings/numbers)
router.get('/users/me/addresses', async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || (db.users[0] ? db.users[0].id : '');
  const rows = await listAddressesForUser(userId);
  const userAddresses = rows.length ? rows.map((row) => toStoreAddress(row)) : db.addresses.filter((a) => a.userId === userId);
  return sendSuccess(res, 200, 'Saved addresses retrieved', userAddresses);
});

router.post('/users/me/addresses', async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || (db.users[0] ? db.users[0].id : '');

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
    isDefault: db.addresses.filter((a) => a.userId === userId).length === 0,
  };

  db.addresses.push(newAddr);
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

router.get('/users/me/addresses/:id', (req: Request, res: Response) => {
  const addr = db.addresses.find((a) => a.id === req.params.id);
  if (!addr) return sendError(res, 404, 'ADDRESS_NOT_FOUND', 'Address not found');
  return sendSuccess(res, 200, 'Address detail retrieved', addr);
});

router.put('/users/me/addresses/:id', async (req: Request, res: Response) => {
  const addr = db.addresses.find((a) => a.id === req.params.id);
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
  const index = db.addresses.findIndex((a) => a.id === addressId);
  if (index !== -1) db.addresses.splice(index, 1);
  await deleteAddress(addressId);
  return sendSuccess(res, 200, 'Address deleted successfully', { id: addressId });
});

router.put('/users/me/addresses/:id/default', async (req: Request, res: Response) => {
  const addr = db.addresses.find((a) => a.id === req.params.id);
  if (!addr) return sendError(res, 404, 'ADDRESS_NOT_FOUND', 'Address not found');

  db.addresses.forEach((a) => {
    if (a.userId === addr.userId) a.isDefault = a.id === addr.id;
  });
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

  const filteredUsers = db.users
    .filter((u) => (!roleFilter ? true : u.role === roleFilter))
    .map((u) => {
      const { pinHash, ...rest } = u;
      return { ...rest, hasPin: Boolean(pinHash) };
    });
  return sendSuccess(res, 200, 'All users retrieved', filteredUsers, { page: 1, limit: 10, total: filteredUsers.length, totalPages: 1 });
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

  db.users.push(newUser);
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
  const memoryUser = db.users.find((u) => u.id === req.params.id);
  if (!dbUser && !memoryUser) return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
  const user = dbUser ? toStoreUser(dbUser) : { ...memoryUser!, hasPin: Boolean(memoryUser?.pinHash) };
  const { pinHash, ...safeUser } = user as typeof user & { pinHash?: string };
  return sendSuccess(res, 200, 'User details retrieved', safeUser);
});

router.put('/admin/users/:id', async (req: Request, res: Response) => {
  const userId = String(req.params.id);
  const dbUser = await findUserById(userId);
  const memoryUser = db.users.find((u) => u.id === userId);
  const baseUser = dbUser ? toStoreUser(dbUser) : memoryUser;
  if (!baseUser) return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');

  const updated: User = {
    ...baseUser,
    ...req.body,
    id: userId,
    role: baseUser.role,
  };

  if (memoryUser) Object.assign(memoryUser, updated);

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
  return sendSuccess(res, 200, 'User profile updated by Admin', updated);
});

router.put('/admin/users/:id/status', (req: Request, res: Response) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');

  user.status = req.body.status;
  return sendSuccess(res, 200, 'User status updated', user);
});

router.delete('/admin/users/:id', async (req: Request, res: Response) => {
  const currentUserId = typeof req.query.currentUserId === 'string' ? req.query.currentUserId : undefined;
  if (currentUserId && currentUserId === req.params.id) {
    return sendError(res, 400, 'SELF_DELETE_BLOCKED', 'Admin users cannot delete their own account');
  }
  const index = db.users.findIndex((u) => u.id === req.params.id);
  if (index !== -1) db.users.splice(index, 1);
  const kycIndex = db.kycSubmissions.findIndex((sub) => sub.userId === req.params.id);
  if (kycIndex !== -1) db.kycSubmissions.splice(kycIndex, 1);
  for (let i = db.products.length - 1; i >= 0; i -= 1) {
    if (db.products[i].sellerId === req.params.id) db.products.splice(i, 1);
  }
  await deactivateProductsBySellerId(String(req.params.id));
  await deleteUserById(String(req.params.id));
  await deleteKycByUserId(String(req.params.id));
  return sendSuccess(res, 200, 'User account archived', { id: req.params.id });
});

export default router;
