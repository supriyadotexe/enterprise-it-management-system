import { randomBytes } from 'node:crypto';
import { query, withTransaction } from '../db/index.js';
import { ApiError } from '../utils/ApiError.js';
import { paginationMeta, paginationSql } from '../utils/pagination.js';

const REQUEST_SELECT = `
  SELECT
    r.*,
    e.employee_code AS requester_code,
    e.full_name AS requester_name,
    e.email AS requester_email,
    d.name AS department_name,
    sc.name AS service_category_name,
    a.asset_code,
    a.name AS asset_name,
    tech_user.username AS technician_username,
    tech_employee.full_name AS technician_name
  FROM service_requests AS r
  JOIN employees AS e ON e.employee_id = r.employee_id
  JOIN departments AS d ON d.department_id = e.department_id
  JOIN service_categories AS sc ON sc.service_category_id = r.service_category_id
  LEFT JOIN assets AS a ON a.asset_id = r.asset_id
  LEFT JOIN users AS tech_user ON tech_user.user_id = r.assigned_technician_id
  LEFT JOIN employees AS tech_employee ON tech_employee.employee_id = tech_user.employee_id
`;

function requestPlaceholderCode() {
  return `TMP-${randomBytes(4).toString('hex')}`;
}

async function getRequestRow(id, db = { query }) {
  const [rows] = await db.query(`${REQUEST_SELECT} WHERE r.request_id = ? LIMIT 1`, [id]);
  return rows[0] ?? null;
}

function assertRequestReadable(request, actor) {
  if (actor.role === 'admin') return;
  if (actor.role === 'employee' && request.employee_id === actor.employee_id) return;
  if (actor.role === 'technician' && request.assigned_technician_id === actor.user_id) return;
  throw new ApiError(403, 'FORBIDDEN', 'You may not access this service request.');
}

async function assertActiveEmployee(connection, employeeId) {
  const [rows] = await connection.query(
    'SELECT employee_id, is_active FROM employees WHERE employee_id = ? FOR SHARE',
    [employeeId],
  );
  if (!rows[0]) throw new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'Employee was not found.');
  if (!rows[0].is_active) {
    throw new ApiError(409, 'EMPLOYEE_INACTIVE', 'The requester is inactive.');
  }
}

async function assertServiceCategoryActive(connection, categoryId) {
  const [rows] = await connection.query(
    'SELECT service_category_id, is_active FROM service_categories WHERE service_category_id = ? FOR SHARE',
    [categoryId],
  );
  if (!rows[0]) {
    throw new ApiError(404, 'SERVICE_CATEGORY_NOT_FOUND', 'Service category was not found.');
  }
  if (!rows[0].is_active) {
    throw new ApiError(422, 'CATEGORY_INACTIVE', 'The selected service category is not active.');
  }
}

async function assertAssetForRequester(connection, assetId, employeeId, { enforceOwnership }) {
  const [rows] = await connection.query(
    'SELECT asset_id, asset_code, name FROM assets WHERE asset_id = ? FOR SHARE',
    [assetId],
  );
  if (!rows[0]) throw new ApiError(404, 'ASSET_NOT_FOUND', 'Asset was not found.');
  if (enforceOwnership) {
    const [assignments] = await connection.query(
      `SELECT assignment_id
       FROM asset_assignments
       WHERE asset_id = ? AND employee_id = ? AND returned_at IS NULL
       LIMIT 1`,
      [assetId, employeeId],
    );
    if (!assignments[0]) {
      throw new ApiError(
        403,
        'ASSET_NOT_ASSIGNED_TO_EMPLOYEE',
        'You may only reference an asset currently allocated to you.',
      );
    }
  }
  return rows[0];
}

