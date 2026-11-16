import { withTransaction } from '../db/index.js';
import { ApiError } from '../utils/ApiError.js';
import { mapDuplicateError } from './serviceErrors.js';

const ASSET_ROW_SELECT = `
  SELECT a.*, ac.category_name
  FROM assets AS a
  JOIN asset_categories AS ac ON ac.category_id = a.category_id
  WHERE a.asset_id = ?
`;

const ASSIGNMENT_ROW_SELECT = `
  SELECT
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
    assigned_user.username AS assigned_by_username,
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
  WHERE asg.assignment_id = ?
`;

const MAINTENANCE_ROW_SELECT = `
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
  LEFT JOIN employees AS started_employee
    ON started_employee.employee_id = started_user.employee_id
  LEFT JOIN users AS completed_user ON completed_user.user_id = m.completed_by
  LEFT JOIN employees AS completed_employee
    ON completed_employee.employee_id = completed_user.employee_id
  LEFT JOIN users AS cancelled_user ON cancelled_user.user_id = m.cancelled_by
  LEFT JOIN employees AS cancelled_employee
    ON cancelled_employee.employee_id = cancelled_user.employee_id
  LEFT JOIN service_requests AS r ON r.request_id = m.request_id
  WHERE m.maintenance_id = ?
`;

function nullSafeEqual(left, right) {
  return (left ?? null) === (right ?? null);
}

async function lockAsset(connection, assetId) {
  const [rows] = await connection.query(
    `SELECT
       asset_id, category_id, asset_code, name, brand, model, serial_number,
       purchase_date, warranty_end, purchase_cost, asset_condition, status,
       created_by, retired_at, retired_by, notes, created_at, updated_at
     FROM assets
     WHERE asset_id = ?
     FOR UPDATE`,
    [assetId],
  );
  if (!rows[0]) {
    throw new ApiError(404, 'ASSET_NOT_FOUND', 'Asset was not found.');
  }
  return rows[0];
}

async function getAssetRecord(connection, assetId) {
  const [rows] = await connection.query(ASSET_ROW_SELECT, [assetId]);
  return rows[0] ?? null;
}

async function getAssignmentRecord(connection, assignmentId) {
  const [rows] = await connection.query(ASSIGNMENT_ROW_SELECT, [assignmentId]);
  return rows[0] ?? null;
}

async function getMaintenanceRecord(connection, maintenanceId) {
  const [rows] = await connection.query(MAINTENANCE_ROW_SELECT, [maintenanceId]);
  return rows[0] ?? null;
}

async function hasOpenAssignment(connection, assetId) {
  const [rows] = await connection.query(
    `SELECT assignment_id
     FROM asset_assignments
     WHERE asset_id = ? AND returned_at IS NULL
     LIMIT 1`,
    [assetId],
  );
  return rows[0] ?? null;
}

async function hasInProgressMaintenance(connection, assetId, excludeId = null) {
  const params = [assetId];
  let sql = `SELECT maintenance_id
             FROM maintenance_records
             WHERE asset_id = ? AND status = 'in_progress'`;
  if (excludeId !== null) {
    sql += ' AND maintenance_id <> ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const [rows] = await connection.query(sql, params);
  return rows[0] ?? null;
}

async function assertCategoryActive(connection, categoryId) {
  const [rows] = await connection.query(
    'SELECT category_id, is_active FROM asset_categories WHERE category_id = ? FOR SHARE',
    [categoryId],
  );
  if (!rows[0]) {
    throw new ApiError(404, 'ASSET_CATEGORY_NOT_FOUND', 'Asset category was not found.');
  }
  if (!rows[0].is_active) {
    throw new ApiError(422, 'CATEGORY_INACTIVE', 'The selected asset category is not active.');
  }
}

async function assertActiveEmployee(connection, employeeId) {
  const [rows] = await connection.query(
    'SELECT employee_id, full_name, is_active FROM employees WHERE employee_id = ? FOR SHARE',
    [employeeId],
  );
  if (!rows[0]) {
    throw new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'Employee was not found.');
  }
  if (!rows[0].is_active) {
    throw new ApiError(409, 'EMPLOYEE_INACTIVE', 'The selected employee is inactive.');
  }
  return rows[0];
}

