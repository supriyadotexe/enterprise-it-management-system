import { env } from '../config/env.js';
import { execute, query } from '../db/index.js';
import { ApiError } from '../utils/ApiError.js';
import { signAccessToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

const AUTH_USER_SELECT = `
  SELECT
    u.user_id,
    u.username,
    u.password_hash,
    u.is_active AS user_active,
    u.last_login_at,
    u.role_id,
    r.role_name,
    e.employee_id,
    e.employee_code,
    e.full_name,
    e.email,
    e.phone,
    e.designation,
    e.department_id,
    e.is_active AS employee_active,
    d.name AS department_name
  FROM users AS u
  JOIN roles AS r ON r.role_id = u.role_id
  JOIN employees AS e ON e.employee_id = u.employee_id
  LEFT JOIN departments AS d ON d.department_id = e.department_id
`;

function publicUser(row) {
  return {
    user_id: row.user_id,
    username: row.username,
    role_id: row.role_id,
    role: row.role_name,
    employee_id: row.employee_id,
    employee_code: row.employee_code,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    designation: row.designation,
    department_id: row.department_id,
    department_name: row.department_name,
    user_active: Boolean(row.user_active),
    employee_active: Boolean(row.employee_active),
    is_active: Boolean(row.user_active && row.employee_active),
    last_login_at: row.last_login_at,
  };
}

function isAccountActive(row) {
  return Boolean(row && row.user_active && row.employee_active);
}

export async function login({ username, password }) {
  const [rows] = await query(
    `${AUTH_USER_SELECT}
     WHERE u.username = ?
     LIMIT 1`,
    [username],
  );
  const row = rows[0];

  // Deliberately return the same error for an unknown username, an inactive
  // account and an incorrect password. Do not disclose whether the account
  // exists.
  if (!isAccountActive(row)) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
  }

  const passwordMatches = await verifyPassword(password, row.password_hash);
  if (!passwordMatches) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
  }

  await execute('UPDATE users SET last_login_at = NOW(6) WHERE user_id = ?', [row.user_id]);

  const token = signAccessToken({
    userId: row.user_id,
    role: row.role_name,
    employeeId: row.employee_id,
  });

  return {
    token,
    tokenType: 'Bearer',
    expiresIn: env.jwt.expiresIn,
    user: { ...publicUser(row), last_login_at: new Date().toISOString() },
  };
}

/**
 * Re-read the current identity on every authenticated request. The role in
 * the JWT is informational; authorisation always uses this database value so
 * a role change or deactivation takes effect immediately.
 */
export async function getCurrentUser(userId) {
  const [rows] = await query(`${AUTH_USER_SELECT} WHERE u.user_id = ? LIMIT 1`, [userId]);
  const row = rows[0];
  if (!isAccountActive(row)) return null;
  return publicUser(row);
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const [rows] = await query('SELECT password_hash FROM users WHERE user_id = ? LIMIT 1', [
    userId,
  ]);
  const row = rows[0];
  if (!row) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User was not found.');
  }

  const matches = await verifyPassword(currentPassword, row.password_hash);
  if (!matches) {
    throw new ApiError(400, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect.');
  }

  const passwordHash = await hashPassword(newPassword);
  await execute('UPDATE users SET password_hash = ? WHERE user_id = ?', [passwordHash, userId]);

  return { message: 'Password changed successfully.' };
}

export function logout() {
  return {
    message: 'Logged out. Discard the bearer token on the client.',
  };
}
