import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { mysqlOffsetFor } from './timezone.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..', '..', '..');
const seedSqlPath = path.join(projectRoot, 'database', 'seed.sql');

const DEMO_PASSWORD = 'Demo@12345';
// A fixed bcrypt salt makes the seed byte-for-byte deterministic. The hash is
// still generated at runtime; only the salt is fixed for this synthetic dataset.
const FIXED_BCRYPT_SALT = '$2b$12$QYoRVG12Q9b3koTMf8dd4u';
const TIMEZONE_OFFSET = mysqlOffsetFor(env.appTimezone);

const BASE_TS = '2025-01-01 09:00:00.000000';
const EMPLOYEE_TS = '2025-01-02 09:00:00.000000';
const USER_TS = '2025-01-02 09:05:00.000000';
const FINAL_AT = '9999-12-31 23:59:59.000000';

const TABLE_ORDER = [
  'departments',
  'roles',
  'employees',
  'users',
  'asset_categories',
  'service_categories',
  'assets',
  'asset_assignments',
  'service_requests',
  'request_status_history',
  'maintenance_records',
  'asset_status_history',
];

const COLUMNS = {
  departments: ['department_id', 'name', 'description', 'is_active', 'created_at', 'updated_at'],
  roles: ['role_id', 'role_name', 'description'],
  employees: [
    'employee_id',
    'employee_code',
    'department_id',
    'full_name',
    'email',
    'phone',
    'designation',
    'date_joined',
    'is_active',
    'created_at',
    'updated_at',
  ],
  users: [
    'user_id',
    'employee_id',
    'role_id',
    'username',
    'password_hash',
    'is_active',
    'last_login_at',
    'created_at',
    'updated_at',
  ],
  asset_categories: ['category_id', 'category_name', 'description', 'is_active'],
  service_categories: ['service_category_id', 'name', 'description', 'is_active'],
  assets: [
    'asset_id',
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
    'status',
    'created_by',
    'retired_at',
    'retired_by',
    'notes',
    'created_at',
    'updated_at',
  ],
  asset_assignments: [
    'assignment_id',
    'asset_id',
    'employee_id',
    'assigned_by',
    'assigned_at',
    'returned_at',
    'returned_by',
    'return_condition',
    'remarks',
  ],
  service_requests: [
    'request_id',
    'request_code',
    'employee_id',
    'asset_id',
    'service_category_id',
    'assigned_technician_id',
    'title',
    'description',
    'priority',
    'status',
    'assigned_at',
    'resolved_at',
    'resolution_notes',
    'created_at',
    'updated_at',
  ],
  request_status_history: [
    'history_id',
    'request_id',
    'changed_by',
    'old_status',
    'new_status',
    'remarks',
    'changed_at',
  ],
  maintenance_records: [
    'maintenance_id',
    'asset_id',
    'request_id',
    'technician_id',
    'created_by',
    'maintenance_type',
    'description',
    'status',
    'scheduled_date',
    'started_at',
    'started_by',
    'completed_at',
    'completed_by',
    'cancelled_at',
    'cancelled_by',
    'outcome',
    'condition_after',
    'cost',
    'next_due_date',
    'remarks',
    'created_at',
  ],
  asset_status_history: [
    'history_id',
    'asset_id',
    'old_status',
    'new_status',
    'old_condition',
    'new_condition',
    'source',
    'reference_id',
    'changed_by',
    'remarks',
    'changed_at',
  ],
};

const PEOPLE = [
  'Aarav Mehta',
  'Ananya Rao',
  'Rohan Iyer',
  'Meera Nair',
  'Vikram Shah',
  'Priya Sharma',
  'Arjun Patel',
  'Kavya Menon',
  'Siddharth Kulkarni',
  'Neha Verma',
  'Aditya Bose',
  'Isha Kapoor',
  'Rahul Desai',
  'Sneha Pillai',
  'Kunal Joshi',
  'Riya Chatterjee',
  'Manish Gupta',
  'Pooja Reddy',
  'Naveen Kumar',
  'Divya Iyer',
  'Harish Bhat',
  'Anjali Singh',
  'Suresh Rao',
  'Tanvi Malhotra',
  'Mohit Saxena',
  'Shreya Ghosh',
  'Akash Jain',
  'Nandini Das',
  'Rajat Chopra',
  'Shruti Bansal',
  'Deepak Yadav',
  'Ayesha Khan',
  'Nikhil Arora',
  'Madhuri Shetty',
  'Sanjay Mishra',
  'Ritika Soni',
  'Farhan Ali',
  'Charu Mathur',
  'Om Prakash',
  'Leela Krishnan',
];

const DEPARTMENTS = [
  ['IT', 'Technology infrastructure and support'],
  ['HR', 'People operations and employee services'],
  ['Finance', 'Finance, procurement and control'],
  ['Operations', 'Business operations and delivery'],
  ['Sales', 'Sales and customer engagement'],
  ['Administration', 'Facilities and administration'],
];

const ROLES = [
  ['admin', 'Full administrative access'],
  ['employee', 'Employee self-service access'],
  ['technician', 'Service and maintenance access'],
];

const ASSET_MODELS = {
  1: [
    ['Dell', 'Latitude 5440'],
    ['Lenovo', 'ThinkPad T14 Gen 4'],
    ['HP', 'EliteBook 840 G10'],
    ['Asus', 'ExpertBook B9'],
  ],
  2: [
    ['Dell', 'OptiPlex 7010'],
    ['HP', 'ProDesk 400 G9'],
    ['Lenovo', 'ThinkCentre M70q'],
  ],
  3: [
    ['HP', 'LaserJet Pro M404dn'],
    ['Canon', 'imageRUNNER 1643i'],
    ['Epson', 'EcoTank L3250'],
  ],
  4: [
    ['Dell', 'PowerEdge R650'],
    ['HPE', 'ProLiant DL380 Gen10'],
    ['Lenovo', 'ThinkSystem SR650'],
  ],
  5: [
    ['Cisco', 'Catalyst 9200'],
    ['Ubiquiti', 'UniFi Switch 24'],
    ['Fortinet', 'FortiGate 60F'],
    ['TP-Link', 'Omada EAP670'],
  ],
  6: [
    ['Dell', 'UltraSharp U2723QE'],
    ['LG', '27UP850'],
    ['HP', 'E24 G5'],
    ['Logitech', 'MX Master 3'],
  ],
};

