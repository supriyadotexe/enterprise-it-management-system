import { query } from '../db/index.js';
import { paginationMeta, paginationSql } from '../utils/pagination.js';
import {
  allocateAsset,
  returnAssignment as returnAssignmentLifecycle,
} from './assetLifecycle.service.js';

export function assignAsset(actor, assetId, input) {
  return allocateAsset(actor.user_id, assetId, input);
}

export function returnAssignment(actor, assignmentId, input) {
  return returnAssignmentLifecycle(actor.user_id, assignmentId, input);
}

export async function listAssignments({ asset_id, employee_id, is_open, page, limit }) {
  const conditions = [];
  const params = [];

  if (asset_id !== undefined) {
    conditions.push('asg.asset_id = ?');
    params.push(asset_id);
  }
  if (employee_id !== undefined) {
    conditions.push('asg.employee_id = ?');
    params.push(employee_id);
  }
  if (is_open !== undefined) {
    conditions.push(is_open ? 'asg.returned_at IS NULL' : 'asg.returned_at IS NOT NULL');
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [[countRow]] = await query(
    `SELECT COUNT(*) AS total FROM asset_assignments AS asg ${where}`,
    params,
  );
  const pageValues = paginationSql({ page, limit });
  const [rows] = await query(
    `SELECT
       asg.assignment_id,
       asg.asset_id,
       a.asset_code,
       a.name AS asset_name,
       a.status AS asset_status,
       a.asset_condition,
       asg.employee_id,
       e.full_name AS employee_name,
       e.email AS employee_email,
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
     JOIN employees AS e ON e.employee_id = asg.employee_id
     JOIN users AS assigned_user ON assigned_user.user_id = asg.assigned_by
     JOIN employees AS assigned_employee
       ON assigned_employee.employee_id = assigned_user.employee_id
     LEFT JOIN users AS returned_user ON returned_user.user_id = asg.returned_by
     LEFT JOIN employees AS returned_employee
       ON returned_employee.employee_id = returned_user.employee_id
     ${where}
     ORDER BY asg.assigned_at DESC, asg.assignment_id DESC
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
