import { query } from '../db/index.js';

export async function getAdminDashboard() {
  const [[assetCounts]] = await query(
    `SELECT
       COUNT(*) AS total_assets,
       SUM(status = 'available') AS available,
       SUM(status = 'allocated') AS allocated,
       SUM(status = 'under_maintenance') AS under_maintenance,
       SUM(status = 'unavailable') AS unavailable,
       SUM(status = 'retired') AS retired
     FROM assets`,
  );
  const [[requestCounts]] = await query(
    `SELECT
       COUNT(*) AS total_requests,
       SUM(status = 'pending') AS pending,
       SUM(status = 'assigned') AS assigned,
       SUM(status = 'in_progress') AS in_progress,
       SUM(status = 'resolved') AS resolved,
       SUM(status = 'closed') AS closed,
       SUM(status = 'cancelled') AS cancelled
     FROM service_requests`,
  );
  const [[maintenanceCounts]] = await query(
    `SELECT
       COUNT(*) AS total_maintenance,
       SUM(status = 'scheduled') AS scheduled,
       SUM(status = 'in_progress') AS in_progress,
       SUM(status = 'completed') AS completed,
       SUM(status = 'cancelled') AS cancelled,
       SUM(outcome = 'returned_to_service') AS returned_to_service,
       SUM(outcome = 'held_unavailable') AS held_unavailable,
       SUM(outcome = 'retired') AS retired
     FROM maintenance_records`,
  );
  const [[allocationCounts]] = await query(
    `SELECT
       SUM(returned_at IS NULL) AS open_allocations,
       SUM(returned_at IS NOT NULL) AS returned_allocations
     FROM asset_assignments`,
  );
  const [[overdue]] = await query(
    `SELECT COUNT(*) AS overdue_maintenance
     FROM maintenance_records
     WHERE status IN ('scheduled', 'in_progress')
       AND next_due_date IS NOT NULL
       AND next_due_date < CURDATE()`,
  );

  return {
    assets: normalizeCounts(assetCounts),
    requests: normalizeCounts(requestCounts),
    maintenance: normalizeCounts(maintenanceCounts),
    allocations: normalizeCounts(allocationCounts),
    overdue_maintenance: Number(overdue.overdue_maintenance ?? 0),
  };
}

export async function getEmployeeDashboard(actor) {
  const [[assetCounts]] = await query(
    `SELECT COUNT(*) AS total_assets
     FROM asset_assignments
     WHERE employee_id = ? AND returned_at IS NULL`,
    [actor.employee_id],
  );
  const [[requestCounts]] = await query(
    `SELECT
       COUNT(*) AS total_requests,
       SUM(status = 'pending') AS pending,
       SUM(status = 'assigned') AS assigned,
       SUM(status = 'in_progress') AS in_progress,
       SUM(status = 'resolved') AS resolved,
       SUM(status = 'closed') AS closed,
       SUM(status = 'cancelled') AS cancelled
     FROM service_requests
     WHERE employee_id = ?`,
    [actor.employee_id],
  );

  return {
    assigned_assets: Number(assetCounts.total_assets ?? 0),
    requests: normalizeCounts(requestCounts),
  };
}

export async function getTechnicianDashboard(actor) {
  const [[requestCounts]] = await query(
    `SELECT
       COUNT(*) AS total_requests,
       SUM(status = 'assigned') AS assigned,
       SUM(status = 'in_progress') AS in_progress,
       SUM(status = 'resolved') AS resolved
     FROM service_requests
     WHERE assigned_technician_id = ?`,
    [actor.user_id],
  );
  const [[maintenanceCounts]] = await query(
    `SELECT
       COUNT(*) AS total_maintenance,
       SUM(status = 'scheduled') AS scheduled,
       SUM(status = 'in_progress') AS in_progress,
       SUM(status = 'completed') AS completed,
       SUM(status = 'cancelled') AS cancelled
     FROM maintenance_records
     WHERE technician_id = ?`,
    [actor.user_id],
  );

  return {
    requests: normalizeCounts(requestCounts),
    maintenance: normalizeCounts(maintenanceCounts),
  };
}

function normalizeCounts(row) {
  const output = {};
  for (const [key, value] of Object.entries(row ?? {})) {
    output[key] = Number(value ?? 0);
  }
  return output;
}