const SERVICE_TITLES = {
  1: ['Laptop overheats and shuts down', 'Desktop does not power on', 'Keyboard is unresponsive'],
  2: [
    'Cannot install approved software',
    'Application crashes on launch',
    'Operating system update fails',
  ],
  3: [
    'Intermittent network disconnection',
    'VPN is not connecting',
    'Network drive is unavailable',
  ],
  4: ['Printer reports a paper jam', 'Printer is not detected', 'Print jobs stay in the queue'],
  5: ['Password reset required', 'Shared drive access is missing', 'Email account needs recovery'],
};

function pad(value, length) {
  return String(value).padStart(length, '0');
}

function parseSqlDateTime(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?)?$/.exec(
    value,
  );
  if (!match) throw new Error(`Invalid timestamp: ${value}`);
  const [, year, month, day, hour = '00', minute = '00', second = '00', fraction = '0'] = match;
  const milliseconds = Number(fraction.padEnd(6, '0').slice(0, 3));
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      milliseconds,
    ),
  );
}

function formatSqlDateTime(date) {
  return [
    date.getUTCFullYear(),
    '-',
    pad(date.getUTCMonth() + 1, 2),
    '-',
    pad(date.getUTCDate(), 2),
    ' ',
    pad(date.getUTCHours(), 2),
    ':',
    pad(date.getUTCMinutes(), 2),
    ':',
    pad(date.getUTCSeconds(), 2),
    '.',
    pad(date.getUTCMilliseconds(), 3),
    '000',
  ].join('');
}

function addDays(value, days) {
  const date = parseSqlDateTime(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatSqlDateTime(date);
}

function addYearsDate(value, years) {
  const [year, month, day] = value.split('-').map(Number);
  return `${year + years}-${pad(month, 2)}-${pad(day, 2)}`;
}

function offsetSeconds(offset) {
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!match) throw new Error(`Invalid MySQL offset: ${offset}`);
  const seconds = Number(match[2]) * 3600 + Number(match[3]) * 60;
  return match[1] === '-' ? -seconds : seconds;
}

function roleFor(employeeId) {
  if (employeeId === 1) return 1;
  if (employeeId <= 5) return 3;
  return 2;
}

function departmentFor(employeeId) {
  if (employeeId === 1) return 6;
  if (employeeId <= 5) return 1;
  if (employeeId <= 13) return 4;
  if (employeeId <= 19) return 3;
  if (employeeId <= 25) return 2;
  if (employeeId <= 31) return 5;
  if (employeeId <= 36) return 6;
  return 1;
}

function designationFor(employeeId) {
  if (employeeId === 1) return 'IT Systems Administrator';
  if (employeeId === 2) return 'Systems Technician';
  if (employeeId === 3) return 'Hardware Technician';
  if (employeeId === 4) return 'Network Technician';
  if (employeeId === 5) return 'Support Technician';
  const department = departmentFor(employeeId);
  if (department === 1) return 'IT Support Officer';
  if (department === 2) return 'HR Generalist';
  if (department === 3) return 'Finance Officer';
  if (department === 4) return 'Operations Analyst';
  if (department === 5) return 'Sales Executive';
  return 'Administrative Officer';
}

function usernameFor(employeeId) {
  if (employeeId === 1) return 'admin';
  if (employeeId === 2) return 'ananya.rao';
  if (employeeId === 3) return 'rohan.iyer';
  if (employeeId === 4) return 'meera.nair';
  if (employeeId === 5) return 'vikram.shah';
  return `staff${pad(employeeId - 5, 2)}`;
}

function categoryForAsset(assetId) {
  if (assetId <= 25) return 1;
  if (assetId <= 38) return 2;
  if (assetId <= 45) return 3;
  if (assetId <= 51) return 4;
  if (assetId <= 60) return 5;
  return 6;
}

function initialConditionFor(assetId) {
  const overrides = {
    1: 'good',
    2: 'good',
    35: 'good',
    36: 'fair',
    37: 'good',
    38: 'fair',
    39: 'fair',
    40: 'good',
    41: 'good',
    42: 'good',
    43: 'poor',
    44: 'damaged',
    45: 'good',
    46: 'good',
    47: 'good',
    48: 'fair',
    49: 'good',
    50: 'fair',
    51: 'good',
    52: 'poor',
    53: 'damaged',
    69: 'good',
    70: 'fair',
  };
  return overrides[assetId] ?? ['good', 'fair', 'new', 'good', 'fair'][assetId % 5];
}

function statusForCondition(condition) {
  return ['new', 'good', 'fair'].includes(condition) ? 'available' : 'unavailable';
}

