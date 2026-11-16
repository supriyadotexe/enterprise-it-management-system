import request from 'supertest';
import { createApp } from '../src/app.js';

describe('maintenance lifecycle', () => {
  async function tokenFor(username) {
    const app = createApp();
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username, password: 'Demo@12345' });
    return response.body.data.token;
  }

  it('validates technician role on maintenance creation', async () => {
    const app = createApp();
    const adminToken = await tokenFor('admin');

    const response = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        asset_id: 52,
        technician_id: 1,
        maintenance_type: 'corrective',
        description: 'Invalid technician',
      });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('TECHNICIAN_ROLE_REQUIRED');
  });

  it('completes immediate maintenance with returned_to_service', async () => {
    const app = createApp();
    const adminToken = await tokenFor('admin');
    const techToken = await tokenFor('ananya.rao');

    const created = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        asset_id: 52,
        technician_id: 2,
        maintenance_type: 'corrective',
        description: 'Repair and return',
      });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('in_progress');
    const maintenanceId = created.body.data.maintenance_id;

    const completed = await request(app)
      .patch(`/api/v1/maintenance/${maintenanceId}/complete`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        outcome: 'returned_to_service',
        condition_after: 'good',
        remarks: 'Repaired',
      });

    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe('completed');
    expect(completed.body.data.outcome).toBe('returned_to_service');

    const asset = await request(app)
      .get('/api/v1/assets/52')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(asset.body.data.status).toBe('available');

    const history = await request(app)
      .get('/api/v1/assets/52/history')
      .set('Authorization', `Bearer ${adminToken}`);
    const maintenanceEvent = history.body.data.items.find(
      (item) => item.event_type === 'maintenance_completed',
    );
    expect(maintenanceEvent).toBeTruthy();
    expect(maintenanceEvent.actor_name).toBe('Ananya Rao');
  });

  it('holds a poor asset unavailable', async () => {
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
        description: 'Hold unavailable',
      });
    expect(created.status).toBe(201);

    const completed = await request(app)
      .patch(`/api/v1/maintenance/${created.body.data.maintenance_id}/complete`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        outcome: 'held_unavailable',
        condition_after: 'poor',
      });

    expect(completed.status).toBe(200);
    const asset = await request(app)
      .get('/api/v1/assets/41')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(asset.body.data.status).toBe('unavailable');
  });

  it('retires an asset through maintenance', async () => {
    const app = createApp();
    const adminToken = await tokenFor('admin');
    const techToken = await tokenFor('ananya.rao');

    const created = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        asset_id: 53,
        technician_id: 2,
        maintenance_type: 'corrective',
        description: 'Retire asset',
      });
    expect(created.status).toBe(201);

    const completed = await request(app)
      .patch(`/api/v1/maintenance/${created.body.data.maintenance_id}/complete`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        outcome: 'retired',
        condition_after: 'fair',
      });

    expect(completed.status).toBe(200);
    const asset = await request(app)
      .get('/api/v1/assets/53')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(asset.body.data.status).toBe('retired');
  });

  it('supports scheduled maintenance transitions', async () => {
    const app = createApp();
    const adminToken = await tokenFor('admin');
    const techToken = await tokenFor('ananya.rao');

    const created = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        asset_id: 54,
        technician_id: 2,
        maintenance_type: 'preventive',
        description: 'Scheduled work',
        status: 'scheduled',
        scheduled_date: '2099-01-01',
      });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('scheduled');

    const started = await request(app)
      .patch(`/api/v1/maintenance/${created.body.data.maintenance_id}/start`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ remarks: 'Started' });
    expect(started.status).toBe(200);
    expect(started.body.data.status).toBe('in_progress');

    const cancelled = await request(app)
      .patch(`/api/v1/maintenance/${started.body.data.maintenance_id}/cancel`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ remarks: 'No longer needed' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe('cancelled');
  });

  it('validates linked maintenance against request asset and technician', async () => {
    const app = createApp();
    const adminToken = await tokenFor('admin');

    const mismatchAsset = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        asset_id: 52,
        technician_id: 2,
        maintenance_type: 'corrective',
        description: 'Linked mismatch',
        request_id: 9,
      });
    expect(mismatchAsset.status).toBe(422);
    expect(mismatchAsset.body.error.code).toBe('ASSET_MISMATCH');

    const mismatchTech = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        asset_id: 69,
        technician_id: 3,
        maintenance_type: 'corrective',
        description: 'Technician mismatch',
        request_id: 9,
      });
    expect(mismatchTech.status).toBe(422);
    expect(mismatchTech.body.error.code).toBe('TECHNICIAN_MISMATCH');
  });
});
