import http from 'http';
import app from '../app';
import { uploadBase64Media } from '../utils/cloudinary';
import { env } from '../config/env';

const PORT = 3099;
let server: http.Server;

async function testCloudinaryUploads() {
  console.log('\n================================================================');
  console.log('☁️ TESTING UNIFIED POST /api/v1/uploads (IMAGES & VIDEOS)');
  console.log('================================================================\n');

  console.log(`📌 Cloudinary Cloud Name: ${env.CLOUDINARY_CLOUD_NAME}`);
  console.log(`📌 Endpoint: POST http://localhost:${PORT}/api/v1/uploads\n`);

  server = app.listen(PORT);

  try {
    // 1. Direct Cloudinary SDK Image & Video Test
    console.log('--- 1. Testing Image & Video Cloudinary SDK Uploads ---');
    const sampleImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const sampleVideoBase64 = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAA=';
    
    const imgRes = await uploadBase64Media(sampleImageBase64, 'aswamithra_tests');
    console.log('  ✅ Image Upload Result:', imgRes.secureUrl);

    const vidRes = await uploadBase64Media(sampleVideoBase64, 'aswamithra_tests');
    console.log('  ✅ Video Upload Result:', vidRes.secureUrl);

    // 2. HTTP POST /api/v1/uploads Test
    console.log('\n--- 2. Testing HTTP POST /api/v1/uploads Endpoint ---');
    const postData = JSON.stringify({
      base64: sampleImageBase64,
      folder: 'aswamithra_products',
    });

    const httpRes = await new Promise<{ status: number; body: any }>((resolve, reject) => {
      const req = http.request(
        `http://localhost:${PORT}/api/v1/uploads`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            resolve({ status: res.statusCode || 500, body: JSON.parse(data) });
          });
        }
      );
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    if (httpRes.status === 201 && httpRes.body.success) {
      console.log('  ✅ HTTP POST /api/v1/uploads Success! HTTP 201');
      console.log('     Media CDN URL:', httpRes.body.data.url);
      console.log('     Type:', httpRes.body.data.type);
    } else {
      console.error('  ❌ HTTP POST /api/v1/uploads Failed:', httpRes.body);
    }

  } catch (err: any) {
    console.error('❌ Test Exception:', err.message);
  } finally {
    server.close();
    console.log('\n================================================================');
    console.log('🎉 UNIFIED MEDIA UPLOADS VERIFICATION COMPLETE');
    console.log('================================================================\n');
  }
}

testCloudinaryUploads();
