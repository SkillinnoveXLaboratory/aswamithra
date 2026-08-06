import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { db, KycSubmission } from '../../store/db.store';
import { insertAddress, deleteKycById, deleteKycByUserId, deleteOrphanKycSubmissions, findKycById, findUserById, findUserByMobile, findKycByUserId, listKycByRole, listUsersByRole, toStoreKyc, toStoreUser, upsertKyc, upsertUser } from '../../services/sql-store';

const router = Router();

function collectDocumentUrls(body: Record<string, unknown>) {
  return [
    body.aadhaarDocumentUrl,
    body.tradeLicenseDocument,
    body.farmPhotoUrl,
    body.bankPassbookUrl,
  ].filter((url): url is string => typeof url === 'string' && url.trim().length > 0);
}

async function resolveKycSubmission(submissionId: string) {
  const direct = await findKycById(submissionId);
  if (direct) return toStoreKyc(direct);
  const memory = db.kycSubmissions.find((item) => item.id === submissionId);
  if (memory) return memory;
  const userScopedId = submissionId.startsWith('kyc_') ? submissionId.replace(/^kyc_/, '') : submissionId;
  const byUser = await findKycByUserId(userScopedId);
  if (byUser) return toStoreKyc(byUser);
  const user = await findUserById(userScopedId);
  if (user) {
    return {
      id: `kyc_${user.id}`,
      userId: user.id,
      name: user.name,
      role: user.role as 'farmer' | 'b2b',
      status: 'pending' as const,
      bankVerified: false,
      submittedAt: user.created_at,
      documents: [],
    };
  }
  return null;
}

async function applyKycDecision(sub: KycSubmission, decision: 'approved' | 'rejected') {
  if (sub.id.startsWith('kyc_') && !sub.id.startsWith('kyc_sub_')) {
    sub.id = `kyc_sub_${Date.now()}`;
  }
  sub.status = decision;

  const memoryIndex = db.kycSubmissions.findIndex((item) => item.id === sub.id || item.userId === sub.userId);
  if (memoryIndex === -1) db.kycSubmissions.push(sub);
  else db.kycSubmissions[memoryIndex] = sub;

  await upsertKyc({
    id: sub.id,
    userId: sub.userId,
    name: sub.name,
    role: sub.role,
    village: sub.village ?? null,
    district: sub.district ?? null,
    gstin: sub.gstin ?? null,
    aadhaarMasked: sub.aadhaarMasked ?? null,
    bankAccountMasked: sub.bankAccountMasked ?? null,
    ifsc: sub.ifsc ?? null,
    status: decision,
    bankVerified: sub.bankVerified,
    documents: sub.documents ?? [],
  });

  const userStatus = decision === 'approved' ? 'active' : 'suspended';
  const memoryUser = db.users.find((user) => user.id === sub.userId);
  if (memoryUser) memoryUser.status = userStatus;
  const dbUser = await findUserById(sub.userId);
  if (dbUser) {
    await upsertUser({
      id: dbUser.id,
      mobile: dbUser.mobile,
      name: sub.name || dbUser.name,
      role: dbUser.role,
      email: dbUser.email,
      status: userStatus,
      language: dbUser.language ?? 'te',
      avatarUrl: dbUser.avatar_url,
    });
  }
}

// Onboarding Endpoints
router.post('/onboarding/customer', (req: Request, res: Response) => {
  const user = req.body.mobile ? db.users.find((u) => u.mobile === req.body.mobile) : db.users[0];
  if (user) {
    if (req.body.name) user.name = req.body.name;
    user.status = 'active';
  }
  if (user) {
    void upsertUser({
      id: user.id,
      mobile: user.mobile,
      name: user.name,
      role: user.role,
      email: user.email ?? null,
      status: user.status,
      language: user.language,
      avatarUrl: user.avatar ?? null,
    });
    if (req.body.address || req.body.city || req.body.pincode) {
      void insertAddress({
        id: `addr_${Date.now()}`,
        userId: user.id,
        name: req.body.name || 'Home',
        street: req.body.address || req.body.street || '',
        landmark: req.body.landmark || null,
        pincode: req.body.pincode || '',
        city: req.body.city || '',
        district: req.body.district || req.body.city || '',
        state: req.body.state || 'Andhra Pradesh',
        lat: req.body.lat || 0,
        lng: req.body.lng || 0,
        isDefault: true,
      });
    }
  }
  return sendSuccess(res, 200, 'Customer onboarding complete', { status: 'active', role: 'customer' });
});

