import { Pool, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';

const rawConnectionString = env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aswamithra';
const connectionUrl = new URL(rawConnectionString);
connectionUrl.searchParams.delete('sslmode');

export const pool = new Pool({
  connectionString: connectionUrl.toString(),
  ssl: env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('🔥 Unexpected PostgreSQL pool client error:', err);
});

export const query = async <T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (env.NODE_ENV === 'development') {
      console.log(`🐘 [PostgreSQL Query] (${duration}ms):`, text.trim().substring(0, 100));
    }
    return res;
  } catch (error) {
    console.error('❌ PostgreSQL Query Error:', error);
    throw error;
  }
};

export async function testDbConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ PostgreSQL Database connected successfully at:', res.rows[0].now);
    return true;
  } catch (err: any) {
    console.warn('⚠️ PostgreSQL local connection warning (falling back to synchronized SQL state repository):', err.message);
    return false;
  }
}
