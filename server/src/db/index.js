import { createDatabasePool } from './pool.js';
import { env } from '../config/env.js';

let pool = null;

/**
 * Return the shared application pool, creating it on first use. The pool is
 * deliberately lazy so tests can set their database name before the first
 * query and so the health endpoint remains usable during a database outage.
 */
export function getPool() {
  if (!pool) {
    pool = createDatabasePool({
      database: env.isTest ? env.database.testName : env.database.name,
      connectionLimit: env.isTest ? 5 : 10,
      multipleStatements: false,
    });
  }
  return pool;
}

/** Run a parameterised query on the shared pool. Services only. */
export function query(sql, params = []) {
  return getPool().query(sql, params);
}

/** Run a parameterised statement on the shared pool. Services only. */
export function execute(sql, params = []) {
  return getPool().execute(sql, params);
}

/**
 * Execute a callback with a dedicated connection inside a transaction.
 * The callback receives the connection and MUST use it for every statement.
 */
export async function withTransaction(callback) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('[db] Transaction rollback failed', rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
}

/** Verify connectivity and the approved session time zone at startup. */
export async function verifyDatabaseConnection() {
  const [rows] = await query(
    'SELECT 1 AS ok, DATABASE() AS database_name, @@session.time_zone AS time_zone',
  );
  const row = rows[0];
  if (!row || row.ok !== 1) {
    throw new Error('Database connection check did not return the expected result.');
  }
  return row;
}

/** Close the pool. Used by tests and graceful shutdown. */
export async function closePool() {
  if (!pool) return;
  const closing = pool;
  pool = null;
  await closing.end();
}
