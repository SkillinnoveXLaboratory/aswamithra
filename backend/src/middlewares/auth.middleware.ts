import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt';
import { db, User } from '../store/db.store';
import { sendError } from '../utils/response';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const authenticateJwt = (options: { optional?: boolean } = {}) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

    // Dynamic Database User Lookup
    const user = db.users.find((u) => u.id === payload.id) || {
      id: payload.id,
      mobile: payload.mobile,
      name: payload.name,
      role: payload.role,
      status: 'active' as const,
      language: 'te',
      createdAt: new Date().toISOString(),
    };

    if (user.status === 'suspended') {
      return sendError(res, 403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended.');
    }

    req.user = user;
    return next();
  };
};
