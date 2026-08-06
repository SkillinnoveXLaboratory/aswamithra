import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export const validateRequiredFields = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing: string[] = [];

    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        `Missing required payload fields: ${missing.join(', ')}`
      );
    }

    return next();
  };
};
