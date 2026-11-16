-- ===========================================================================
-- EITAMS database schema
-- MySQL 8.0+, InnoDB, utf8mb4
--
-- This script recreates the approved 12 core tables and the read-only
-- v_asset_history view. It is destructive for the target schema: existing
-- EITAMS tables and the view are dropped before creation.
--
-- Session time zone:
--   The application derives a numeric MySQL session offset from APP_TIMEZONE
--   (Asia/Kolkata => +05:30) and sets it on every new mysql2 connection. The
--   static SQL runner must do the same, for example:
--
--     mysql --init-command="SET time_zone = '+05:30'" ...
--
--   A named zone cannot be used unless the MySQL time-zone tables are loaded;
--   this installation does not load them. See database/README.md.
-- ===========================================================================

CREATE DATABASE IF NOT EXISTS eitams
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE eitams;

-- Static scripts cannot derive an IANA offset without the MySQL named-zone
-- tables, so they pin the approved case-study offset. The application and
-- seed.js derive the same offset from APP_TIMEZONE at runtime.
SET time_zone = '+05:30';
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS v_asset_history;

DROP TABLE IF EXISTS asset_status_history;
DROP TABLE IF EXISTS request_status_history;
DROP TABLE IF EXISTS maintenance_records;
DROP TABLE IF EXISTS service_requests;
DROP TABLE IF EXISTS asset_assignments;
DROP TABLE IF EXISTS assets;
DROP TABLE IF EXISTS service_categories;
DROP TABLE IF EXISTS asset_categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS departments;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- 1. departments
-- ---------------------------------------------------------------------------
CREATE TABLE departments (
  department_id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (department_id),
  UNIQUE KEY uq_departments_name (name),
  CONSTRAINT chk_departments_is_active CHECK (is_active IN (0, 1))
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- 2. employees
-- ---------------------------------------------------------------------------
CREATE TABLE employees (
  employee_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_code VARCHAR(20) NOT NULL,
  department_id SMALLINT UNSIGNED NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NULL,
  designation VARCHAR(80) NOT NULL,
  date_joined DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (employee_id),
  UNIQUE KEY uq_employees_code (employee_code),
  UNIQUE KEY uq_employees_email (email),
  KEY idx_employees_department (department_id),
  KEY idx_employees_full_name (full_name),
  CONSTRAINT fk_employees_department
    FOREIGN KEY (department_id) REFERENCES departments (department_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_employees_is_active CHECK (is_active IN (0, 1))
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- 3. roles
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
  role_id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_name ENUM('admin', 'employee', 'technician') NOT NULL,
  description VARCHAR(150) NULL,
  PRIMARY KEY (role_id),
  UNIQUE KEY uq_roles_name (role_name)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- 4. users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  user_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id INT UNSIGNED NOT NULL,
  role_id SMALLINT UNSIGNED NOT NULL,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME(6) NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_employee (employee_id),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_role (role_id),
  CONSTRAINT fk_users_employee
    FOREIGN KEY (employee_id) REFERENCES employees (employee_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id) REFERENCES roles (role_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_users_is_active CHECK (is_active IN (0, 1))
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- 5. asset_categories
-- ---------------------------------------------------------------------------
CREATE TABLE asset_categories (
  category_id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_name VARCHAR(60) NOT NULL,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_asset_categories_name (category_name),
  CONSTRAINT chk_asset_categories_is_active CHECK (is_active IN (0, 1))
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- 6. assets
-- "status" is a derived cache maintained only by the lifecycle service.
-- ---------------------------------------------------------------------------
CREATE TABLE assets (
  asset_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id SMALLINT UNSIGNED NOT NULL,
  asset_code VARCHAR(30) NOT NULL,
  name VARCHAR(120) NOT NULL,
  brand VARCHAR(60) NULL,
  model VARCHAR(80) NULL,
  serial_number VARCHAR(80) NULL,
  purchase_date DATE NULL,
  warranty_end DATE NULL,
  purchase_cost DECIMAL(12, 2) NULL,
  asset_condition ENUM('new', 'good', 'fair', 'poor', 'damaged') NOT NULL DEFAULT 'good',
  status ENUM('available', 'allocated', 'under_maintenance', 'unavailable', 'retired')
    NOT NULL DEFAULT 'available',
  created_by INT UNSIGNED NOT NULL,
  retired_at DATETIME(6) NULL,
  retired_by INT UNSIGNED NULL,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (asset_id),
  UNIQUE KEY uq_assets_code (asset_code),
  UNIQUE KEY uq_assets_serial (serial_number),
  KEY idx_assets_status (status),
  KEY idx_assets_category (category_id),
  KEY idx_assets_name (name),
  KEY idx_assets_warranty_end (warranty_end),
  KEY idx_assets_retired_by (retired_by),
  CONSTRAINT fk_assets_category
    FOREIGN KEY (category_id) REFERENCES asset_categories (category_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_assets_created_by
    FOREIGN KEY (created_by) REFERENCES users (user_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_assets_retired_by
    FOREIGN KEY (retired_by) REFERENCES users (user_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_assets_warranty CHECK (
    warranty_end IS NULL OR purchase_date IS NULL OR warranty_end >= purchase_date
  ),
  CONSTRAINT chk_assets_purchase_cost CHECK (purchase_cost IS NULL OR purchase_cost >= 0),
  CONSTRAINT chk_assets_retirement_pair CHECK (
    (retired_at IS NULL AND retired_by IS NULL)
    OR (retired_at IS NOT NULL AND retired_by IS NOT NULL)
  )
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- 7. asset_assignments
-- The stored generated column is the database guarantee of at most one open
-- allocation per asset. Multiple NULL values are allowed by the unique index.
-- ---------------------------------------------------------------------------
CREATE TABLE asset_assignments (
  assignment_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  asset_id INT UNSIGNED NOT NULL,
  employee_id INT UNSIGNED NOT NULL,
  assigned_by INT UNSIGNED NOT NULL,
  assigned_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  returned_at DATETIME(6) NULL,
  returned_by INT UNSIGNED NULL,
  return_condition ENUM('new', 'good', 'fair', 'poor', 'damaged') NULL,
  remarks VARCHAR(255) NULL,
  active_asset_id INT UNSIGNED
    GENERATED ALWAYS AS (IF(returned_at IS NULL, asset_id, NULL)) STORED,
  PRIMARY KEY (assignment_id),
  UNIQUE KEY uq_asset_assignments_active_asset (active_asset_id),
  KEY idx_asset_assignments_asset_returned (asset_id, returned_at),
  KEY idx_asset_assignments_employee_returned (employee_id, returned_at),
  KEY idx_asset_assignments_assigned_by (assigned_by),
  KEY idx_asset_assignments_returned_by (returned_by),
  CONSTRAINT fk_asset_assignments_asset
    FOREIGN KEY (asset_id) REFERENCES assets (asset_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_asset_assignments_employee
    FOREIGN KEY (employee_id) REFERENCES employees (employee_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_asset_assignments_assigned_by
    FOREIGN KEY (assigned_by) REFERENCES users (user_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_asset_assignments_returned_by
    FOREIGN KEY (returned_by) REFERENCES users (user_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_asset_assignments_return_time CHECK (
    returned_at IS NULL OR returned_at >= assigned_at
  ),
  CONSTRAINT chk_asset_assignments_return_actor CHECK (
    (returned_at IS NULL) = (returned_by IS NULL)
  )
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- 8. service_categories
-- ---------------------------------------------------------------------------
CREATE TABLE service_categories (
  service_category_id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(60) NOT NULL,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (service_category_id),
  UNIQUE KEY uq_service_categories_name (name),
  CONSTRAINT chk_service_categories_is_active CHECK (is_active IN (0, 1))
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- 9. service_requests
-- ---------------------------------------------------------------------------
CREATE TABLE service_requests (
  request_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_code VARCHAR(20) NOT NULL,
  employee_id INT UNSIGNED NOT NULL,
  asset_id INT UNSIGNED NULL,
  service_category_id SMALLINT UNSIGNED NOT NULL,
  assigned_technician_id INT UNSIGNED NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  status ENUM('pending', 'assigned', 'in_progress', 'resolved', 'closed', 'cancelled')
    NOT NULL DEFAULT 'pending',
  assigned_at DATETIME(6) NULL,
  resolved_at DATETIME(6) NULL,
  resolution_notes TEXT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (request_id),
  UNIQUE KEY uq_service_requests_code (request_code),
  KEY idx_service_requests_employee_status (employee_id, status),
  KEY idx_service_requests_technician_status (assigned_technician_id, status),
  KEY idx_service_requests_status (status),
  KEY idx_service_requests_created_at (created_at),
  KEY idx_service_requests_asset (asset_id),
  KEY idx_service_requests_category (service_category_id),
  CONSTRAINT fk_service_requests_employee
    FOREIGN KEY (employee_id) REFERENCES employees (employee_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_service_requests_asset
    FOREIGN KEY (asset_id) REFERENCES assets (asset_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_service_requests_category
    FOREIGN KEY (service_category_id) REFERENCES service_categories (service_category_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_service_requests_technician
    FOREIGN KEY (assigned_technician_id) REFERENCES users (user_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_service_requests_resolved_at CHECK (
    status NOT IN ('resolved', 'closed') OR resolved_at IS NOT NULL
  )
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- 10. request_status_history (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE request_status_history (
  history_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id INT UNSIGNED NOT NULL,
  changed_by INT UNSIGNED NOT NULL,
  old_status ENUM('pending', 'assigned', 'in_progress', 'resolved', 'closed', 'cancelled') NULL,
  new_status ENUM('pending', 'assigned', 'in_progress', 'resolved', 'closed', 'cancelled') NOT NULL,
  remarks VARCHAR(500) NULL,
  changed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (history_id),
  KEY idx_request_status_history_request_changed (request_id, changed_at),
  KEY idx_request_status_history_changed_by (changed_by),
  CONSTRAINT fk_request_status_history_request
    FOREIGN KEY (request_id) REFERENCES service_requests (request_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_request_status_history_changed_by
    FOREIGN KEY (changed_by) REFERENCES users (user_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_request_status_history_creation CHECK (
    old_status IS NOT NULL OR new_status = 'pending'
  )
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- 11. maintenance_records
-- tenant_id? no. technician_id is the accountable technician, not the actor.
-- The stored generated column enforces at most one in-progress job per asset.
-- ---------------------------------------------------------------------------
CREATE TABLE maintenance_records (
  maintenance_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  asset_id INT UNSIGNED NOT NULL,
  request_id INT UNSIGNED NULL,
  technician_id INT UNSIGNED NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  maintenance_type ENUM('preventive', 'corrective', 'inspection', 'upgrade') NOT NULL,
  description TEXT NOT NULL,
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'in_progress',
  scheduled_date DATE NOT NULL,
  started_at DATETIME(6) NULL,
  started_by INT UNSIGNED NULL,
  completed_at DATETIME(6) NULL,
  completed_by INT UNSIGNED NULL,
  cancelled_at DATETIME(6) NULL,
  cancelled_by INT UNSIGNED NULL,
  outcome ENUM('returned_to_service', 'held_unavailable', 'retired') NULL,
  condition_after ENUM('new', 'good', 'fair', 'poor', 'damaged') NULL,
  cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
  next_due_date DATE NULL,
  remarks VARCHAR(500) NULL,
  open_asset_id INT UNSIGNED
    GENERATED ALWAYS AS (IF(status = 'in_progress', asset_id, NULL)) STORED,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (maintenance_id),
  UNIQUE KEY uq_maintenance_records_open_asset (open_asset_id),
  KEY idx_maintenance_records_asset_scheduled (asset_id, scheduled_date),
  KEY idx_maintenance_records_technician (technician_id),
  KEY idx_maintenance_records_status (status),
  KEY idx_maintenance_records_created_by (created_by),
  KEY idx_maintenance_records_request (request_id),
  KEY idx_maintenance_records_started_by (started_by),
  KEY idx_maintenance_records_completed_by (completed_by),
  KEY idx_maintenance_records_cancelled_by (cancelled_by),
  CONSTRAINT fk_maintenance_records_asset
    FOREIGN KEY (asset_id) REFERENCES assets (asset_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_maintenance_records_request
    FOREIGN KEY (request_id) REFERENCES service_requests (request_id)
    ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT fk_maintenance_records_technician
    FOREIGN KEY (technician_id) REFERENCES users (user_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_maintenance_records_created_by
    FOREIGN KEY (created_by) REFERENCES users (user_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_maintenance_records_started_by
    FOREIGN KEY (started_by) REFERENCES users (user_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_maintenance_records_completed_by
    FOREIGN KEY (completed_by) REFERENCES users (user_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_maintenance_records_cancelled_by
    FOREIGN KEY (cancelled_by) REFERENCES users (user_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_maintenance_records_cost CHECK (cost >= 0),
  CONSTRAINT chk_maintenance_records_next_due CHECK (
    next_due_date IS NULL OR next_due_date >= scheduled_date
  ),
  CONSTRAINT chk_maintenance_records_scheduled_fields CHECK (
    status <> 'scheduled'
    OR (
      started_at IS NULL
      AND started_by IS NULL
      AND completed_at IS NULL
      AND completed_by IS NULL
      AND cancelled_at IS NULL
      AND cancelled_by IS NULL
      AND outcome IS NULL
      AND condition_after IS NULL
    )
  ),
  CONSTRAINT chk_maintenance_records_in_progress_fields CHECK (
    status <> 'in_progress'
    OR (
      started_at IS NOT NULL
      AND started_by IS NOT NULL
      AND completed_at IS NULL
      AND completed_by IS NULL
      AND cancelled_at IS NULL
      AND cancelled_by IS NULL
      AND outcome IS NULL
      AND condition_after IS NULL
    )
  ),
  CONSTRAINT chk_maintenance_records_completed_fields CHECK (
    status <> 'completed'
    OR (
      started_at IS NOT NULL
      AND started_by IS NOT NULL
      AND completed_at IS NOT NULL
      AND completed_by IS NOT NULL
      AND cancelled_at IS NULL
      AND cancelled_by IS NULL
      AND outcome IS NOT NULL
      AND condition_after IS NOT NULL
    )
  ),
  CONSTRAINT chk_maintenance_records_cancelled_fields CHECK (
    status <> 'cancelled'
    OR (
      cancelled_at IS NOT NULL
      AND cancelled_by IS NOT NULL
      AND completed_at IS NULL
      AND completed_by IS NULL
      AND outcome IS NULL
      AND condition_after IS NULL
    )
  ),
  CONSTRAINT chk_maintenance_records_cancelled_start_pair CHECK (
    status <> 'cancelled'
    OR (
      (started_at IS NULL AND started_by IS NULL)
      OR (started_at IS NOT NULL AND started_by IS NOT NULL)
    )
  ),
  CONSTRAINT chk_maintenance_records_completion_order CHECK (
    completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at
  ),
  CONSTRAINT chk_maintenance_records_cancellation_order CHECK (
    cancelled_at IS NULL OR started_at IS NULL OR cancelled_at >= started_at
  )
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- 12. asset_status_history (append-only audit log)
-- reference_id is polymorphic by design and therefore not an FK.
-- ---------------------------------------------------------------------------
CREATE TABLE asset_status_history (
  history_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  asset_id INT UNSIGNED NOT NULL,
  old_status ENUM('available', 'allocated', 'under_maintenance', 'unavailable', 'retired') NULL,
  new_status ENUM('available', 'allocated', 'under_maintenance', 'unavailable', 'retired') NOT NULL,
  old_condition ENUM('new', 'good', 'fair', 'poor', 'damaged') NULL,
  new_condition ENUM('new', 'good', 'fair', 'poor', 'damaged') NULL,
  source ENUM(
    'registration',
    'allocation',
    'return',
    'maintenance_start',
    'maintenance_complete',
    'maintenance_cancel',
    'manual_edit',
    'retirement'
  ) NOT NULL,
  reference_id INT UNSIGNED NULL,
  changed_by INT UNSIGNED NOT NULL,
  remarks VARCHAR(255) NULL,
  changed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (history_id),
  KEY idx_asset_status_history_asset_changed (asset_id, changed_at),
  KEY idx_asset_status_history_changed_by (changed_by),
  KEY idx_asset_status_history_source_reference (source, reference_id),
  CONSTRAINT fk_asset_status_history_asset
    FOREIGN KEY (asset_id) REFERENCES assets (asset_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_asset_status_history_changed_by
    FOREIGN KEY (changed_by) REFERENCES users (user_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Unified asset history view
--
-- Each lifecycle cause appears once. Registration, allocation/return and
-- maintenance events carry their own transition columns. Only audit-only
-- manual edits and direct retirements are read from the audit table, so those
-- transitions are not duplicated.
--
-- A record created as scheduled is identified by started_at being NULL or by
-- started_at > created_at. Immediate records are written with started_at
-- equal to created_at by the lifecycle service.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE ALGORITHM = UNDEFINED
  SQL SECURITY INVOKER
  VIEW v_asset_history AS
SELECT
  a.asset_id AS asset_id,
  CAST(a.created_at AS DATETIME(6)) AS event_at,
  'registered' AS event_type,
  CONCAT('Registered ', a.asset_code, ' - ', a.name) AS summary,
  CAST(NULLIF(CONCAT_WS(' · ', a.notes, CONCAT('Category: ', ac.category_name)), '') AS CHAR(1000)) AS detail,
  actor_employee.full_name AS actor_name,
  'assets' AS reference_table,
  CAST(a.asset_id AS UNSIGNED) AS reference_id,
  h.old_status AS status_from,
  h.new_status AS status_to,
  h.old_condition AS condition_from,
  h.new_condition AS condition_to
FROM assets AS a
JOIN asset_categories AS ac ON ac.category_id = a.category_id
JOIN users AS actor ON actor.user_id = a.created_by
JOIN employees AS actor_employee ON actor_employee.employee_id = actor.employee_id
JOIN asset_status_history AS h
  ON h.asset_id = a.asset_id
 AND h.source = 'registration'

UNION ALL

SELECT
  a.asset_id,
  CAST(asg.assigned_at AS DATETIME(6)),
  'allocated',
  CONCAT('Allocated to ', e.full_name),
  CAST(NULLIF(CONCAT_WS(' · ', asg.remarks, CONCAT('Asset: ', a.name)), '') AS CHAR(1000)),
  actor_employee.full_name,
  'asset_assignments',
  CAST(asg.assignment_id AS UNSIGNED),
  h.old_status,
  h.new_status,
  h.old_condition,
  h.new_condition
FROM asset_assignments AS asg
JOIN assets AS a ON a.asset_id = asg.asset_id
JOIN employees AS e ON e.employee_id = asg.employee_id
JOIN users AS actor ON actor.user_id = asg.assigned_by
JOIN employees AS actor_employee ON actor_employee.employee_id = actor.employee_id
LEFT JOIN asset_status_history AS h
  ON h.source = 'allocation'
 AND h.reference_id = asg.assignment_id

UNION ALL

SELECT
  a.asset_id,
  CAST(asg.returned_at AS DATETIME(6)),
  'returned',
  CONCAT('Returned by ', e.full_name),
  CAST(NULLIF(CONCAT_WS(' · ', asg.remarks, CONCAT('Return condition: ', asg.return_condition)), '') AS CHAR(1000)),
  actor_employee.full_name,
  'asset_assignments',
  CAST(asg.assignment_id AS UNSIGNED),
  h.old_status,
  h.new_status,
  h.old_condition,
  h.new_condition
FROM asset_assignments AS asg
JOIN assets AS a ON a.asset_id = asg.asset_id
JOIN employees AS e ON e.employee_id = asg.employee_id
JOIN users AS actor ON actor.user_id = asg.returned_by
JOIN employees AS actor_employee ON actor_employee.employee_id = actor.employee_id
LEFT JOIN asset_status_history AS h
  ON h.source = 'return'
 AND h.reference_id = asg.assignment_id
WHERE asg.returned_at IS NOT NULL

UNION ALL

SELECT
  a.asset_id,
  CAST(m.created_at AS DATETIME(6)),
  'maintenance_scheduled',
  'Maintenance scheduled',
  CAST(NULLIF(CONCAT_WS(' · ', m.description, CONCAT('Scheduled for ', m.scheduled_date)), '') AS CHAR(1000)),
  actor_employee.full_name,
  'maintenance_records',
  CAST(m.maintenance_id AS UNSIGNED),
  NULL,
  NULL,
  NULL,
  NULL
FROM maintenance_records AS m
JOIN assets AS a ON a.asset_id = m.asset_id
JOIN users AS actor ON actor.user_id = m.created_by
JOIN employees AS actor_employee ON actor_employee.employee_id = actor.employee_id
WHERE m.started_at IS NULL OR m.started_at > m.created_at

UNION ALL

SELECT
  a.asset_id,
  CAST(m.started_at AS DATETIME(6)),
  'maintenance_started',
  'Maintenance started',
  CAST(NULLIF(CONCAT_WS(
    ' · ',
    m.description,
    CONCAT('Accountable technician: ', tech_employee.full_name)
  ), '') AS CHAR(1000)),
  actor_employee.full_name,
  'maintenance_records',
  CAST(m.maintenance_id AS UNSIGNED),
  h.old_status,
  h.new_status,
  h.old_condition,
  h.new_condition
FROM maintenance_records AS m
JOIN assets AS a ON a.asset_id = m.asset_id
JOIN users AS actor ON actor.user_id = m.started_by
JOIN employees AS actor_employee ON actor_employee.employee_id = actor.employee_id
JOIN users AS tech ON tech.user_id = m.technician_id
JOIN employees AS tech_employee ON tech_employee.employee_id = tech.employee_id
LEFT JOIN asset_status_history AS h
  ON h.source = 'maintenance_start'
 AND h.reference_id = m.maintenance_id
WHERE m.started_at IS NOT NULL

UNION ALL

SELECT
  a.asset_id,
  CAST(m.completed_at AS DATETIME(6)),
  'maintenance_completed',
  CONCAT('Maintenance completed: ', REPLACE(m.outcome, '_', ' ')),
  CAST(NULLIF(CONCAT_WS(
    ' · ',
    m.description,
    CONCAT('Condition after: ', m.condition_after),
    CONCAT('Cost: ', FORMAT(m.cost, 2)),
    m.remarks
  ), '') AS CHAR(1000)),
  actor_employee.full_name,
  'maintenance_records',
  CAST(m.maintenance_id AS UNSIGNED),
  h.old_status,
  h.new_status,
  h.old_condition,
  h.new_condition
FROM maintenance_records AS m
JOIN assets AS a ON a.asset_id = m.asset_id
JOIN users AS actor ON actor.user_id = m.completed_by
JOIN employees AS actor_employee ON actor_employee.employee_id = actor.employee_id
LEFT JOIN asset_status_history AS h
  ON h.source = 'maintenance_complete'
 AND h.reference_id = m.maintenance_id
WHERE m.completed_at IS NOT NULL

UNION ALL

SELECT
  a.asset_id,
  CAST(m.cancelled_at AS DATETIME(6)),
  'maintenance_cancelled',
  'Maintenance cancelled',
  CAST(NULLIF(CONCAT_WS(' · ', m.description, m.remarks), '') AS CHAR(1000)),
  actor_employee.full_name,
  'maintenance_records',
  CAST(m.maintenance_id AS UNSIGNED),
  h.old_status,
  h.new_status,
  h.old_condition,
  h.new_condition
FROM maintenance_records AS m
JOIN assets AS a ON a.asset_id = m.asset_id
JOIN users AS actor ON actor.user_id = m.cancelled_by
JOIN employees AS actor_employee ON actor_employee.employee_id = actor.employee_id
LEFT JOIN asset_status_history AS h
  ON h.source = 'maintenance_cancel'
 AND h.reference_id = m.maintenance_id
WHERE m.cancelled_at IS NOT NULL

UNION ALL

SELECT
  a.asset_id,
  CAST(h.changed_at AS DATETIME(6)),
  CASE
    WHEN h.source = 'retirement' THEN 'retired'
    WHEN NOT (h.old_status <=> h.new_status) THEN 'status_changed'
    ELSE 'condition_changed'
  END AS event_type,
  CASE
    WHEN h.source = 'retirement' THEN 'Asset retired'
    WHEN NOT (h.old_status <=> h.new_status) THEN 'Asset status changed'
    ELSE 'Condition changed'
  END AS summary,
  CAST(NULLIF(CONCAT_WS(
    ' · ',
    h.remarks,
    CONCAT('Status: ', COALESCE(h.old_status, 'none'), ' -> ', h.new_status),
    CONCAT('Condition: ', COALESCE(h.old_condition, 'none'), ' -> ', COALESCE(h.new_condition, 'none'))
  ), '') AS CHAR(1000)) AS detail,
  actor_employee.full_name,
  'asset_status_history',
  CAST(h.history_id AS UNSIGNED),
  h.old_status,
  h.new_status,
  h.old_condition,
  h.new_condition
FROM asset_status_history AS h
JOIN assets AS a ON a.asset_id = h.asset_id
JOIN users AS actor ON actor.user_id = h.changed_by
JOIN employees AS actor_employee ON actor_employee.employee_id = actor.employee_id
WHERE h.source IN ('manual_edit', 'retirement');