router.post('/onboarding/farmer', async (req: Request, res: Response) => {
  const dbRow = req.body.userId
    ? await findUserById(String(req.body.userId))
    : req.body.mobile
      ? await findUserByMobile(req.body.mobile)
      : null;
  const memoryUser = req.body.userId
    ? db.users.find((u) => u.id === req.body.userId)
    : req.body.mobile
      ? db.users.find((u) => u.mobile === req.body.mobile)
      : undefined;

  const farmerUser: {
    id: string;
    mobile: string;
    name: string;
    role: 'farmer';
    status: 'pending_kyc';
    language: string;
    createdAt: string;
    email?: string;
    avatar?: string;
  } = dbRow
    ? {
        id: dbRow.id,
        mobile: dbRow.mobile,
        name: req.body.name || dbRow.name,
        role: 'farmer',
        status: 'pending_kyc',
        language: dbRow.language ?? req.body.language ?? 'te',
        createdAt: dbRow.created_at,
        email: dbRow.email ?? undefined,
      }
    : memoryUser
      ? {
          id: memoryUser.id,
          mobile: memoryUser.mobile,
          name: req.body.name || memoryUser.name,
          role: 'farmer',
          status: 'pending_kyc',
          language: memoryUser.language || req.body.language || 'te',
          createdAt: memoryUser.createdAt,
          email: memoryUser.email,
          avatar: memoryUser.avatar,
        }
      : {
          id: 'usr_' + Date.now(),
          mobile: req.body.mobile || `+91${String(Date.now()).slice(-10)}`,
          name: req.body.name,
          role: 'farmer' as const,
          status: 'pending_kyc' as const,
          language: req.body.language || 'te',
          createdAt: new Date().toISOString(),
        };

  const memoryIndex = db.users.findIndex((u) => u.id === farmerUser.id);
  if (memoryIndex === -1) {
    db.users.push(farmerUser);
  } else {
    Object.assign(db.users[memoryIndex], farmerUser);
  }

  await upsertUser({
    id: farmerUser.id,
    mobile: farmerUser.mobile,
    name: farmerUser.name,
    role: farmerUser.role,
    email: farmerUser.email ?? null,
    status: farmerUser.status,
    language: farmerUser.language,
    avatarUrl: farmerUser.avatar ?? null,
  });

  const documents = collectDocumentUrls(req.body);
  const existingKycRow = await findKycByUserId(farmerUser.id);
  const newSub: KycSubmission = existingKycRow
    ? {
        id: existingKycRow.id,
        userId: farmerUser.id,
        name: req.body.name || farmerUser.name,
        role: 'farmer',
        village: req.body.village,
        district: req.body.district,
        aadhaarMasked: req.body.aadhaarNumber ? `XXXX-XXXX-${req.body.aadhaarNumber.slice(-4)}` : existingKycRow.aadhaar_masked ?? undefined,
        bankAccountMasked: req.body.bankAccountNumber ? `XXXXXX${req.body.bankAccountNumber.slice(-4)}` : existingKycRow.bank_account_masked ?? undefined,
        ifsc: req.body.ifscCode || existingKycRow.ifsc || undefined,
        status: 'pending',
        bankVerified: existingKycRow.bank_verified,
        submittedAt: existingKycRow.submitted_at || new Date().toISOString(),
        documents: documents.length ? documents : existingKycRow.documents ?? [],
      }
    : {
        id: 'kyc_sub_' + Date.now(),
        userId: farmerUser.id,
        name: req.body.name || farmerUser.name,
        role: 'farmer',
        village: req.body.village,
        district: req.body.district,
        aadhaarMasked: req.body.aadhaarNumber ? `XXXX-XXXX-${req.body.aadhaarNumber.slice(-4)}` : undefined,
        bankAccountMasked: req.body.bankAccountNumber ? `XXXXXX${req.body.bankAccountNumber.slice(-4)}` : undefined,
        ifsc: req.body.ifscCode,
        status: 'pending',
        bankVerified: false,
        submittedAt: new Date().toISOString(),
        documents,
      };

  const memoryKycIndex = db.kycSubmissions.findIndex((sub) => sub.userId === farmerUser.id);
  if (memoryKycIndex === -1) {
    db.kycSubmissions.push(newSub);
  } else {
    db.kycSubmissions[memoryKycIndex] = newSub;
  }

  await upsertKyc({
    id: newSub.id,
    userId: newSub.userId,
    name: newSub.name,
    role: newSub.role,
    village: newSub.village ?? null,
    district: newSub.district ?? null,
    gstin: newSub.gstin ?? null,
    aadhaarMasked: newSub.aadhaarMasked ?? null,
    bankAccountMasked: newSub.bankAccountMasked ?? null,
    ifsc: newSub.ifsc ?? null,
    status: newSub.status,
    bankVerified: newSub.bankVerified,
    documents: newSub.documents ?? [],
  });
  return sendSuccess(res, 200, 'Farmer KYC submitted for review', newSub);
});

