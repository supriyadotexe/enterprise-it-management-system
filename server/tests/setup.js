import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';
import { closePool } from '../src/db/index.js';

export async function resetDatabase() {
  await closePool();

  const connection = await mysql.createConnection({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    multipleStatements: true,
    timezone: '+05:30',
    dateStrings: true,
  });

  const schemaPath = path.resolve(process.cwd(), '..', 'database', 'schema.sql');
  const seedPath = path.resolve(process.cwd(), '..', 'database', 'seed.sql');
  const schema = fs
    .readFileSync(schemaPath, 'utf8')
    .replace(/\beitams\b/g, env.database.testName);
  const seed = fs
    .readFileSync(seedPath, 'utf8')
    .replace(/\beitams\b/g, env.database.testName);

  await connection.query(schema);
  await connection.query(seed);
  await connection.end();
}

export async function login(app, username, password = 'Demo@12345') {
  const response = await (await import('supertest')).default(app)
    .post('/api/v1/auth/login')
    .send({ username, password });

  if (response.status !== 200) {
    throw new Error(`Login failed for ${username}: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body.data.token;
}

beforeEach(async () => {
  await resetDatabase();
});
