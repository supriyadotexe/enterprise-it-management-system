import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';

describe('phase 5 gap closure', () => {
  async function login(app, username, password = 'Demo@12345') {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username, password });
    return response.body.data.token;
  }

  async function db() {
    return mysql.createConnection({
      host: env.database.host,
      port: env.database.port,
      user: env.database.user,
      password: env.database.password,
      database: env.database.testName,
      timezone: '+05:30',
      dateStrings: true,
    });
  }

  it('rejects expired JWTs and deactivated users', async () => {
    const app = createApp();
    const token = await login(app, 'staff01');

    const expired = jwt.sign(
      { sub: '6', role: 'employee', employeeId: 6 },
      env.jwt.secret,
      { algorithm: 'HS256', expiresIn: '-1s' },
    );
    const expiredResponse = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expired}`);
    expect(expiredResponse.status).toBe(401);

    const connection = await db();
    await connection.execute('UPDATE users SET is_active = 0 WHERE username = ?', ['staff01']);
    await connection.end();

    const deactivated = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(deactivated.status).toBe(401);
  });

  it('reflects role changes immediately after login', async () => {
    const app = createApp();
    const token = await login(app, 'staff01');

    const before = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(before.body.data.role).toBe('employee');

    const connection = await db();
    await connection.execute(
      "UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'technician') WHERE username = ?",
      ['staff01'],
    );
    await connection.end();

    const after = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(after.body.data.role).toBe('technician');
  });

  it('rolls back invalid employee creation', async () => {
    const app = createApp();
    const adminToken = await login(app, 'admin');

    const response = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employee: {
          employee_code: 'EMP-ROLLBACK',
          department_id: 999999,
          full_name: 'Rollback Test',
          email: 'rollback@example.com',
        },
      });
    expect(response.status).toBeGreaterThanOrEqual(400);

    const connection = await db();
    const [rows] = await connection.execute(
      "SELECT employee_id FROM employees WHERE employee_code = 'EMP-ROLLBACK'",
    );
    await connection.end();
    expect(rows).toHaveLength(0);
  });

  it('does not make an asset available when returned during maintenance', async () => {
    const app = createApp();
    const adminToken = await login(app, 'admin');
    const techToken = await login(app, 'ananya.rao');

    await request(app)
      .post('/api/v1/assets/52/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employee_id: 6, remarks: 'Gap closure allocation' });

    const [assignmentRows] = await (await db()).execute(
      'SELECT assignment_id FROM asset_assignments WHERE asset_id = 52 AND returned_at IS NULL ORDER BY assignment_id DESC LIMIT 1',
    );
    const assignmentId = assignmentRows[0].assignment_id;

    const maintenance = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        asset_id: 52,
        technician_id: 2,
        maintenance_type: 'corrective',
        description: 'Maintenance during return test',
      });
    expect(maintenance.status).toBe(201);

    const returned = await request(app)
      .post(`/api/v1/assignments/${assignmentId}/return`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ return_condition: 'good', remarks: 'Returned during maintenance' });
    expect(returned.status).toBe(200);

    const asset = await request(app)
      .get('/api/v1/assets/52')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(asset.body.data.status).toBe('under_maintenance');

    const cancelled = await request(app)
      .patch(`/api/v1/maintenance/${maintenance.body.data.maintenance_id}/cancel`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ remarks: 'Cancel after return' });
    expect(cancelled.status).toBe(200);

    const recomputed = await request(app)
      .get('/api/v1/assets/52')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(recomputed.body.data.status).toBe('available');
  });

  it('records maintenance lifecycle history without duplicate v_asset_history rows', async () => {
    const app = createApp();
    const adminToken = await login(app, 'admin');
    const techToken = await login(app, 'ananya.rao');

    const created = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        asset_id: 53,
        technician_id: 2,
        maintenance_type: 'corrective',
        description: 'History verification',
      });
    expect(created.status).toBe(201);

    const completed = await request(app)
      .patch(`/api/v1/maintenance/${created.body.data.maintenance_id}/complete`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        outcome: 'returned_to_service',
        condition_after: 'good',
        remarks: 'Completed for history check',
      });
    expect(completed.status).toBe(200);

    const maintenanceId = created.body.data.maintenance_id;

    const connection = await db();
    const [history] = await connection.execute(
      "SELECT source, COUNT(*) AS count FROM asset_status_history WHERE asset_id = 53 AND source = 'maintenance_complete' AND reference_id = ? GROUP BY source",
      [maintenanceId],
    );
    await connection.end();

    const apiHistory = await request(app)
      .get('/api/v1/assets/53/history')
      .set('Authorization', `Bearer ${adminToken}`);
    const viewCount = apiHistory.body.data.items.filter(
      (item) => item.event_type === 'maintenance_completed' && item.reference_id === maintenanceId,
    ).length;

    expect(history).toHaveLength(1);
    expect(history[0].count).toBe(1);
    expect(viewCount).toBe(1);
  });

  it('rejects conflicting concurrent maintenance completion', async () => {
    const app = createApp();
    const adminToken = await login(app, 'admin');
    const techToken = await login(app, 'ananya.rao');

    const created = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        asset_id: 54,
        technician_id: 2,
        maintenance_type: 'corrective',
        description: 'Concurrent completion test',
      });
    expect(created.status).toBe(201);
    const maintenanceId = created.body.data.maintenance_id;

    const [first, second] = await Promise.all([
      request(app)
        .patch(`/api/v1/maintenance/${maintenanceId}/complete`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ outcome: 'returned_to_service', condition_after: 'good' }),
      request(app)
        .patch(`/api/v1/maintenance/${maintenanceId}/complete`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ outcome: 'held_unavailable', condition_after: 'poor' }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 409]);

    const asset = await request(app)
      .get('/api/v1/assets/54')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(['available', 'unavailable']).toContain(asset.body.data.status);
  });

  it('enforces direct database constraints', async () => {
    const connection = await db();

    await expect(
      connection.execute("INSERT INTO assets (asset_code, name, asset_category_id, asset_condition) VALUES ('FK-TEST', 'FK Test', 999999, 'good')"),
    ).rejects.toBeTruthy();

    await expect(
      connection.execute("INSERT INTO assets (asset_code, name, asset_category_id, asset_condition, status) VALUES ('CHECK-TEST', 'Check Test', 1, 'good', 'not_a_status')"),
    ).rejects.toBeTruthy();

    await connection.execute('INSERT INTO asset_assignments (asset_id, employee_id, assigned_by) VALUES (52, 6, 1)');
    await expect(
      connection.execute('INSERT INTO asset_assignments (asset_id, employee_id, assigned_by) VALUES (52, 7, 1)'),
    ).rejects.toBeTruthy();

    await connection.end();
  });
});
