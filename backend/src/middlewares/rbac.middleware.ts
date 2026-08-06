import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { sendError } from '../utils/response';

export const requireRoles = (roles: Array<'customer' | 'farmer' | 'b2b' | 'admin'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role || 'customer';

    if (!roles.includes(userRole) && userRole !== 'admin') {
      return sendError(
        res,
        403,
        'FORBIDDEN',
        `Role ${userRole} is not authorized to access this resource. Allowed roles: ${roles.join(', ')}`
      );
    }

    return next();
  };
};
