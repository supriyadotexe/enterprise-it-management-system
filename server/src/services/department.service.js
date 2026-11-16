import { execute, query } from '../db/index.js';
import { ApiError } from '../utils/ApiError.js';
import { mapDuplicateError } from './serviceErrors.js';

export async function listDepartments({ includeInactive = false, search } = {}) {
  const conditions = [];
  const params = [];

  if (!includeInactive) conditions.push('is_active = 1');
  if (search) {
    conditions.push('(name LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await query(
    `SELECT department_id, name, description, is_active, created_at, updated_at
     FROM departments
     ${where}
     ORDER BY name`,
    params,
  );
  return rows;
}

export async function createDepartment({ name, description }) {
  try {
    const [result] = await execute(
      'INSERT INTO departments (name, description) VALUES (?, ?)',
      [name, description ?? null],
    );
    return getDepartment(result.insertId);
  } catch (error) {
    mapDuplicateError(error, [
      {
        index: 'uq_departments_name',
        code: 'DUPLICATE_DEPARTMENT',
        message: 'A department with that name already exists.',
      },
    ]);
    throw error;
  }
}

export async function getDepartment(departmentId) {
  const [rows] = await query(
    `SELECT department_id, name, description, is_active, created_at, updated_at
     FROM departments
     WHERE department_id = ?`,
    [departmentId],
  );
  if (!rows[0]) {
    throw new ApiError(404, 'DEPARTMENT_NOT_FOUND', 'Department was not found.');
  }
  return rows[0];
}

export async function updateDepartment(departmentId, input) {
  await getDepartment(departmentId);
  const fields = [];
  const params = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    params.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    params.push(input.description);
  }

  if (fields.length === 0) return getDepartment(departmentId);

  params.push(departmentId);
  try {
    await execute(`UPDATE departments SET ${fields.join(', ')} WHERE department_id = ?`, params);
  } catch (error) {
    mapDuplicateError(error, [
      {
        index: 'uq_departments_name',
        code: 'DUPLICATE_DEPARTMENT',
        message: 'A department with that name already exists.',
      },
    ]);
    throw error;
  }
  return getDepartment(departmentId);
}

export async function setDepartmentStatus(departmentId, isActive) {
  await getDepartment(departmentId);
  await execute('UPDATE departments SET is_active = ? WHERE department_id = ?', [
    isActive ? 1 : 0,
    departmentId,
  ]);
  return getDepartment(departmentId);
}
