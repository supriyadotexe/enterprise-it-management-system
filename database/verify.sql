-- ===========================================================================
-- EITAMS static database audit
--
-- Scope (approved): current-state consistency, history-chain consistency,
-- one registration row per asset, actor/timestamp/outcome consistency, and
-- domain events referencing existing assets, assignments, requests and
-- maintenance records.
--
-- This file intentionally does NOT claim to prove every historical
-- intermediate transition. Integration tests in a later phase assert the
-- exact events emitted by each lifecycle service call.
--
-- Every query below returns only failing rows. A clean run returns no rows.
--
-- The script pins the approved numeric session offset below, so no
-- --init-command is required.
-- ===========================================================================

USE eitams;

-- Static scripts pin the approved case-study offset. The application derives
-- the same offset from APP_TIMEZONE.
SET time_zone = '+05:30';

-- 1. The session must not silently inherit the server default.
SELECT
  'session_time_zone_is_system' AS check_name,
  @@session.time_zone AS details
WHERE @@session.time_zone = 'SYSTEM';

-- 2. There must be exactly one registration history row per asset.
SELECT
  'registration_row_count' AS check_name,
  a.asset_id AS details
FROM assets AS a
LEFT JOIN asset_status_history AS h
  ON h.asset_id = a.asset_id
 AND h.source = 'registration'
GROUP BY a.asset_id
HAVING COUNT(h.history_id) <> 1;

-- 3. Registration rows must start from NULL status/condition and land in a
--    valid pre-lifecycle cache value.
SELECT
  'registration_row_shape' AS check_name,
  CONCAT('history_id=', h.history_id, ', asset_id=', h.asset_id) AS details
FROM asset_status_history AS h
WHERE h.source = 'registration'
  AND (
    h.old_status IS NOT NULL
    OR h.old_condition IS NOT NULL
    OR h.new_condition IS NULL
    OR h.new_status NOT IN ('available', 'unavailable')
    OR h.reference_id IS NOT NULL
  );

-- 4. The registration actor and timestamp must match the asset row.
SELECT
  'registration_actor_or_time' AS check_name,
  CONCAT('asset_id=', a.asset_id, ', history_id=', h.history_id) AS details
FROM assets AS a
JOIN asset_status_history AS h
  ON h.asset_id = a.asset_id
 AND h.source = 'registration'
WHERE h.changed_by <> a.created_by
   OR h.changed_at <> a.created_at;

-- 5. Registration and all non-status-changing causes must not carry a
--    polymorphic reference.
SELECT
  'history_reference_shape' AS check_name,
  CONCAT('history_id=', h.history_id, ', source=', h.source) AS details
FROM asset_status_history AS h
WHERE (
    h.source IN ('registration', 'manual_edit', 'retirement')
    AND h.reference_id IS NOT NULL
  )
  OR (
    h.source IN (
      'allocation',
      'return',
      'maintenance_start',
      'maintenance_complete',
      'maintenance_cancel'
    )
    AND h.reference_id IS NULL
  );

-- 6. Allocation and return references must resolve to the same assignment
--    and the same asset.
SELECT
  'assignment_history_reference' AS check_name,
  CONCAT('history_id=', h.history_id, ', reference_id=', h.reference_id) AS details
FROM asset_status_history AS h
LEFT JOIN asset_assignments AS a
  ON a.assignment_id = h.reference_id
WHERE h.source IN ('allocation', 'return')
  AND (a.assignment_id IS NULL OR a.asset_id <> h.asset_id);

-- 7. Maintenance history references must resolve to the same maintenance
--    record and the same asset, and the cited event must exist.
SELECT
  'maintenance_history_reference' AS check_name,
  CONCAT('history_id=', h.history_id, ', reference_id=', h.reference_id) AS details
FROM asset_status_history AS h
LEFT JOIN maintenance_records AS m
  ON m.maintenance_id = h.reference_id
WHERE h.source IN ('maintenance_start', 'maintenance_complete', 'maintenance_cancel')
  AND (
    m.maintenance_id IS NULL
    OR m.asset_id <> h.asset_id
    OR (h.source = 'maintenance_start' AND m.started_at IS NULL)
    OR (h.source = 'maintenance_complete' AND m.completed_at IS NULL)
    OR (h.source = 'maintenance_cancel' AND m.cancelled_at IS NULL)
  );

