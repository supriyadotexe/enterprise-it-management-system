import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { mysqlOffsetFor } from './timezone.js';

/**
 * The same numeric offset is used for mysql2's client-side conversion and for
 * every server-side MySQL session. A named zone is not used because a default
 * Windows MySQL installation does not load the named time-zone tables.
 */
export const MYSQL_TIMEZONE_OFFSET = mysqlOffsetFor(env.appTimezone);

/**
 * Create the application pool. The pool is not opened at import time; callers
 * create it when the API starts, and every physical connection is initialised
 * with the approved session time zone before it is handed to a caller.
 */
export function createDatabasePool(overrides = {}) {
  const pool = mysql.createPool({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    database: env.database.name,
    charset: 'utf8mb4',
    timezone: MYSQL_TIMEZONE_OFFSET,
    // Keep DATE/DATETIME values as the exact strings MySQL stores. This avoids
    // losing microseconds when an event timestamp is copied into the audit
    // table and makes API responses deterministic.
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ...overrides,
  });

  pool.on('connection', (connection) => {
    connection.query("SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci", (error) => {
      if (error) {
        connection.destroy();
        return;
      }
      connection.query('SET time_zone = ?', [MYSQL_TIMEZONE_OFFSET], (timezoneError) => {
        if (timezoneError) {
          connection.destroy();
        }
      });
    });
  });

  return pool;
}
