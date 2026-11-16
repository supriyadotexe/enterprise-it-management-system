import { execute, query, withTransaction } from '../db/index.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword } from '../utils/password.js';
import { paginationMeta, paginationSql } from '../utils/pagination.js';
import { mapDuplicateError } from './serviceErrors.js';

const EMPLOYEE_SELECT = `
  SELECT
    e.employee_id,
    e.employee_code,
    e.department_id,
    d.name AS department_name,
    d.is_active AS department_active,
    e.full_name,
    e.email,
    e.phone,
    e.designation,
    e.date_joined,
    e.is_active,
    e.created_at,
    e.updated_at,
    u.user_id,
    u.username,
    u.role_id,
    r.role_name,
    u.is_active AS user_active,
    u.last_login_at
  FROM employees AS e
  JOIN departments AS d ON d.department_id = e.department_id
  LEFT JOIN users AS u ON u.employee_id = e.employee_id
  LEFT JOIN roles AS r ON r.role_id = u.role_id
`;

function mapEmployee(row) {
  if (!row) return null;
  return {
    ...row,
    is_active: Boolean(row.is_active),
    department_active: Boolean(row.department_active),
    user_active: row.user_active === null ? null : Boolean(row.user_active),
    account: row.user_id
      ? {
          user_id: row.user_id,
          username: row.username,
          role_id: row.role_id,
          role: row.role_name,
          is_active: Boolean(row.user_active),
          last_login_at: row.last_login_at,
        }
      : null,
  };
}

async function getEmployeeRow(employeeId, db = { query }) {
  const [rows] = await db.query(`${EMPLOYEE_SELECT} WHERE e.employee_id = ? LIMIT 1`, [employeeId]);
  return rows[0] ?? null;
}

async function assertCanReadEmployee(employeeId, actor) {
  if (actor.role !== 'admin' && actor.employee_id !== employeeId) {
    throw new ApiError(403, 'FORBIDDEN', 'You may only access your own employee record.');
  }
}

async function assertDepartmentActive(departmentId, connection = { query }) {
  const [rows] = await connection.query(
    'SELECT department_id FROM departments WHERE department_id = ? AND is_active = 1 FOR SHARE',
    [departmentId],
  );
  if (!rows[0]) {
    throw new ApiError(422, 'DEPARTMENT_INACTIVE', 'The selected department is not active.');
  }
}

async function assertRoleExists(roleId, connection = { query }) {
  const [rows] = await connection.query('SELECT role_id FROM roles WHERE role_id = ?', [roleId]);
  if (!rows[0]) {
    throw new ApiError(422, 'ROLE_NOT_FOUND', 'The selected role does not exist.');
  }
}

async function assertUniqueEmployeeFields({ employee_code, email, excludeId = null }) {
  const conditions = [];
  const params = [];
  if (employee_code !== undefined) {
    conditions.push('employee_code = ?');
    params.push(employee_code);
  }
  if (email !== undefined) {
    conditions.push('email = ?');
    params.push(email);
  }
  if (conditions.length === 0) return;

  let sql = `SELECT employee_id, employee_code, email FROM employees WHERE (${conditions.join(' OR ')})`;
  if (excludeId !== null) {
    sql += ' AND employee_id <> ?';
    params.push(excludeId);
  }

  const [rows] = await query(`${sql} LIMIT 1`, params);
  if (!rows[0]) return;
  if (employee_code !== undefined && rows[0].employee_code === employee_code) {
    throw new ApiError(409, 'DUPLICATE_EMPLOYEE_CODE', 'That employee code already exists.');
  }
  if (email !== undefined && rows[0].email === email) {
    throw new ApiError(409, 'DUPLICATE_EMAIL', 'That email address already exists.');
  }
}

async function assertUsernameAvailable(username, excludeUserId = null) {
  const params = [username];
  let sql = 'SELECT user_id FROM users WHERE username = ?';
  if (excludeUserId !== null) {
    sql += ' AND user_id <> ?';
    params.push(excludeUserId);
  }
  const [rows] = await query(`${sql} LIMIT 1`, params);
  if (rows[0]) {
    throw new ApiError(409, 'DUPLICATE_USERNAME', 'That username already exists.');
  }
}