function buildBaseData() {
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, FIXED_BCRYPT_SALT);
  if (!bcrypt.compareSync(DEMO_PASSWORD, passwordHash)) {
    throw new Error('The fixed bcrypt salt did not produce a usable password hash');
  }

  const departments = DEPARTMENTS.map(([name, description], index) => ({
    department_id: index + 1,
    name,
    description,
    is_active: 1,
    created_at: BASE_TS,
    updated_at: BASE_TS,
  }));

  const roles = ROLES.map(([roleName, description], index) => ({
    role_id: index + 1,
    role_name: roleName,
    description,
  }));

  const employees = PEOPLE.map((fullName, index) => {
    const employeeId = index + 1;
    return {
      employee_id: employeeId,
      employee_code: `EMP-${pad(employeeId, 4)}`,
      department_id: departmentFor(employeeId),
      full_name: fullName,
      email: `emp${pad(employeeId, 2)}@northbridge.example`,
      phone: `+91-90000-${pad(employeeId, 5)}`,
      designation: designationFor(employeeId),
      date_joined: addDays('2020-01-15 00:00:00.000000', (employeeId - 1) * 45).slice(0, 10),
      is_active: 1,
      created_at: EMPLOYEE_TS,
      updated_at: EMPLOYEE_TS,
    };
  });

  const users = employees.map((employee) => ({
    user_id: employee.employee_id,
    employee_id: employee.employee_id,
    role_id: roleFor(employee.employee_id),
    username: usernameFor(employee.employee_id),
    password_hash: passwordHash,
    is_active: 1,
    last_login_at: employee.employee_id <= 5 ? '2026-11-14 08:30:00.000000' : null,
    created_at: USER_TS,
    updated_at: USER_TS,
  }));

  const assetCategories = [
    ['Laptop', 'Portable business computers'],
    ['Desktop', 'Desktop computers and workstations'],
    ['Printer', 'Printers and multifunction devices'],
    ['Server', 'Physical servers and storage nodes'],
    ['Network Equipment', 'Switches, routers, firewalls and access points'],
    ['Monitor & Peripheral', 'Displays, docking stations and peripherals'],
  ].map(([categoryName, description], index) => ({
    category_id: index + 1,
    category_name: categoryName,
    description,
    is_active: 1,
  }));

  const serviceCategories = [
    ['Hardware', 'Physical device faults and repairs'],
    ['Software', 'Applications and operating systems'],
    ['Network', 'Connectivity and network access'],
    ['Printer', 'Printing and scanning services'],
    ['Account & Access', 'Credentials and access permissions'],
  ].map(([name, description], index) => ({
    service_category_id: index + 1,
    name,
    description,
    is_active: 1,
  }));

  const costBase = { 1: 72000, 2: 52000, 3: 38000, 4: 320000, 5: 85000, 6: 24000 };
  const assets = Array.from({ length: 70 }, (_, index) => {
    const assetId = index + 1;
    const categoryId = categoryForAsset(assetId);
    const models = ASSET_MODELS[categoryId];
    const [brand, model] = models[index % models.length];
    const initialCondition = initialConditionFor(assetId);
    const createdAt = addDays('2025-01-05 09:00:00.000000', index);
    const purchaseDate = addDays('2020-01-15 00:00:00.000000', (assetId * 29) % 1700).slice(0, 10);
    const cost = costBase[categoryId] + ((assetId * 137) % 18000);
    const notes =
      assetId <= 10
        ? 'Primary work device'
        : assetId <= 20
          ? 'Shared equipment pool'
          : assetId <= 30
            ? 'Department floor asset'
            : assetId <= 40
              ? 'Scheduled service candidate'
              : assetId <= 51
                ? 'End-of-life review cohort'
                : 'General pool';

    return {
      asset_id: assetId,
      category_id: categoryId,
      asset_code: `AST-${pad(assetId, 4)}`,
      name: `${brand} ${model}`,
      brand,
      model,
      serial_number: `EIT-${pad(assetId, 6)}`,
      purchase_date: purchaseDate,
      warranty_end: addYearsDate(purchaseDate, 3),
      purchase_cost: `${cost}.00`,
      asset_condition: initialCondition,
      status: statusForCondition(initialCondition),
      created_by: 1,
      retired_at: null,
      retired_by: null,
      notes,
      created_at: createdAt,
      updated_at: createdAt,
      initial_condition: initialCondition,
    };
  });

  return {
    passwordHash,
    departments,
    roles,
    employees,
    users,
    assetCategories,
    serviceCategories,
    assets,
  };
}

function buildAssignments(assets) {
  const assignments = [];
  let assignmentId = 1;

  for (let index = 0; index < 38; index += 1) {
    const assetId = index + 1;
    const employeeId = index < 35 ? index + 6 : index - 33;
    assignments.push({
      assignment_id: assignmentId,
      asset_id: assetId,
      employee_id: employeeId,
      assigned_by: 1,
      assigned_at: addDays('2025-06-01 10:00:00.000000', index * 2),
      returned_at: null,
      returned_by: null,
      return_condition: null,
      remarks: index % 3 === 0 ? 'Primary work device' : 'Department allocation',
    });
    assignmentId += 1;
  }

  const closedAssets = [
    ...Array.from({ length: 11 }, (_, index) => 60 + index),
    45,
    46,
    49,
    50,
    41,
    42,
  ];

  for (let index = 0; index < closedAssets.length; index += 1) {
    const assetId = closedAssets[index];
    const asset = assets.find((item) => item.asset_id === assetId);
    const assignedAt = addDays('2025-04-01 09:30:00.000000', index * 3);
    const returnedAt = addDays(assignedAt, 90 + (index % 5));
    const returnCondition = [41, 42, 45, 46].includes(assetId)
      ? assetId % 2 === 0
        ? 'damaged'
        : 'poor'
      : [49, 50].includes(assetId)
        ? 'good'
        : asset.initial_condition;

    assignments.push({
      assignment_id: assignmentId,
      asset_id: assetId,
      employee_id: 6 + ((index * 4) % 35),
      assigned_by: 1,
      assigned_at: assignedAt,
      returned_at: returnedAt,
      returned_by: 1,
      return_condition: returnCondition,
      remarks: index % 2 === 0 ? 'Temporary project allocation' : 'Replacement device',
    });
    assignmentId += 1;
  }

  for (const assignment of assignments) {
    if (assignment.returned_at) {
      const asset = assets.find((item) => item.asset_id === assignment.asset_id);
      asset.asset_condition = assignment.return_condition;
    }
  }

  return assignments;
}

