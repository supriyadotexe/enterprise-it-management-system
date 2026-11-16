import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, env.bcryptRounds);
}

export function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}