export async function listEmployees({ department_id, is_active, search, page, limit }) {
  const conditions = [];
  const params = [];

  if (department_id !== undefined) {
    conditions.push('e.department_id = ?');
    params.push(department_id);
  }
  if (is_active !== undefined) {
    conditions.push('e.is_active = ?');
    params.push(is_active ? 1 : 0);
  }
  if (search) {
    conditions.push('(e.full_name LIKE ? OR e.email LIKE ? OR e.employee_code LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [[countRow]] = await query(
    `SELECT COUNT(*) AS total FROM employees AS e ${where}`,
    params,
  );
  const { limit: safeLimit, offset } = paginationSql({ page, limit });
  const [rows] = await query(
    `${EMPLOYEE_SELECT}
     ${where}
     ORDER BY e.full_name, e.employee_id
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset],
  );

  return {
    items: rows.map(mapEmployee),
    meta: paginationMeta({
      page,
      limit: safeLimit,
      total: Number(countRow.total),
    }),
  };
}

export async function getEmployee(employeeId, actor) {
  await assertCanReadEmployee(employeeId, actor);
  const row = await getEmployeeRow(employeeId);
  if (!row) throw new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'Employee was not found.');
  return mapEmployee(row);
}

export async function createEmployee({ employee, account }) {
  await assertDepartmentActive(employee.department_id);
  await assertUniqueEmployeeFields(employee);
  if (account) {
    await assertUsernameAvailable(account.username);
  }

  let passwordHash = null;
  if (account) {
    passwordHash = await hashPassword(account.password);
  }

  try {
    return await withTransaction(async (connection) => {
      await assertDepartmentActive(employee.department_id, connection);
      if (account) await assertRoleExists(account.role_id, connection);

      const [employeeResult] = await connection.query(
        `INSERT INTO employees
          (employee_code, department_id, full_name, email, phone, designation, date_joined)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          employee.employee_code,
          employee.department_id,
          employee.full_name,
          employee.email,
          employee.phone ?? null,
          employee.designation,
          employee.date_joined ?? null,
        ],
      );

      if (account) {
        await connection.query(
          `INSERT INTO users (employee_id, role_id, username, password_hash)
           VALUES (?, ?, ?, ?)`,
          [employeeResult.insertId, account.role_id, account.username, passwordHash],
        );
      }

      const row = await getEmployeeRow(employeeResult.insertId, connection);
      return mapEmployee(row);
    });
  } catch (error) {
    mapDuplicateError(error, [
      {
        index: 'uq_employees_email',
        code: 'DUPLICATE_EMAIL',
        message: 'That email address already exists.',
      },
      {
        index: 'uq_employees_code',
        code: 'DUPLICATE_EMPLOYEE_CODE',
        message: 'That employee code already exists.',
      },
      {
        index: 'uq_users_username',
        code: 'DUPLICATE_USERNAME',
        message: 'That username already exists.',
      },
      {
        index: 'uq_users_employee',
        code: 'EMPLOYEE_ALREADY_HAS_ACCOUNT',
        message: 'That employee already has a user account.',
      },
    ]);
    throw error;
  }
}

export async function updateEmployee(employeeId, input) {
  const existing = await getEmployeeRow(employeeId);
  if (!existing) throw new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'Employee was not found.');

  if (input.department_id !== undefined) {
    await assertDepartmentActive(input.department_id);
  }
  await assertUniqueEmployeeFields({
    employee_code: input.employee_code,
    email: input.email,
    excludeId: employeeId,
  });

  const fields = [];
  const params = [];
  for (const column of [
    'employee_code',
    'department_id',
    'full_name',
    'email',
    'phone',
    'designation',
    'date_joined',
  ]) {
    if (input[column] !== undefined) {
      fields.push(`${column} = ?`);
      params.push(input[column]);
    }
  }

  if (fields.length > 0) {
    params.push(employeeId);
    try {
      await execute(`UPDATE employees SET ${fields.join(', ')} WHERE employee_id = ?`, params);
    } catch (error) {
      mapDuplicateError(error, [
        {
          index: 'uq_employees_email',
          code: 'DUPLICATE_EMAIL',
          message: 'That email address already exists.',
        },
        {
          index: 'uq_employees_code',
          code: 'DUPLICATE_EMPLOYEE_CODE',
          message: 'That employee code already exists.',
        },
      ]);
      throw error;
    }
  }

  return mapEmployee(await getEmployeeRow(employeeId));
}

