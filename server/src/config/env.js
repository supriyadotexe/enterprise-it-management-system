import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(currentDir, '..', '..');

dotenv.config({ path: path.join(serverRoot, '.env') });

const raw = process.env;

function fail(message) {
  throw new Error(`[env] ${message}`);
}

function readNodeEnv() {
  const value = raw.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(value)) {
    fail('NODE_ENV must be development, test or production');
  }
  return value;
}

function readInteger(name, fallback, { min, max }) {
  const input = raw[name];
  if (input === undefined || input.trim() === '') return fallback;

  const value = Number(input);
  if (!Number.isInteger(value) || value < min || value > max) {
    fail(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function readOrigins() {
  const input = raw.CLIENT_ORIGIN ?? 'http://localhost:5173';
  const origins = input
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (origins.length === 0) fail('CLIENT_ORIGIN must contain at least one origin');

  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      fail(`CLIENT_ORIGIN contains an invalid URL: ${origin}`);
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      fail(`CLIENT_ORIGIN must use http or https: ${origin}`);
    }
  }

  return origins;
}

function readTimezone() {
  const timezone = raw.APP_TIMEZONE ?? 'Asia/Kolkata';

  if (timezone.startsWith('+') || timezone.startsWith('-') || timezone.includes(' ')) {
    fail('APP_TIMEZONE must be an IANA name such as Asia/Kolkata, not a numeric offset');
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
  } catch {
    fail(`APP_TIMEZONE is not a valid IANA time zone: ${timezone}`);
  }

  return timezone;
}

const nodeEnv = readNodeEnv();
const jwtSecret = raw.JWT_SECRET?.trim() ?? '';

if (jwtSecret && jwtSecret.length < 32) {
  fail('JWT_SECRET must be at least 32 characters when provided');
}

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  serviceName: 'eitams-api',
  version: '0.1.0',
  port: readInteger('PORT', 5000, { min: 1, max: 65535 }),
  clientOrigins: Object.freeze(readOrigins()),
  appTimezone: readTimezone(),
  database: Object.freeze({
    host: raw.DB_HOST ?? '127.0.0.1',
    port: readInteger('DB_PORT', 3306, { min: 1, max: 65535 }),
    user: raw.DB_USER ?? '',
    password: raw.DB_PASSWORD ?? '',
    name: raw.DB_NAME ?? 'eitams',
    testName: raw.DB_TEST_NAME ?? 'eitams_test',
  }),
  jwt: Object.freeze({
    secret: jwtSecret,
    expiresIn: raw.JWT_EXPIRES_IN ?? '8h',
  }),
  bcryptRounds: readInteger('BCRYPT_ROUNDS', 12, { min: 4, max: 15 }),
});
