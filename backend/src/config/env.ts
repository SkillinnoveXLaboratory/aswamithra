import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: process.env.PORT || 3099,
  NODE_ENV: process.env.NODE_ENV || 'development',
  BASE_URL: process.env.BASE_URL || 'http://localhost:3099',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aswamithra',
  JWT_SECRET: process.env.JWT_SECRET || 'aswamithra_production_jwt_secret_key_2026',
  
  // Cloudinary Storage Settings
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || 'fvltwa0p',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '5372215834923944',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || 'farGLtUfwVLgZ5Gdi_6OmQFGnyU4',
  CLOUDINARY_URL: process.env.CLOUDINARY_URL || 'cloudinary://5372215834923944:farGLtUfwVLgZ5Gdi_6OmQFGnyU4@fvltwa0p',

  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
};