async function assertTechnicianRole(connection, userId) {
  const [rows] = await connection.query(
    `SELECT
       u.user_id,
       u.is_active AS user_active,
       r.role_name,
       e.employee_id,
       e.full_name,
       e.is_active AS employee_active
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
      'The accountable technician must be an active user with the technician role.',
    );
  }
  return row;
}

function assertDateRange(purchaseDate, warrantyEnd) {
  if (purchaseDate && warrantyEnd && warrantyEnd < purchaseDate) {
    throw new ApiError(
      422,
      'INVALID_WARRANTY_RANGE',
      'The warranty end date cannot be before the purchase date.',
    );
  }
}

async function validateRequestLink(connection, { requestId, assetId, technicianId, actor }) {
  if (requestId === null || requestId === undefined) return null;

  const [rows] = await connection.query(
    `SELECT
       request_id, request_code, employee_id, asset_id, assigned_technician_id, status
     FROM service_requests
     WHERE request_id = ?
     FOR UPDATE`,
    [requestId],
  );
  const request = rows[0];
  if (!request) {
    throw new ApiError(404, 'REQUEST_NOT_FOUND', 'Service request was not found.');
  }
  if (request.asset_id === null) {
    throw new ApiError(422, 'REQUEST_HAS_NO_ASSET', 'The linked request has no asset.');
  }
  if (request.asset_id !== assetId) {
    throw new ApiError(
      422,
      'ASSET_MISMATCH',
      'The maintenance asset does not match the linked request asset.',
    );
  }
  if (!['assigned', 'in_progress'].includes(request.status)) {
    throw new ApiError(409, 'REQUEST_NOT_OPEN', 'The linked request is not open.');
  }
  if (request.assigned_technician_id !== technicianId) {
    throw new ApiError(
      422,
      'TECHNICIAN_MISMATCH',
      'The accountable technician does not match the request technician.',
    );
  }
  if (actor.role !== 'admin' && request.assigned_technician_id !== actor.user_id) {
    throw new ApiError(
      403,
      'NOT_ASSIGNED_TECHNICIAN',
      'Only the assigned technician or an administrator may perform this action.',
    );
  }
  return request;
}

/**
 * The single status/history transition function. It must be called inside a
 * transaction while the caller already holds the asset row lock. It locks the
 * row again defensively and writes at most one audit row for the operation.
 */
export async function recomputeAssetStatus(
  connection,
  assetId,
  { source, referenceId = null, actorId, priorStatus = null, priorCondition = null, remarks = null, changedAt = null },
) {
  const asset = await lockAsset(connection, assetId);
  const [maintenanceRows] = await connection.query(
    `SELECT maintenance_id
     FROM maintenance_records
     WHERE asset_id = ? AND status = 'in_progress'
     LIMIT 1`,
    [assetId],
  );
  const [assignmentRows] = await connection.query(
    `SELECT assignment_id
     FROM asset_assignments
     WHERE asset_id = ? AND returned_at IS NULL
     LIMIT 1`,
    [assetId],
  );

  let computedStatus;
  if (asset.retired_at !== null) {
    computedStatus = 'retired';
  } else if (maintenanceRows[0]) {
    computedStatus = 'under_maintenance';
  } else if (assignmentRows[0]) {
    computedStatus = 'allocated';
  } else if (['new', 'good', 'fair'].includes(asset.asset_condition)) {
    computedStatus = 'available';
  } else {
    computedStatus = 'unavailable';
  }

  await connection.query('UPDATE assets SET status = ? WHERE asset_id = ?', [
    computedStatus,
    assetId,
  ]);

  if (
    !nullSafeEqual(priorStatus, computedStatus) ||
    !nullSafeEqual(priorCondition, asset.asset_condition)
  ) {
    await connection.query(
      `INSERT INTO asset_status_history
        (asset_id, old_status, new_status, old_condition, new_condition,
         source, reference_id, changed_by, remarks, changed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP(6)))`,
      [
        assetId,
        priorStatus,
        computedStatus,
        priorCondition,
        asset.asset_condition,
        source,
        referenceId,
        actorId,
        remarks,
        changedAt,
      ],
    );
  }

  return { status: computedStatus, asset };
}

export async function createAsset(actorId, input) {
  try {
    return await withTransaction(async (connection) => {
      await assertCategoryActive(connection, input.category_id);
      assertDateRange(input.purchase_date, input.warranty_end);

      const [result] = await connection.query(
        `INSERT INTO assets
          (category_id, asset_code, name, brand, model, serial_number,
           purchase_date, warranty_end, purchase_cost, asset_condition, created_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.category_id,
          input.asset_code,
          input.name,
          input.brand ?? null,
          input.model ?? null,
          input.serial_number ?? null,
          input.purchase_date ?? null,
          input.warranty_end ?? null,
          input.purchase_cost ?? null,
          input.asset_condition ?? 'good',
          actorId,
          input.notes ?? null,
        ],
      );

      const [[created]] = await connection.query(
        'SELECT created_at FROM assets WHERE asset_id = ?',
        [result.insertId],
      );
      await recomputeAssetStatus(connection, result.insertId, {
        source: 'registration',
        referenceId: null,
        actorId,
        priorStatus: null,
        priorCondition: null,
        remarks: 'Asset registered',
        changedAt: created.created_at,
      });

      return getAssetRecord(connection, result.insertId);
    });
  } catch (error) {
    mapDuplicateError(error, [
      {
        index: 'uq_assets_code',
        code: 'DUPLICATE_ASSET_CODE',
        message: 'That asset code already exists.',
      },
      {
        index: 'uq_assets_serial',
        code: 'DUPLICATE_SERIAL_NUMBER',
        message: 'That serial number already exists.',
      },
    ]);
    throw error;
  }
}

