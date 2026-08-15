import http from 'http';
import app from './app';
import { env } from './config/env';
import { setupWebSocketServer } from './websocket/ws.server';
import { testDbConnection } from './config/db.config';
import { ensureTablesReady, seedFromMemoryIfEmpty } from './services/sql-store';

const server = http.createServer(app);

// Initialize WebSocket Broadcaster
setupWebSocketServer(server);

async function bootstrap() {
  console.log(`=======================================================`);
  console.log(`🚀 Aswamithra REST API Server booting on port ${env.PORT}`);
  console.log(`🐘 Database: PostgreSQL (${env.DATABASE_URL.split('@')[1] || 'localhost'})`);
  console.log(`☁️  Cloudinary Storage: ${env.CLOUDINARY_CLOUD_NAME}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${env.PORT}/api/v1/ws`);
  console.log(`⚡ Environment: ${env.NODE_ENV}`);
  console.log(`=======================================================`);
  await testDbConnection();
  await ensureTablesReady();
  await seedFromMemoryIfEmpty();
  server.listen(env.PORT, () => {
    console.log(`✅ Aswamithra REST API Server live on port ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('❌ Failed to bootstrap server:', error);
  process.exit(1);
});
