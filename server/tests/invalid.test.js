import request from 'supertest';
import { createApp } from '../src/app.js';

describe('invalid requests and error codes', () => {
  async function tokenFor(username) {
    const app = createApp();
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username, password: 'Demo@12345' });
    return response.body.data.token;
  }

  it('rejects an arbitrary asset status update', async () => {
    const app = createApp();
    const token = await tokenFor('admin');
    const response = await request(app)
      .patch('/api/v1/assets/52')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'available' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects immediate maintenance with a different scheduled date', async () => {
    const app = createApp();
    const token = await tokenFor('admin');
    const response = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${token}`)
      .send({
        asset_id: 52,
        technician_id: 2,
        maintenance_type: 'corrective',
        description: 'Bad date',
        status: 'in_progress',
        scheduled_date: '2099-01-01',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_SCHEDULED_DATE');
  });

  it('rejects scheduled maintenance without a date', async () => {
    const app = createApp();
    const token = await tokenFor('admin');
    const response = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${token}`)
      .send({
        asset_id: 52,
        technician_id: 2,
        maintenance_type: 'corrective',
        description: 'No date',
        status: 'scheduled',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_SCHEDULED_DATE');
  });

  it('rejects returning a poor asset to service', async () => {
    const app = createApp();
    const adminToken = await tokenFor('admin');
    const techToken = await tokenFor('ananya.rao');

    const created = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        asset_id: 41,
        technician_id: 2,
        maintenance_type: 'corrective',
        description: 'Poor return',
      });

    const response = await request(app)
      .patch(`/api/v1/maintenance/${created.body.data.maintenance_id}/complete`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        outcome: 'returned_to_service',
        condition_after: 'poor',
      });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('CONDITION_NOT_ALLOCATABLE');
  });

  it('rejects returning an already returned assignment', async () => {
    const app = createApp();
    const token = await tokenFor('admin');

    const allocated = await request(app)
      .post('/api/v1/assets/52/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ employee_id: 6 });
    const assignmentId = allocated.body.data.assignment_id;

    await request(app)
      .post(`/api/v1/assignments/${assignmentId}/return`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    const response = await request(app)
      .post(`/api/v1/assignments/${assignmentId}/return`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ASSIGNMENT_ALREADY_RETURNED');
  });
});