export async function updateAsset(actorId, assetId, input) {
  try {
    return await withTransaction(async (connection) => {
      const current = await lockAsset(connection, assetId);

      if (input.category_id !== undefined && input.category_id !== current.category_id) {
        await assertCategoryActive(connection, input.category_id);
      }

      const purchaseDate =
        input.purchase_date !== undefined ? input.purchase_date : current.purchase_date;
      const warrantyEnd =
        input.warranty_end !== undefined ? input.warranty_end : current.warranty_end;
      assertDateRange(purchaseDate, warrantyEnd);

      const columns = [
        'category_id',
        'asset_code',
        'name',
        'brand',
        'model',
        'serial_number',
        'purchase_date',
        'warranty_end',
        'purchase_cost',
        'asset_condition',
        'notes',
      ];
      const fields = [];
      const params = [];
      for (const column of columns) {
        if (input[column] !== undefined) {
          fields.push(`${column} = ?`);
          params.push(input[column]);
        }
      }

      if (fields.length > 0) {
        params.push(assetId);
        await connection.query(
          `UPDATE assets SET ${fields.join(', ')} WHERE asset_id = ?`,
          params,
        );
      }

      if (
        input.asset_condition !== undefined &&
        input.asset_condition !== current.asset_condition
      ) {
        const [[updated]] = await connection.query(
          'SELECT updated_at FROM assets WHERE asset_id = ?',
          [assetId],
        );
        await recomputeAssetStatus(connection, assetId, {
          source: 'manual_edit',
          referenceId: null,
          actorId,
          priorStatus: current.status,
          priorCondition: current.asset_condition,
          remarks: 'Asset condition changed by manual edit',
          changedAt: updated.updated_at,
        });
      }

      return getAssetRecord(connection, assetId);
    });
  } catch (error) {
    mapDuplicateError(error, [
      {
        index: 'uq_assets_code',
        code: 'DUPLICATE_ASSET_CODE',
        message: 'That asset code already exists.',
      },
      {
        index: 'uq_assets_serial',
        code: 'DUPLICATE_SERIAL_NUMBER',
        message: 'That serial number already exists.',
      },
    ]);
    throw error;
  }
}

