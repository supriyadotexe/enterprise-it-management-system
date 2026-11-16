import request from 'supertest';
import { createApp } from '../src/app.js';

describe('role-based access control', () => {
  async function tokenFor(username) {
    const app = createApp();
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username, password: 'Demo@12345' });
    return response.body.data.token;
  }

  it('prevents an employee from listing employees', async () => {
    const app = createApp();
    const token = await tokenFor('staff01');
    const response = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('prevents an employee from creating an asset', async () => {
    const app = createApp();
    const token = await tokenFor('staff01');
    const response = await request(app)
      .post('/api/v1/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category_id: 1,
        asset_code: 'AST-TEST-001',
        name: 'Test asset',
      });

    expect(response.status).toBe(403);
  });

  it('prevents a technician from resolving another technician request', async () => {
    const app = createApp();
    const adminToken = await tokenFor('admin');
    const technicianToken = await tokenFor('rohan.iyer');

    const created = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${adminToken}`) // admin can create? employee endpoint; admin also allowed
      .send({
        employee_id: 6,
        service_category_id: 1,
        title: 'RBAC request',
        description: 'Request for RBAC test',
      });
    expect(created.status).toBe(201);
    const requestId = created.body.data.request_id;

    await request(app)
      .post(`/api/v1/requests/${requestId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ technician_id: 2 });

    const response = await request(app)
      .patch(`/api/v1/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ status: 'in_progress' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('NOT_ASSIGNED_TECHNICIAN');
  });
});
