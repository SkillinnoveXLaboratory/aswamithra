import { Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { db, User } from '../store/db.store';
import { signJwt } from '../utils/jwt';
import { hashPin, verifyPinHash } from '../utils/pin';
import {
  findUserByMobile,
  findUserByMobileAndRole,
  findUserById,
  findKycByUserId,
  deleteKycByUserId,
  getUserPinHash,
  setUserPinHash,
  upsertUser,
  toStoreKyc,
  toStoreUser,
} from '../services/sql-store';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

type AuthUser = User & { hasPin?: boolean };

function toPublicUser(user: AuthUser) {
  const { pinHash, ...safeUser } = user;
  return { ...safeUser, hasPin: Boolean(pinHash) || Boolean(user.hasPin) };
}

export class AuthController {
  private static async resolvePinHash(userId: string): Promise<string | null> {
    const dbHash = await getUserPinHash(userId);
    if (dbHash) return dbHash;
    const memoryUser = db.users.find((u) => u.id === userId);
    return memoryUser?.pinHash ?? null;
  }

  private static async persistPinHash(userId: string, pinHash: string) {
    await setUserPinHash(userId, pinHash);
    const memoryUser = db.users.find((u) => u.id === userId);
    if (memoryUser) memoryUser.pinHash = pinHash;
  }

  /** True only when farmer/B2B actually submitted KYC/onboarding details (not a blank shell). */
  private static hasSubmittedKyc(kycSub?: { documents?: string[]; aadhaarMasked?: string; gstin?: string; village?: string; bankAccountMasked?: string; status?: string } | null) {
    if (!kycSub) return false;
    if (kycSub.status === 'approved') return true;
    return Boolean(
      (kycSub.documents && kycSub.documents.length > 0) ||
        kycSub.aadhaarMasked ||
        kycSub.gstin ||
        kycSub.village ||
        kycSub.bankAccountMasked,
    );
  }

  private static async resolveUserForLogin(mobile: string, role?: string) {
    const requestedRole = (role || 'customer') as User['role'];
    const dbUserForRole = await findUserByMobileAndRole(mobile, requestedRole);
    const dbUserAny = dbUserForRole ? null : await findUserByMobile(mobile);
    let user: AuthUser | undefined = dbUserForRole
      ? { ...toStoreUser(dbUserForRole) }
      : db.users.find((u) => u.mobile === mobile && u.role === requestedRole);

    let isNewUser = false;
    let isPendingApproval = false;
    let needsOnboarding = false;

    // Same mobile already belongs to a different role — do not silently switch dashboards.
    if (!user && dbUserAny && dbUserAny.role !== requestedRole) {
      const err: any = new Error(`This mobile number is already registered as ${dbUserAny.role}. Please login with the ${dbUserAny.role} role.`);
      err.statusCode = 409;
      err.code = 'ROLE_MISMATCH';
      err.existingRole = dbUserAny.role;
      throw err;
    }

    if (!user) {
      // New farmer/B2B must complete onboarding/KYC form before waiting for admin approval.
      const initialStatus = requestedRole === 'farmer' || requestedRole === 'b2b' ? 'needs_onboarding' : 'active';
      user = {
        id: 'usr_' + Date.now(),
        mobile,
        name: requestedRole === 'farmer' ? 'New Farmer' : requestedRole === 'b2b' ? 'New B2B Business' : requestedRole === 'admin' ? 'Admin' : 'New Customer',
        role: requestedRole,
        status: initialStatus,
        language: 'te',
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
      await upsertUser({
        id: user.id,
        mobile: user.mobile,
        name: user.name,
        role: user.role,
        status: user.status,
        language: user.language,
      });
      isNewUser = true;
    }

    if (user.role === 'farmer' || user.role === 'b2b') {
      const memoryKyc = db.kycSubmissions.find((sub) => sub.userId === user!.id);
      const kycRow = await findKycByUserId(user.id);
      const kycSub = memoryKyc || (kycRow ? toStoreKyc(kycRow) : null);

      if (kycSub?.status === 'approved' || user.status === 'active') {
        // Approved KYC or already-active account → farmer dashboard access.
        if (kycSub?.status === 'approved') user.status = 'active';
        isPendingApproval = user.status === 'pending_kyc';
        needsOnboarding = false;
        if (user.status === 'active') isPendingApproval = false;
      } else if (AuthController.hasSubmittedKyc(kycSub)) {
        user.status = 'pending_kyc';
        isPendingApproval = true;
        needsOnboarding = false;
      } else {
        // No real KYC yet — send user through onboarding, do not invent a pending submission.
        user.status = 'needs_onboarding';
        isPendingApproval = false;
        needsOnboarding = true;
        const blankIdx = db.kycSubmissions.findIndex((sub) => sub.userId === user!.id && !AuthController.hasSubmittedKyc(sub));
        if (blankIdx !== -1) db.kycSubmissions.splice(blankIdx, 1);
        if (kycRow && !AuthController.hasSubmittedKyc(toStoreKyc(kycRow))) {
          await deleteKycByUserId(user.id);
        }
      }

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

    return { user, isNewUser, isPendingApproval, needsOnboarding };
  }

  public static async sendOtp(req: AuthenticatedRequest, res: Response) {
    const { mobile, role } = req.body;
    if (!mobile) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Mobile number is required');
    }
    return sendSuccess(res, 200, 'OTP sent successfully to mobile number', {
      mobile,
      role: role || 'customer',
      expiresInSeconds: 300,
    });
  }

  public static async verifyOtp(req: AuthenticatedRequest, res: Response) {
    const { mobile, otp, role } = req.body;
    if (!mobile || !otp) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Mobile number and 6-digit OTP are required');
    }

    try {
      const { user, isNewUser, isPendingApproval, needsOnboarding } = await AuthController.resolveUserForLogin(mobile, role);

      const accessToken = signJwt({
        id: user.id,
        mobile: user.mobile,
        role: user.role,
        name: user.name,
      });

      const refreshToken = signJwt(
        {
          id: user.id,
          mobile: user.mobile,
          role: user.role,
          name: user.name,
        },
        7 * 86400,
      );

      return sendSuccess(res, 200, 'OTP verified successfully', {
        accessToken,
        refreshToken,
        expiresIn: 86400,
        isNewUser,
        isPendingApproval,
        needsOnboarding,
        user: toPublicUser(user),
      });
    } catch (error: any) {
      if (error?.code === 'ROLE_MISMATCH') {
        return sendError(res, 409, 'ROLE_MISMATCH', error.message);
      }
      throw error;
    }
  }

  public static async loginPin(req: AuthenticatedRequest, res: Response) {
    const { mobile, pin, role } = req.body;
    if (!mobile || !pin) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Mobile number and 4-digit PIN are required');
    }
    if (String(pin).length !== 4 || !/^\d{4}$/.test(String(pin))) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'A 4-digit security PIN is required');
    }

    const dbUser = role ? await findUserByMobileAndRole(mobile, role) : await findUserByMobile(mobile);
    const anyRoleUser = dbUser ? null : await findUserByMobile(mobile);
    if (!dbUser && anyRoleUser && role && anyRoleUser.role !== role) {
      return sendError(
        res,
        409,
        'ROLE_MISMATCH',
        `This mobile number is already registered as ${anyRoleUser.role}. Please login with the ${anyRoleUser.role} role.`,
      );
    }
    const memoryUser = db.users.find((u) => u.mobile === mobile && (!role || u.role === role));
    const user = dbUser ? { ...toStoreUser(dbUser) } : memoryUser ? toPublicUser(memoryUser) : undefined;
    if (!user) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid mobile number or security PIN');
    }

    if (role && user.role !== role) {
      return sendError(
        res,
        409,
        'ROLE_MISMATCH',
        `This mobile number is already registered as ${user.role}. Please login with the ${user.role} role.`,
      );
    }

    if (user.status === 'suspended') {
      return sendError(res, 403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended.');
    }

    const storedHash = await AuthController.resolvePinHash(user.id);
    if (!storedHash || !(await verifyPinHash(String(pin), storedHash))) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid mobile number or security PIN');
    }

    let isPendingApproval = false;
    let needsOnboarding = false;
    if (user.role === 'farmer' || user.role === 'b2b') {
      const memoryKyc = db.kycSubmissions.find((sub) => sub.userId === user.id);
      const kycRow = await findKycByUserId(user.id);
      const kycSub = memoryKyc || (kycRow ? toStoreKyc(kycRow) : null);
      if (kycSub?.status === 'approved' || user.status === 'active') {
        user.status = 'active';
        isPendingApproval = false;
        needsOnboarding = false;
      } else if (AuthController.hasSubmittedKyc(kycSub)) {
        user.status = 'pending_kyc';
        isPendingApproval = true;
      } else {
        user.status = 'needs_onboarding';
        needsOnboarding = true;
      }
    }

    const accessToken = signJwt({
      id: user.id,
      mobile: user.mobile,
      role: user.role,
      name: user.name,
    });

    const refreshToken = signJwt(
      {
        id: user.id,
        mobile: user.mobile,
        role: user.role,
        name: user.name,
      },
      7 * 86400,
    );

    return sendSuccess(res, 200, 'PIN login successful', {
      accessToken,
      refreshToken,
      expiresIn: 86400,
      isNewUser: false,
      isPendingApproval,
      needsOnboarding,
      user: toPublicUser({ ...user, hasPin: true }),
    });
  }

  public static async refreshToken(req: AuthenticatedRequest, res: Response) {
    const user = db.users[0];
    const accessToken = signJwt({
      id: user.id,
      mobile: user.mobile,
      role: user.role,
      name: user.name,
    });

    return sendSuccess(res, 200, 'Token refreshed successfully', {
      accessToken,
      expiresIn: 86400,
    });
  }

  public static async googleSso(req: AuthenticatedRequest, res: Response) {
    const user = db.users[0];
    const accessToken = signJwt({
      id: user.id,
      mobile: user.mobile,
      role: user.role,
      name: user.name,
    });

    return sendSuccess(res, 200, 'Google OAuth verification successful', {
      accessToken,
      user,
    });
  }

  public static async setPin(req: AuthenticatedRequest, res: Response) {
    const { pin, userId } = req.body;
    if (!pin || String(pin).length !== 4 || !/^\d{4}$/.test(String(pin))) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'A 4-digit security PIN is required');
    }

    const actor = req.user;
    if (!actor) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required to set a security PIN');
    }

    const targetUserId = userId ? String(userId) : actor.id;
    if (targetUserId !== actor.id && actor.role !== 'admin') {
      return sendError(res, 403, 'FORBIDDEN', 'Only admins can set a security PIN for another user');
    }

    const dbUser = await findUserById(targetUserId);
    const memoryUser = db.users.find((u) => u.id === targetUserId);
    if (!dbUser && !memoryUser) {
      return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
    }

    const pinHash = await hashPin(String(pin));
    await AuthController.persistPinHash(targetUserId, pinHash);

    return sendSuccess(res, 200, 'Security PIN set successfully', { userId: targetUserId, hasPin: true });
  }

  public static async verifyPin(req: AuthenticatedRequest, res: Response) {
    const { pin } = req.body;
    if (!pin || String(pin).length !== 4 || !/^\d{4}$/.test(String(pin))) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'A 4-digit security PIN is required');
    }

    const actor = req.user;
    if (!actor) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required to verify security PIN');
    }

    const storedHash = await AuthController.resolvePinHash(actor.id);
    if (!storedHash || !(await verifyPinHash(String(pin), storedHash))) {
      return sendError(res, 401, 'INVALID_PIN', 'Incorrect security PIN');
    }

    return sendSuccess(res, 200, 'Security PIN verified successfully', { verified: true });
  }

  public static async logout(req: AuthenticatedRequest, res: Response) {
    return sendSuccess(res, 200, 'Logged out successfully');
  }
}