function buildRequests(employees, assets) {
  const statuses = [
    ...Array(8).fill('pending'),
    ...Array(10).fill('assigned'),
    ...Array(12).fill('in_progress'),
    ...Array(12).fill('resolved'),
    ...Array(14).fill('closed'),
    ...Array(4).fill('cancelled'),
  ];
  const allowedAssets = [
    ...Array.from({ length: 46 }, (_, index) => index + 1),
    ...Array.from({ length: 19 }, (_, index) => 52 + index),
  ];
  const linkedAssets = [35, 36, 37, 38, 39, 40];
  const linkedTechnicians = [2, 3, 4, 5, 2, 3];
  const requests = [];
  const history = [];
  let historyId = 1;

  function pushHistory(requestId, changedBy, oldStatus, newStatus, remarks, changedAt) {
    history.push({
      history_id: historyId,
      request_id: requestId,
      changed_by: changedBy,
      old_status: oldStatus,
      new_status: newStatus,
      remarks,
      changed_at: changedAt,
    });
    historyId += 1;
  }

  for (let index = 0; index < 60; index += 1) {
    const requestId = index + 1;
    const status = statuses[index];
    const employeeId = 6 + ((requestId * 3) % 35);
    const linked = requestId >= 19 && requestId <= 24;
    const assetId = linked
      ? linkedAssets[requestId - 19]
      : requestId <= 2
        ? null
        : allowedAssets[(requestId * 7) % allowedAssets.length];
    const serviceCategoryId = linked ? (assetId >= 39 ? 4 : 1) : ((requestId - 1) % 5) + 1;
    const asset = assetId ? assets.find((item) => item.asset_id === assetId) : null;
    const technicianId = linked
      ? linkedTechnicians[requestId - 19]
      : ['pending'].includes(status)
        ? null
        : status === 'cancelled' && requestId <= 58
          ? null
          : 2 + ((requestId - 1) % 4);
    const createdAt = addDays('2026-01-05 09:00:00.000000', (requestId - 1) * 3);
    const assignedAt =
      ['assigned', 'in_progress', 'resolved', 'closed'].includes(status) ||
      (status === 'cancelled' && requestId > 58)
        ? addDays(createdAt, 1)
        : null;
    const resolvedAt = ['resolved', 'closed'].includes(status) ? addDays(createdAt, 4) : null;
    const startedAt = ['in_progress', 'resolved', 'closed'].includes(status)
      ? addDays(createdAt, 2)
      : null;
    const titles = SERVICE_TITLES[serviceCategoryId];
    const title = linked
      ? assetId >= 35 && assetId <= 40
        ? 'Device requires corrective maintenance'
        : titles[requestId % titles.length]
      : titles[requestId % titles.length];
    const description = `${title}${asset ? ` (${asset.asset_code})` : ''}. Reported through the employee portal.`;
    const resolutionNotes = ['resolved', 'closed'].includes(status)
      ? 'Issue reproduced, corrected and confirmed with the requester.'
      : null;

    requests.push({
      request_id: requestId,
      request_code: `SR-2026-${pad(requestId, 4)}`,
      employee_id: employeeId,
      asset_id: assetId,
      service_category_id: serviceCategoryId,
      assigned_technician_id: technicianId,
      title,
      description,
      priority: ['medium', 'high', 'low', 'high', 'critical', 'medium'][requestId % 6],
      status,
      assigned_at: assignedAt,
      resolved_at: resolvedAt,
      resolution_notes: resolutionNotes,
      created_at: createdAt,
      updated_at: resolvedAt ?? assignedAt ?? createdAt,
    });

    pushHistory(requestId, employeeId, null, 'pending', 'Request created', createdAt);

    if (assignedAt) {
      pushHistory(requestId, 1, 'pending', 'assigned', 'Assigned to technician', assignedAt);
    }

    if (startedAt) {
      pushHistory(
        requestId,
        technicianId,
        'assigned',
        'in_progress',
        'Technician started work',
        startedAt,
      );
    }

    if (resolvedAt) {
      pushHistory(requestId, technicianId, 'in_progress', 'resolved', resolutionNotes, resolvedAt);
    }

    if (status === 'closed') {
      pushHistory(
        requestId,
        employeeId,
        'resolved',
        'closed',
        'Requester confirmed resolution',
        addDays(resolvedAt, 1),
      );
    }

    if (status === 'cancelled') {
      const cancelledAt = assignedAt ? addDays(assignedAt, 1) : addDays(createdAt, 2);
      pushHistory(
        requestId,
        1,
        assignedAt ? 'assigned' : 'pending',
        'cancelled',
        'Cancelled by administrator',
        cancelledAt,
      );
    }
  }

  for (const request of requests) {
    const latest = history
      .filter((item) => item.request_id === request.request_id)
      .sort((left, right) => left.changed_at.localeCompare(right.changed_at))
      .at(-1);
    if (!latest || latest.new_status !== request.status) {
      throw new Error(`Request ${request.request_id} history does not end at ${request.status}`);
    }
  }

  return { requests, history };
}