router.post('/onboarding/b2b', (req: Request, res: Response) => {
  const b2bId = 'b2b_' + Date.now();
  const existingB2b = db.users.find((u) => u.id === b2bId);
  const b2bUser: {
    id: string;
    mobile: string;
    name: string;
    role: 'b2b';
    status: 'pending_kyc';
    language: string;
    createdAt: string;
    email?: string;
    avatar?: string;
  } = (existingB2b as any) || {
    id: b2bId,
    mobile: req.body.mobile || `+91${String(Date.now() + 1).slice(-10)}`,
    name: req.body.businessName,
    role: 'b2b' as const,
    status: 'pending_kyc' as const,
    language: req.body.language || 'en',
    createdAt: new Date().toISOString(),
  };

  if (!db.users.find((u) => u.id === b2bUser.id)) {
    db.users.push(b2bUser);
  }

  void upsertUser({
    id: b2bUser.id,
    mobile: b2bUser.mobile,
    name: b2bUser.name,
    role: b2bUser.role,
    email: b2bUser.email ?? null,
    status: b2bUser.status,
    language: b2bUser.language,
    avatarUrl: b2bUser.avatar ?? null,
  });

  const newSub: KycSubmission = {
    id: 'kyc_sub_' + Date.now(),
    userId: b2bUser.id,
    name: req.body.businessName,
    role: 'b2b',
    gstin: req.body.gstin,
    status: 'pending',
    bankVerified: false,
    submittedAt: new Date().toISOString(),
  };

  db.kycSubmissions.push(newSub);
  void upsertKyc(newSub);
  return sendSuccess(res, 200, 'B2B profile & trade license submitted', newSub);
});

// User KYC Status
router.get('/kyc/status', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const row = userId ? await findKycByUserId(userId) : null;
  const sub = row ? toStoreKyc(row) : (userId ? db.kycSubmissions.find((s) => s.userId === userId) : db.kycSubmissions[0]);

  return sendSuccess(res, 200, 'KYC status retrieved', {
    kycStatus: sub ? sub.status : 'approved',
    bankAccountVerified: sub ? sub.bankVerified : true,
    documentsSubmitted: sub?.documents || [],
  });
});

router.get('/kyc/documents', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Uploaded documents retrieved', [
    { id: 'doc_1', type: 'aadhaar', name: 'aadhaar_card.enc', uploadedAt: '2026-07-25T10:00:00.000Z' },
  ]);
});

router.post('/kyc/documents/upload', (req: Request, res: Response) => {
  return sendSuccess(res, 201, 'Document uploaded successfully', {
    docId: 'doc_' + Date.now(),
    docType: req.body.docType,
  });
});

router.get('/kyc/documents/:doc_id/download-url', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Signed download URL generated', {
    signedUrl: `https://storage.aswamithra.in/kyc/${req.params.doc_id}?token=temp_token`,
    expiresInSeconds: 900,
  });
});

router.delete('/kyc/documents/:doc_id', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'KYC document draft deleted', { docId: req.params.doc_id });
});

// Admin KYC Queue CRUD
router.get('/admin/kyc/submissions', async (req: Request, res: Response) => {
  const roleFilter = typeof req.query.role === 'string' ? req.query.role : undefined;
  const scopedRole = roleFilter === 'farmer' || roleFilter === 'b2b' ? roleFilter : undefined;

  await deleteOrphanKycSubmissions();

  const dbUsers = (await listUsersByRole(scopedRole)).filter((user) => user.role === 'farmer' || user.role === 'b2b');
  if (dbUsers.length > 0) {
    const userIds = new Set(dbUsers.map((user) => user.id));
    db.kycSubmissions = db.kycSubmissions.filter((sub) => userIds.has(sub.userId));

    const kycRows = await listKycByRole(scopedRole);
    const submissions = kycRows
      .filter((row) => userIds.has(row.user_id))
      .map((row) => toStoreKyc(row));

    const pendingUsers = dbUsers
      .filter((user) => user.status === 'pending_kyc')
      .filter((user) => !submissions.some((sub) => sub.userId === user.id))
      .map((user) => ({
        id: `kyc_${user.id}`,
        userId: user.id,
        name: user.name,
        role: user.role as 'farmer' | 'b2b',
        status: 'pending' as const,
        bankVerified: false,
        submittedAt: user.created_at,
      }));

    const merged = [...submissions, ...pendingUsers];
    merged.sort((a, b) => ((a.submittedAt || '') < (b.submittedAt || '') ? 1 : -1));
    return sendSuccess(res, 200, 'Pending KYC applications list retrieved', merged, { page: 1, limit: 10, total: merged.length, totalPages: 1 });
  }

  const submissions = db.kycSubmissions.filter((s) => {
    const userExists = db.users.some((user) => user.id === s.userId);
    return userExists && (!roleFilter ? true : s.role === roleFilter);
  });
  return sendSuccess(res, 200, 'Pending KYC applications list retrieved', submissions, { page: 1, limit: 10, total: submissions.length, totalPages: 1 });
});

