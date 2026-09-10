/**
 * KudiFlow Auth Tests
 */

import request from 'supertest';
import app from '../src/app';
import { query } from '../src/config/database';

const TEST_PHONE_BASE = '+23320100';

function testPhone(suffix: string): string {
  return `${TEST_PHONE_BASE}${suffix}`;
}

// Clean up test users created during tests
async function cleanTestUsers(): Promise<void> {
  const usersRes = await query<{ id: string }>(`SELECT id FROM users WHERE phone LIKE '${TEST_PHONE_BASE}%'`);
  const userIds = usersRes.rows.map(r => r.id);
  if (userIds.length === 0) return;

  const idList = userIds.map(id => `'${id}'`).join(',');

  const acctRes = await query<{ id: string }>(`SELECT id FROM accounts WHERE user_id IN (${idList})`);
  const acctIds = acctRes.rows.map(r => r.id);
  if (acctIds.length > 0) {
    const acctList = acctIds.map(id => `'${id}'`).join(',');
    await query(`UPDATE transactions SET reversal_of = NULL WHERE sender_account_id IN (${acctList}) OR recipient_account_id IN (${acctList})`);
    await query(`DELETE FROM transactions WHERE sender_account_id IN (${acctList}) OR recipient_account_id IN (${acctList})`);
    await query(`DELETE FROM accounts WHERE id IN (${acctList})`);
  }

  await query(`DELETE FROM users WHERE id IN (${idList})`);
}

describe('Authentication', () => {
  beforeAll(async () => {
    await cleanTestUsers();
  });

  afterAll(async () => {
    await cleanTestUsers();
  });

  test('Register new user — success', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Test User',
        phone: testPhone('0001'),
        email: 'testuser001@test.com',
        password: 'TestPass123',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.phone).toBe('+233201000001');
  });

  test('Register with duplicate phone — PHONE_ALREADY_EXISTS', async () => {
    // First registration
    await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Duplicate Phone',
        phone: testPhone('0002'),
        email: 'dupphone@test.com',
        password: 'TestPass123',
      });

    // Duplicate
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Duplicate Phone 2',
        phone: testPhone('0002'),
        email: 'dupphone2@test.com',
        password: 'TestPass123',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PHONE_ALREADY_EXISTS');
  });

  test('Register with duplicate email — EMAIL_ALREADY_EXISTS', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Dup Email',
        phone: testPhone('0003'),
        email: 'dupemail@test.com',
        password: 'TestPass123',
      });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Dup Email 2',
        phone: testPhone('0004'),
        email: 'dupemail@test.com',
        password: 'TestPass123',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  test('Register with weak password — VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Weak Pass',
        phone: testPhone('0005'),
        email: 'weakpass@test.com',
        password: 'weak',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('Login with correct credentials — returns tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: '+233245550192',
        password: 'KudiFlow2024!',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(res.body.data.user).toBeTruthy();
    // Ensure sensitive fields are NOT returned
    expect(res.body.data.user.password_hash).toBeUndefined();
    expect(res.body.data.user.pin_hash).toBeUndefined();
  });

  test('Login with wrong password — INVALID_CREDENTIALS', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: '+233245550192',
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('Login with non-existent user — INVALID_CREDENTIALS (not a different error)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: '+233299999999',
        password: 'SomePass123',
      });

    // SECURITY: must return INVALID_CREDENTIALS, not NOT_FOUND (prevent user enumeration)
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('Refresh access token — returns new access token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: '+233245550192', password: 'KudiFlow2024!' });

    const refreshToken = loginRes.body.data.refreshToken;

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  test('Health check — returns 200 with database status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.api).toBe('ok');
  });
});