function buildMaintenance(assets, requests) {
  const maintenance = [];

  function push(record) {
    maintenance.push({
      request_id: null,
      started_at: null,
      started_by: null,
      completed_at: null,
      completed_by: null,
      cancelled_at: null,
      cancelled_by: null,
      outcome: null,
      condition_after: null,
      cost: '0.00',
      next_due_date: null,
      remarks: null,
      ...record,
    });
  }

  push({
    maintenance_id: 1,
    asset_id: 35,
    request_id: 19,
    technician_id: 2,
    created_by: 2,
    maintenance_type: 'corrective',
    description: 'Replace failing solid-state drive',
    status: 'in_progress',
    scheduled_date: '2026-11-09',
    started_at: '2026-11-09 09:00:00.000000',
    started_by: 2,
    created_at: '2026-11-09 09:00:00.000000',
  });
  push({
    maintenance_id: 2,
    asset_id: 36,
    request_id: 20,
    technician_id: 3,
    created_by: 1,
    maintenance_type: 'corrective',
    description: 'Replace memory module and retest',
    status: 'in_progress',
    scheduled_date: '2026-11-10',
    started_at: '2026-11-10 10:00:00.000000',
    started_by: 3,
    created_at: '2026-11-10 10:00:00.000000',
  });
  push({
    maintenance_id: 3,
    asset_id: 37,
    request_id: 21,
    technician_id: 4,
    created_by: 4,
    maintenance_type: 'inspection',
    description: 'Investigate intermittent network faults',
    status: 'in_progress',
    scheduled_date: '2026-11-11',
    started_at: '2026-11-11 09:15:00.000000',
    started_by: 4,
    created_at: '2026-11-01 09:00:00.000000',
  });
  push({
    maintenance_id: 4,
    asset_id: 38,
    request_id: 22,
    technician_id: 5,
    created_by: 1,
    maintenance_type: 'upgrade',
    description: 'Upgrade device firmware and drivers',
    status: 'in_progress',
    scheduled_date: '2026-11-12',
    started_at: '2026-11-12 10:00:00.000000',
    started_by: 5,
    created_at: '2026-11-02 09:00:00.000000',
  });
  push({
    maintenance_id: 5,
    asset_id: 39,
    request_id: 23,
    technician_id: 2,
    created_by: 1,
    maintenance_type: 'corrective',
    description: 'Clear a persistent paper-feed fault',
    status: 'in_progress',
    scheduled_date: '2026-11-09',
    started_at: '2026-11-09 11:00:00.000000',
    started_by: 2,
    created_at: '2026-11-09 11:00:00.000000',
  });
  push({
    maintenance_id: 6,
    asset_id: 40,
    request_id: 24,
    technician_id: 3,
    created_by: 1,
    maintenance_type: 'inspection',
    description: 'Assess repeated print-quality failures',
    status: 'in_progress',
    scheduled_date: '2026-11-13',
    started_at: '2026-11-13 14:00:00.000000',
    started_by: 3,
    created_at: '2026-11-03 09:00:00.000000',
  });

  push({
    maintenance_id: 7,
    asset_id: 1,
    technician_id: 2,
    created_by: 1,
    maintenance_type: 'corrective',
    description: 'Replace cooling fan',
    status: 'completed',
    scheduled_date: '2026-06-10',
    started_at: '2026-06-10 09:00:00.000000',
    started_by: 2,
    completed_at: '2026-06-12 16:00:00.000000',
    completed_by: 2,
    outcome: 'returned_to_service',
    condition_after: 'good',
    cost: '120.00',
    next_due_date: '2027-06-10',
    remarks: 'Device returned to the employee after testing.',
    created_at: '2026-06-10 09:00:00.000000',
  });
  push({
    maintenance_id: 8,
    asset_id: 2,
    technician_id: 3,
    created_by: 1,
    maintenance_type: 'preventive',
    description: 'Clean chassis and replace thermal paste',
    status: 'completed',
    scheduled_date: '2026-05-05',
    started_at: '2026-05-05 10:00:00.000000',
    started_by: 3,
    completed_at: '2026-05-06 15:00:00.000000',
    completed_by: 3,
    outcome: 'returned_to_service',
    condition_after: 'fair',
    cost: '220.00',
    next_due_date: '2027-05-05',
    remarks: 'Device remains with the current assignee.',
    created_at: '2026-05-01 09:00:00.000000',
  });
  push({
    maintenance_id: 9,
    asset_id: 41,
    technician_id: 4,
    created_by: 1,
    maintenance_type: 'inspection',
    description: 'Assess liquid damage',
    status: 'completed',
    scheduled_date: '2026-04-10',
    started_at: '2026-04-10 09:00:00.000000',
    started_by: 4,
    completed_at: '2026-04-12 15:00:00.000000',
    completed_by: 4,
    outcome: 'held_unavailable',
    condition_after: 'poor',
    cost: '350.00',
    remarks: 'Held for disposal assessment.',
    created_at: '2026-04-10 09:00:00.000000',
  });
  push({
    maintenance_id: 10,
    asset_id: 42,
    technician_id: 5,
    created_by: 1,
    maintenance_type: 'corrective',
    description: 'Repair damaged power connector',
    status: 'completed',
    scheduled_date: '2026-03-05',
    started_at: '2026-03-05 10:00:00.000000',
    started_by: 5,
    completed_at: '2026-03-06 16:00:00.000000',
    completed_by: 5,
    outcome: 'held_unavailable',
    condition_after: 'damaged',
    cost: '480.00',
    remarks: 'Repair unsuccessful; asset remains unavailable.',
    created_at: '2026-03-01 09:00:00.000000',
  });
  push({
    maintenance_id: 11,
    asset_id: 47,
    technician_id: 2,
    created_by: 1,
    maintenance_type: 'inspection',
    description: 'End-of-life hardware evaluation',
    status: 'completed',
    scheduled_date: '2026-02-10',
    started_at: '2026-02-10 09:00:00.000000',
    started_by: 2,
    completed_at: '2026-02-11 14:00:00.000000',
    completed_by: 2,
    outcome: 'retired',
    condition_after: 'good',
    cost: '0.00',
    remarks: 'Retired for end-of-life reasons.',
    created_at: '2026-02-10 09:00:00.000000',
  });
  push({
    maintenance_id: 12,
    asset_id: 48,
    technician_id: 3,
    created_by: 1,
    maintenance_type: 'inspection',
    description: 'Server capacity and lifecycle review',
    status: 'completed',
    scheduled_date: '2026-01-20',
    started_at: '2026-01-20 10:00:00.000000',
    started_by: 3,
    completed_at: '2026-01-21 15:00:00.000000',
    completed_by: 3,
    outcome: 'retired',
    condition_after: 'fair',
    cost: '0.00',
    remarks: 'Retired after replacement server commissioning.',
    created_at: '2026-01-15 09:00:00.000000',
  });
  push({
    maintenance_id: 13,
    asset_id: 52,
    technician_id: 4,
    created_by: 1,
    maintenance_type: 'corrective',
    description: 'Replace damaged display assembly',
    status: 'completed',
    scheduled_date: '2026-07-10',
    started_at: '2026-07-10 09:00:00.000000',
    started_by: 4,
    completed_at: '2026-07-11 16:00:00.000000',
    completed_by: 4,
    outcome: 'returned_to_service',
    condition_after: 'good',
    cost: '150.00',
    next_due_date: '2027-07-10',
    remarks: 'Repair completed and verified.',
    created_at: '2026-07-10 09:00:00.000000',
  });
  push({
    maintenance_id: 14,
    asset_id: 53,
    technician_id: 5,
    created_by: 1,
    maintenance_type: 'corrective',
    description: 'Replace network interface card',
    status: 'completed',
    scheduled_date: '2026-08-05',
    started_at: '2026-08-05 10:00:00.000000',
    started_by: 5,
    completed_at: '2026-08-06 16:00:00.000000',
    completed_by: 5,
    outcome: 'returned_to_service',
    condition_after: 'fair',
    cost: '180.00',
    next_due_date: '2027-08-05',
    remarks: 'Back in the general pool.',
    created_at: '2026-08-01 09:00:00.000000',
  });

  push({
    maintenance_id: 15,
    asset_id: 54,
    technician_id: 2,
    created_by: 1,
    maintenance_type: 'preventive',
    description: 'Quarterly preventive maintenance',
    status: 'scheduled',
    scheduled_date: '2026-12-01',
    created_at: '2026-10-20 09:00:00.000000',
    remarks: 'Scheduled during the maintenance window.',
  });
  push({
    maintenance_id: 16,
    asset_id: 55,
    technician_id: 3,
    created_by: 1,
    maintenance_type: 'preventive',
    description: 'Switch health and configuration review',
    status: 'scheduled',
    scheduled_date: '2026-12-02',
    created_at: '2026-10-21 09:00:00.000000',
    remarks: 'Scheduled during the maintenance window.',
  });
  push({
    maintenance_id: 17,
    asset_id: 56,
    technician_id: 4,
    created_by: 1,
    maintenance_type: 'upgrade',
    description: 'Firmware upgrade and rollback rehearsal',
    status: 'scheduled',
    scheduled_date: '2026-12-03',
    created_at: '2026-10-22 09:00:00.000000',
    remarks: 'Scheduled during the maintenance window.',
  });
  push({
    maintenance_id: 18,
    asset_id: 57,
    technician_id: 5,
    created_by: 1,
    maintenance_type: 'inspection',
    description: 'Access-point coverage inspection',
    status: 'scheduled',
    scheduled_date: '2026-12-04',
    created_at: '2026-10-23 09:00:00.000000',
    remarks: 'Scheduled during the maintenance window.',
  });

  push({
    maintenance_id: 19,
    asset_id: 43,
    technician_id: 2,
    created_by: 1,
    maintenance_type: 'preventive',
    description: 'Prepare printer for relocation',
    status: 'cancelled',
    scheduled_date: '2026-09-10',
    cancelled_at: '2026-09-02 10:00:00.000000',
    cancelled_by: 1,
    remarks: 'Cancelled because the relocation was postponed.',
    created_at: '2026-09-01 09:00:00.000000',
  });
  push({
    maintenance_id: 20,
    asset_id: 44,
    technician_id: 3,
    created_by: 1,
    maintenance_type: 'inspection',
    description: 'Inspect intermittent scanner fault',
    status: 'cancelled',
    scheduled_date: '2026-09-15',
    cancelled_at: '2026-09-06 10:00:00.000000',
    cancelled_by: 1,
    remarks: 'Cancelled after the fault stopped reproducing.',
    created_at: '2026-09-05 09:00:00.000000',
  });
  push({
    maintenance_id: 21,
    asset_id: 58,
    technician_id: 4,
    created_by: 1,
    maintenance_type: 'corrective',
    description: 'Replace faulty uplink cable',
    status: 'cancelled',
    scheduled_date: '2026-09-10',
    started_at: '2026-09-10 09:00:00.000000',
    started_by: 4,
    cancelled_at: '2026-09-12 11:00:00.000000',
    cancelled_by: 1,
    remarks: 'Cancelled after the spare part arrived damaged.',
    created_at: '2026-09-10 09:00:00.000000',
  });
  push({
    maintenance_id: 22,
    asset_id: 59,
    technician_id: 5,
    created_by: 1,
    maintenance_type: 'inspection',
    description: 'Diagnose intermittent access-point reboot',
    status: 'cancelled',
    scheduled_date: '2026-09-08',
    started_at: '2026-09-08 09:00:00.000000',
    started_by: 5,
    cancelled_at: '2026-09-09 10:00:00.000000',
    cancelled_by: 1,
    remarks: 'Cancelled pending a vendor case.',
    created_at: '2026-09-01 09:00:00.000000',
  });

  for (const record of maintenance) {
    if (record.request_id) {
      const request = requests.find((item) => item.request_id === record.request_id);
      if (!request) throw new Error(`Missing linked request ${record.request_id}`);
      if (request.asset_id !== record.asset_id) {
        throw new Error(`Maintenance ${record.maintenance_id} asset does not match its request`);
      }
      if (request.assigned_technician_id !== record.technician_id) {
        throw new Error(
          `Maintenance ${record.maintenance_id} technician does not match its request`,
        );
      }
    }
  }

  for (const record of maintenance) {
    if (![2, 3, 4, 5].includes(record.technician_id)) {
      throw new Error(`Maintenance ${record.maintenance_id} technician is not a technician role`);
    }
  }

  return maintenance;
}