async function assertTechnicianRole(connection, userId) {
  const [rows] = await connection.query(
    `SELECT u.user_id, u.is_active AS user_active, r.role_name, e.is_active AS employee_active
     FROM users AS u
     JOIN roles AS r ON r.role_id = u.role_id
     JOIN employees AS e ON e.employee_id = u.employee_id
     WHERE u.user_id = ?
     LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row || row.role_name !== 'technician' || !row.user_active || !row.employee_active) {
    throw new ApiError(
      422,
      'TECHNICIAN_ROLE_REQUIRED',
      'The assigned user must be an active user with the technician role.',
    );
  }
  return row;
}

async function lockRequest(connection, requestId) {
  const [rows] = await connection.query(
    `SELECT *
     FROM service_requests
     WHERE request_id = ?
     FOR UPDATE`,
    [requestId],
  );
  if (!rows[0]) {
    throw new ApiError(404, 'REQUEST_NOT_FOUND', 'Service request was not found.');
  }
  return rows[0];
}

async function writeHistory(connection, requestId, actorId, oldStatus, newStatus, remarks) {
  await connection.query(
    `INSERT INTO request_status_history
      (request_id, changed_by, old_status, new_status, remarks)
     VALUES (?, ?, ?, ?, ?)`,
    [requestId, actorId, oldStatus, newStatus, remarks ?? null],
  );
}

export async function listRequests(actor, filters) {
  const conditions = [];
  const params = [];

  if (actor.role === 'employee') {
    conditions.push('r.employee_id = ?');
    params.push(actor.employee_id);
  } else if (actor.role === 'technician') {
    conditions.push('r.assigned_technician_id = ?');
    params.push(actor.user_id);
  } else {
    if (filters.employee_id !== undefined) {
      conditions.push('r.employee_id = ?');
      params.push(filters.employee_id);
    }
    if (filters.assigned_technician_id !== undefined) {
      conditions.push('r.assigned_technician_id = ?');
      params.push(filters.assigned_technician_id);
    }
  }

  if (filters.status !== undefined) {
    conditions.push('r.status = ?');
    params.push(filters.status);
  }
  if (filters.priority !== undefined) {
    conditions.push('r.priority = ?');
    params.push(filters.priority);
  }
  if (filters.service_category_id !== undefined) {
    conditions.push('r.service_category_id = ?');
    params.push(filters.service_category_id);
  }
  if (filters.search) {
    conditions.push('(r.request_code LIKE ? OR r.title LIKE ? OR r.description LIKE ?)');
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [[countRow]] = await query(
    `SELECT COUNT(*) AS total FROM service_requests AS r ${where}`,
    params,
  );
  const pageValues = paginationSql(filters);
  const [rows] = await query(
    `${REQUEST_SELECT}
     ${where}
     ORDER BY r.created_at DESC, r.request_id DESC
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

export async function getRequest(requestId, actor) {
  const row = await getRequestRow(requestId);
  if (!row) throw new ApiError(404, 'REQUEST_NOT_FOUND', 'Service request was not found.');
  assertRequestReadable(row, actor);
  return row;
}

export async function createRequest(actor, input) {
  if (!['employee', 'admin'].includes(actor.role)) {
    throw new ApiError(403, 'FORBIDDEN', 'Only employees and administrators may raise requests.');
  }

  let employeeId;
  if (actor.role === 'employee') {
    employeeId = actor.employee_id;
    if (input.employee_id !== undefined && input.employee_id !== actor.employee_id) {
      throw new ApiError(403, 'FORBIDDEN', 'You may only raise requests for yourself.');
    }
  } else {
    employeeId = input.employee_id ?? actor.employee_id;
  }

  return withTransaction(async (connection) => {
    await assertActiveEmployee(connection, employeeId);
    await assertServiceCategoryActive(connection, input.service_category_id);

    if (input.asset_id !== undefined && input.asset_id !== null) {
      await assertAssetForRequester(connection, input.asset_id, employeeId, {
        enforceOwnership: actor.role === 'employee',
      });
    }

    const [result] = await connection.query(
      `INSERT INTO service_requests
        (request_code, employee_id, asset_id, service_category_id,
         title, description, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        requestPlaceholderCode(),
        employeeId,
        input.asset_id ?? null,
        input.service_category_id,
        input.title,
        input.description,
        input.priority ?? 'medium',
      ],
    );

    await connection.query(
      `UPDATE service_requests
       SET request_code = CONCAT('SR-', YEAR(CURDATE()), '-', LPAD(?, 4, '0'))
       WHERE request_id = ?`,
      [result.insertId, result.insertId],
    );
    await writeHistory(
      connection,
      result.insertId,
      actor.user_id,
      null,
      'pending',
      'Request created',
    );

    return getRequestRow(result.insertId, connection);
  });
}

export async function updateRequest(actor, requestId, input) {
  return withTransaction(async (connection) => {
    const record = await lockRequest(connection, requestId);
    const isOwner = record.employee_id === actor.employee_id;
    if (actor.role !== 'admin' && !(actor.role === 'employee' && isOwner)) {
      throw new ApiError(403, 'FORBIDDEN', 'You may not edit this service request.');
    }
    if (actor.role === 'employee' && record.status !== 'pending') {
      throw new ApiError(409, 'REQUEST_NOT_EDITABLE', 'Only pending requests may be edited.');
    }
    if (actor.role === 'admin' && ['closed', 'cancelled'].includes(record.status)) {
      throw new ApiError(409, 'REQUEST_NOT_EDITABLE', 'Closed or cancelled requests cannot be edited.');
    }

    if (input.service_category_id !== undefined) {
      await assertServiceCategoryActive(connection, input.service_category_id);
    }
    if (input.asset_id !== undefined && input.asset_id !== null) {
      await assertAssetForRequester(connection, input.asset_id, record.employee_id, {
        enforceOwnership: actor.role === 'employee',
      });
    }

    const fields = [];
    const params = [];
    for (const column of [
      'title',
      'description',
      'priority',
      'asset_id',
      'service_category_id',
    ]) {
      if (input[column] !== undefined) {
        fields.push(`${column} = ?`);
        params.push(input[column]);
      }
    }

    if (fields.length > 0) {
      params.push(requestId);
      await connection.query(
        `UPDATE service_requests SET ${fields.join(', ')} WHERE request_id = ?`,
        params,
      );
    }

    return getRequestRow(requestId, connection);
  });
}

export async function assignRequest(actor, requestId, { technician_id, remarks }) {
  return withTransaction(async (connection) => {
    const record = await lockRequest(connection, requestId);
    if (record.status !== 'pending') {
      throw new ApiError(
        409,
        'INVALID_REQUEST_TRANSITION',
        'Only pending requests can be assigned.',
      );
    }
    await assertTechnicianRole(connection, technician_id);

    await connection.query(
      `UPDATE service_requests
       SET assigned_technician_id = ?,
           assigned_at = CURRENT_TIMESTAMP(6),
           status = 'assigned'
       WHERE request_id = ?`,
      [technician_id, requestId],
    );
    await writeHistory(
      connection,
      requestId,
      actor.user_id,
      'pending',
      'assigned',
      remarks ?? 'Technician assigned',
    );

    return getRequestRow(requestId, connection);
  });
}

export async function startRequest(actor, requestId, { remarks } = {}) {
  return withTransaction(async (connection) => {
    const record = await lockRequest(connection, requestId);
    if (record.status !== 'assigned') {
      throw new ApiError(
        409,
        'INVALID_REQUEST_TRANSITION',
        'Only assigned requests can be started.',
      );
    }
    if (actor.role !== 'admin' && record.assigned_technician_id !== actor.user_id) {
      throw new ApiError(
        403,
        'NOT_ASSIGNED_TECHNICIAN',
        'Only the assigned technician or an administrator may start this request.',
      );
    }

    await connection.query(
      "UPDATE service_requests SET status = 'in_progress' WHERE request_id = ?",
      [requestId],
    );
    await writeHistory(
      connection,
      requestId,
      actor.user_id,
      'assigned',
      'in_progress',
      remarks ?? 'Work started',
    );

    return getRequestRow(requestId, connection);
  });
}

export async function resolveRequest(actor, requestId, { resolution_notes, remarks } = {}) {
  return withTransaction(async (connection) => {
    const record = await lockRequest(connection, requestId);
    if (record.status !== 'in_progress') {
      throw new ApiError(
        409,
        'INVALID_REQUEST_TRANSITION',
        'Only in-progress requests can be resolved.',
      );
    }
    // The approved transition table restricts resolution to the assigned
    // technician. Administrators can start, cancel or close, but do not sign
    // off technical resolution on the technician's behalf.
    if (record.assigned_technician_id !== actor.user_id) {
      throw new ApiError(
        403,
        'NOT_ASSIGNED_TECHNICIAN',
        'Only the assigned technician may resolve this request.',
      );
    }

    await connection.query(
      `UPDATE service_requests
       SET status = 'resolved',
           resolved_at = CURRENT_TIMESTAMP(6),
           resolution_notes = ?
       WHERE request_id = ?`,
      [resolution_notes, requestId],
    );
    await writeHistory(
      connection,
      requestId,
      actor.user_id,
      'in_progress',
      'resolved',
      remarks ?? 'Request resolved',
    );

    return getRequestRow(requestId, connection);
  });
}

export async function closeRequest(actor, requestId, { remarks } = {}) {
  return withTransaction(async (connection) => {
    const record = await lockRequest(connection, requestId);
    if (record.status !== 'resolved') {
      throw new ApiError(
        409,
        'INVALID_REQUEST_TRANSITION',
        'Only resolved requests can be closed.',
      );
    }
    const isOwner = record.employee_id === actor.employee_id;
    if (actor.role !== 'admin' && !(actor.role === 'employee' && isOwner)) {
      throw new ApiError(403, 'FORBIDDEN', 'Only the requester or an administrator may close this request.');
    }

    await connection.query(
      "UPDATE service_requests SET status = 'closed' WHERE request_id = ?",
      [requestId],
    );
    await writeHistory(
      connection,
      requestId,
      actor.user_id,
      'resolved',
      'closed',
      remarks ?? 'Request closed',
    );

    return getRequestRow(requestId, connection);
  });
}

export async function cancelRequest(actor, requestId, { remarks } = {}) {
  return withTransaction(async (connection) => {
    const record = await lockRequest(connection, requestId);
    if (!['pending', 'assigned', 'in_progress'].includes(record.status)) {
      throw new ApiError(
        409,
        'INVALID_REQUEST_TRANSITION',
        'Only open requests can be cancelled.',
      );
    }

    await connection.query(
      "UPDATE service_requests SET status = 'cancelled' WHERE request_id = ?",
      [requestId],
    );
    await writeHistory(
      connection,
      requestId,
      actor.user_id,
      record.status,
      'cancelled',
      remarks ?? null,
    );

    return getRequestRow(requestId, connection);
  });
}

export async function getRequestHistory(requestId, actor) {
  const record = await getRequestRow(requestId);
  if (!record) throw new ApiError(404, 'REQUEST_NOT_FOUND', 'Service request was not found.');
  assertRequestReadable(record, actor);

  const [rows] = await query(
    `SELECT
       h.history_id,
       h.request_id,
       h.changed_by,
       u.username AS changed_by_username,
       e.full_name AS changed_by_name,
       h.old_status,
       h.new_status,
       h.remarks,
       h.changed_at
     FROM request_status_history AS h
     JOIN users AS u ON u.user_id = h.changed_by
     JOIN employees AS e ON e.employee_id = u.employee_id
     WHERE h.request_id = ?
     ORDER BY h.changed_at ASC, h.history_id ASC`,
    [requestId],
  );

  return rows;
}