export async function retireAsset(actorId, assetId) {
  return withTransaction(async (connection) => {
    const asset = await lockAsset(connection, assetId);
    if (asset.retired_at !== null) {
      throw new ApiError(409, 'ASSET_RETIRED', 'The asset is already retired.');
    }
    if (await hasOpenAssignment(connection, assetId)) {
      throw new ApiError(
        409,
        'ASSET_ALLOCATED',
        'Return the asset before retiring it.',
      );
    }
    if (await hasInProgressMaintenance(connection, assetId)) {
      throw new ApiError(
        409,
        'ASSET_UNDER_MAINTENANCE',
        'Cancel or complete the in-progress maintenance before retiring the asset.',
      );
    }

    await connection.query(
      'UPDATE assets SET retired_at = CURRENT_TIMESTAMP(6), retired_by = ? WHERE asset_id = ?',
      [actorId, assetId],
    );
    const [[retired]] = await connection.query(
      'SELECT retired_at FROM assets WHERE asset_id = ?',
      [assetId],
    );

    await recomputeAssetStatus(connection, assetId, {
      source: 'retirement',
      referenceId: null,
      actorId,
      priorStatus: asset.status,
      priorCondition: asset.asset_condition,
      remarks: 'Asset retired',
      changedAt: retired.retired_at,
    });

    return getAssetRecord(connection, assetId);
  });
}

export async function allocateAsset(actorId, assetId, { employee_id, remarks = null }) {
  try {
    return await withTransaction(async (connection) => {
      const asset = await lockAsset(connection, assetId);
      if (asset.retired_at !== null) {
        throw new ApiError(409, 'ASSET_RETIRED', 'The asset is retired.');
      }
      if (await hasOpenAssignment(connection, assetId)) {
        throw new ApiError(409, 'ASSET_ALREADY_ALLOCATED', 'The asset already has an open allocation.');
      }
      if (await hasInProgressMaintenance(connection, assetId)) {
        throw new ApiError(
          409,
          'ASSET_UNDER_MAINTENANCE',
          'The asset is under maintenance and cannot be allocated.',
        );
      }
      if (asset.status !== 'available') {
        throw new ApiError(409, 'ASSET_UNAVAILABLE', 'The asset is not available for allocation.');
      }

      await assertActiveEmployee(connection, employee_id);

      const [result] = await connection.query(
        `INSERT INTO asset_assignments (asset_id, employee_id, assigned_by, remarks)
         VALUES (?, ?, ?, ?)`,
        [assetId, employee_id, actorId, remarks],
      );
      const [[assigned]] = await connection.query(
        'SELECT assigned_at FROM asset_assignments WHERE assignment_id = ?',
        [result.insertId],
      );

      await recomputeAssetStatus(connection, assetId, {
        source: 'allocation',
        referenceId: result.insertId,
        actorId,
        priorStatus: asset.status,
        priorCondition: asset.asset_condition,
        remarks,
        changedAt: assigned.assigned_at,
      });

      return getAssignmentRecord(connection, result.insertId);
    });
  } catch (error) {
    mapDuplicateError(error, [
      {
        index: 'uq_asset_assignments_active_asset',
        code: 'ASSET_ALREADY_ALLOCATED',
        message: 'The asset already has an open allocation.',
      },
    ]);
    throw error;
  }
}

export async function returnAssignment(actorId, assignmentId, input) {
  return withTransaction(async (connection) => {
    const [assignmentRows] = await connection.query(
      `SELECT assignment_id, asset_id, employee_id, assigned_at, returned_at
       FROM asset_assignments
       WHERE assignment_id = ?
       FOR UPDATE`,
      [assignmentId],
    );
    const assignment = assignmentRows[0];
    if (!assignment) {
      throw new ApiError(404, 'ASSIGNMENT_NOT_FOUND', 'Assignment was not found.');
    }
    if (assignment.returned_at !== null) {
      throw new ApiError(409, 'ASSIGNMENT_ALREADY_RETURNED', 'The asset has already been returned.');
    }

    const asset = await lockAsset(connection, assignment.asset_id);
    const returnCondition = input.return_condition ?? null;

    if (returnCondition !== null) {
      await connection.query('UPDATE assets SET asset_condition = ? WHERE asset_id = ?', [
        returnCondition,
        asset.asset_id,
      ]);
    }

    await connection.query(
      `UPDATE asset_assignments
       SET returned_at = CURRENT_TIMESTAMP(6),
           returned_by = ?,
           return_condition = ?,
           remarks = ?
       WHERE assignment_id = ?`,
      [actorId, returnCondition, input.remarks ?? null, assignmentId],
    );

    const [[returned]] = await connection.query(
      'SELECT returned_at FROM asset_assignments WHERE assignment_id = ?',
      [assignmentId],
    );

    await recomputeAssetStatus(connection, asset.asset_id, {
      source: 'return',
      referenceId: assignmentId,
      actorId,
      priorStatus: asset.status,
      priorCondition: asset.asset_condition,
      remarks: input.remarks ?? null,
      changedAt: returned.returned_at,
    });

    return getAssignmentRecord(connection, assignmentId);
  });
}