function applyAssetFacts(assets, assignments, maintenance) {
  for (const assignment of assignments) {
    if (assignment.returned_at) {
      const asset = assets.find((item) => item.asset_id === assignment.asset_id);
      asset.asset_condition = assignment.return_condition;
    }
  }

  for (const record of maintenance) {
    if (record.status !== 'completed') continue;
    const asset = assets.find((item) => item.asset_id === record.asset_id);
    asset.asset_condition = record.condition_after;
    if (record.outcome === 'retired') {
      asset.retired_at = record.completed_at;
      asset.retired_by = record.completed_by;
    }
  }

  for (const assetId of [49, 50, 51]) {
    const asset = assets.find((item) => item.asset_id === assetId);
    const retirementAt = {
      49: '2026-03-20 11:00:00.000000',
      50: '2026-04-10 11:00:00.000000',
      51: '2026-05-05 11:00:00.000000',
    }[assetId];
    asset.retired_at = retirementAt;
    asset.retired_by = 1;
  }

  const manualEdits = [
    {
      asset_id: 69,
      changed_by: 1,
      new_condition: 'fair',
      remarks: 'Condition corrected after inspection',
      changed_at: '2026-09-15 11:00:00.000000',
    },
    {
      asset_id: 70,
      changed_by: 1,
      new_condition: 'good',
      remarks: 'Minor cosmetic issue cleared',
      changed_at: '2026-09-20 12:00:00.000000',
    },
  ];

  for (const edit of manualEdits) {
    const asset = assets.find((item) => item.asset_id === edit.asset_id);
    asset.asset_condition = edit.new_condition;
  }

  return manualEdits;
}

function hasOpenAssignmentAt(assignments, assetId, at) {
  return assignments.some(
    (assignment) =>
      assignment.asset_id === assetId &&
      assignment.assigned_at <= at &&
      (assignment.returned_at === null || assignment.returned_at > at),
  );
}

function hasInProgressMaintenanceAt(maintenance, assetId, at) {
  return maintenance.some(
    (record) =>
      record.asset_id === assetId &&
      record.started_at !== null &&
      record.started_at <= at &&
      (record.completed_at === null || record.completed_at > at) &&
      (record.cancelled_at === null || record.cancelled_at > at),
  );
}

function computeStatusAt(asset, assignmentFacts, maintenanceFacts, at, condition) {
  if (asset.retired_at !== null && asset.retired_at <= at) return 'retired';
  if (hasInProgressMaintenanceAt(maintenanceFacts, asset.asset_id, at)) {
    return 'under_maintenance';
  }
  if (hasOpenAssignmentAt(assignmentFacts, asset.asset_id, at)) return 'allocated';
  return statusForCondition(condition);
}

