const REQUEST_STATUS = [
  'pending',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
  'cancelled',
];
const PRIORITY = ['low', 'medium', 'high', 'critical'];

export const requestBody = {
  employee_id: { type: 'integer', min: 1 },
  asset_id: { type: 'integer', min: 1 },
  service_category_id: { type: 'integer', required: true, min: 1, nullable: false },
  title: { type: 'string', required: true, min: 1, max: 150, nullable: false },
  description: { type: 'string', required: true, min: 1, max: 5000, nullable: false },
  priority: { type: 'string', enum: PRIORITY, default: 'medium' },
};

export const requestUpdateBody = {
  asset_id: { type: 'integer', min: 1 },
  service_category_id: { type: 'integer', min: 1 },
  title: { type: 'string', min: 1, max: 150, nullable: false },
  description: { type: 'string', min: 1, max: 5000, nullable: false },
  priority: { type: 'string', enum: PRIORITY },
};

export const requestListQuery = {
  page: { type: 'integer', min: 1, default: 1 },
  limit: { type: 'integer', min: 1, max: 100, default: 20 },
  status: { type: 'string', enum: REQUEST_STATUS },
  priority: { type: 'string', enum: PRIORITY },
  service_category_id: { type: 'integer', min: 1 },
  employee_id: { type: 'integer', min: 1 },
  assigned_technician_id: { type: 'integer', min: 1 },
  search: { type: 'string', max: 100, nullable: false },
};

export const assignRequestBody = {
  technician_id: { type: 'integer', required: true, min: 1, nullable: false },
  remarks: { type: 'string', max: 500 },
};

export const startRequestBody = {
  remarks: { type: 'string', max: 500 },
};

export const resolveRequestBody = {
  resolution_notes: { type: 'string', required: true, min: 1, max: 5000, nullable: false },
  remarks: { type: 'string', max: 500 },
};

export const closeRequestBody = {
  remarks: { type: 'string', max: 500 },
};

export const cancelRequestBody = {
  remarks: { type: 'string', required: true, min: 1, max: 500, nullable: false },
};

export const requestStatusBody = {
  status: { type: 'string', required: true, enum: REQUEST_STATUS, nullable: false },
  technician_id: { type: 'integer', min: 1 },
  resolution_notes: { type: 'string', min: 1, max: 5000 },
  remarks: { type: 'string', max: 500 },
};

export { REQUEST_STATUS, PRIORITY };