router.post('/admin/kyc/submissions', (req: Request, res: Response) => {
  const newSub: KycSubmission = {
    id: 'kyc_sub_' + Date.now(),
    userId: req.body.userId || 'usr_' + Date.now(),
    name: req.body.name,
    role: req.body.role || 'farmer',
    status: 'pending',
    bankVerified: false,
    submittedAt: new Date().toISOString(),
  };

  db.kycSubmissions.push(newSub);
  return sendSuccess(res, 201, 'Manual KYC submission created by Admin', newSub);
});

router.get('/admin/kyc/submissions/:id', async (req: Request, res: Response) => {
  const sub = await resolveKycSubmission(String(req.params.id));
  if (!sub) return sendError(res, 404, 'KYC_NOT_FOUND', 'KYC submission not found');
  return sendSuccess(res, 200, 'KYC review package details', sub);
});

router.put('/admin/kyc/submissions/:id', (req: Request, res: Response) => {
  const sub = db.kycSubmissions.find((s) => s.id === req.params.id);
  if (!sub) return sendError(res, 404, 'KYC_NOT_FOUND', 'KYC submission not found');

  Object.assign(sub, req.body);
  return sendSuccess(res, 200, 'Submitted KYC record updated', sub);
});

router.delete('/admin/kyc/submissions/:id', async (req: Request, res: Response) => {
  const submissionId = String(req.params.id);
  const index = db.kycSubmissions.findIndex((s) => s.id === submissionId || s.userId === submissionId);
  if (index !== -1) db.kycSubmissions.splice(index, 1);
  await deleteKycById(submissionId);
  if (submissionId.startsWith('kyc_')) {
    await deleteKycByUserId(submissionId.replace(/^kyc_/, ''));
  }
  return sendSuccess(res, 200, 'KYC submission record purged', { id: submissionId });
});

router.patch('/admin/kyc/submissions/:id/approve', async (req: Request, res: Response) => {
  const sub = await resolveKycSubmission(String(req.params.id));
  if (!sub) return sendError(res, 404, 'KYC_NOT_FOUND', 'KYC submission not found');
  await applyKycDecision(sub, 'approved');
  return sendSuccess(res, 200, 'KYC application approved', sub);
});

router.patch('/admin/kyc/submissions/:id/reject', async (req: Request, res: Response) => {
  const sub = await resolveKycSubmission(String(req.params.id));
  if (!sub) return sendError(res, 404, 'KYC_NOT_FOUND', 'KYC submission not found');
  await applyKycDecision(sub, 'rejected');
  return sendSuccess(res, 200, 'KYC application rejected', sub);
});

router.patch('/admin/kyc/submissions/:id/reupload', (req: Request, res: Response) => {
  const sub = db.kycSubmissions.find((s) => s.id === req.params.id);
  if (sub) sub.status = 'reupload_requested';
  return sendSuccess(res, 200, 'Document reupload requested', sub || { id: req.params.id, status: 'reupload_requested' });
});

router.post('/admin/kyc/:farmer_id/verify-bank', (req: Request, res: Response) => {
  const sub = db.kycSubmissions.find((s) => s.userId === req.params.farmer_id);
  if (sub) sub.bankVerified = true;
  return sendSuccess(res, 200, 'Razorpay ₹1 penny-drop bank verification initiated', {
    farmerId: req.params.farmer_id,
    transactionId: 'penny_drop_tx_' + Date.now(),
    status: 'success',
  });
});

router.get('/admin/kyc/:farmer_id/bank-status', (req: Request, res: Response) => {
  const sub = db.kycSubmissions.find((s) => s.userId === req.params.farmer_id);
  return sendSuccess(res, 200, 'Bank verification status retrieved', {
    farmerId: req.params.farmer_id,
    isVerified: sub ? sub.bankVerified : true,
    accountNameMatchScore: 98,
  });
});

export default router;
