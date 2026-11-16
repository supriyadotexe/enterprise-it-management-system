import request from 'supertest';
import { createApp } from '../src/app.js';

describe('phase 5 asset lifecycle invariants', () => {
  async function login(app, username, password = 'Demo@12345') {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username, password });
    return response.body.data.token;
  }

  it('recomputes allocated status when maintenance is cancelled', async () => {
    const app = createApp();
    const adminToken = await login(app, 'admin');
    const techToken = await login(app, 'ananya.rao');

    await request(app)
      .post('/api/v1/assets/52/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employee_id: 6, remarks: 'Lifecycle test' });

    const created = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        asset_id: 52,
        technician_id: 2,
        maintenance_type: 'corrective',
        description: 'Cancel lifecycle test',
      });
    expect(created.status).toBe(201);

    const underMaintenance = await request(app)
      .get('/api/v1/assets/52')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(underMaintenance.body.data.status).toBe('under_maintenance');

    const cancelled = await request(app)
      .patch(`/api/v1/maintenance/${created.body.data.maintenance_id}/cancel`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ remarks: 'No longer needed' });
    expect(cancelled.status).toBe(200);

    const recomputed = await request(app)
      .get('/api/v1/assets/52')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(recomputed.body.data.status).toBe('allocated');
  });

  it('returns an allocated asset to allocated after maintenance completion', async () => {
    const app = createApp();
    const adminToken = await login(app, 'admin');
    const techToken = await login(app, 'ananya.rao');

    await request(app)
      .post('/api/v1/assets/52/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employee_id: 6, remarks: 'Lifecycle completion test' });

    const created = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        asset_id: 52,
        technician_id: 2,
        maintenance_type: 'corrective',
        description: 'Complete lifecycle test',
      });
    expect(created.status).toBe(201);

    const completed = await request(app)
      .patch(`/api/v1/maintenance/${created.body.data.maintenance_id}/complete`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        outcome: 'returned_to_service',
        condition_after: 'good',
        remarks: 'Completed',
      });
    expect(completed.status).toBe(200);

    const asset = await request(app)
      .get('/api/v1/assets/52')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(asset.body.data.status).toBe('allocated');
  });
});