-- 8. A cause must produce at most one history row.
SELECT
  'duplicate_history_cause' AS check_name,
  CONCAT('source=', source, ', reference_id=', reference_id) AS details
FROM asset_status_history
WHERE reference_id IS NOT NULL
GROUP BY source, reference_id
HAVING COUNT(*) > 1;

-- 9. History rows must actually change status or condition.
SELECT
  'no_op_history_row' AS check_name,
  CONCAT('history_id=', history_id, ', asset_id=', asset_id) AS details
FROM asset_status_history
WHERE old_status <=> new_status
  AND old_condition <=> new_condition;

-- 10. History must be a continuous chain per asset.
WITH ordered_history AS (
  SELECT
    h.history_id,
    h.asset_id,
    h.old_status,
    h.new_status,
    h.old_condition,
    h.new_condition,
    LAG(h.new_status) OVER (
      PARTITION BY h.asset_id
      ORDER BY h.changed_at, h.history_id
    ) AS previous_status,
    LAG(h.new_condition) OVER (
      PARTITION BY h.asset_id
      ORDER BY h.changed_at, h.history_id
    ) AS previous_condition
  FROM asset_status_history AS h
)
SELECT
  'history_chain_gap' AS check_name,
  CONCAT('history_id=', history_id, ', asset_id=', asset_id) AS details
FROM ordered_history
WHERE (
    previous_status IS NULL
    AND old_status IS NOT NULL
  )
  OR (
    previous_status IS NOT NULL
    AND NOT (old_status <=> previous_status)
  )
  OR (
    previous_condition IS NULL
    AND old_condition IS NOT NULL
  )
  OR (
    previous_condition IS NOT NULL
    AND NOT (old_condition <=> previous_condition)
  );

-- 11. The last history row must agree with the cached asset row.
WITH ranked_history AS (
  SELECT
    h.asset_id,
    h.new_status,
    h.new_condition,
    ROW_NUMBER() OVER (
      PARTITION BY h.asset_id
      ORDER BY h.changed_at DESC, h.history_id DESC
    ) AS rn
  FROM asset_status_history AS h
)
SELECT
  'latest_history_mismatch' AS check_name,
  CONCAT(
    'asset_id=', a.asset_id,
    ', cached=', a.status, '/', a.asset_condition,
    ', history=', COALESCE(h.new_status, 'missing'), '/', COALESCE(h.new_condition, 'missing')
  ) AS details
FROM assets AS a
LEFT JOIN ranked_history AS h
  ON h.asset_id = a.asset_id
 AND h.rn = 1
WHERE h.asset_id IS NULL
   OR NOT (h.new_status <=> a.status)
   OR NOT (h.new_condition <=> a.asset_condition);

-- 12. The cached status must equal the single recompute precedence.
WITH computed_status AS (
  SELECT
    a.asset_id,
    a.status AS cached_status,
    CASE
      WHEN a.retired_at IS NOT NULL THEN 'retired'
      WHEN EXISTS (
        SELECT 1
        FROM maintenance_records AS m
        WHERE m.asset_id = a.asset_id
          AND m.status = 'in_progress'
      ) THEN 'under_maintenance'
      WHEN EXISTS (
        SELECT 1
        FROM asset_assignments AS aa
        WHERE aa.asset_id = a.asset_id
          AND aa.returned_at IS NULL
      ) THEN 'allocated'
      WHEN a.asset_condition IN ('new', 'good', 'fair') THEN 'available'
      ELSE 'unavailable'
    END AS expected_status
  FROM assets AS a
)
SELECT
  'cached_status_mismatch' AS check_name,
  CONCAT('asset_id=', asset_id, ', cached=', cached_status, ', expected=', expected_status) AS details
FROM computed_status
WHERE NOT (cached_status <=> expected_status);

-- 13. Retirement fields and status must agree, and retired assets must have
--    no open allocation or in-progress maintenance.
SELECT
  'retirement_state_mismatch' AS check_name,
  CONCAT('asset_id=', a.asset_id, ', status=', a.status) AS details
