import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'application/pdf': '.pdf',
};

export interface LocalUploadResult {
  url: string;
  filename: string;
  folder: string;
  type: 'image' | 'video' | 'document';
  format: string;
  sizeBytes: number;
}

export function sanitizeUploadFolder(folder?: string) {
  const cleaned = String(folder || 'products').replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned || 'products';
}

export function ensureUploadDir(folder?: string) {
  const safeFolder = sanitizeUploadFolder(folder);
  const dir = path.join(UPLOADS_ROOT, safeFolder);
  fs.mkdirSync(dir, { recursive: true });
  return { dir, safeFolder };
}

export function buildUploadFilename(originalName: string, mimeType: string) {
  const extFromName = path.extname(originalName || '').toLowerCase();
  const ext = extFromName || MIME_EXT[mimeType] || '.bin';
  const id = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  return `${id}${ext}`;
}

export function publicUploadUrl(folder: string, filename: string) {
  return `/uploads/${folder}/${filename}`;
}

export function saveUploadBuffer(
  buffer: Buffer,
  options: { folder?: string; originalName?: string; mimeType?: string }
): LocalUploadResult {
  const mimeType = options.mimeType || 'application/octet-stream';
  const { dir, safeFolder } = ensureUploadDir(options.folder);
  const filename = buildUploadFilename(options.originalName || 'upload', mimeType);
  const filePath = path.join(dir, filename);

  fs.writeFileSync(filePath, buffer);

  const isVideo = mimeType.startsWith('video/');
  const isDocument = mimeType === 'application/pdf' || mimeType.startsWith('application/');
  const format = path.extname(filename).replace('.', '') || (isVideo ? 'mp4' : isDocument ? 'pdf' : 'jpg');

  return {
    url: publicUploadUrl(safeFolder, filename),
    filename,
    folder: safeFolder,
    type: isVideo ? 'video' : isDocument ? 'document' : 'image',
    format,
    sizeBytes: buffer.length,
  };
}

export function saveBase64Upload(base64String: string, folder?: string): LocalUploadResult {
  const match = base64String.match(/^data:([^;]+);base64,(.+)$/);
  const mimeType = match?.[1] || 'image/png';
  const payload = match?.[2] || base64String;
  const buffer = Buffer.from(payload, 'base64');
  return saveUploadBuffer(buffer, { folder, originalName: `upload${MIME_EXT[mimeType] || '.png'}`, mimeType });
}
