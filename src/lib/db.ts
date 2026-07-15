import { Pool, QueryResult, QueryResultRow } from "pg";

// Database configuration from environment variables
// Supabase provides a DATABASE_URL connection string
const connectionString = process.env.DATABASE_URL;

// Fallback to individual env vars if DATABASE_URL not set
const poolConfig = connectionString
  ? {
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "postgres",
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

// Create a connection pool (singleton pattern for serverless)
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(poolConfig);

    // Handle pool errors
    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });
  }
  return pool;
}

// Helper function for executing queries with automatic connection management
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result: QueryResult<T> = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// Helper for single row queries
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Escape identifiers (table/column names) for dynamic queries
// PostgreSQL uses double quotes for identifiers
export function escapeId(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}
