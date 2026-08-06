import http from 'http';
import app from './app';
import { env } from './config/env';
import { setupWebSocketServer } from './websocket/ws.server';
import { testDbConnection } from './config/db.config';
import { ensureTablesReady, seedFromMemoryIfEmpty } from './services/sql-store';

const server = http.createServer(app);

// Initialize WebSocket Broadcaster
setupWebSocketServer(server);

server.listen(env.PORT, async () => {
  console.log(`=======================================================`);
  console.log(`🚀 Aswamithra REST API Server live on port ${env.PORT}`);
  console.log(`🐘 Database: PostgreSQL (${env.DATABASE_URL.split('@')[1] || 'localhost'})`);
  console.log(`☁️  Cloudinary Storage: ${env.CLOUDINARY_CLOUD_NAME}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${env.PORT}/api/v1/ws`);
  console.log(`⚡ Environment: ${env.NODE_ENV}`);
  console.log(`=======================================================`);
  try {
    await testDbConnection();
    await ensureTablesReady();
    await seedFromMemoryIfEmpty();
  } catch (error) {
    console.warn('⚠️ PostgreSQL bootstrap skipped, continuing with the in-memory fallback:', error);
  }
});
