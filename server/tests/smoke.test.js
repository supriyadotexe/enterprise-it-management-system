import request from 'supertest';
import { createApp } from '../src/app.js';

describe('smoke', () => {
  it('health and login', async () => {
    const app = createApp();
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'Demo@12345' });
    expect(login.status).toBe(200);
    expect(login.body.data.token).toBeTruthy();
  });
});