FROM assets AS a
WHERE (
    a.status = 'retired'
    AND (a.retired_at IS NULL OR a.retired_by IS NULL)
  )
  OR (
    a.retired_at IS NOT NULL
    AND a.status <> 'retired'
  )
  OR (
    a.retired_at IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM asset_assignments AS aa
        WHERE aa.asset_id = a.asset_id AND aa.returned_at IS NULL
      )
      OR EXISTS (
        SELECT 1 FROM maintenance_records AS m
        WHERE m.asset_id = a.asset_id AND m.status = 'in_progress'
      )
    )
  );

-- 14. At most one open allocation per asset.
SELECT
  'multiple_open_allocations' AS check_name,
  CONCAT('asset_id=', asset_id, ', open_count=', COUNT(*)) AS details
FROM asset_assignments
WHERE returned_at IS NULL
GROUP BY asset_id
HAVING COUNT(*) > 1;

-- 15. At most one in-progress maintenance record per asset.
SELECT
  'multiple_in_progress_maintenance' AS check_name,
  CONCAT('asset_id=', asset_id, ', open_count=', COUNT(*)) AS details
FROM maintenance_records
WHERE status = 'in_progress'
GROUP BY asset_id
HAVING COUNT(*) > 1;

-- 16. Assignment return fields and timestamps must be internally consistent.
SELECT
  'assignment_return_mismatch' AS check_name,
  CONCAT('assignment_id=', assignment_id) AS details
FROM asset_assignments
WHERE (returned_at IS NULL) <> (returned_by IS NULL)
   OR (returned_at IS NOT NULL AND returned_at < assigned_at)
   OR (returned_at IS NOT NULL AND return_condition IS NULL);

-- 17. Each assignment must emit exactly the expected allocation and return
--    history rows, with the correct actor and event timestamp.
SELECT
  'assignment_history_count' AS check_name,
  CONCAT('assignment_id=', a.assignment_id) AS details
FROM asset_assignments AS a
LEFT JOIN asset_status_history AS allocation_history
  ON allocation_history.source = 'allocation'
 AND allocation_history.reference_id = a.assignment_id
LEFT JOIN asset_status_history AS return_history
  ON return_history.source = 'return'
 AND return_history.reference_id = a.assignment_id
GROUP BY a.assignment_id, a.returned_at
HAVING (
    SUM(CASE WHEN allocation_history.history_id IS NOT NULL THEN 1 ELSE 0 END) <> 1
  )
  OR (
    a.returned_at IS NULL
    AND SUM(CASE WHEN return_history.history_id IS NOT NULL THEN 1 ELSE 0 END) <> 0
  )
  OR (
    a.returned_at IS NOT NULL
    AND SUM(CASE WHEN return_history.history_id IS NOT NULL THEN 1 ELSE 0 END) <> 1
  );

-- 18. Allocation history actor, timestamp and transition must match the
--    assignment row.
SELECT
  'allocation_history_consistency' AS check_name,
  CONCAT('assignment_id=', a.assignment_id, ', history_id=', h.history_id) AS details
FROM asset_assignments AS a
JOIN asset_status_history AS h
  ON h.source = 'allocation'
 AND h.reference_id = a.assignment_id
WHERE h.changed_by <> a.assigned_by
   OR h.changed_at <> a.assigned_at
   OR h.asset_id <> a.asset_id
   OR h.old_status <> 'available'
   OR h.new_status <> 'allocated';

-- 19. Return history actor, timestamp, condition and transition must match
--    the assignment row.
SELECT
  'return_history_consistency' AS check_name,
  CONCAT('assignment_id=', a.assignment_id, ', history_id=', h.history_id) AS details
FROM asset_assignments AS a
JOIN asset_status_history AS h
  ON h.source = 'return'
 AND h.reference_id = a.assignment_id
WHERE h.changed_by <> a.returned_by
   OR h.changed_at <> a.returned_at
   OR h.asset_id <> a.asset_id
   OR NOT (h.new_condition <=> a.return_condition)
   OR h.old_status NOT IN ('allocated', 'under_maintenance')
   OR h.new_status NOT IN ('available', 'unavailable', 'under_maintenance');

-- 20. Maintenance field matrix, exactly as enforced by the CHECK
--    constraints, repeated as a static audit.
SELECT
  'maintenance_field_matrix' AS check_name,
  CONCAT('maintenance_id=', maintenance_id, ', status=', status) AS details