export async function createMaintenance(actor, input) {
  try {
    return await withTransaction(async (connection) => {
      let technicianId = input.technician_id ?? null;
      if (technicianId === null) {
        if (actor.role !== 'technician') {
          throw new ApiError(
            400,
            'TECHNICIAN_REQUIRED',
            'An administrator must choose an accountable technician.',
          );
        }
        technicianId = actor.user_id;
      }
      if (actor.role === 'technician' && technicianId !== actor.user_id) {
        throw new ApiError(
          403,
          'FORBIDDEN',
          'A technician may only create maintenance assigned to themselves.',
        );
      }

      await assertTechnicianRole(connection, technicianId);
      const asset = await lockAsset(connection, input.asset_id);
      if (asset.retired_at !== null) {
        throw new ApiError(409, 'ASSET_RETIRED', 'A retired asset cannot enter maintenance.');
      }

      const mode =
        input.status ?? (input.scheduled_date === undefined ? 'in_progress' : 'scheduled');
      const [[todayRow]] = await connection.query(
        "SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today",
      );
      const today = todayRow.today;

      let scheduledDate;
      if (mode === 'in_progress') {
        if (
          input.scheduled_date !== undefined &&
          input.scheduled_date !== null &&
          input.scheduled_date !== today
        ) {
          throw new ApiError(
            400,
            'INVALID_SCHEDULED_DATE',
            'Immediate maintenance may only use the current date.',
          );
        }
        if (await hasInProgressMaintenance(connection, input.asset_id)) {
          throw new ApiError(
            409,
            'ASSET_UNDER_MAINTENANCE',
            'The asset already has an in-progress maintenance record.',
          );
        }
        scheduledDate = today;
      } else {
        if (input.scheduled_date === undefined || input.scheduled_date === null) {
          throw new ApiError(
            400,
            'INVALID_SCHEDULED_DATE',
            'Scheduled maintenance requires a scheduled_date.',
          );
        }
        if (input.scheduled_date < today) {
          throw new ApiError(
            400,
            'INVALID_SCHEDULED_DATE',
            'Scheduled maintenance cannot be in the past.',
          );
        }
        scheduledDate = input.scheduled_date;
      }

      await validateRequestLink(connection, {
        requestId: input.request_id ?? null,
        assetId: input.asset_id,
        technicianId,
        actor,
      });

      const [result] = await connection.query(
        `INSERT INTO maintenance_records
          (asset_id, request_id, technician_id, created_by, maintenance_type, description,
           status, scheduled_date, started_at, started_by, remarks, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?,
                 IF(? = 'in_progress', CURRENT_TIMESTAMP(6), NULL),
                 IF(? = 'in_progress', ?, NULL),
                 ?, CURRENT_TIMESTAMP(6))`,
        [
          input.asset_id,
          input.request_id ?? null,
          technicianId,
          actor.user_id,
          input.maintenance_type,
          input.description,
          mode,
          scheduledDate,
          mode,
          mode,
          actor.user_id,
          input.remarks ?? null,
        ],
      );

      if (mode === 'in_progress') {
        const [[created]] = await connection.query(
          'SELECT started_at FROM maintenance_records WHERE maintenance_id = ?',
          [result.insertId],
        );
        await recomputeAssetStatus(connection, input.asset_id, {
          source: 'maintenance_start',
          referenceId: result.insertId,
          actorId: actor.user_id,
          priorStatus: asset.status,
          priorCondition: asset.asset_condition,
          remarks: input.remarks ?? null,
          changedAt: created.started_at,
        });
      }

      return getMaintenanceRecord(connection, result.insertId);
    });
  } catch (error) {
    mapDuplicateError(error, [
      {
        index: 'uq_maintenance_records_open_asset',
        code: 'ASSET_UNDER_MAINTENANCE',
        message: 'The asset already has an in-progress maintenance record.',
      },
    ]);
    throw error;
  }
}

