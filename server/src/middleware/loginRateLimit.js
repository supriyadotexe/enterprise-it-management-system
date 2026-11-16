import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;
const attempts = new Map();

function keyFor(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Small in-memory login limiter for the prototype. A production deployment
 * would use a shared store (Redis) behind a load balancer. Tests skip the
 * limiter so a test run cannot exhaust the window.
 */
export function loginRateLimit(req, res, next) {
  if (env.isTest) return next();

  const key = keyFor(req);
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || record.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    res.set('Retry-After', String(retryAfter));
    return next(
      new ApiError(
        429,
        'TOO_MANY_LOGIN_ATTEMPTS',
        'Too many login attempts. Try again later.',
      ),
    );
  }

  record.count += 1;
  return next();
}
