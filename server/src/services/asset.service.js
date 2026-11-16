import { query } from '../db/index.js';
import { ApiError } from '../utils/ApiError.js';
import { paginationMeta, paginationSql } from '../utils/pagination.js';

const ASSET_LIST_SELECT = `
  SELECT
    a.asset_id,
    a.category_id,
    ac.category_name,
    a.asset_code,
    a.name,
    a.brand,
    a.model,
    a.serial_number,
    a.purchase_date,
    a.warranty_end,
    a.purchase_cost,
    a.asset_condition,
    a.status,
    a.created_by,
    a.retired_at,
    a.retired_by,
    a.notes,
    a.created_at,
    a.updated_at,
    asg.assignment_id AS open_assignment_id,
    asg.employee_id AS assigned_employee_id,
    assigned_employee.full_name AS assigned_employee_name,
    asg.assigned_at,
    m.maintenance_id AS open_maintenance_id,
    m.scheduled_date AS open_maintenance_scheduled_date,
    m.technician_id AS maintenance_technician_id,
    maintenance_technician.full_name AS maintenance_technician_name
  FROM assets AS a
  JOIN asset_categories AS ac ON ac.category_id = a.category_id
  LEFT JOIN asset_assignments AS asg
    ON asg.asset_id = a.asset_id AND asg.returned_at IS NULL
  LEFT JOIN employees AS assigned_employee
    ON assigned_employee.employee_id = asg.employee_id
  LEFT JOIN maintenance_records AS m
    ON m.asset_id = a.asset_id AND m.status = 'in_progress'
  LEFT JOIN users AS maintenance_user ON maintenance_user.user_id = m.technician_id
  LEFT JOIN employees AS maintenance_technician
    ON maintenance_technician.employee_id = maintenance_user.employee_id
`;

async function canEmployeeReadAsset(assetId, employeeId) {
  const [rows] = await query(
    `SELECT 1 AS allowed
     FROM asset_assignments
     WHERE asset_id = ? AND employee_id = ?
     UNION ALL
     SELECT 1 AS allowed
     FROM service_requests
     WHERE asset_id = ? AND employee_id = ?
     LIMIT 1`,
    [assetId, employeeId, assetId, employeeId],
  );
  return Boolean(rows[0]);
}

export async function assertAssetReadable(assetId, actor) {
  if (actor.role === 'admin' || actor.role === 'technician') return;
  if (actor.role === 'employee') {
    if (await canEmployeeReadAsset(assetId, actor.employee_id)) return;
    throw new ApiError(403, 'FORBIDDEN', 'You may only access your own assets.');
  }
  throw new ApiError(403, 'FORBIDDEN', 'You may not access this asset.');
}

export async function listAssets(actor, filters) {
  const conditions = [];
  const params = [];

  if (filters.status !== undefined) {
    conditions.push('a.status = ?');
    params.push(filters.status);
  }
  if (filters.category_id !== undefined) {
    conditions.push('a.category_id = ?');
    params.push(filters.category_id);
  }
  if (filters.assigned_employee_id !== undefined) {
    conditions.push(`EXISTS (
      SELECT 1 FROM asset_assignments AS filter_asg
      WHERE filter_asg.asset_id = a.asset_id
        AND filter_asg.employee_id = ?
        AND filter_asg.returned_at IS NULL
    )`);
    params.push(filters.assigned_employee_id);
  }
  if (filters.search) {
    conditions.push('(a.asset_code LIKE ? OR a.name LIKE ? OR a.serial_number LIKE ?)');
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  if (actor.role === 'employee') {
    conditions.push(`(
      EXISTS (
        SELECT 1 FROM asset_assignments AS own_asg
        WHERE own_asg.asset_id = a.asset_id AND own_asg.employee_id = ?
      ) OR EXISTS (
        SELECT 1 FROM service_requests AS own_req
        WHERE own_req.asset_id = a.asset_id AND own_req.employee_id = ?
      )
    )`);
    params.push(actor.employee_id, actor.employee_id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [[countRow]] = await query(
    `SELECT COUNT(*) AS total FROM assets AS a ${where}`,
    params,
  );
  const { limit, offset } = paginationSql(filters);

  const [rows] = await query(
    `${ASSET_LIST_SELECT}
     ${where}
     ORDER BY a.name, a.asset_id
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return {
    items: rows,
    meta: paginationMeta({ page: filters.page, limit, total: Number(countRow.total) }),
  };
}

export async function getAsset(assetId, actor) {
  const [rows] = await query(`${ASSET_LIST_SELECT} WHERE a.asset_id = ?`, [assetId]);
  const asset = rows[0];
  if (!asset) throw new ApiError(404, 'ASSET_NOT_FOUND', 'Asset was not found.');
  await assertAssetReadable(assetId, actor);
  return asset;
}

export async function getAssetHistory(assetId, actor, { page, limit }) {
  const [[assetRow]] = await query('SELECT asset_id FROM assets WHERE asset_id = ?', [assetId]);
  if (!assetRow) throw new ApiError(404, 'ASSET_NOT_FOUND', 'Asset was not found.');
  await assertAssetReadable(assetId, actor);

  const [[countRow]] = await query(
    'SELECT COUNT(*) AS total FROM v_asset_history WHERE asset_id = ?',
    [assetId],
  );
  const pageValues = paginationSql({ page, limit });
  const [rows] = await query(
    `SELECT asset_id, event_at, event_type, summary, detail, actor_name,
            reference_table, reference_id, status_from, status_to,
            condition_from, condition_to
     FROM v_asset_history
     WHERE asset_id = ?
     ORDER BY event_at DESC, reference_id DESC
     LIMIT ? OFFSET ?`,
    [assetId, pageValues.limit, pageValues.offset],
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

export async function getAssetMaintenance(assetId, actor, { page, limit, status }) {
  const [[assetRow]] = await query('SELECT asset_id FROM assets WHERE asset_id = ?', [assetId]);
  if (!assetRow) throw new ApiError(404, 'ASSET_NOT_FOUND', 'Asset was not found.');
  await assertAssetReadable(assetId, actor);

  const conditions = ['m.asset_id = ?'];
  const params = [assetId];
  if (status !== undefined) {
    conditions.push('m.status = ?');
    params.push(status);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const [[countRow]] = await query(
    `SELECT COUNT(*) AS total FROM maintenance_records AS m ${where}`,
    params,
  );
  const pageValues = paginationSql({ page, limit });
  const [rows] = await query(
    `SELECT
       m.*,
       a.asset_code,
       a.name AS asset_name,
       technician.full_name AS technician_name,
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
     ${where}
     ORDER BY m.scheduled_date DESC, m.maintenance_id DESC
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
