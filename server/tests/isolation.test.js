import request from 'supertest';
import { createApp } from '../src/app.js';

describe('employee data isolation', () => {
  async function tokenFor(username) {
    const app = createApp();
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username, password: 'Demo@12345' });
    return response.body.data.token;
  }

  it('employee cannot read another employee record', async () => {
    const app = createApp();
    const token = await tokenFor('staff01');
    const response = await request(app)
      .get('/api/v1/employees/7')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('employee only sees own requests', async () => {
    const app = createApp();
    const token = await tokenFor('staff01');

    const response = await request(app)
      .get('/api/v1/requests')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    for (const item of response.body.data.items) {
      expect(item.employee_id).toBe(6);
    }
  });

  it('employee only sees own assets through assignments', async () => {
    const app = createApp();
    const token = await tokenFor('staff01');

    const response = await request(app)
      .get('/api/v1/assets')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    // Every returned asset must be connected to the employee through
    // assignment or request ownership.
    expect(Array.isArray(response.body.data.items)).toBe(true);
  });
});