function buildHistory(assets, assignments, maintenance, manualEdits) {
  const events = [];

  for (const asset of assets) {
    events.push({
      asset_id: asset.asset_id,
      at: asset.created_at,
      source: 'registration',
      reference_id: null,
      changed_by: asset.created_by,
      condition_after: asset.initial_condition,
      remarks: 'Asset registered',
    });
  }

  for (const assignment of assignments) {
    events.push({
      asset_id: assignment.asset_id,
      at: assignment.assigned_at,
      source: 'allocation',
      reference_id: assignment.assignment_id,
      changed_by: assignment.assigned_by,
      remarks: 'Asset allocated',
    });
    if (assignment.returned_at !== null) {
      events.push({
        asset_id: assignment.asset_id,
        at: assignment.returned_at,
        source: 'return',
        reference_id: assignment.assignment_id,
        changed_by: assignment.returned_by,
        condition_after: assignment.return_condition,
        remarks: 'Asset returned',
      });
    }
  }

  for (const record of maintenance) {
    if (record.started_at !== null) {
      events.push({
        asset_id: record.asset_id,
        at: record.started_at,
        source: 'maintenance_start',
        reference_id: record.maintenance_id,
        changed_by: record.started_by,
        remarks: 'Maintenance started',
      });
    }
    if (record.completed_at !== null) {
      events.push({
        asset_id: record.asset_id,
        at: record.completed_at,
        source: 'maintenance_complete',
        reference_id: record.maintenance_id,
        changed_by: record.completed_by,
        condition_after: record.condition_after,
        remarks: `Maintenance completed: ${record.outcome}`,
      });
    }
    if (record.cancelled_at !== null && record.started_at !== null) {
      events.push({
        asset_id: record.asset_id,
        at: record.cancelled_at,
        source: 'maintenance_cancel',
        reference_id: record.maintenance_id,
        changed_by: record.cancelled_by,
        remarks: 'Maintenance cancelled',
      });
    }
  }

  for (const assetId of [49, 50, 51]) {
    const asset = assets.find((item) => item.asset_id === assetId);
    events.push({
      asset_id: assetId,
      at: asset.retired_at,
      source: 'retirement',
      reference_id: null,
      changed_by: asset.retired_by,
      remarks: 'Asset retired',
    });
  }

  for (const edit of manualEdits) {
    events.push({
      asset_id: edit.asset_id,
      at: edit.changed_at,
      source: 'manual_edit',
      reference_id: null,
      changed_by: edit.changed_by,
      condition_after: edit.new_condition,
      remarks: edit.remarks,
    });
  }

  const history = [];
  let historyId = 1;

  for (const asset of assets) {
    const assetEvents = events
      .filter((event) => event.asset_id === asset.asset_id)
      .sort((left, right) => {
        const byTime = left.at.localeCompare(right.at);
        if (byTime !== 0) return byTime;
        return left.source.localeCompare(right.source);
      });

    let currentStatus = null;
    let currentCondition = null;

    for (const event of assetEvents) {
      const oldStatus = currentStatus;
      const oldCondition = currentCondition;
      const nextCondition = event.condition_after ?? currentCondition;
      const nextStatus = computeStatusAt(asset, assignments, maintenance, event.at, nextCondition);

      if (
        currentStatus === null ||
        nextStatus !== currentStatus ||
        nextCondition !== currentCondition
      ) {
        history.push({
          history_id: historyId,
          asset_id: asset.asset_id,
          old_status: oldStatus,
          new_status: nextStatus,
          old_condition: oldCondition,
          new_condition: nextCondition,
          source: event.source,
          reference_id: event.reference_id,
          changed_by: event.changed_by,
          remarks: event.remarks,
          changed_at: event.at,
        });
        historyId += 1;
      }

      currentStatus = nextStatus;
      currentCondition = nextCondition;
    }

    const finalStatus = computeStatusAt(
      asset,
      assignments,
      maintenance,
      FINAL_AT,
      asset.asset_condition,
    );
    if (currentStatus !== finalStatus || currentCondition !== asset.asset_condition) {
      throw new Error(
        `History for asset ${asset.asset_id} ends at ${currentStatus}/${currentCondition}, expected ${finalStatus}/${asset.asset_condition}`,
      );
    }
    asset.status = finalStatus;
    asset.updated_at = assetEvents.at(-1)?.at ?? asset.created_at;
  }

  return history;
}

function validateDataset(dataset) {
  const assets = dataset.assets;
  const assetAssignments = dataset.asset_assignments;
  const serviceRequests = dataset.service_requests;
  const requestStatusHistory = dataset.request_status_history;
  const maintenanceRecords = dataset.maintenance_records;
  const assetStatusHistory = dataset.asset_status_history;

  const statusCounts = assets.reduce((counts, asset) => {
    counts[asset.status] = (counts[asset.status] ?? 0) + 1;
    return counts;
  }, {});
  const expectedCounts = {
    available: 19,
    allocated: 34,
    under_maintenance: 6,
    unavailable: 6,
    retired: 5,
  };
  const sortKeys = (object) =>
    Object.fromEntries(Object.entries(object).sort(([left], [right]) => left.localeCompare(right)));
  if (JSON.stringify(sortKeys(statusCounts)) !== JSON.stringify(sortKeys(expectedCounts))) {
    throw new Error(`Unexpected asset status counts: ${JSON.stringify(statusCounts)}`);
  }

  if (
    assetAssignments.length !== 55 ||
    assetAssignments.filter((a) => !a.returned_at).length !== 38
  ) {
    throw new Error('Unexpected assignment volume');
  }
  if (serviceRequests.length !== 60 || maintenanceRecords.length !== 22) {
    throw new Error('Unexpected request or maintenance volume');
  }
  if (assetStatusHistory.length < 150) {
    throw new Error(`Expected at least 150 asset history rows, got ${assetStatusHistory.length}`);
  }

  for (const asset of assets) {
    const openAssignments = assetAssignments.filter(
      (assignment) => assignment.asset_id === asset.asset_id && assignment.returned_at === null,
    );
    if (openAssignments.length > 1) {
      throw new Error(`Asset ${asset.asset_id} has more than one open assignment`);
    }
    const openMaintenance = maintenanceRecords.filter(
      (record) => record.asset_id === asset.asset_id && record.status === 'in_progress',
    );
    if (openMaintenance.length > 1) {
      throw new Error(`Asset ${asset.asset_id} has more than one in-progress maintenance record`);
    }
    const registrationRows = assetStatusHistory.filter(
      (row) => row.asset_id === asset.asset_id && row.source === 'registration',
    );
    if (registrationRows.length !== 1) {
      throw new Error(`Asset ${asset.asset_id} does not have exactly one registration row`);
    }
    if (asset.retired_at !== null && asset.status !== 'retired') {
      throw new Error(`Retired asset ${asset.asset_id} is not cached as retired`);
    }
  }

  for (const record of maintenanceRecords) {
    if (record.status === 'completed') {
      const openAtCompletion = hasOpenAssignmentAt(
        assetAssignments,
        record.asset_id,
        record.completed_at,
      );
      if (record.outcome === 'returned_to_service') {
        if (!['new', 'good', 'fair'].includes(record.condition_after)) {
          throw new Error(`Maintenance ${record.maintenance_id} has an invalid service condition`);
        }
      } else if (record.outcome === 'held_unavailable') {
        if (!['poor', 'damaged'].includes(record.condition_after)) {
          throw new Error(`Maintenance ${record.maintenance_id} has an invalid held condition`);
        }
        if (openAtCompletion) {
          throw new Error(`Maintenance ${record.maintenance_id} was held with an open allocation`);
        }
      } else if (record.outcome === 'retired') {
        if (openAtCompletion) {
          throw new Error(
            `Maintenance ${record.maintenance_id} was retired with an open allocation`,
          );
        }
      }
    }
  }

  for (const request of serviceRequests) {
    const rows = requestStatusHistory.filter((row) => row.request_id === request.request_id);
    const creations = rows.filter((row) => row.old_status === null);
    if (creations.length !== 1 || creations[0].new_status !== 'pending') {
      throw new Error(`Request ${request.request_id} does not have exactly one creation row`);
    }
  }

  const eventKeys = new Set();
  for (const row of assetStatusHistory) {
    if (row.reference_id !== null) {
      const key = `${row.source}:${row.reference_id}`;
      if (eventKeys.has(key)) throw new Error(`Duplicate asset history cause ${key}`);
      eventKeys.add(key);
    }
  }
}

