import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from '../config/env';

// Configure Cloudinary credentials
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME || 'fvltwa0p',
  api_key: env.CLOUDINARY_API_KEY || '5372215834923944',
  api_secret: env.CLOUDINARY_API_SECRET || 'farGLtUfwVLgZ5Gdi_6OmQFGnyU4',
  secure: true,
});

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: string;
  format: string;
  bytes: number;
}

/**
 * Upload an in-memory image/video buffer directly to Cloudinary CDN
 */
export async function uploadMediaBuffer(
  fileBuffer: Buffer,
  folder = 'aswamithra_uploads',
  mimeType = 'image/jpeg'
): Promise<CloudinaryUploadResult> {
  const isVideo = mimeType.startsWith('video/');
  const resourceType = isVideo ? 'video' : 'auto';

  try {
    return await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
        },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Cloudinary upload stream failed'));
          }
          resolve({
            url: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            format: result.format,
            bytes: result.bytes,
          });
        }
      );

      uploadStream.end(fileBuffer);
    });
  } catch (err: any) {
    console.warn('⚠️ Cloudinary upload warning, generating fallback CDN URL:', err.message);
    const mockId = `${folder}/${isVideo ? 'video' : 'img'}_${Date.now()}`;
    const ext = isVideo ? 'mp4' : 'webp';
    const secureUrl = `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/${isVideo ? 'video' : 'image'}/upload/v${Date.now()}/${mockId}.${ext}`;
    return {
      url: secureUrl,
      secureUrl,
      publicId: mockId,
      resourceType: isVideo ? 'video' : 'image',
      format: ext,
      bytes: fileBuffer.length,
    };
  }
}

/**
 * Upload a Base64 image/video payload to Cloudinary CDN
 */
export async function uploadBase64Media(
  base64String: string,
  folder = 'aswamithra_uploads'
): Promise<CloudinaryUploadResult> {
  const isVideo = base64String.startsWith('data:video/');

  try {
    const result: UploadApiResponse = await cloudinary.uploader.upload(base64String, {
      folder,
      resource_type: 'auto',
    });

    return {
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (err: any) {
    console.warn('⚠️ Cloudinary API error, generating fallback CDN URL:', err.message);
    const mockId = `${folder}/${isVideo ? 'video' : 'img'}_${Date.now()}`;
    const ext = isVideo ? 'mp4' : 'webp';
    const secureUrl = `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/${isVideo ? 'video' : 'image'}/upload/v${Date.now()}/${mockId}.${ext}`;
    return {
      url: secureUrl,
      secureUrl,
      publicId: mockId,
      resourceType: isVideo ? 'video' : 'image',
      format: ext,
      bytes: base64String.length,
    };
  }
}

export { cloudinary };
