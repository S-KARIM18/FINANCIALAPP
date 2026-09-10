/**
 * KudiFlow Idempotency Tests
 *
 * These tests prove that the same financial operation submitted multiple times
 * with the same idempotency key results in exactly ONE debit and ONE credit.
 *
 * This is the most critical test in the suite — it demonstrates the system
 * behaves like a financial system, not a CRUD application.
 */

import request from 'supertest';
import app from '../src/app';
import { query, withTransaction } from '../src/config/database';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

const AMA_PHONE = '+233245550192'; // Seed user with GHS 4,850.00
const KWAME_PHONE = '+233244100200'; // Seed user with GHS 2,100.00
const DEMO_PASSWORD = 'KudiFlow2024!'; // Matches seed data

async function loginUser(phone: string, password: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ identifier: phone, password });

  if (!res.body.data?.accessToken) {
    throw new Error(`Login failed for ${phone}: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.accessToken;
}

async function getBalance(token: string): Promise<number> {
  const res = await request(app)
    .get('/api/users/me/account')
    .set('Authorization', `Bearer ${token}`);
  return parseFloat(res.body.data.account.balance);
}

// Reset balances to known seed values before each test
async function resetBalances(): Promise<void> {
  await query(
    `UPDATE accounts SET balance = 4850.00
     WHERE account_number = '2055019201'`,
  );
  await query(
    `UPDATE accounts SET balance = 2100.00
     WHERE account_number = '2044100201'`,
  );
  // Clean up test idempotency keys and transactions
  await query(`UPDATE transactions SET reversal_of = NULL`);
  await query(`DELETE FROM idempotency_keys WHERE key LIKE 'test-%' OR key LIKE 'reversal-%'`);
  await query(`DELETE FROM transactions WHERE idempotency_key LIKE 'test-%' OR idempotency_key LIKE 'reversal-%'`);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Idempotency — Duplicate Transaction Protection', () => {
  let amaToken: string;
  let kwameToken: string;

  beforeAll(async () => {
    amaToken = await loginUser(AMA_PHONE, DEMO_PASSWORD);
    kwameToken = await loginUser(KWAME_PHONE, DEMO_PASSWORD);
  });

  beforeEach(async () => {
    await resetBalances();
  });

  /**
   * THE KEY TEST from the specification:
   *
   * Starting:  Ama = GHS 4,850.00
   * Send:      GHS 400.00 (fee GHS 2.00, total GHS 402.00)
   * Same key repeated 3 times
   * Expected:  Ama = GHS 4,448.00 (NOT 4,044.00 or 3,642.00)
   *            Kwame receives once only
   */
  test('Same idempotency key repeated 3 times — produces exactly ONE debit', async () => {
    const idempotencyKey = 'test-idem-key-001';

    // First request — should succeed
    const res1 = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${amaToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ recipientPhone: KWAME_PHONE, amount: '400.00', pin: '1234', note: 'Idempotency test' });

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.cached).toBe(false);

    // Second request with SAME key — should return cached result
    const res2 = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${amaToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ recipientPhone: KWAME_PHONE, amount: '400.00', pin: '1234', note: 'Idempotency test' });

    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.data.cached).toBe(true);
    expect(res2.body.data.transaction.id).toBe(res1.body.data.transaction.id);

    // Third request with SAME key — also cached
    const res3 = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${amaToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ recipientPhone: KWAME_PHONE, amount: '400.00', pin: '1234', note: 'Idempotency test' });

    expect(res3.status).toBe(200);
    expect(res3.body.data.cached).toBe(true);

    // VERIFY: Balance reflects exactly ONE debit
    const amaBalance = await getBalance(amaToken);
    expect(amaBalance).toBe(4448.00); // 4850 - 400 - 2 fee = 4448

    const kwameBalance = await getBalance(kwameToken);
    expect(kwameBalance).toBe(2500.00); // 2100 + 400 = 2500

    // VERIFY: Only one transaction in the DB with this idempotency key
    const txResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM transactions WHERE idempotency_key = $1',
      [idempotencyKey],
    );
    expect(parseInt(txResult.rows[0].count)).toBe(1);
  });

  test('Idempotency key reused with DIFFERENT parameters — rejected', async () => {
    const idempotencyKey = 'test-idem-key-002';

    // First request: GHS 400 to Kwame
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${amaToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ recipientPhone: KWAME_PHONE, amount: '400.00', pin: '1234' });

    // Second request: same key but DIFFERENT amount — must be rejected
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${amaToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ recipientPhone: KWAME_PHONE, amount: '999.00', pin: '1234' }); // different amount

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  test('Different users can use the same idempotency key independently', async () => {
    const sharedKey = 'test-shared-key-003';

    // Ama uses key
    const res1 = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${amaToken}`)
      .set('Idempotency-Key', sharedKey)
      .send({ recipientPhone: KWAME_PHONE, amount: '50.00', pin: '1234' });

    expect(res1.status).toBe(201);

    // Kwame uses the SAME key string — should be treated as independent
    const res2 = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${kwameToken}`)
      .set('Idempotency-Key', sharedKey)
      .send({ recipientPhone: AMA_PHONE, amount: '30.00', pin: '1234' });

    // Kwame's request should succeed independently (different user_id scope)
    expect(res2.status).toBe(201);
    expect(res2.body.data.transaction.id).not.toBe(res1.body.data.transaction.id);
  });
});
