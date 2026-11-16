import request from 'supertest';
import { createApp } from '../src/app.js';

describe('asset allocation and return', () => {
  async function adminToken(app) {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'Demo@12345' });
    return response.body.data.token;
  }

  it('allocates and returns an asset', async () => {
    const app = createApp();
    const token = await adminToken(app);

    const allocated = await request(app)
      .post('/api/v1/assets/52/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ employee_id: 6, remarks: 'Allocation test' });

    expect(allocated.status).toBe(201);
    const assignmentId = allocated.body.data.assignment_id;

    const asset = await request(app)
      .get('/api/v1/assets/52')
      .set('Authorization', `Bearer ${token}`);
    expect(asset.body.data.status).toBe('allocated');

    const returned = await request(app)
      .post(`/api/v1/assignments/${assignmentId}/return`)
      .set('Authorization', `Bearer ${token}`)
      .send({ return_condition: 'good', remarks: 'Returned' });

    expect(returned.status).toBe(200);
    const assetAfter = await request(app)
      .get('/api/v1/assets/52')
      .set('Authorization', `Bearer ${token}`);
    expect(assetAfter.body.data.status).toBe('available');
  });

  it('rejects concurrent allocation of the same asset', async () => {
    const app = createApp();
    const token = await adminToken(app);

    const [first, second] = await Promise.all([
      request(app)
        .post('/api/v1/assets/52/assign')
        .set('Authorization', `Bearer ${token}`)
        .send({ employee_id: 6 }),
      request(app)
        .post('/api/v1/assets/52/assign')
        .set('Authorization', `Bearer ${token}`)
        .send({ employee_id: 7 }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
  });
});
