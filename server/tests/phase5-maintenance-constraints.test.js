import request from 'supertest';
import { createApp } from '../src/app.js';

describe('phase 5 maintenance constraints', () => {
  async function login(app, username, password = 'Demo@12345') {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username, password });
    return response.body.data.token;
  }

  it('rejects a second in-progress maintenance record for one asset', async () => {
    const app = createApp();
    const adminToken = await login(app, 'admin');

    const first = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        asset_id: 52,
        technician_id: 2,
        maintenance_type: 'corrective',
        description: 'First in-progress maintenance',
      });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        asset_id: 52,
        technician_id: 2,
        maintenance_type: 'corrective',
        description: 'Second in-progress maintenance',
      });
    expect(second.status).toBe(409);
  });

  it('rejects duplicate asset codes', async () => {
    const app = createApp();
    const adminToken = await login(app, 'admin');

    const duplicate = await request(app)
      .post('/api/v1/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        asset_code: 'AST-0001',
        name: 'Duplicate asset',
        category_id: 1,
        asset_condition: 'good',
      });
    expect([409, 422]).toContain(duplicate.status);
  });
});
