const CONDITION = ['new', 'good', 'fair', 'poor', 'damaged'];
const STATUS = ['available', 'allocated', 'under_maintenance', 'unavailable', 'retired'];

const ASSET_CODE = {
  type: 'string',
  required: true,
  min: 2,
  max: 30,
  nullable: false,
  pattern: /^[A-Za-z0-9-]+$/,
  message: 'Use letters, numbers and hyphens only.',
};
const NAME = { type: 'string', required: true, min: 1, max: 120, nullable: false };
const BRAND = { type: 'string', max: 60 };
const MODEL = { type: 'string', max: 80 };
const SERIAL = { type: 'string', max: 80 };
const NOTES = { type: 'string', max: 500 };
const COST = { type: 'decimal', min: 0, max: 9999999999.99 };

export const assetBody = {
  category_id: { type: 'integer', required: true, min: 1, nullable: false },
  asset_code: ASSET_CODE,
  name: NAME,
  brand: BRAND,
  model: MODEL,
  serial_number: SERIAL,
  purchase_date: { type: 'date' },
  warranty_end: { type: 'date' },
  purchase_cost: COST,
  asset_condition: { type: 'string', enum: CONDITION, default: 'good' },
  notes: NOTES,
};

export const assetUpdateBody = {
  category_id: { type: 'integer', min: 1 },
  asset_code: { ...ASSET_CODE, required: false },
  name: { ...NAME, required: false },
  brand: BRAND,
  model: MODEL,
  serial_number: SERIAL,
  purchase_date: { type: 'date' },
  warranty_end: { type: 'date' },
  purchase_cost: COST,
  asset_condition: { type: 'string', enum: CONDITION },
  notes: NOTES,
};

export const assetListQuery = {
  page: { type: 'integer', min: 1, default: 1 },
  limit: { type: 'integer', min: 1, max: 100, default: 20 },
  status: { type: 'string', enum: STATUS },
  category_id: { type: 'integer', min: 1 },
  assigned_employee_id: { type: 'integer', min: 1 },
  search: { type: 'string', max: 100, nullable: false },
};

export const historyQuery = {
  page: { type: 'integer', min: 1, default: 1 },
  limit: { type: 'integer', min: 1, max: 100, default: 20 },
};

export const assetMaintenanceQuery = {
  ...historyQuery,
  status: {
    type: 'string',
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
  },
};

export const assignBody = {
  employee_id: { type: 'integer', required: true, min: 1, nullable: false },
  remarks: { type: 'string', max: 255 },
};

export const returnBody = {
  return_condition: { type: 'string', enum: CONDITION },
  remarks: { type: 'string', max: 255 },
};

export const assignmentListQuery = {
  page: { type: 'integer', min: 1, default: 1 },
  limit: { type: 'integer', min: 1, max: 100, default: 20 },
  asset_id: { type: 'integer', min: 1 },
  employee_id: { type: 'integer', min: 1 },
  is_open: { type: 'boolean', nullable: false },
};

export { CONDITION, STATUS };