function buildDataset() {
  const base = buildBaseData();
  const assetAssignments = buildAssignments(base.assets);
  const { requests, history: requestStatusHistory } = buildRequests(base.employees, base.assets);
  const maintenanceRecords = buildMaintenance(base.assets, requests);
  const manualEdits = applyAssetFacts(base.assets, assetAssignments, maintenanceRecords);
  const assetStatusHistory = buildHistory(
    base.assets,
    assetAssignments,
    maintenanceRecords,
    manualEdits,
  );

  const dataset = {
    departments: base.departments,
    roles: base.roles,
    employees: base.employees,
    users: base.users,
    asset_categories: base.assetCategories,
    service_categories: base.serviceCategories,
    assets: base.assets,
    asset_assignments: assetAssignments,
    service_requests: requests,
    request_status_history: requestStatusHistory,
    maintenance_records: maintenanceRecords,
    asset_status_history: assetStatusHistory,
  };

  validateDataset(dataset);
  return dataset;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replaceAll('\\', '\\\\').replaceAll("'", "''")}'`;
}

function rowsFor(dataset, table) {
  return dataset[table].map((row) => COLUMNS[table].map((column) => sqlLiteral(row[column])));
}

function buildSeedSql(dataset) {
  const lines = [
    '-- ===========================================================================',
    '-- EITAMS deterministic seed snapshot',
    '-- Generated by: node server/src/db/seed.js --emit-sql',
    '-- Synthetic data only. This file resets all 12 EITAMS tables.',
    '-- One demo password is documented in README.md; every seeded account uses it.',
    '-- The timestamp literals below are in the approved APP_TIMEZONE zone.',
    '-- ===========================================================================',
    '',
    `SET time_zone = '${TIMEZONE_OFFSET}';`,
    'SET NAMES utf8mb4;',
    'USE eitams;',
    '',
    'SET FOREIGN_KEY_CHECKS = 0;',
    ...[...TABLE_ORDER].reverse().map((table) => `TRUNCATE TABLE \`${table}\`;`),
    'SET FOREIGN_KEY_CHECKS = 1;',
    '',
    'START TRANSACTION;',
  ];

  for (const table of TABLE_ORDER) {
    const columns = COLUMNS[table];
    const rows = rowsFor(dataset, table);
    lines.push(
      `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(', ')}) VALUES`,
    );
    lines.push(rows.map((row) => `  (${row.join(', ')})`).join(',\n') + ';');
    lines.push('');
  }

  lines.push('COMMIT;');
  lines.push('');
  return lines.join('\n');
}

async function applySeed(dataset) {
  if (!env.database.user) {
    throw new Error('DB_USER is required to apply the seed');
  }

  const connection = await mysql.createConnection({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    database: env.database.name,
    charset: 'utf8mb4',
    timezone: TIMEZONE_OFFSET,
    multipleStatements: false,
  });

  try {
    await connection.query('SET time_zone = ?', [TIMEZONE_OFFSET]);
    const [[sessionCheck]] = await connection.query(
      `SELECT
         @@session.time_zone AS session_time_zone,
         TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) AS offset_seconds`,
    );
    if (
      sessionCheck.session_time_zone !== TIMEZONE_OFFSET ||
      Number(sessionCheck.offset_seconds) !== offsetSeconds(TIMEZONE_OFFSET)
    ) {
      throw new Error(
        `Session time zone mismatch: expected ${TIMEZONE_OFFSET}, got ${sessionCheck.session_time_zone} (${sessionCheck.offset_seconds}s)`,
      );
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of [...TABLE_ORDER].reverse()) {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    await connection.beginTransaction();
    for (const table of TABLE_ORDER) {
      const columns = COLUMNS[table];
      const placeholders = `(${columns.map(() => '?').join(', ')})`;
      const sql = `INSERT INTO \`${table}\` (${columns
        .map((column) => `\`${column}\``)
        .join(', ')}) VALUES ${placeholders}`;
      for (const row of dataset[table]) {
        await connection.query(
          sql,
          columns.map((column) => row[column]),
        );
      }
    }
    await connection.commit();

    console.log(
      `Seed applied to ${env.database.name} at ${env.database.host}:${env.database.port}`,
    );
    for (const table of TABLE_ORDER) {
      console.log(`  ${table.padEnd(26)} ${String(dataset[table].length).padStart(4)} rows`);
    }
    console.log(`  ${'session time_zone'.padEnd(26)} ${TIMEZONE_OFFSET}`);
    console.log(`  ${'demo password'.padEnd(26)} ${DEMO_PASSWORD}`);
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    await connection.end();
  }
}

async function main() {
  const dataset = buildDataset();

  if (process.argv.includes('--emit-sql')) {
    await fs.writeFile(seedSqlPath, buildSeedSql(dataset), 'utf8');
    console.log(`Wrote ${seedSqlPath}`);
    return;
  }

  await applySeed(dataset);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