FROM maintenance_records
WHERE (
    status = 'scheduled'
    AND (
      started_at IS NOT NULL
      OR started_by IS NOT NULL
      OR completed_at IS NOT NULL
      OR completed_by IS NOT NULL
      OR cancelled_at IS NOT NULL
      OR cancelled_by IS NOT NULL
      OR outcome IS NOT NULL
      OR condition_after IS NOT NULL
    )
  )
  OR (
    status = 'in_progress'
    AND (
      started_at IS NULL
      OR started_by IS NULL
      OR completed_at IS NOT NULL
      OR completed_by IS NOT NULL
      OR cancelled_at IS NOT NULL
      OR cancelled_by IS NOT NULL
      OR outcome IS NOT NULL
      OR condition_after IS NOT NULL
    )
  )
  OR (
    status = 'completed'
    AND (
      started_at IS NULL
      OR started_by IS NULL
      OR completed_at IS NULL
      OR completed_by IS NULL
      OR cancelled_at IS NOT NULL
      OR cancelled_by IS NOT NULL
      OR outcome IS NULL
      OR condition_after IS NULL
    )
  )
  OR (
    status = 'cancelled'
    AND (
      cancelled_at IS NULL
      OR cancelled_by IS NULL
      OR completed_at IS NOT NULL
      OR completed_by IS NOT NULL
      OR outcome IS NOT NULL
      OR condition_after IS NOT NULL
      OR ((started_at IS NULL) <> (started_by IS NULL))
    )
  )
  OR (completed_at IS NOT NULL AND started_at IS NOT NULL AND completed_at < started_at)
  OR (cancelled_at IS NOT NULL AND started_at IS NOT NULL AND cancelled_at < started_at)
  OR (started_at IS NOT NULL AND started_at < created_at)
  OR (started_at IS NOT NULL AND scheduled_date > DATE(started_at))
  OR (next_due_date IS NOT NULL AND next_due_date < scheduled_date)
  OR cost < 0;

-- 21. Completion outcome and condition matrix.
SELECT
  'completion_outcome_matrix' AS check_name,
  CONCAT('maintenance_id=', maintenance_id, ', outcome=', outcome, ', condition=', condition_after) AS details
FROM maintenance_records
WHERE status = 'completed'
  AND (
    (
      outcome = 'returned_to_service'
      AND condition_after NOT IN ('new', 'good', 'fair')
    )
    OR (
      outcome = 'held_unavailable'
      AND condition_after NOT IN ('poor', 'damaged')
    )
  );

-- 22. Held or retired completions must not have an allocation open at the
--    completion instant.
SELECT
  'completion_with_open_allocation' AS check_name,
  CONCAT('maintenance_id=', m.maintenance_id, ', outcome=', m.outcome) AS details
FROM maintenance_records AS m
WHERE m.status = 'completed'
  AND m.outcome IN ('held_unavailable', 'retired')
  AND EXISTS (
    SELECT 1
    FROM asset_assignments AS a
    WHERE a.asset_id = m.asset_id
      AND a.assigned_at <= m.completed_at
      AND (a.returned_at IS NULL OR a.returned_at > m.completed_at)
  );

-- 23. Completion history must exist, match the completion timestamp/actor,
--    and show the status and condition required by the outcome matrix.
SELECT
  'completion_history_mismatch' AS check_name,
  CONCAT('maintenance_id=', m.maintenance_id) AS details
FROM maintenance_records AS m
LEFT JOIN asset_status_history AS h
  ON h.source = 'maintenance_complete'
 AND h.reference_id = m.maintenance_id
WHERE m.status = 'completed'
  AND (
    h.history_id IS NULL
    OR h.changed_by <> m.completed_by
    OR h.changed_at <> m.completed_at
    OR h.asset_id <> m.asset_id
    OR NOT (h.new_condition <=> m.condition_after)
    OR NOT (
      h.new_status <=>
        CASE
          WHEN m.outcome = 'retired' THEN 'retired'
          WHEN m.outcome = 'held_unavailable' THEN 'unavailable'
          WHEN m.outcome = 'returned_to_service' AND EXISTS (
            SELECT 1
            FROM asset_assignments AS a
            WHERE a.asset_id = m.asset_id
              AND a.assigned_at <= m.completed_at
              AND (a.returned_at IS NULL OR a.returned_at > m.completed_at)
          ) THEN 'allocated'
          WHEN m.outcome = 'returned_to_service' THEN 'available'
          ELSE NULL
        END
    )
  );

