import { query } from '../db/index.js';

export async function getLookups() {
  const [roles] = await query('SELECT role_id, role_name, description FROM roles ORDER BY role_id');
  const [assetCategories] = await query(
    'SELECT category_id, category_name, description, is_active FROM asset_categories ORDER BY category_name',
  );
  const [serviceCategories] = await query(
    'SELECT service_category_id, name, description, is_active FROM service_categories ORDER BY name',
  );
  const [employees] = await query(
    `SELECT employee_id, employee_code, full_name, email, department_id, designation, is_active
     FROM employees
     WHERE is_active = 1
     ORDER BY full_name`,
  );
  const [technicians] = await query(
    `SELECT u.user_id, e.employee_id, e.employee_code, e.full_name, e.email
     FROM users AS u
     JOIN roles AS r ON r.role_id = u.role_id
     JOIN employees AS e ON e.employee_id = u.employee_id
     WHERE r.role_name = 'technician' AND u.is_active = 1 AND e.is_active = 1
     ORDER BY e.full_name`,
  );

  return {
    roles,
    asset_categories: assetCategories,
    service_categories: serviceCategories,
    employees,
    technicians,
  };
}