async function getMaintenanceForUpdate(connection, maintenanceId) {
  const [rows] = await connection.query(
    `SELECT *
     FROM maintenance_records
     WHERE maintenance_id = ?
     FOR UPDATE`,
    [maintenanceId],
  );
  if (!rows[0]) {
    throw new ApiError(404, 'MAINTENANCE_NOT_FOUND', 'Maintenance record was not found.');
  }
  return rows[0];
}

function assertMaintenanceActor(actor, technicianId) {
  if (actor.role !== 'admin' && technicianId !== actor.user_id) {
    throw new ApiError(
      403,
      'NOT_ASSIGNED_TECHNICIAN',
      'Only the assigned technician or an administrator may perform this action.',
    );
  }
}

export async function startMaintenance(actor, maintenanceId, input) {
  return withTransaction(async (connection) => {
    const record = await getMaintenanceForUpdate(connection, maintenanceId);
    if (record.status !== 'scheduled') {
      throw new ApiError(409, 'INVALID_MAINTENANCE_TRANSITION', 'Only scheduled maintenance can be started.');
    }
    assertMaintenanceActor(actor, record.technician_id);
    await assertTechnicianRole(connection, record.technician_id);

    const asset = await lockAsset(connection, record.asset_id);
    if (asset.retired_at !== null) {
      throw new ApiError(409, 'ASSET_RETIRED', 'A retired asset cannot enter maintenance.');
    }
    if (await hasInProgressMaintenance(connection, record.asset_id, record.maintenance_id)) {
      throw new ApiError(
        409,
        'ASSET_UNDER_MAINTENANCE',
        'The asset already has another in-progress maintenance record.',
      );
    }

    const requestId =
      input.request_id !== undefined ? input.request_id : record.request_id;
    await validateRequestLink(connection, {
      requestId,
      assetId: record.asset_id,
      technicianId: record.technician_id,
      actor,
    });

    await connection.query(
      `UPDATE maintenance_records
       SET status = 'in_progress',
           started_at = CURRENT_TIMESTAMP(6),
           started_by = ?,
           request_id = ?
       WHERE maintenance_id = ?`,
      [actor.user_id, requestId, maintenanceId],
    );
    const [[started]] = await connection.query(
      'SELECT started_at FROM maintenance_records WHERE maintenance_id = ?',
      [maintenanceId],
    );

    await recomputeAssetStatus(connection, record.asset_id, {
      source: 'maintenance_start',
      referenceId: maintenanceId,
      actorId: actor.user_id,
      priorStatus: asset.status,
      priorCondition: asset.asset_condition,
      remarks: record.remarks,
      changedAt: started.started_at,
    });

    return getMaintenanceRecord(connection, maintenanceId);
  });
}

