import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

function requireSecret() {
  if (!env.jwt.secret) {
    throw new Error('JWT_SECRET is not configured.');
  }
}

export function signAccessToken({ userId, role, employeeId }) {
  requireSecret();
  return jwt.sign(
    {
      sub: userId,
      role,
      employeeId,
    },
    env.jwt.secret,
    {
      algorithm: 'HS256',
      expiresIn: env.jwt.expiresIn,
    },
  );
}

export function verifyAccessToken(token) {
  requireSecret();
  return jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] });
}
