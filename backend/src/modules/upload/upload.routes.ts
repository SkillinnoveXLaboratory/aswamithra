import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../utils/async-handler';
import { authenticateJwt } from '../../middlewares/auth.middleware';
import {
  buildUploadFilename,
  ensureUploadDir,
  publicUploadUrl,
  saveBase64Upload,
  sanitizeUploadFolder,
} from '../../utils/local-upload';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const folder = sanitizeUploadFolder((req.query.folder as string) || (req.body?.folder as string));
    const { dir } = ensureUploadDir(folder);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, buildUploadFilename(file.originalname, file.mimetype));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/') ||
      file.mimetype === 'application/pdf'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only image, video, or PDF files are allowed'));
    }
  },
});

function toUploadResponse(file: Express.Multer.File, folder: string) {
  const isVideo = file.mimetype.startsWith('video/');
  const isDocument = file.mimetype === 'application/pdf';
  const format = path.extname(file.filename).replace('.', '') || (isVideo ? 'mp4' : isDocument ? 'pdf' : 'jpg');
  return {
    url: publicUploadUrl(folder, file.filename),
    filename: file.filename,
    folder,
    type: isVideo ? 'video' : isDocument ? 'document' : 'image',
    format,
    sizeBytes: file.size,
  };
}

/**
 * Unified Media Upload Endpoint for Images and Videos
 * POST /api/v1/uploads
 * Accepts multipart form-data ('file' or 'files') OR JSON payload { base64: "..." }
 */
router.post(
  '/uploads',
  authenticateJwt({ optional: true }),
  upload.any(),
  asyncHandler(async (req: Request, res: Response) => {
    const folder = sanitizeUploadFolder((req.query.folder as string) || (req.body?.folder as string));
    const files = req.files as Express.Multer.File[];

    if (files && files.length > 0) {
      const nonEmpty = files.filter((file) => file.size > 0);
      if (!nonEmpty.length) {
        return sendError(res, 400, 'EMPTY_FILE', 'Uploaded file is empty. Please choose a valid image and try again.');
      }

      const results = nonEmpty.map((file) => toUploadResponse(file, folder));

      if (results.length === 1) {
        const single = results[0];
        const label = single.type === 'video' ? 'Video' : single.type === 'document' ? 'Document' : 'Image';
        return sendSuccess(res, 201, `${label} uploaded successfully`, single);
      }

      return sendSuccess(res, 201, `${results.length} media files uploaded successfully`, {
        urls: results.map((item) => item.url),
        files: results,
      });
    }

    if (req.body && req.body.base64) {
      const result = saveBase64Upload(req.body.base64, folder);
      const label = result.type === 'video' ? 'Video' : result.type === 'document' ? 'Document' : 'Image';
      return sendSuccess(res, 201, `${label} uploaded successfully`, result);
    }

    return sendError(
      res,
      400,
      'NO_MEDIA_PROVIDED',
      'Please upload an image, video, or PDF via multipart form-data ("file" or "files") or provide a "base64" payload.'
    );
  })
);

export default router;