export async function completeMaintenance(actor, maintenanceId, input) {
  return withTransaction(async (connection) => {
    const record = await getMaintenanceForUpdate(connection, maintenanceId);
    if (record.status !== 'in_progress') {
      throw new ApiError(
        409,
        'INVALID_MAINTENANCE_TRANSITION',
        'Only in-progress maintenance can be completed.',
      );
    }
    assertMaintenanceActor(actor, record.technician_id);

    const asset = await lockAsset(connection, record.asset_id);
    const outcome = input.outcome;
    const conditionAfter = input.condition_after;

    if (!outcome || !conditionAfter) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Completion requires outcome and condition_after.',
      );
    }

    const eligible = ['new', 'good', 'fair'].includes(conditionAfter);
    if (outcome === 'returned_to_service' && !eligible) {
      throw new ApiError(
        422,
        'CONDITION_NOT_ALLOCATABLE',
        'A poor or damaged asset cannot be returned to service.',
      );
    }
    if (outcome === 'held_unavailable' && eligible) {
      throw new ApiError(
        422,
        'CONDITION_ELIGIBLE_FOR_SERVICE',
        'An eligible condition must use returned_to_service.',
      );
    }

    const openAssignment = await hasOpenAssignment(connection, record.asset_id);
    if (outcome === 'held_unavailable' && openAssignment) {
      throw new ApiError(
        409,
        'RETURN_BEFORE_HOLD',
        'Return the open allocation before holding the asset unavailable.',
      );
    }
    if (outcome === 'retired' && openAssignment) {
      throw new ApiError(
        409,
        'RETURN_BEFORE_RETIRE',
        'Return the open allocation before retiring the asset.',
      );
    }
    if (input.next_due_date && input.next_due_date < record.scheduled_date) {
      throw new ApiError(
        422,
        'INVALID_NEXT_DUE_DATE',
        'The next due date cannot be before the scheduled date.',
      );
    }

    await connection.query('UPDATE assets SET asset_condition = ? WHERE asset_id = ?', [
      conditionAfter,
      record.asset_id,
    ]);
    if (outcome === 'retired') {
      await connection.query(
        'UPDATE assets SET retired_at = CURRENT_TIMESTAMP(6), retired_by = ? WHERE asset_id = ?',
        [actor.user_id, record.asset_id],
      );
    }

    await connection.query(
      `UPDATE maintenance_records
       SET status = 'completed',
           completed_at = CURRENT_TIMESTAMP(6),
           completed_by = ?,
           outcome = ?,
           condition_after = ?,
           cost = ?,
           next_due_date = ?,
           remarks = ?
       WHERE maintenance_id = ?`,
      [
        actor.user_id,
        outcome,
        conditionAfter,
        input.cost ?? 0,
        input.next_due_date ?? null,
        input.remarks ?? null,
        maintenanceId,
      ],
    );

    const [[completed]] = await connection.query(
      'SELECT completed_at FROM maintenance_records WHERE maintenance_id = ?',
      [maintenanceId],
    );
    const recomputed = await recomputeAssetStatus(connection, record.asset_id, {
      source: 'maintenance_complete',
      referenceId: maintenanceId,
      actorId: actor.user_id,
      priorStatus: asset.status,
      priorCondition: asset.asset_condition,
      remarks: input.remarks ?? null,
      changedAt: completed.completed_at,
    });

    const expected =
      outcome === 'retired'
        ? 'retired'
        : outcome === 'held_unavailable'
          ? 'unavailable'
          : openAssignment
            ? 'allocated'
            : 'available';
    if (recomputed.status !== expected) {
      throw new ApiError(
        409,
        'STATE_INVARIANT',
        `The asset lifecycle produced ${recomputed.status}, expected ${expected}.`,
      );
    }

    return getMaintenanceRecord(connection, maintenanceId);
  });
}

export async function cancelMaintenance(actor, maintenanceId, input) {
  return withTransaction(async (connection) => {
    const record = await getMaintenanceForUpdate(connection, maintenanceId);
    if (!['scheduled', 'in_progress'].includes(record.status)) {
      throw new ApiError(
        409,
        'INVALID_MAINTENANCE_TRANSITION',
        'Only scheduled or in-progress maintenance can be cancelled.',
      );
    }
    assertMaintenanceActor(actor, record.technician_id);

    if (record.status === 'scheduled') {
      await connection.query(
        `UPDATE maintenance_records
         SET status = 'cancelled',
             cancelled_at = CURRENT_TIMESTAMP(6),
             cancelled_by = ?,
             remarks = ?
         WHERE maintenance_id = ?`,
        [actor.user_id, input.remarks ?? record.remarks, maintenanceId],
      );
      return getMaintenanceRecord(connection, maintenanceId);
    }

    const asset = await lockAsset(connection, record.asset_id);
    await connection.query(
      `UPDATE maintenance_records
       SET status = 'cancelled',
           cancelled_at = CURRENT_TIMESTAMP(6),
           cancelled_by = ?,
           remarks = ?
       WHERE maintenance_id = ?`,
      [actor.user_id, input.remarks ?? record.remarks, maintenanceId],
    );
    const [[cancelled]] = await connection.query(
      'SELECT cancelled_at FROM maintenance_records WHERE maintenance_id = ?',
      [maintenanceId],
    );

    await recomputeAssetStatus(connection, record.asset_id, {
      source: 'maintenance_cancel',
      referenceId: maintenanceId,
      actorId: actor.user_id,
      priorStatus: asset.status,
      priorCondition: asset.asset_condition,
      remarks: input.remarks ?? record.remarks,
      changedAt: cancelled.cancelled_at,
    });

    return getMaintenanceRecord(connection, maintenanceId);
  });
}

// Re-export for service-level tests and diagnostics without exposing writes to
// controllers. All public lifecycle mutations above remain the only writes.
export { getAssetRecord, getAssignmentRecord, getMaintenanceRecord };
