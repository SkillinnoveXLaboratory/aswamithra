import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt';
import { db, User } from '../store/db.store';
import { sendError } from '../utils/response';
import { findUserById, toStoreUser } from '../services/sql-store';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const authenticateJwt = (options: { optional?: boolean } = {}) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (options.optional) {
        return next();
      }
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required. Missing Bearer token.');
    }

    const token = authHeader.substring(7);
    const payload = verifyJwt(token);

    if (!payload) {
      if (options.optional) {
        return next();
      }
      return sendError(res, 401, 'UNAUTHORIZED', 'Invalid or expired JWT authentication token.');
    }

    let user: User | undefined = db.users.find((u) => u.id === payload.id);
    if (!user) {
      try {
        const row = await findUserById(String(payload.id));
        if (row) user = { ...toStoreUser(row) } as User;
      } catch {
        // Fall through to JWT payload shell.
      }
    }
    if (!user) {
      user = {
        id: payload.id,
        mobile: payload.mobile,
        name: payload.name,
        role: payload.role,
        status: 'active',
        language: 'te',
        createdAt: new Date().toISOString(),
      };
    }

    if (user.status === 'suspended') {
      return sendError(res, 403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended.');
    }

    req.user = user;
    return next();
  };
};
