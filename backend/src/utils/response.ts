import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export const sendSuccess = (
  res: Response,
  statusCode = 200,
  message = 'Success',
  data: any = null,
  meta: PaginationMeta | any = null
) => {
  let paginationMeta = meta;

  if (!paginationMeta && Array.isArray(data)) {
    paginationMeta = {
      page: 1,
      limit: 50,
      total: data.length,
      total_pages: data.length > 0 ? Math.ceil(data.length / 50) : 1,
    };
  }

  return res.status(statusCode).json({
    success: true,
    data: data !== undefined ? data : {},
    meta: paginationMeta || null,
    error: null,
  });
};

export const sendError = (
  res: Response,
  statusCode = 400,
  code = 'BAD_REQUEST',
  message = 'An error occurred',
  field: string | null = null
) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code,
      message,
      field: field || null,
    },
  });
};
