import { query } from '../db/index.js';
import { ApiError } from '../utils/ApiError.js';
import { paginationMeta, paginationSql } from '../utils/pagination.js';
import {
  cancelMaintenance,
  completeMaintenance,
  createMaintenance,
  startMaintenance,
} from './assetLifecycle.service.js';

const MAINTENANCE_SELECT = `
  SELECT
    m.*,
    a.asset_code,
    a.name AS asset_name,
    a.status AS asset_status,
    a.asset_condition,
    technician.full_name AS technician_name,
    technician.email AS technician_email,
    created_user.username AS created_by_username,
    created_employee.full_name AS created_by_name,
    started_employee.full_name AS started_by_name,
    completed_employee.full_name AS completed_by_name,
    cancelled_employee.full_name AS cancelled_by_name,
    r.request_code
  FROM maintenance_records AS m
  JOIN assets AS a ON a.asset_id = m.asset_id
  JOIN users AS technician_user ON technician_user.user_id = m.technician_id
  JOIN employees AS technician ON technician.employee_id = technician_user.employee_id
  JOIN users AS created_user ON created_user.user_id = m.created_by
  JOIN employees AS created_employee ON created_employee.employee_id = created_user.employee_id
  LEFT JOIN users AS started_user ON started_user.user_id = m.started_by
  LEFT JOIN employees AS started_employee ON started_employee.employee_id = started_user.employee_id
  LEFT JOIN users AS completed_user ON completed_user.user_id = m.completed_by
  LEFT JOIN employees AS completed_employee
    ON completed_employee.employee_id = completed_user.employee_id
  LEFT JOIN users AS cancelled_user ON cancelled_user.user_id = m.cancelled_by
  LEFT JOIN employees AS cancelled_employee
    ON cancelled_employee.employee_id = cancelled_user.employee_id
  LEFT JOIN service_requests AS r ON r.request_id = m.request_id
`;

export function create(actor, input) {
  return createMaintenance(actor, input);
}

export function start(actor, maintenanceId, input) {
  return startMaintenance(actor, maintenanceId, input);
}

export function complete(actor, maintenanceId, input) {
  return completeMaintenance(actor, maintenanceId, input);
}

export function cancel(actor, maintenanceId, input) {
  return cancelMaintenance(actor, maintenanceId, input);
}

export async function listMaintenance(actor, filters) {
  const conditions = [];
  const params = [];

  if (actor.role === 'technician') {
    conditions.push('m.technician_id = ?');
    params.push(actor.user_id);
  } else if (filters.technician_id !== undefined) {
    conditions.push('m.technician_id = ?');
    params.push(filters.technician_id);
  }
  if (filters.status !== undefined) {
    conditions.push('m.status = ?');
    params.push(filters.status);
  }
  if (filters.asset_id !== undefined) {
    conditions.push('m.asset_id = ?');
    params.push(filters.asset_id);
  }
  if (filters.request_id !== undefined) {
    conditions.push('m.request_id = ?');
    params.push(filters.request_id);
  }
  if (filters.search) {
    conditions.push('(a.asset_code LIKE ? OR a.name LIKE ? OR m.description LIKE ?)');
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [[countRow]] = await query(
    `SELECT COUNT(*) AS total
     FROM maintenance_records AS m
     JOIN assets AS a ON a.asset_id = m.asset_id
     ${where}`,
    params,
  );
  const pageValues = paginationSql(filters);
  const [rows] = await query(
    `${MAINTENANCE_SELECT}
     ${where}
     ORDER BY m.created_at DESC, m.maintenance_id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageValues.limit, pageValues.offset],
  );

  return {
    items: rows,
    meta: paginationMeta({
      page: pageValues.page,
      limit: pageValues.limit,
      total: Number(countRow.total),
    }),
  };
}

export async function getMaintenance(maintenanceId, actor) {
  const [rows] = await query(`${MAINTENANCE_SELECT} WHERE m.maintenance_id = ?`, [
    maintenanceId,
  ]);
  const record = rows[0];
  if (!record) {
    throw new ApiError(404, 'MAINTENANCE_NOT_FOUND', 'Maintenance record was not found.');
  }
  if (actor.role !== 'admin' && record.technician_id !== actor.user_id) {
    throw new ApiError(
      403,
      'NOT_ASSIGNED_TECHNICIAN',
      'You may only access maintenance assigned to you.',
    );
  }
  return record;
}
