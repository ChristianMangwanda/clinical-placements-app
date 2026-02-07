import mysql from "mysql2/promise";

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || "mysql.clarksonmsda.org",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "mangwazc",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "mangwazc_Clinical Database",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// Create a connection pool (singleton pattern for serverless)
let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

// Helper function for executing queries with automatic connection management
export async function query<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const connection = await getPool().getConnection();
  try {
    const [rows] = await connection.execute(sql, params);
    return rows as T[];
  } finally {
    connection.release();
  }
}

// Helper for single row queries
export async function queryOne<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper for INSERT/UPDATE/DELETE operations
export async function execute(
  sql: string,
  params?: unknown[]
): Promise<mysql.ResultSetHeader> {
  const connection = await getPool().getConnection();
  try {
    const [result] = await connection.execute(sql, params);
    return result as mysql.ResultSetHeader;
  } finally {
    connection.release();
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await getPool().getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

// Escape identifiers (table/column names) for dynamic queries
// Note: The database name has a space, so always use backticks
export function escapeId(identifier: string): string {
  return `\`${identifier.replace(/`/g, "``")}\``;
}
