const NAME = { type: 'string', required: true, min: 1, max: 100, nullable: false };
const DESCRIPTION = { type: 'string', max: 255 };
const ACTIVE = { type: 'boolean', required: true, nullable: false };

const EMPLOYEE_CODE = {
  type: 'string',
  required: true,
  min: 2,
  max: 20,
  nullable: false,
  pattern: /^[A-Za-z0-9-]+$/,
  message: 'Use letters, numbers and hyphens only.',
};
const FULL_NAME = { type: 'string', required: true, min: 2, max: 120, nullable: false };
const EMAIL = {
  type: 'email',
  required: true,
  min: 3,
  max: 150,
  nullable: false,
  lowercase: true,
};
const PHONE = { type: 'string', max: 20 };
const DESIGNATION = { type: 'string', required: true, min: 2, max: 80, nullable: false };
const DATE = { type: 'date' };
const DEPARTMENT_ID = { type: 'integer', required: true, min: 1, nullable: false };
const ROLE_ID = { type: 'integer', required: true, min: 1, nullable: false };
const USERNAME = {
  type: 'string',
  required: true,
  min: 3,
  max: 50,
  nullable: false,
  pattern: /^[A-Za-z0-9._-]+$/,
  message: 'Use letters, numbers, dots, underscores and hyphens only.',
};
const PASSWORD = { type: 'string', required: true, min: 8, max: 72, nullable: false };

export const departmentBody = {
  name: NAME,
  description: DESCRIPTION,
};

export const departmentUpdateBody = {
  name: { ...NAME, required: false },
  description: DESCRIPTION,
};

export const statusBody = {
  is_active: ACTIVE,
};

export const employeeBody = {
  employee: {
    type: 'object',
    required: true,
    nullable: false,
    schema: {
      employee_code: EMPLOYEE_CODE,
      department_id: DEPARTMENT_ID,
      full_name: FULL_NAME,
      email: EMAIL,
      phone: PHONE,
      designation: DESIGNATION,
      date_joined: DATE,
    },
  },
  account: {
    type: 'object',
    schema: {
      username: USERNAME,
      role_id: ROLE_ID,
      password: PASSWORD,
    },
  },
};

export const employeeUpdateBody = {
  employee_code: { ...EMPLOYEE_CODE, required: false },
  department_id: { ...DEPARTMENT_ID, required: false },
  full_name: { ...FULL_NAME, required: false },
  email: { ...EMAIL, required: false },
  phone: PHONE,
  designation: { ...DESIGNATION, required: false },
  date_joined: DATE,
};

export const employeeListQuery = {
  page: { type: 'integer', min: 1, default: 1 },
  limit: { type: 'integer', min: 1, max: 100, default: 20 },
  search: { type: 'string', max: 100, nullable: false },
  department_id: { type: 'integer', min: 1 },
  is_active: { type: 'boolean', nullable: false },
};

export const employeeSubresourceQuery = {
  page: { type: 'integer', min: 1, default: 1 },
  limit: { type: 'integer', min: 1, max: 100, default: 20 },
};

export const employeeAssetsQuery = {
  ...employeeSubresourceQuery,
  include_returned: { type: 'boolean', nullable: false },
};

export const employeeRequestsQuery = {
  ...employeeSubresourceQuery,
  status: {
    type: 'string',
    enum: ['pending', 'assigned', 'in_progress', 'resolved', 'closed', 'cancelled'],
  },
};

export const departmentListQuery = {
  search: { type: 'string', max: 100, nullable: false },
  include_inactive: { type: 'boolean', nullable: false },
};

export const userBody = {
  employee_id: { type: 'integer', required: true, min: 1, nullable: false },
  username: USERNAME,
  role_id: ROLE_ID,
  password: PASSWORD,
};

export const userUpdateBody = {
  username: { ...USERNAME, required: false },
  role_id: { ...ROLE_ID, required: false },
  is_active: { type: 'boolean', nullable: false },
};

export const resetPasswordBody = {
  password: PASSWORD,
};

export const categoryBody = {
  name: { type: 'string', required: true, min: 1, max: 60, nullable: false },
  description: DESCRIPTION,
  is_active: { type: 'boolean', nullable: false },
};

export const categoryUpdateBody = {
  name: { type: 'string', required: false, min: 1, max: 60, nullable: false },
  description: DESCRIPTION,
  is_active: { type: 'boolean', nullable: false },
};

export const categoryListQuery = {
  include_inactive: { type: 'boolean', nullable: false },
};
