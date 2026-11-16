import { query } from '../db/index.js';

export async function assetsByDepartment() {
  const [rows] = await query(
    `SELECT
       d.department_id,
       d.name AS department_name,
       COUNT(DISTINCT a.asset_id) AS total_assets,
       SUM(a.status = 'available') AS available,
       SUM(a.status = 'allocated') AS allocated,
       SUM(a.status = 'under_maintenance') AS under_maintenance,
       SUM(a.status = 'unavailable') AS unavailable,
       SUM(a.status = 'retired') AS retired
     FROM departments AS d
     LEFT JOIN employees AS e ON e.department_id = d.department_id
     LEFT JOIN asset_assignments AS asg
       ON asg.employee_id = e.employee_id AND asg.returned_at IS NULL
     LEFT JOIN assets AS a ON a.asset_id = asg.asset_id
     GROUP BY d.department_id, d.name
     ORDER BY d.name`,
  );
  return rows.map(normalizeRow);
}

export async function technicianWorkload() {
  const [rows] = await query(
    `SELECT
       u.user_id AS technician_id,
       e.full_name AS technician_name,
       (SELECT COUNT(*) FROM service_requests sr WHERE sr.assigned_technician_id = u.user_id AND sr.status IN ('assigned', 'in_progress')) AS open_requests,
       (SELECT COUNT(*) FROM service_requests sr WHERE sr.assigned_technician_id = u.user_id AND sr.status = 'in_progress') AS in_progress_requests,
       (SELECT COUNT(*) FROM maintenance_records m WHERE m.technician_id = u.user_id AND m.status = 'in_progress') AS in_progress_maintenance,
       (SELECT COUNT(*) FROM maintenance_records m WHERE m.technician_id = u.user_id AND m.status = 'scheduled') AS scheduled_maintenance
     FROM users AS u
     JOIN roles AS r ON r.role_id = u.role_id
     JOIN employees AS e ON e.employee_id = u.employee_id
     WHERE r.role_name = 'technician' AND u.is_active = 1 AND e.is_active = 1
     ORDER BY e.full_name`,
  );
  return rows.map(normalizeRow);
}

export async function maintenanceCost({ from, to } = {}) {
  const conditions = [];
  const params = [];
  if (from) {
    conditions.push('completed_at >= ?');
    params.push(from);
  }
  if (to) {
    conditions.push('completed_at <= ?');
    params.push(to);
  }
  const [rows] = await query(
    `SELECT
       DATE_FORMAT(completed_at, '%Y-%m') AS period,
       COUNT(*) AS completed_count,
       SUM(cost) AS total_cost,
       AVG(cost) AS average_cost
     FROM maintenance_records
     WHERE status = 'completed' ${conditions.length ? 'AND ' + conditions.join(' AND ') : ''}
     GROUP BY DATE_FORMAT(completed_at, '%Y-%m')
     ORDER BY period`,
    params,
  );
  return rows.map(normalizeRow);
}

export async function requestSummary({ from, to } = {}) {
  const conditions = [];
  const params = [];
  if (from) {
    conditions.push('created_at >= ?');
    params.push(from);
  }
  if (to) {
    conditions.push('created_at <= ?');
    params.push(to);
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const [byStatus] = await query(
    `SELECT status, COUNT(*) AS count
     FROM service_requests
     ${where}
     GROUP BY status
     ORDER BY status`,
    params,
  );
  const [byPriority] = await query(
    `SELECT priority, COUNT(*) AS count
     FROM service_requests
     ${where}
     GROUP BY priority
     ORDER BY priority`,
    params,
  );
  const [[totals]] = await query(
    `SELECT COUNT(*) AS total_requests,
            SUM(status IN ('pending', 'assigned', 'in_progress')) AS open_requests
     FROM service_requests
     ${where}`,
    params,
  );

  return {
    totals: normalizeRow(totals),
    by_status: byStatus.map(normalizeRow),
    by_priority: byPriority.map(normalizeRow),
  };
}

function normalizeRow(row) {
  const output = {};
  for (const [key, value] of Object.entries(row ?? {})) {
    output[key] = typeof value === 'bigint' ? Number(value) : value;
  }
  return output;
}
