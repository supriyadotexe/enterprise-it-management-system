import request from 'supertest';
import { createApp } from '../src/app.js';

describe('authentication', () => {
  it('rejects invalid credentials', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns the current user from the database', async () => {
    const app = createApp();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'Demo@12345' });
    const token = login.body.data.token;

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(me.status).toBe(200);
    expect(me.body.data.username).toBe('admin');
    expect(me.body.data.role).toBe('admin');
  });

  it('rejects an invalid token', async () => {
    const app = createApp();
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-token');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  it('changes a password and allows login with it', async () => {
    const app = createApp();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'staff01', password: 'Demo@12345' });
    const token = login.body.data.token;

    const changed = await request(app)
      .patch('/api/v1/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Demo@12345', newPassword: 'NewPassword@123' });

    expect(changed.status).toBe(200);

    const relogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'staff01', password: 'NewPassword@123' });
    expect(relogin.status).toBe(200);
  });
});