export async function setEmployeeStatus(employeeId, isActive) {
  return withTransaction(async (connection) => {
    const [rows] = await connection.query(
      'SELECT employee_id, is_active FROM employees WHERE employee_id = ? FOR UPDATE',
      [employeeId],
    );
    const employee = rows[0];
    if (!employee) throw new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'Employee was not found.');

    if (!isActive) {
      const [assignments] = await connection.query(
        `SELECT assignment_id
         FROM asset_assignments
         WHERE employee_id = ? AND returned_at IS NULL
         LIMIT 1
         FOR UPDATE`,
        [employeeId],
      );
      if (assignments[0]) {
        throw new ApiError(
          409,
          'ASSETS_STILL_ALLOCATED',
          'Return all assets held by this employee before deactivating the account.',
        );
      }
    }

    await connection.query('UPDATE employees SET is_active = ? WHERE employee_id = ?', [
      isActive ? 1 : 0,
      employeeId,
    ]);
    await connection.query('UPDATE users SET is_active = ? WHERE employee_id = ?', [
      isActive ? 1 : 0,
      employeeId,
    ]);

    return mapEmployee(await getEmployeeRow(employeeId, connection));
  });
}

export async function getEmployeeAssets(employeeId, actor, { includeReturned = false, page, limit }) {
  await assertCanReadEmployee(employeeId, actor);

  const conditions = ['asg.employee_id = ?'];
  const params = [employeeId];
  if (!includeReturned) conditions.push('asg.returned_at IS NULL');

  const where = `WHERE ${conditions.join(' AND ')}`;
  const [[countRow]] = await query(
    `SELECT COUNT(*) AS total FROM asset_assignments AS asg ${where}`,
    params,
  );
  const { limit: safeLimit, offset } = paginationSql({ page, limit });
  const [rows] = await query(
    `SELECT
       asg.assignment_id,
       asg.asset_id,
       a.asset_code,
       a.name AS asset_name,
       a.asset_condition,
       a.status AS asset_status,
       ac.category_id,
       ac.category_name,
       asg.assigned_by,
       assigned_employee.full_name AS assigned_by_name,
       asg.assigned_at,
       asg.returned_at,
       asg.returned_by,
       returned_employee.full_name AS returned_by_name,
       asg.return_condition,
       asg.remarks
     FROM asset_assignments AS asg
     JOIN assets AS a ON a.asset_id = asg.asset_id
     JOIN asset_categories AS ac ON ac.category_id = a.category_id
     JOIN users AS assigned_user ON assigned_user.user_id = asg.assigned_by
     JOIN employees AS assigned_employee ON assigned_employee.employee_id = assigned_user.employee_id
     LEFT JOIN users AS returned_user ON returned_user.user_id = asg.returned_by
     LEFT JOIN employees AS returned_employee ON returned_employee.employee_id = returned_user.employee_id
     ${where}
     ORDER BY asg.assigned_at DESC, asg.assignment_id DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset],
  );

  return {
    items: rows,
    meta: paginationMeta({ page, limit: safeLimit, total: Number(countRow.total) }),
  };
}

export async function getEmployeeRequests(employeeId, actor, { status, page, limit }) {
  await assertCanReadEmployee(employeeId, actor);

  const conditions = ['r.employee_id = ?'];
  const params = [employeeId];
  if (status !== undefined) {
    conditions.push('r.status = ?');
    params.push(status);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const [[countRow]] = await query(
    `SELECT COUNT(*) AS total FROM service_requests AS r ${where}`,
    params,
  );
  const { limit: safeLimit, offset } = paginationSql({ page, limit });
  const [rows] = await query(
    `SELECT
       r.request_id,
       r.request_code,
       r.employee_id,
       r.asset_id,
       a.asset_code,
       a.name AS asset_name,
       r.service_category_id,
       sc.name AS service_category_name,
       r.assigned_technician_id,
       tech_employee.full_name AS technician_name,
       r.title,
       r.description,
       r.priority,
       r.status,
       r.assigned_at,
       r.resolved_at,
       r.resolution_notes,
       r.created_at,
       r.updated_at
     FROM service_requests AS r
     JOIN service_categories AS sc ON sc.service_category_id = r.service_category_id
     LEFT JOIN assets AS a ON a.asset_id = r.asset_id
     LEFT JOIN users AS tech ON tech.user_id = r.assigned_technician_id
     LEFT JOIN employees AS tech_employee ON tech_employee.employee_id = tech.employee_id
     ${where}
     ORDER BY r.created_at DESC, r.request_id DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset],
  );

  return {
    items: rows,
    meta: paginationMeta({ page, limit: safeLimit, total: Number(countRow.total) }),
  };
}