-- 24. Retired-by-maintenance completion must populate the asset retirement
--    fields with the completing actor and timestamp.
SELECT
  'maintenance_retirement_mismatch' AS check_name,
  CONCAT('maintenance_id=', m.maintenance_id, ', asset_id=', m.asset_id) AS details
FROM maintenance_records AS m
JOIN assets AS a ON a.asset_id = m.asset_id
WHERE m.status = 'completed'
  AND m.outcome = 'retired'
  AND (
    a.retired_at IS NULL
    OR a.retired_at <> m.completed_at
    OR a.retired_by <> m.completed_by
  );

-- 25. Every started maintenance record must have exactly one start history
--    row, and scheduled-only records must have none.
SELECT
  'maintenance_start_history_count' AS check_name,
  CONCAT('maintenance_id=', m.maintenance_id) AS details
FROM maintenance_records AS m
LEFT JOIN asset_status_history AS h
  ON h.source = 'maintenance_start'
 AND h.reference_id = m.maintenance_id
GROUP BY m.maintenance_id, m.started_at
HAVING (
    m.started_at IS NOT NULL
    AND SUM(CASE WHEN h.history_id IS NOT NULL THEN 1 ELSE 0 END) <> 1
  )
  OR (
    m.started_at IS NULL
    AND SUM(CASE WHEN h.history_id IS NOT NULL THEN 1 ELSE 0 END) <> 0
  );

-- 26. Start history actor, timestamp and transition must match the record.
SELECT
  'maintenance_start_history_consistency' AS check_name,
  CONCAT('maintenance_id=', m.maintenance_id, ', history_id=', h.history_id) AS details
FROM maintenance_records AS m
JOIN asset_status_history AS h
  ON h.source = 'maintenance_start'
 AND h.reference_id = m.maintenance_id
WHERE h.changed_by <> m.started_by
   OR h.changed_at <> m.started_at
   OR h.asset_id <> m.asset_id
   OR h.old_status = 'under_maintenance'
   OR h.new_status <> 'under_maintenance';

-- 27. In-progress cancellation must have exactly one cancel history row;
--    scheduled-only cancellation must have none.
SELECT
  'maintenance_cancel_history_count' AS check_name,
  CONCAT('maintenance_id=', m.maintenance_id) AS details
FROM maintenance_records AS m
LEFT JOIN asset_status_history AS h
  ON h.source = 'maintenance_cancel'
 AND h.reference_id = m.maintenance_id
GROUP BY m.maintenance_id, m.status, m.started_at
HAVING (
    m.status = 'cancelled'
    AND m.started_at IS NOT NULL
    AND SUM(CASE WHEN h.history_id IS NOT NULL THEN 1 ELSE 0 END) <> 1
  )
  OR (
    NOT (m.status = 'cancelled' AND m.started_at IS NOT NULL)
    AND SUM(CASE WHEN h.history_id IS NOT NULL THEN 1 ELSE 0 END) <> 0
  );

-- 28. Cancel history actor, timestamp and transition must match the record.
SELECT
  'maintenance_cancel_history_consistency' AS check_name,
  CONCAT('maintenance_id=', m.maintenance_id, ', history_id=', h.history_id) AS details
FROM maintenance_records AS m
JOIN asset_status_history AS h
  ON h.source = 'maintenance_cancel'
 AND h.reference_id = m.maintenance_id
WHERE h.changed_by <> m.cancelled_by
   OR h.changed_at <> m.cancelled_at
   OR h.asset_id <> m.asset_id
   OR h.old_status <> 'under_maintenance'
   OR h.new_status NOT IN ('available', 'allocated', 'unavailable');

-- 29. Maintenance technicians must have the technician role.
SELECT
  'maintenance_technician_role' AS check_name,
  CONCAT('maintenance_id=', m.maintenance_id, ', technician_id=', m.technician_id) AS details
FROM maintenance_records AS m
JOIN users AS u ON u.user_id = m.technician_id
JOIN roles AS r ON r.role_id = u.role_id
WHERE r.role_name <> 'technician';

-- 30. Request-assigned technicians must also have the technician role.
SELECT
  'request_technician_role' AS check_name,
  CONCAT('request_id=', r.request_id, ', technician_id=', r.assigned_technician_id) AS details
