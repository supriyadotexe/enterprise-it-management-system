const MAINTENANCE_TYPE = ['preventive', 'corrective', 'inspection', 'upgrade'];
const MAINTENANCE_STATUS = ['scheduled', 'in_progress', 'completed', 'cancelled'];
const CONDITION = ['new', 'good', 'fair', 'poor', 'damaged'];
const OUTCOME = ['returned_to_service', 'held_unavailable', 'retired'];

export const maintenanceBody = {
  asset_id: { type: 'integer', required: true, min: 1, nullable: false },
  request_id: { type: 'integer', min: 1 },
  technician_id: { type: 'integer', min: 1 },
  maintenance_type: { type: 'string', required: true, enum: MAINTENANCE_TYPE, nullable: false },
  description: { type: 'string', required: true, min: 1, max: 5000, nullable: false },
  // Optional explicit mode. When omitted, the presence of scheduled_date
  // selects scheduled work and its absence selects immediate work.
  status: { type: 'string', enum: ['scheduled', 'in_progress'] },
  scheduled_date: { type: 'date' },
  remarks: { type: 'string', max: 500 },
};

export const maintenanceStartBody = {
  request_id: { type: 'integer', min: 1 },
  remarks: { type: 'string', max: 500 },
};

export const maintenanceCompleteBody = {
  outcome: { type: 'string', required: true, enum: OUTCOME, nullable: false },
  condition_after: { type: 'string', required: true, enum: CONDITION, nullable: false },
  cost: { type: 'decimal', min: 0, max: 9999999999.99, default: 0 },
  next_due_date: { type: 'date' },
  remarks: { type: 'string', max: 500 },
};

export const maintenanceCancelBody = {
  remarks: { type: 'string', max: 500 },
};

export const maintenanceListQuery = {
  page: { type: 'integer', min: 1, default: 1 },
  limit: { type: 'integer', min: 1, max: 100, default: 20 },
  status: { type: 'string', enum: MAINTENANCE_STATUS },
  asset_id: { type: 'integer', min: 1 },
  request_id: { type: 'integer', min: 1 },
  technician_id: { type: 'integer', min: 1 },
  search: { type: 'string', max: 100, nullable: false },
};

export { MAINTENANCE_TYPE, MAINTENANCE_STATUS, CONDITION, OUTCOME };
