import { execute, query, withTransaction } from '../db/index.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword } from '../utils/password.js';
import { mapDuplicateError } from './serviceErrors.js';

const USER_SELECT = `
  SELECT
    u.user_id,
    u.employee_id,
    e.employee_code,
    e.full_name,
    e.email,
    e.is_active AS employee_active,
    u.role_id,
    r.role_name,
    u.username,
    u.is_active,
    u.last_login_at,
    u.created_at,
    u.updated_at
  FROM users AS u
  JOIN employees AS e ON e.employee_id = u.employee_id
  JOIN roles AS r ON r.role_id = u.role_id
`;

function mapUser(row) {
  if (!row) return null;
  return {
    ...row,
    is_active: Boolean(row.is_active),
    employee_active: Boolean(row.employee_active),
  };
}

async function getUser(userId, db = { query }) {
  const [rows] = await db.query(`${USER_SELECT} WHERE u.user_id = ? LIMIT 1`, [userId]);
  if (!rows[0]) throw new ApiError(404, 'USER_NOT_FOUND', 'User was not found.');
  return mapUser(rows[0]);
}

async function assertRoleExists(roleId, connection = { query }) {
  const [rows] = await connection.query('SELECT role_id FROM roles WHERE role_id = ?', [roleId]);
  if (!rows[0]) throw new ApiError(422, 'ROLE_NOT_FOUND', 'The selected role does not exist.');
}

async function assertUsernameAvailable(username, excludeId = null) {
  const params = [username];
  let sql = 'SELECT user_id FROM users WHERE username = ?';
  if (excludeId !== null) {
    sql += ' AND user_id <> ?';
    params.push(excludeId);
  }
  const [rows] = await query(`${sql} LIMIT 1`, params);
  if (rows[0]) {
    throw new ApiError(409, 'DUPLICATE_USERNAME', 'That username already exists.');
  }
}

export async function createUser({ employee_id, username, role_id, password }) {
  const [employeeRows] = await query(
    'SELECT employee_id, is_active FROM employees WHERE employee_id = ? LIMIT 1',
    [employee_id],
  );
  const employee = employeeRows[0];
  if (!employee) throw new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'Employee was not found.');
  if (!employee.is_active) {
    throw new ApiError(422, 'EMPLOYEE_INACTIVE', 'Cannot create an account for an inactive employee.');
  }

  await assertRoleExists(role_id);
  await assertUsernameAvailable(username);
  const passwordHash = await hashPassword(password);

  try {
    return await withTransaction(async (connection) => {
      const [employeeCheck] = await connection.query(
        'SELECT employee_id, is_active FROM employees WHERE employee_id = ? FOR UPDATE',
        [employee_id],
      );
      if (!employeeCheck[0]) {
        throw new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'Employee was not found.');
      }
      if (!employeeCheck[0].is_active) {
        throw new ApiError(
          422,
          'EMPLOYEE_INACTIVE',
          'Cannot create an account for an inactive employee.',
        );
      }
      await assertRoleExists(role_id, connection);
      const [result] = await connection.query(
        `INSERT INTO users (employee_id, role_id, username, password_hash)
         VALUES (?, ?, ?, ?)`,
        [employee_id, role_id, username, passwordHash],
      );
      return getUser(result.insertId, connection);
    });
  } catch (error) {
    mapDuplicateError(error, [
      {
        index: 'uq_users_employee',
        code: 'EMPLOYEE_ALREADY_HAS_ACCOUNT',
        message: 'That employee already has a user account.',
      },
      {
        index: 'uq_users_username',
        code: 'DUPLICATE_USERNAME',
        message: 'That username already exists.',
      },
    ]);
    throw error;
  }
}

export async function updateUser(userId, input) {
  await getUser(userId);

  if (input.role_id !== undefined) {
    await assertRoleExists(input.role_id);
  }
  if (input.username !== undefined) {
    await assertUsernameAvailable(input.username, userId);
  }

  const fields = [];
  const params = [];
  if (input.username !== undefined) {
    fields.push('username = ?');
    params.push(input.username);
  }
  if (input.role_id !== undefined) {
    fields.push('role_id = ?');
    params.push(input.role_id);
  }
  if (input.is_active !== undefined) {
    fields.push('is_active = ?');
    params.push(input.is_active ? 1 : 0);
  }

  if (fields.length > 0) {
    params.push(userId);
    try {
      await execute(`UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`, params);
    } catch (error) {
      mapDuplicateError(error, [
        {
          index: 'uq_users_username',
          code: 'DUPLICATE_USERNAME',
          message: 'That username already exists.',
        },
      ]);
      throw error;
    }
  }

  return getUser(userId);
}

export async function resetPassword(userId, { password }) {
  await getUser(userId);
  const passwordHash = await hashPassword(password);
  await execute('UPDATE users SET password_hash = ? WHERE user_id = ?', [passwordHash, userId]);
  return { message: 'Password reset successfully.' };
}

export async function getUserById(userId) {
  return getUser(userId);
}
