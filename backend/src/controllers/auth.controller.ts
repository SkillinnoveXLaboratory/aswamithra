import { Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { db, User } from '../store/db.store';
import { signJwt } from '../utils/jwt';
import { hashPin, verifyPinHash } from '../utils/pin';
import {
  findUserByMobile,
  findUserById,
  getUserPinHash,
  setUserPinHash,
  upsertKyc,
  upsertUser,
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

  private static async resolveUserForLogin(mobile: string, role?: string) {
    const dbUser = await findUserByMobile(mobile);
    let user: AuthUser | undefined = dbUser ? { ...toStoreUser(dbUser) } : db.users.find((u) => u.mobile === mobile);
    let isNewUser = false;
    let isPendingApproval = false;

    if (!user) {
      const initialStatus = role === 'farmer' || role === 'b2b' ? 'pending_kyc' : 'active';
      user = {
        id: 'usr_' + Date.now(),
        mobile,
        name: role === 'farmer' ? 'New Farmer' : role === 'b2b' ? 'New B2B Business' : 'New Customer',
        role: (role || 'customer') as User['role'],
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

    const kycSub = db.kycSubmissions.find((sub) => sub.userId === user!.id);
    if ((user.role === 'farmer' || user.role === 'b2b') && (!kycSub || kycSub.status !== 'approved')) {
      user.status = 'pending_kyc';
      isPendingApproval = true;
      if (!kycSub) {
        const pendingSub = {
          id: `kyc_sub_${Date.now()}`,
          userId: user.id,
          name: user.name,
          role: user.role as 'farmer' | 'b2b',
          status: 'pending' as const,
          bankVerified: false,
          submittedAt: new Date().toISOString(),
        };
        db.kycSubmissions.push(pendingSub);
        await upsertKyc(pendingSub);
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

    if (user.status === 'pending_kyc' && (user.role === 'farmer' || user.role === 'b2b')) {
      isPendingApproval = true;
    }

    return { user, isNewUser, isPendingApproval };
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

    const { user, isNewUser, isPendingApproval } = await AuthController.resolveUserForLogin(mobile, role);

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
      user: toPublicUser(user),
    });
  }

  public static async loginPin(req: AuthenticatedRequest, res: Response) {
    const { mobile, pin, role } = req.body;
    if (!mobile || !pin) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Mobile number and 4-digit PIN are required');
    }
    if (String(pin).length !== 4 || !/^\d{4}$/.test(String(pin))) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'A 4-digit security PIN is required');
    }

    const dbUser = await findUserByMobile(mobile);
    const memoryUser = db.users.find((u) => u.mobile === mobile);
    const user = dbUser ? { ...toStoreUser(dbUser) } : memoryUser ? toPublicUser(memoryUser) : undefined;
    if (!user) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid mobile number or security PIN');
    }

    if (role && user.role !== role) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid mobile number or security PIN');
    }

    if (user.status === 'suspended') {
      return sendError(res, 403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended.');
    }

    const storedHash = await AuthController.resolvePinHash(user.id);
    if (!storedHash || !(await verifyPinHash(String(pin), storedHash))) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid mobile number or security PIN');
    }

    const isPendingApproval = user.status === 'pending_kyc' && (user.role === 'farmer' || user.role === 'b2b');

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