FROM service_requests AS r
JOIN users AS u ON u.user_id = r.assigned_technician_id
JOIN roles AS role ON role.role_id = u.role_id
WHERE r.assigned_technician_id IS NOT NULL
  AND role.role_name <> 'technician';

-- 31. Maintenance event actors must hold an admin or technician role.
SELECT
  'maintenance_actor_role' AS check_name,
  CONCAT('maintenance_id=', m.maintenance_id, ', actor_id=', actor.user_id) AS details
FROM maintenance_records AS m
JOIN users AS actor
  ON actor.user_id IN (m.created_by, m.started_by, m.completed_by, m.cancelled_by)
JOIN roles AS role ON role.role_id = actor.role_id
WHERE role.role_name NOT IN ('admin', 'technician');

-- 32. Linked maintenance must match the request asset and accountable
--    technician.
SELECT
  'maintenance_request_mismatch' AS check_name,
  CONCAT('maintenance_id=', m.maintenance_id, ', request_id=', m.request_id) AS details
FROM maintenance_records AS m
JOIN service_requests AS r ON r.request_id = m.request_id
WHERE r.asset_id IS NULL
   OR r.asset_id <> m.asset_id
   OR NOT (r.assigned_technician_id <=> m.technician_id);

-- 33. Every request must have exactly one creation history row, and its
--    actor and timestamp must match the request.
SELECT
  'request_creation_history' AS check_name,
  CONCAT('request_id=', r.request_id) AS details
FROM service_requests AS r
LEFT JOIN request_status_history AS h
  ON h.request_id = r.request_id
 AND h.old_status IS NULL
GROUP BY r.request_id, r.employee_id, r.created_at
HAVING SUM(CASE WHEN h.history_id IS NOT NULL THEN 1 ELSE 0 END) <> 1
    OR MIN(h.new_status) <> 'pending'
    OR MIN(h.changed_at) <> r.created_at
    OR MIN(h.changed_by) <> (
      SELECT u.user_id
      FROM users AS u
      WHERE u.employee_id = r.employee_id
    );

-- 34. Request history must be a continuous chain per request.
WITH ordered_request_history AS (
  SELECT
    h.history_id,
    h.request_id,
    h.old_status,
    h.new_status,
    LAG(h.new_status) OVER (
      PARTITION BY h.request_id
      ORDER BY h.changed_at, h.history_id
    ) AS previous_status
  FROM request_status_history AS h
)
SELECT
  'request_history_chain_gap' AS check_name,
  CONCAT('history_id=', history_id, ', request_id=', request_id) AS details
FROM ordered_request_history
WHERE (
    previous_status IS NULL
    AND old_status IS NOT NULL
  )
  OR (
    previous_status IS NOT NULL
    AND NOT (old_status <=> previous_status)
  );

-- 35. The last request history row must agree with the cached request status.
WITH ranked_request_history AS (
  SELECT
    h.request_id,
    h.new_status,
    ROW_NUMBER() OVER (
      PARTITION BY h.request_id
      ORDER BY h.changed_at DESC, h.history_id DESC
    ) AS rn
  FROM request_status_history AS h
)
SELECT
  'latest_request_history_mismatch' AS check_name,
  CONCAT('request_id=', r.request_id, ', cached=', r.status, ', history=', h.new_status) AS details
FROM service_requests AS r
LEFT JOIN ranked_request_history AS h
  ON h.request_id = r.request_id
 AND h.rn = 1
WHERE h.request_id IS NULL
   OR NOT (h.new_status <=> r.status);

-- 36. Request lifecycle fields must agree with the cached status.
SELECT
  'request_state_mismatch' AS check_name,
  CONCAT('request_id=', request_id, ', status=', status) AS details
FROM service_requests
WHERE (
    status IN ('resolved', 'closed')
    AND resolved_at IS NULL
  )
  OR (
    status NOT IN ('resolved', 'closed')
    AND resolved_at IS NOT NULL
  )
  OR (
    status IN ('assigned', 'in_progress', 'resolved', 'closed')
    AND (assigned_technician_id IS NULL OR assigned_at IS NULL)
  )
  OR (
    status = 'pending'
    AND (assigned_technician_id IS NOT NULL OR assigned_at IS NOT NULL)
  )
  OR (
    resolved_at IS NOT NULL
    AND assigned_at IS NOT NULL
    AND resolved_at < assigned_at
  );

