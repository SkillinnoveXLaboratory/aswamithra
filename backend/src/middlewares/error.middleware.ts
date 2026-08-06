import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected server error occurred';
  let field: string | null = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    field = err.details ? err.details.field || null : null;
  } else if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    statusCode = 400;
    code = 'MALFORMED_JSON';
    message = 'Malformed JSON body payload in request';
  } else if (err && err.code === '23505') {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'A resource with the specified unique key already exists';
  } else if (err && err.statusCode) {
    statusCode = err.statusCode;
    code = err.code || 'BAD_REQUEST';
    message = err.message || 'Operation failed';
  } else if (err && err.message) {
    message = err.message;
  }

  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code,
      message,
      field,
    },
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    data: null,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found on this server`,
      field: null,
    },
  });
};
