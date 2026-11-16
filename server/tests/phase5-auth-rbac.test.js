import request from 'supertest';
import { createApp } from '../src/app.js';

describe('phase 5 auth and rbac', () => {
  async function login(app, username, password = 'Demo@12345') {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username, password });
    return response.body.data.token;
  }

  it('rejects missing and malformed bearer tokens', async () => {
    const app = createApp();

    const missing = await request(app).get('/api/v1/auth/me');
    expect(missing.status).toBe(401);

    const malformed = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-token');
    expect(malformed.status).toBe(401);
  });

  it('enforces role and ownership restrictions', async () => {
    const app = createApp();
    const employeeToken = await login(app, 'staff01');
    const technicianToken = await login(app, 'ananya.rao');

    const adminDashboard = await request(app)
      .get('/api/v1/dashboard/admin')
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(adminDashboard.status).toBe(403);

    const otherRequest = await request(app)
      .get('/api/v1/requests/2')
      .set('Authorization', `Bearer ${employeeToken}`);
    expect([403, 404]).toContain(otherRequest.status);

    const unassignedTransition = await request(app)
      .patch('/api/v1/requests/1/status')
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ status: 'in_progress' });
    expect([403, 409]).toContain(unassignedTransition.status);
  });
});