-- 36b. Request history volume must match the status shape: pending has only
--     creation, every other status has at least one real transition.
SELECT
  'request_history_volume' AS check_name,
  CONCAT('request_id=', r.request_id, ', status=', r.status, ', rows=', COUNT(*)) AS details
FROM service_requests AS r
JOIN request_status_history AS h ON h.request_id = r.request_id
GROUP BY r.request_id, r.status
HAVING (r.status = 'pending' AND COUNT(*) <> 1)
    OR (r.status <> 'pending' AND COUNT(*) < 2);

-- 37. The view must not duplicate a domain event.
SELECT
  'view_duplicate_event' AS check_name,
  CONCAT(
    'asset_id=', asset_id,
    ', event_type=', event_type,
    ', reference_table=', reference_table,
    ', reference_id=', reference_id,
    ', event_at=', event_at
  ) AS details
FROM v_asset_history
GROUP BY asset_id, event_type, reference_table, reference_id, event_at
HAVING COUNT(*) > 1;

-- 38. Every asset must appear exactly once in the registration branch of the
--    view.
SELECT
  'view_registration_count' AS check_name,
  CONCAT('asset_id=', a.asset_id, ', registered_events=', COUNT(v.event_type)) AS details
FROM assets AS a
LEFT JOIN v_asset_history AS v
  ON v.asset_id = a.asset_id
 AND v.event_type = 'registered'
GROUP BY a.asset_id
HAVING COUNT(v.event_type) <> 1;

-- 39. View references must resolve to real domain rows.
SELECT
  'view_reference_missing' AS check_name,
  CONCAT(
    'asset_id=', v.asset_id,
    ', event_type=', v.event_type,
    ', reference_table=', v.reference_table,
    ', reference_id=', v.reference_id
  ) AS details
FROM v_asset_history AS v
WHERE (
    v.reference_table = 'assets'
    AND NOT EXISTS (
      SELECT 1 FROM assets AS a WHERE a.asset_id = v.reference_id
    )
  )
  OR (
    v.reference_table = 'asset_assignments'
    AND NOT EXISTS (
      SELECT 1 FROM asset_assignments AS a WHERE a.assignment_id = v.reference_id
    )
  )
  OR (
    v.reference_table = 'maintenance_records'
    AND NOT EXISTS (
      SELECT 1 FROM maintenance_records AS m WHERE m.maintenance_id = v.reference_id
    )
  )
  OR (
    v.reference_table = 'asset_status_history'
    AND NOT EXISTS (
      SELECT 1 FROM asset_status_history AS h WHERE h.history_id = v.reference_id
    )
  );

-- 40. Manual edits and retirements must be audit-only rows with the correct
--    transition shape.
SELECT
  'manual_or_retirement_history_shape' AS check_name,
  CONCAT('history_id=', history_id, ', source=', source) AS details
FROM asset_status_history
WHERE (
    source = 'manual_edit'
    AND old_status <=> new_status
    AND old_condition <=> new_condition
  )
  OR (
    source = 'retirement'
    AND (new_status <> 'retired' OR old_status = 'retired')
  );

-- 41. Asset status history source/transition sanity.
SELECT
  'history_source_transition' AS check_name,
  CONCAT('history_id=', history_id, ', source=', source) AS details
FROM asset_status_history
WHERE (
    source = 'allocation'
    AND (old_status <> 'available' OR new_status <> 'allocated')
  )
  OR (
    source = 'return'
    AND (
      old_status NOT IN ('allocated', 'under_maintenance')
      OR new_status NOT IN ('available', 'unavailable', 'under_maintenance')
    )
  )
  OR (
    source = 'maintenance_start'
    AND (old_status = 'under_maintenance' OR new_status <> 'under_maintenance')
  )
  OR (
    source = 'maintenance_complete'
    AND old_status <> 'under_maintenance'
  )
  OR (
    source = 'maintenance_cancel'
    AND (old_status <> 'under_maintenance' OR new_status NOT IN ('available', 'allocated', 'unavailable'))
  )
  OR (
    source = 'retirement'
    AND new_status <> 'retired'
  );
